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

var clients = make(map[*websocket.Conn]bool)

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

	status, username, err1 := authenticate(w, r)
	if err1 != nil || status != http.StatusOK {
		log.Print(err1)
		message := websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "Unauthorized access!")
		c.WriteMessage(websocket.CloseMessage, message)
		return
	}

	clients[c] = true
	getDocuments(c, "location")
	getDocuments(c, "chat")
	handleConnection(c, username)
}

func handleConnection(c *websocket.Conn, username string) {
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

		websocketMessage := &WebsocketMessage{}
		err1 := json.Unmarshal(bytes, websocketMessage)
		if err1 != nil {
			log.Print(err1)
		}

		if websocketMessage.Type == "chat" {
			chatMessage := &ChatMessage{}
			chatMessage.User = username
			chatMessage.Date = time.Now()
			addDocument(c, bytes, chatMessage, "chat")
		} else if websocketMessage.Type == "location" {
			location := &Location{}
			addDocument(c, bytes, location, "location")
		}

		for client := range clients {
			if err != nil {
				log.Printf("error: %v", err)
			}

			if websocketMessage.Type == "chat" {
				getDocuments(client, "chat")
			} else if websocketMessage.Type == "location" {
				getDocuments(client, "location")
			}
		}
	}
}

func getDocuments(c *websocket.Conn, collectionName string) {
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

	var results []*bson.M
	defer cur.Close(ctx)
	for cur.Next(ctx) {
		var result bson.M
		err1 := cur.Decode(&result)
		if err1 != nil {
			log.Print(err1)
		}
		results = append(results, &result)
	}
	var body bson.M = bson.M{"type": collectionName, "body": results}

	err2 := c.WriteJSON(body)
	if err2 != nil {
		log.Print(err2)
	}
}

func addDocument(c *websocket.Conn, bytes []byte, data interface{}, collection string) {
	err := json.Unmarshal(bytes, data)
	res, err1 := insertIntoDatabase(data, collection)

	if err != nil {
		info := "Sorry, we encountered an error our end. It has been logged and will be fixed"
		log.Print(info, " : ", err)
	}
	if err1 != nil {
		info := "Sorry, we encountered an error our end. It has been logged and will be fixed"
		log.Print(info, " : ", err1)
		c.WriteJSON(bson.M{"type": "error", "body": err1.Error()})
	}
	if res != nil {
		info := "Added to DB succesffully with id:" + res.InsertedID.(primitive.ObjectID).String()
		log.Print(info)
	}
}

func insertIntoDatabase(data interface{}, collectionName string) (*mongo.InsertOneResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := mongoClient.Database(database).Collection(collectionName)
	if collectionName == "location" {
		location, ok := data.(*Location)
		if ok {
			res := Location{}
			err := collection.FindOne(ctx, bson.M{"place_id": location.PlaceID}).Decode(&res)
			if err != nil {
				log.Print(err)
			}
			if res.Name != "" {
				return nil, errors.New("Location already added")
			}
		}
	}
	res, err := collection.InsertOne(ctx, data)
	return res, err
}

// WebsocketMessage contains a general message format from client
type WebsocketMessage struct {
	Type string                 `json:"type"`
	Body map[string]interface{} `json:"-"`
}

// ChatMessage is used to identify a chat message
type ChatMessage struct {
	Date    time.Time `json:"date"`
	User    string    `json:"user"`
	Message string    `json:"message"`
}

// Location is used to identify the values of a restaurant
type Location struct {
	PlaceID          string `json:"place_id" bson:"place_id"`
	Name             string `json:"name"`
	Rating           string `json:"rating"`
	UserRatingsTotal string `json:"user_ratings_total" bson:"user_ratings_total"`
	PriceLevel       string `json:"price_level" bson:"price_level"`
	Website          string `json:"website"`
	URL              string `json:"url"`
	Votes            string `json:"votes"`
}
