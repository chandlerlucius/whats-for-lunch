package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

func hashPassword(password string) string {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		log.Print(err)
	}
	return string(bytes)
}

func checkPasswordHash(password string, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		log.Print(err)
	}
	return err == nil
}

var key = []byte("the_most_secret_key")
var expirationTime = 5 * time.Minute

func authenticateHandler(w http.ResponseWriter, r *http.Request) {
	status, claims, token, err := authenticateRequest(w, r)
	if err != nil || status != http.StatusOK {
		title := "Failure"
		body := "Token invalid or session expired. Please login again."
		message := Message{status, title, body, token, 0}
		sendMessageAndLogError(w, message, err)
		return
	}

	title := "Success"
	body := "User authentication succeeded. Welcome " + claims.User.Username + "!"
	message := Message{status, title, body, token, (claims.ExpiresAt - time.Now().Unix()) * 1000}
	sendMessage(w, message)
}

func authenticateRequest(w http.ResponseWriter, r *http.Request) (int, *Claims, string, error) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	token := r.URL.Query().Get("token")
	return authenticate(token)
}

func authenticateWebsocket(c *websocket.Conn, token string) (bool, string, *Claims) {
	status, claims, token, err1 := authenticate(token)
	if err1 != nil || status != http.StatusOK || claims == (&Claims{}) {
		log.Print(err1)
		message := websocket.FormatCloseMessage(4001, "Session expired. Please log in again.")
		c.WriteMessage(websocket.CloseMessage, message)
		return false, "", &Claims{}
	}
	return true, token, claims
}

func authenticate(token string) (int, *Claims, string, error) {
	claims := &Claims{}
	tkn, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		return key, nil
	})

	user, err1 := findUserDocumentByID(claims.User.ID)
	if err != nil || err1 != nil || !tkn.Valid || user == (User{}) {
		return http.StatusUnauthorized, &Claims{}, "", err
	}

	claims.ExpiresAt = time.Now().Add(expirationTime).Unix()
	newToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err1 := newToken.SignedString(key)
	if err1 != nil {
		return http.StatusUnauthorized, &Claims{}, "", err1
	}
	return http.StatusOK, claims, tokenString, nil
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	username := r.FormValue("username")
	password := r.FormValue("password")
	if len(username) < 3 || len(password) < 3 {
		message := Message{http.StatusBadRequest, "Failure", "Username and Password must longer than 3 characters.", "", 0}
		sendMessageAndLogError(w, message, nil)
		return
	}

	user, err := findUserDocumentByUsername(username)
	if err != nil {
		log.Print(err)
	}
	if user.ID == primitive.NilObjectID {
		hash := hashPassword(password)
		count := findNextUserCount()
		user = User{primitive.NewObjectID(), time.Now(), count, username, hash}
		res, err := insertUserIntoDatabase(&user, "user")
		if err != nil {
			status := http.StatusInternalServerError
			sendMessageAndLogDefaultError(w, status, err)
			return
		}
		if res != nil {
			user.ID = res.InsertedID.(primitive.ObjectID)
			info := "Added to DB succesffully with name: " + user.Username + " | id:" + res.InsertedID.(primitive.ObjectID).String()
			log.Print(info)
		}
	}

	success := checkPasswordHash(password, user.Password)
	if success == true {
		claims := &Claims{
			User: user,
			StandardClaims: jwt.StandardClaims{
				ExpiresAt: time.Now().Add(expirationTime).Unix(),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, err := token.SignedString(key)
		if err != nil {
			sendMessageAndLogDefaultError(w, http.StatusInternalServerError, err)
			return
		}

		jsonData := map[string]interface{}{"token": tokenString, "timeout": (claims.ExpiresAt-time.Now().Unix())*1000 + 2000}
		err1 := json.NewEncoder(w).Encode(jsonData)
		if err1 != nil {
			log.Print(err1)
		}
	} else {
		message := Message{http.StatusUnauthorized, "Failure", "Username or Password is incorrect.", "", 0}
		sendMessage(w, message)
		return
	}
}

func insertUserIntoDatabase(user *User, collection string) (*mongo.InsertOneResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	mongoCollection := mongoClient.Database(database).Collection(collection)
	res, err := mongoCollection.InsertOne(ctx, user)
	return res, err
}

func findUserDocumentByUsername(username string) (User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user User
	collection := mongoClient.Database(database).Collection("user")
	err := collection.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	return user, err
}

func findUserDocumentByID(id primitive.ObjectID) (User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user User
	collection := mongoClient.Database(database).Collection("user")
	err := collection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	return user, err
}

func findNextUserCount() int {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	findOptions := options.Find()
	findOptions.SetSort(bson.M{"count": 1})

	collection := mongoClient.Database(database).Collection("user")
	cur, err := collection.Find(ctx, bson.D{}, findOptions)
	if err != nil {
		log.Print(err)
	}

	var count = 0
	defer cur.Close(ctx)
	for cur.Next(ctx) {
		var user User
		err1 := cur.Decode(&user)
		if err1 != nil {
			log.Print(err1)
		}
		if user.Count != count {
			return count
		}
		count++
	}
	return count
}

// User is a simple user auth object
type User struct {
	ID       primitive.ObjectID `bson:"_id, omitempty"`
	Date     time.Time
	Count    int
	Username string
	Password string
}

// Claims is a jwt claims object
type Claims struct {
	User User
	jwt.StandardClaims
}
