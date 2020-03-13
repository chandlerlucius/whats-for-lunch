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
)

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

	status, err1 := authenticate(w, r)
	if err1 != nil || status != http.StatusOK {
		log.Print(err1)
		message := websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "Unauthorized access!")
		c.WriteMessage(websocket.CloseMessage, message)
		return
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

	collection := mongoClient.Database(database).Collection("location")
	cur, err := collection.Find(ctx, bson.D{})
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

	err2 := c.WriteJSON(results)
	if err2 != nil {
		log.Print(err2)
	}
}

func addLocation(c *websocket.Conn, bytes []byte) {
	location := &Location{}
	err := json.Unmarshal(bytes, location)
	res, err1 := insertLocationIntoDatabase(location, "location")

	if err != nil {
		info := "Sorry, we encountered an error our end. It has been logged and will be fixed"
		log.Print(info, " : ", err)
	}
	if err1 != nil {
		info := "Sorry, we encountered an error our end. It has been logged and will be fixed"
		log.Print(info, " : ", err1)
	}
	if res != nil {
		info := "Added to DB succesffully with name: " + location.Name + " | id:" + res.InsertedID.(primitive.ObjectID).String()
		log.Print(info)
	}
}

func insertLocationIntoDatabase(location *Location, collection string) (*mongo.InsertOneResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	mongoCollection := mongoClient.Database(database).Collection(collection)
	res, err := mongoCollection.InsertOne(ctx, location)
	return res, err
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
