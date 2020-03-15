package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/dgrijalva/jwt-go"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
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

func authenticateHandler(w http.ResponseWriter, r *http.Request) {
	status, err := authenticate(w, r)
	if err != nil || status != http.StatusOK {
		title := "Failure"
		body := "Token is either invalid or session timed out. Please login again."
		message := Message{status, title, body}
		sendMessageAndLogError(w, message, err)
		return
	}

	title := "Success"
	body := "User authentication succeeded!"
	message := Message{status, title, body}
	sendMessageAndLogError(w, message, err)
}

func authenticate(w http.ResponseWriter, r *http.Request) (int, error) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	token := r.URL.Query().Get("token")
	if err != nil {
		log.Print(err)
	}
	tknStr := token

	claims := &Claims{}
	tkn, err := jwt.ParseWithClaims(tknStr, claims, func(token *jwt.Token) (interface{}, error) {
		return key, nil
	})
	if err != nil || !tkn.Valid {
		return http.StatusUnauthorized, err
	}
	return http.StatusOK, nil
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	username := r.FormValue("username")
	password := r.FormValue("password")
	if username == "" || password == "" {
		message := Message{http.StatusBadRequest, "Failure", "Username and Password must be filled out."}
		sendMessageAndLogError(w, message, nil)
		return
	}

	user, err := getUserFromDatabase(username)
	if err != nil {
		status := http.StatusInternalServerError
		sendMessageAndLogDefaultError(w, status, err)
		return
	}
	if user.Username == "" {
		hash := hashPassword(password)
		user = User{username, hash}
		res, err := insertUserIntoDatabase(&user, "user")
		if err != nil {
			status := http.StatusInternalServerError
			sendMessageAndLogDefaultError(w, status, err)
			return
		}
		if res != nil {
			info := "Added to DB succesffully with name: " + user.Username + " | id:" + res.InsertedID.(primitive.ObjectID).String()
			log.Print(info)
		}
	}

	success := checkPasswordHash(password, user.Password)
	if success == true {
		expirationTime := time.Now().Add(1 * time.Minute)
		claims := &Claims{
			Username: user.Username,
			StandardClaims: jwt.StandardClaims{
				ExpiresAt: expirationTime.Unix(),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, err := token.SignedString(key)
		if err != nil {
			sendMessageAndLogDefaultError(w, http.StatusInternalServerError, err)
			return
		}

		jsonToken := map[string]string{"token": tokenString}
		err1 := json.NewEncoder(w).Encode(jsonToken)
		if err1 != nil {
			log.Print(err1)
		}
	} else {
		message := Message{http.StatusUnauthorized, "Failure", "Username or Password is incorrect."}
		sendMessageAndLogError(w, message, nil)
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

func getUserFromDatabase(username string) (User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var res User
	collection := mongoClient.Database(database).Collection("user")
	err := collection.FindOne(ctx, bson.M{"username": username}).Decode(&res)
	return res, err
}

// User is a simple user auth object
type User struct {
	Username string
	Password string
}

// Claims is a jwt claims object
type Claims struct {
	Username string `json:"username"`
	jwt.StandardClaims
}
