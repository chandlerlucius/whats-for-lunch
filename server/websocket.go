package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var clientTokens = make(map[*websocket.Conn]string)
var clientUserIDs = sync.Map{}

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
		message := websocket.FormatCloseMessage(4001, "Session expired. Please log in again.")
		c.WriteMessage(websocket.CloseMessage, message)
		return
	}
	clientTokens[c] = token
	clientUserIDs.Store(claims.User.ID.Hex(), time.Now())

	writeDocumentsToClient(c, "location", claims)
	writeDocumentsToClient(c, "chat", claims)
	handleConnection(c, claims.User.ID.Hex())
}

func handleConnection(c *websocket.Conn, userID string) {
	defer func() {
		clientUserIDs.Delete(userID)
		delete(clientTokens, c)
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
		authenticated, token, claims := authenticateWebsocket(c, clientTokens[c])
		if !authenticated {
			break
		}

		websocketMessage := &WebsocketMessage{}
		err1 := json.Unmarshal(bytes, websocketMessage)
		if err1 != nil {
			log.Print(err1)
		}

		if websocketMessage.Type == "background" {
			var results []bson.M
			clientUserIDs.Range(func(key interface{}, value interface{}) bool {
				date := value.(time.Time)
				var status = "offline"
				if date.Before(time.Now().Add(-5 * time.Minute)) {
					status = "away"
				} else {
					status = "active"
				}
				var result = bson.M{"id": key, "date": date, "status": status}
				results = append(results, result)
				return true
			})
			if websocketMessage.Active {
				clientTokens[c] = token
				clientUserIDs.Store(claims.User.ID.Hex(), time.Now())
			}

			var body bson.M = bson.M{"type": "background", "token": clientTokens[c], "timeout": (claims.ExpiresAt-time.Now().Unix())*1000 + 2000, "body": results}
			err3 := c.WriteJSON(body)
			if err3 != nil {
				log.Print(err3)
			}
		} else {
			log.Print("Message received from websocket. User: " + claims.User.Username + " | Message: " + websocketMessage.Type)
			clientTokens[c] = token
			clientUserIDs.Store(claims.User.ID.Hex(), time.Now())
		}

		if websocketMessage.Type == "chat" {
			chatMessage := &ChatMessage{}
			chatMessage.Date = time.Now()
			chatMessage.User = claims.User.ID
			chatMessage.ID = primitive.NewObjectID()
			insertDocument(c, bytes, chatMessage, "chat")
		} else if websocketMessage.Type == "location" {
			location := &Location{}
			location.ID = primitive.NewObjectID()
			location.Date = time.Now()
			location.User = claims.User.ID
			location.VoteCount = 0
			location.UpVotes = []Vote{}
			location.DownVotes = []Vote{}
			insertDocument(c, bytes, location, "location")
		} else if websocketMessage.Type == "vote" {
			vote := &Vote{}
			vote.Date = time.Now()
			vote.User = claims.User.ID
			updateDocument(c, bytes, vote, "location")
		} else {
			continue
		}

		for client := range clientTokens {
			if err != nil {
				log.Printf("error: %v", err)
			}

			authenticated, token, claims := authenticateWebsocket(c, clientTokens[client])
			if !authenticated {
				continue
			}
			clientTokens[client] = token

			if websocketMessage.Type == "chat" {
				writeDocumentsToClient(client, "chat", claims)
			} else if websocketMessage.Type == "location" {
				writeDocumentsToClient(client, "location", claims)
			} else if websocketMessage.Type == "vote" {
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
		result = replaceUserIDWithUserDetails(result, claims)
		if result["up_votes"] != nil {
			result = fixVoteJSON(result, "up_votes", claims)
		}
		if result["down_votes"] != nil {
			result = fixVoteJSON(result, "down_votes", claims)
		}
		results = append(results, &result)
	}
	var body bson.M = bson.M{"type": collectionName, "token": clientTokens[c], "timeout": (claims.ExpiresAt-time.Now().Unix())*1000 + 2000, "body": results}

	err2 := c.WriteJSON(body)
	if err2 != nil {
		log.Print(err2)
	}
}

func fixVoteJSON(result bson.M, voteType string, claims *Claims) bson.M {
	votes := []bson.M{}
	for _, vote := range result[voteType].(primitive.A) {
		vote := vote.(bson.M)
		if vote["user"] == claims.User.ID {
			if voteType == "up_votes" {
				result["voted"] = "up"
			}
			if voteType == "down_votes" {
				result["voted"] = "down"
			}
		}
		vote = replaceUserIDWithUserDetails(vote, claims)
		votes = append(votes, vote)
	}
	result[voteType] = votes
	return result
}

func replaceUserIDWithUserDetails(result bson.M, claims *Claims) bson.M {
	if result["user"] != nil {
		user, err := findUserDocumentByID(result["user"].(primitive.ObjectID))
		if err != nil {
			log.Print(err)
		}

		if user == (User{}) {
			result["user_id"] = "removed"
			result["user_name"] = "[removed]"
			result["user_count"] = "removed"
		} else {
			result["user_id"] = user.ID
			result["user_name"] = user.Username
			result["user_count"] = user.Count
		}
		if user.ID == claims.User.ID {
			result["added"] = true
		}
	}
	return result
}

func findDocuments(collectionName string) *mongo.Cursor {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	findOptions := options.Find()
	filter := bson.M{}
	if collectionName == "chat" {
		filter = bson.M{
			"date": bson.M{
				"$gt": time.Now().Add(-12 * time.Hour),
				"$lt": time.Now().Add(12 * time.Hour),
			},
		}
		findOptions.SetSort(bson.M{"date": -1})
	} else if collectionName == "location" {
		filter = bson.M{
			"date": bson.M{
				"$gt": time.Now().Add(-12 * time.Hour),
				"$lt": time.Now().Add(12 * time.Hour),
			},
		}
		findOptions.SetSort(bson.M{"vote_count": -1})
	}

	collection := mongoClient.Database(database).Collection(collectionName)
	cur, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		log.Print(err)
	}
	return cur
}

func findLocationWithFilter(collectionName string, filter bson.M) (Location, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var location Location
	collection := mongoClient.Database(database).Collection(collectionName)
	err := collection.FindOne(ctx, filter).Decode(&location)
	return location, err
}

func insertDocument(c *websocket.Conn, bytes []byte, data interface{}, collectionName string) {
	err := json.Unmarshal(bytes, data)
	res, err1 := insertDocumentInDatabase(data, collectionName)

	if err != nil {
		log.Print(err)
	}
	if err1 != nil {
		log.Print(err1)
		message := Message{}
		message.Status = http.StatusConflict
		message.Title = collectionName
		message.Body = err1.Error()
		c.WriteJSON(message)
	}
	if res != nil {
		info := "Added to DB succesffully with id:" + res.InsertedID.(primitive.ObjectID).String()
		log.Print(info)
		message := Message{}
		message.Status = http.StatusOK
		message.Title = collectionName
		if collectionName == "chat" {
			message.Body = "Message sent succesfully!"
		}
		if collectionName == "location" {
			message.Body = "Location added succesfully!"
		}
		c.WriteJSON(message)
	}
}

func updateDocument(c *websocket.Conn, bytes []byte, data interface{}, collectionName string) {
	err := json.Unmarshal(bytes, &data)
	res, response, err1 := updateDocumentInDatabase(data, collectionName)

	if err != nil {
		log.Print(err)
	}
	if err1 != nil {
		log.Print(err1)
		message := Message{}
		message.Status = http.StatusConflict
		message.Title = collectionName
		message.Body = err1.Error()
		c.WriteJSON(message)
	}
	if res != nil {
		info := "Updated DB succesffully"
		log.Print(info)
		message := Message{}
		message.Status = http.StatusOK
		message.Title = collectionName
		message.Body = response
		c.WriteJSON(message)
	}
}

func updateDocumentInDatabase(data interface{}, collectionName string) (interface{}, string, error) {
	filter := bson.M{}
	update := bson.M{}
	response := ""
	if collectionName == "location" {
		vote, ok := data.(*Vote)
		if ok {
			document := searchDocumentsForName(collectionName, vote.Location)
			if document == nil {
				return nil, "", errors.New(vote.Location + " not found!")
			}
			filter = bson.M{"_id": document["_id"]}
			pushField := bson.M{}
			pullField := bson.M{}
			incField := bson.M{}

			upVoteLocation, err := findLocationWithFilter(collectionName, bson.M{"_id": document["_id"], "up_votes.user": vote.User})
			if err != nil {
				log.Print(err)
			}
			downVoteLocation, err := findLocationWithFilter(collectionName, bson.M{"_id": document["_id"], "down_votes.user": vote.User})
			if err != nil {
				log.Print(err)
			}

			if vote.Value == "up" {
				if upVoteLocation.Name != "" {
					// Remove entry from up_votes and decrement vote_count by 1 if user previously upvoted
					pullField = bson.M{"up_votes": bson.M{"user": vote.User}}
					incField = bson.M{"vote_count": -1}
					update = bson.M{"$pull": pullField, "$inc": incField}
					response = "Up vote removed successfully!"
				} else if downVoteLocation.Name != "" {
					// Add entry to up_votes and increment vote_count by 2 if user previously downvoted
					pushField = bson.M{"up_votes": vote}
					pullField = bson.M{"down_votes": bson.M{"user": vote.User}}
					incField = bson.M{"vote_count": 2}
					update = bson.M{"$push": pushField, "$pull": pullField, "$inc": incField}
					response = "Up vote added and down vote removed successfully!"
				} else {
					// Add entry to up_votes and increment vote_count by 1 if user clicks up vote
					pushField = bson.M{"up_votes": vote}
					incField = bson.M{"vote_count": 1}
					update = bson.M{"$push": pushField, "$inc": incField}
					response = "Up vote added successfully!"
				}
			} else if vote.Value == "down" {
				if downVoteLocation.Name != "" {
					// Remove entry from down_votes and increment vote_count by 1 if user previously downvoted
					pullField = bson.M{"down_votes": bson.M{"user": vote.User}}
					incField = bson.M{"vote_count": 1}
					update = bson.M{"$pull": pullField, "$inc": incField}
					response = "Down vote removed successfully!"
				} else if upVoteLocation.Name != "" {
					// Add entry to down_votes and decrement vote_count by 2 if user previously upvoted
					pushField = bson.M{"down_votes": vote}
					pullField = bson.M{"up_votes": bson.M{"user": vote.User}}
					incField = bson.M{"vote_count": -2}
					update = bson.M{"$push": pushField, "$pull": pullField, "$inc": incField}
					response = "Down vote added and up vote removed successfully!"
				} else {
					// Add entry to down_votes and decrement vote_count by 1 if user clicks down vote
					pushField = bson.M{"down_votes": vote}
					incField = bson.M{"vote_count": -1}
					update = bson.M{"$push": pushField, "$inc": incField}
					response = "Down vote added successfully!"
				}
			} else if vote.Value == "remove" {
				if vote.Location != "" && vote.User == document["user"] {
					if len(document["up_votes"].(primitive.A)) > 0 {
						message := "You cannot remove a location until all upvotes are removed as well!"
						return nil, "", errors.New(message)
					}
					res, err := deleteDocumentByName("location", vote.Location)
					if res.DeletedCount == 1 {
						response = "Successfully removed " + vote.Location + "!"
						return res, response, err
					}
					return nil, "", errors.New(vote.Location + " not found!")
				}
				message := "You did not add this location so you cannot remove it!"
				return nil, "", errors.New(message)
			} else {
				message := "You have chosen an invalid operation: '" + vote.Value + "'"
				return nil, "", errors.New(message)
			}
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := mongoClient.Database(database).Collection(collectionName)
	res, err := collection.UpdateOne(ctx, filter, update)
	return res, response, err
}

func insertDocumentInDatabase(data interface{}, collectionName string) (*mongo.InsertOneResult, error) {
	if collectionName == "location" {
		location, ok := data.(*Location)
		if ok {
			if location.Name == "" {
				err := "Location name cannot be empty!"
				return nil, errors.New(err)
			}
			document := searchDocumentsForName(collectionName, location.Name)
			if document != nil {
				return nil, errors.New(location.Name + " has already been added!")
			}
		}
	}
	if collectionName == "chat" {
		chatMessage, ok := data.(*ChatMessage)
		if ok && chatMessage.Message == "" {
			err := "Message can not be empty!"
			return nil, errors.New(err)
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := mongoClient.Database(database).Collection(collectionName)
	res, err := collection.InsertOne(ctx, data)
	return res, err
}

func searchDocumentsForName(collectionName string, name string) bson.M {
	cur := findDocuments(collectionName)

	defer cur.Close(ctx)
	for cur.Next(ctx) {
		var result bson.M
		err1 := cur.Decode(&result)
		if err1 != nil {
			log.Print(err1)
		}
		if result["name"] == name {
			return result
		}
	}
	return nil
}

func deleteDocumentByName(collectionName string, name string) (*mongo.DeleteResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{
		"name": name,
		"date": bson.M{
			"$gt": time.Now().Add(-12 * time.Hour),
			"$lt": time.Now().Add(12 * time.Hour),
		},
	}
	collection := mongoClient.Database(database).Collection(collectionName)
	res, err := collection.DeleteOne(ctx, filter)
	return res, err
}

// WebsocketMessage contains a general message format from client
type WebsocketMessage struct {
	Type   string                 `json:"type"`
	Active bool                   `json:"active"`
	Body   map[string]interface{} `json:"-"`
}

// ChatMessage is used to identify a chat message
type ChatMessage struct {
	ID      primitive.ObjectID `bson:"_id, omitempty"`
	Date    time.Time          `json:"date"`
	User    primitive.ObjectID `json:"user"`
	Message string             `json:"message"`
}

// Vote is used to hold a vote object for locations
type Vote struct {
	Date     time.Time          `json:"date"`
	User     primitive.ObjectID `json:"user"`
	Username string             `json:"username" bson:"-"`
	Value    string             `json:"value" bson:"-"`
	Location string             `json:"location" bson:"-"`
}

// Location is used to identify the values of a location
type Location struct {
	ID               primitive.ObjectID `bson:"_id, omitempty"`
	Date             time.Time          `json:"date"`
	User             primitive.ObjectID `json:"user"`
	Name             string             `json:"name"`
	Rating           string             `json:"rating"`
	Website          string             `json:"website"`
	URL              string             `json:"url"`
	Photo            string             `json:"photo"`
	PlaceID          string             `json:"place_id" bson:"place_id"`
	UserRatingsTotal string             `json:"user_ratings_total" bson:"user_ratings_total"`
	PriceLevel       string             `json:"price_level" bson:"price_level"`
	FormattedAddress string             `json:"formatted_address" bson:"formatted_address"`
	UpVotes          []Vote             `json:"up_votes" bson:"up_votes"`
	DownVotes        []Vote             `json:"down_votes" bson:"down_votes"`
	VoteCount        int                `json:"vote_count" bson:"vote_count"`
}
