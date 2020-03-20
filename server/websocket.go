package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var clients = make(map[*websocket.Conn]string)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func websocketHandler(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print(err)
	}

	token := r.URL.Query().Get("token")
	authenticated, token, claims := authenticateWebsocket(c, token)
	if !authenticated {
		return
	}

	clients[c] = token
	writeDocumentsToClient(c, "location", claims)
	writeDocumentsToClient(c, "chat", claims)
	handleConnection(c)
}

func handleConnection(c *websocket.Conn) {
	defer func() {
		delete(clients, c)
		c.Close()
	}()
	for {
		_, bytes, err := c.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		authenticated, token, claims := authenticateWebsocket(c, clients[c])
		if !authenticated {
			return
		}
		clients[c] = token

		websocketMessage := &WebsocketMessage{}
		err2 := json.Unmarshal(bytes, websocketMessage)
		if err2 != nil {
			log.Print(err2)
		}

		if websocketMessage.Type == "chat" {
			chatMessage := &ChatMessage{}
			chatMessage.Date = time.Now()
			chatMessage.User = claims.User.ID
			addDocument(c, bytes, chatMessage, "chat")
		} else if websocketMessage.Type == "location" {
			location := &Location{}
			location.Date = time.Now()
			location.User = claims.User.ID
			location.Votes = 0
			addDocument(c, bytes, location, "location")
		} else if websocketMessage.Type == "votes" {

		} else {
			continue
		}

		for client := range clients {
			if err != nil {
				log.Printf("error: %v", err)
			}

			authenticated, token, claims := authenticateWebsocket(c, clients[client])
			if !authenticated {
				continue
			}
			clients[client] = token

			if websocketMessage.Type == "chat" {
				writeDocumentsToClient(client, "chat", claims)
			} else if websocketMessage.Type == "location" {
				writeDocumentsToClient(client, "location", claims)
			}
		}
	}
}

func writeDocumentsToClient(c *websocket.Conn, collectionName string, claims *Claims) {
	cur := findDocuments(collectionName)

	var results []*bson.M
	defer cur.Close(ctx)
	for cur.Next(ctx) {
		var result bson.M
		err1 := cur.Decode(&result)
		if err1 != nil {
			log.Print(err1)
		}
		if result["user"] != nil {
			user, err := findUserDocumentByID(result["user"].(primitive.ObjectID))
			if err != nil {
				log.Print(err)
			}
			result["user"] = user.Username
		}
		results = append(results, &result)
	}
	var body bson.M = bson.M{"type": collectionName, "token" : clients[c], "timeout": (claims.ExpiresAt-time.Now().Unix())*1000 + 2000, "body": results}

	err2 := c.WriteJSON(body)
	if err2 != nil {
		log.Print(err2)
	}
}

func findDocuments(collectionName string) *mongo.Cursor {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	findOptions := options.Find()
	if collectionName == "chat" {
		findOptions.SetLimit(100)
		findOptions.SetSort(bson.D{primitive.E{Key: "date", Value: -1}})
	} else if collectionName == "location" {
		findOptions.SetLimit(5)
		findOptions.SetSort(bson.D{primitive.E{Key: "votes", Value: -1}})
	}

	collection := mongoClient.Database(database).Collection(collectionName)
	cur, err := collection.Find(ctx, bson.D{}, findOptions)
	if err != nil {
		log.Print(err)
	}
	return cur
}

func addDocument(c *websocket.Conn, bytes []byte, data interface{}, collectionName string) {
	err := json.Unmarshal(bytes, data)
	res, err1 := insertIntoDatabase(data, collectionName)

	if err != nil {
		log.Print(err)
	}
	if err1 != nil {
		log.Print(err1)
		c.WriteJSON(bson.M{"type": "error", "body": err1.Error()})
	}
	if res != nil {
		info := "Added to DB succesffully with id:" + res.InsertedID.(primitive.ObjectID).String()
		log.Print(info)
		c.WriteJSON(bson.M{"type": "success", "body": collectionName})
	}
}

func insertIntoDatabase(data interface{}, collectionName string) (*mongo.InsertOneResult, error) {
	if collectionName == "location" {
		location, ok := data.(*Location)
		if ok {
			found := searchDocumentsForName(collectionName, location.Name)
			if found {
				return nil, errors.New(location.Name + " has already been added!")
			}
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := mongoClient.Database(database).Collection(collectionName)
	res, err := collection.InsertOne(ctx, data)
	return res, err
}

func searchDocumentsForName(collectionName string, name string) bool {
	cur := findDocuments(collectionName)

	defer cur.Close(ctx)
	for cur.Next(ctx) {
		var result bson.M
		err1 := cur.Decode(&result)
		if err1 != nil {
			log.Print(err1)
		}
		if result["name"] == name {
			return true
		}
	}
	return false
}

// WebsocketMessage contains a general message format from client
type WebsocketMessage struct {
	Type string                 `json:"type"`
	Body map[string]interface{} `json:"-"`
}

// ChatMessage is used to identify a chat message
type ChatMessage struct {
	Date    time.Time          `json:"date"`
	User    primitive.ObjectID `json:"user"`
	Message string             `json:"message"`
}

// Location is used to identify the values of a restaurant
type Location struct {
	Date             time.Time          `json:"date"`
	User             primitive.ObjectID `json:"user"`
	Name             string             `json:"name"`
	Rating           string             `json:"rating"`
	UserRatingsTotal string             `json:"user_ratings_total" bson:"user_ratings_total"`
	PriceLevel       string             `json:"price_level" bson:"price_level"`
	Website          string             `json:"website"`
	URL              string             `json:"url"`
	Votes            int                `json:"votes"`
}
