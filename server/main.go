package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var ctx, _ = context.WithTimeout(context.Background(), 5*time.Second)
var mongoClient, err = mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
var database = "lunch"

func main() {
	router := mux.NewRouter()
	router.HandleFunc("/authenticate", authenticateHandler).Methods("POST")
	router.HandleFunc("/login", loginHandler).Methods("POST")

	subrouter := router.PathPrefix("/ws").Subrouter()
	subrouter.HandleFunc("", websocketHandler).Methods("GET")

	http.Handle("/", router)
	http.ListenAndServe(":9000", router)
}

func sendMessageAndLogDefaultError(w http.ResponseWriter, status int, err error) {
	title := "Failure"
	body := "Sorry, we encountered an error our end. It has been logged and will be fixed!"
	message := Message{status, title, body, "", 0}
	sendMessageAndLogError(w, message, err)
}

func sendMessageAndLogError(w http.ResponseWriter, message Message, err error) {
	log.Print(err)
	sendMessage(w, message)
}

func sendMessage(w http.ResponseWriter, message Message) {
	w.WriteHeader(message.Status)
	err := json.NewEncoder(w).Encode(message)
	if err != nil {
		log.Print(err)
	}
}

// Message is used to send a title and body as error message to client
type Message struct {
	Status  int    `json:"status"`
	Title   string `json:"title"`
	Body    string `json:"body"`
	Token   string `json:"token"`
	Timeout int64  `json:"timeout"`
}
