package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var mongoClient, err = mongo.NewClient(options.Client().ApplyURI("mongodb://localhost:27017"))
var database = "lunch"
var collection = "location"
var clients = make(map[*websocket.Conn]bool)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func locationsWebsocketHandler(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print(err)
	}
	clients[c] = true
	getLocations(c)
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

		addLocation(c, bytes)
		for client := range clients {
			if err != nil {
				log.Printf("error: %v", err)
			}
			getLocations(client)
		}
	}
}

func getLocations(c *websocket.Conn) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err1 := mongoClient.Connect(ctx)
	if err1 != nil {
		log.Print(err1)
	}

	collection := mongoClient.Database(database).Collection(collection)
	cur, err2 := collection.Find(context.Background(), bson.D{})
	if err2 != nil {
		log.Print(err2)
	}

	var results []*bson.M
	defer cur.Close(context.Background())
	for cur.Next(context.Background()) {
		var result bson.M
		err3 := cur.Decode(&result)
		if err3 != nil {
			log.Print(err3)
		}
		results = append(results, &result)
	}

	err4 := c.WriteJSON(results)
	if err4 != nil {
		log.Print(err4)
	}
}

func addLocation(c *websocket.Conn, bytes []byte) {
	location := &Location{}
	err := json.Unmarshal(bytes, location)
	res, err1, err2 := insertOneIntoDatabase(location, database, collection)

	if err != nil {
		info := "Sorry, we encountered an error our end. It has been logged and will be fixed"
		log.Print(info, " : ", err)
	}
	if err1 != nil {
		info := "Sorry, we encountered an error our end. It has been logged and will be fixed"
		log.Print(info, " : ", err1)
	}
	if err2 != nil {
		info := "Sorry, we encountered an error our end. It has been logged and will be fixed"
		log.Print(info, " : ", err2)
	}
	if res != nil {
		info := "Added to DB succesffully with name: " + location.Name + " | id:" + res.InsertedID.(primitive.ObjectID).String()
		log.Print(info)
	}
}

func insertOneIntoDatabase(location *Location, database string, collection string) (res *mongo.InsertOneResult, err error, err1 error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err2 := mongoClient.Connect(ctx)
	mongoCollection := mongoClient.Database(database).Collection(collection)
	res1, err3 := mongoCollection.InsertOne(ctx, location)
	return res1, err2, err3
}

func sendAndLogError(err error, w http.ResponseWriter) {
	if err != nil {
		log.Print(err)
		info := "Sorry, we encountered an error our end. It has been logged and will be fixed!"
		message := Message{"Failure", info}
		err1 := json.NewEncoder(w).Encode(message)
		if err1 != nil {
			log.Print(err1)
		}
	}
}

// Location is used to identify the values of a restaurant
type Location struct {
	Name             string `json:"name"`
	Rating           string `json:"rating"`
	UserRatingsTotal string `json:"user_ratings_total" bson:"user_ratings_total"`
	PriceLevel       string `json:"price_level" bson:"price_level"`
	Website          string `json:"website"`
	URL              string `json:"url"`
	Votes            string `json:"votes"`
}

// Message is used to send a title and body as error message to client
type Message struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}
