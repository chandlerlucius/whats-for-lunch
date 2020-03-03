package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var client, err = mongo.NewClient(options.Client().ApplyURI("mongodb://localhost:27017"))

func main() {
	router := mux.NewRouter()
	subrouter := router.PathPrefix("/location").Subrouter()
	subrouter.HandleFunc("/add", locationAddHandler).Methods("POST")
	http.Handle("/", router)
	http.ListenAndServe(":8080", router)
}

func locationAddHandler(writer http.ResponseWriter, request *http.Request) {
	name := request.FormValue("name")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := client.Connect(ctx)
	collection := client.Database("lunch").Collection("location")
	res, err := collection.InsertOne(ctx, bson.M{"name": name})

	var message Message
	writer.Header().Set("Content-Type", "application/json; charset=UTF-8")
	writer.Header().Set("Access-Control-Allow-Origin", "*")
	if err != nil {
		info := "Sorry, we encountered an error our end. It has been logged and will be fixed"
		log.Print(info, " : ", err)
		writer.WriteHeader(http.StatusInternalServerError)
		message = Message{"Failure", info}
	}
	if res != nil {
		info := "Added to DB succesffully with id: " + res.InsertedID.(primitive.ObjectID).String()
		log.Print(info)
		writer.WriteHeader(http.StatusOK)
		message = Message{"Success", info}
	}
	jsonerror := json.NewEncoder(writer).Encode(message)
	if jsonerror != nil {
		log.Print(jsonerror)
	}
}

// Message is simple json construct
type Message struct {
	Title string `json:"title"`
	Body string `json:"body"`
}
