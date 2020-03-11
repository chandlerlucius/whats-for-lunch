package main

import (
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	router := mux.NewRouter()
	subrouter := router.PathPrefix("/locations").Subrouter()
	subrouter.HandleFunc("", locationsWebsocketHandler).Methods("GET")
	http.Handle("/", router)
	http.ListenAndServe(":9000", router)
}
