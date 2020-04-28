package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
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
var clientOfflineUserIDs = sync.Map{}

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
	clientOfflineUserIDs.Delete(claims.User.ID.Hex())
	clientUserIDs.Store(claims.User.ID.Hex(), time.Now())

	writeDocumentsToClient(c, "location", claims)
	writeDocumentsToClient(c, "chat", claims)
	writeDocumentsToClient(c, "user", claims)
	if claims.User.Role == "admin" {
		writeDocumentsToClient(c, "settings", claims)
	}
	handleConnection(c, claims.User.ID.Hex())
}

func handleConnection(c *websocket.Conn, userID string) {
	defer func() {
		time, _ := clientUserIDs.Load(userID)
		clientOfflineUserIDs.Store(userID, time)
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
			var users []bson.M
			clientOfflineUserIDs.Range(func(key interface{}, value interface{}) bool {
				date := value.(time.Time)
				var status = "offline"
				var user = bson.M{"id": key, "last_seen": date, "status": status}
				users = append(users, user)
				return true
			})
			clientUserIDs.Range(func(key interface{}, value interface{}) bool {
				date := value.(time.Time)
				var status string
				if date.Before(time.Now().Add(-5 * time.Minute)) {
					status = "away"
				} else {
					status = "active"
				}
				var user = bson.M{"id": key, "last_seen": date, "status": status}
				users = append(users, user)
				return true
			})
			if websocketMessage.Active {
				clientTokens[c] = token
				clientOfflineUserIDs.Delete(claims.User.ID.Hex())
				clientUserIDs.Store(claims.User.ID.Hex(), time.Now())
			}

			now := time.Now().UTC()
			voting, now := getVotingSettings(now)

			var message string
			var progress int
			var winner interface{}
			var err error
			if now.Before(voting.StartTime) {
				duration := time.Until(voting.StartTime)
				message = "Voting begins in " + fmtDuration(duration) + " (" + voting.StartTimeString + ")"
				progress = 0
			} else if now.Before(voting.EndTime) {
				duration := time.Until(voting.EndTime)
				message = "Voting ends in " + fmtDuration(duration) + " (" + voting.EndTimeString + ")"
				progress = 1
			} else {
				voting.StartTime = voting.StartTime.AddDate(0, 0, 1)
				duration := voting.StartTime.Sub(now)
				message = "Voting begins in " + fmtDuration(duration) + " (" + voting.StartTimeString + ")"
				progress = 0
			}
			if now.After(voting.EndTime) && now.Before(voting.EndTime.Add(2*time.Hour)) {
				winner, err = findOneDocument("location")
			}

			var results bson.M
			if err != nil {
				results = bson.M{"users": users, "message": message, "progress": progress}
			} else {
				results = bson.M{"users": users, "message": message, "progress": progress, "winner": winner}
			}

			var body bson.M = bson.M{"type": "background", "token": clientTokens[c], "timeout": (claims.ExpiresAt-time.Now().Unix())*1000 + 2000, "body": results}
			err3 := c.WriteJSON(body)
			if err3 != nil {
				log.Print(err3)
			}
		} else {
			log.Print("Message received from websocket. User: " + claims.User.Username + " | Message: " + websocketMessage.Type)
			clientTokens[c] = token
			clientOfflineUserIDs.Delete(claims.User.ID.Hex())
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
		} else if websocketMessage.Type == "user" {
			user := &User{}
			if claims.User.Role == "admin" {
				updateDocument(c, bytes, user, "user")
			} else {
				message := Message{}
				message.Status = http.StatusUnauthorized
				message.Title = "user"
				message.Body = "You must be an admin to change user settings!"
				c.WriteJSON(message)
			}
		} else if websocketMessage.Type == "settings" {
			if claims.User.Role == "admin" {
				settings := &Voting{}
				settings.Name = "voting"
				updateDocument(c, bytes, settings, "settings")
			} else {
				message := Message{}
				message.Status = http.StatusUnauthorized
				message.Title = "user"
				message.Body = "You must be an admin to change voting settings!"
				c.WriteJSON(message)
			}
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
			} else if websocketMessage.Type == "user" {
				writeDocumentsToClient(client, "user", claims)
			} else if websocketMessage.Type == "settings" {
				writeDocumentsToClient(client, "location", claims)
				if claims.User.Role == "admin" {
					writeDocumentsToClient(client, "settings", claims)
				}
			}
		}
	}
}

func getVotingSettings(now time.Time) (Voting, time.Time) {
	voting := Voting{}
	settings := searchDocumentsForName("settings", "voting")
	bsonBytes, _ := bson.Marshal(settings)
	bson.Unmarshal(bsonBytes, &voting)

	locale := time.FixedZone("UTC", voting.TimezoneOffset*60*60)
	voting.StartTime = voting.StartTime.In(locale)
	voting.EndTime = voting.EndTime.In(locale)
	now = now.In(locale)

	voting.StartTime = time.Date(now.Year(), now.Month(), now.Day(), voting.StartTime.Hour(), voting.StartTime.Minute(), 0, 0, locale)
	voting.EndTime = time.Date(now.Year(), now.Month(), now.Day(), voting.EndTime.Hour(), voting.EndTime.Minute(), 0, 0, locale)
	log.Print(now.String() + " - " + voting.StartTime.String() + " - " + voting.EndTime.String())
	return voting, now
}

func fmtDuration(d time.Duration) string {
	h := d / time.Hour
	d -= h * time.Hour
	m := d / time.Minute
	d -= m * time.Minute
	s := d / time.Second
	return fmt.Sprintf("%02dh %02dm %02ds", h, m, s)
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
		delete(result, "password")
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
		now := time.Now().UTC()
		voting, now := getVotingSettings(now)

		start := voting.StartTime
		end := voting.EndTime
		if now.After(voting.EndTime) {
			start = now
			end = now
		}
		filter = bson.M{
			"date": bson.M{
				"$gt": start,
				"$lt": end,
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

func findOneDocument(collectionName string) (Location, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	findOptions := options.FindOne()
	filter := bson.M{}
	if collectionName == "location" {
		now := time.Now().UTC()
		voting, now := getVotingSettings(now)
		filter = bson.M{
			"date": bson.M{
				"$gt": voting.StartTime,
				"$lt": voting.EndTime,
			},
		}
		findOptions.SetSort(bson.M{"vote_count": -1})
	}

	var location Location
	collection := mongoClient.Database(database).Collection(collectionName)
	err := collection.FindOne(ctx, filter, findOptions).Decode(&location)
	if err != nil {
		log.Print(err)
		return location, err
	}
	return location, nil
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
	if collectionName == "settings" {
		voting, ok := data.(*Voting)
		startTime, _ := regexp.MatchString(`^[0-2][0-9]:[0-5][0-9]$`, voting.StartTimeString)
		endTime, _ := regexp.MatchString(`^[0-2][0-9]:[0-5][0-9]$`, voting.EndTimeString)

		if ok && startTime && endTime {
			location := time.FixedZone("UTC", voting.TimezoneOffset*60*60)
			startTimeHours, _ := strconv.Atoi(strings.Split(voting.StartTimeString, ":")[0])
			startTimeMinutes, _ := strconv.Atoi(strings.Split(voting.StartTimeString, ":")[1])
			endTimeHours, _ := strconv.Atoi(strings.Split(voting.EndTimeString, ":")[0])
			endTimeMinutes, _ := strconv.Atoi(strings.Split(voting.EndTimeString, ":")[1])

			now := time.Now().In(location)
			voting.StartTime = time.Date(now.Year(), now.Month(), now.Day(), startTimeHours, startTimeMinutes, 0, 0, now.Location())
			voting.EndTime = time.Date(now.Year(), now.Month(), now.Day(), endTimeHours, endTimeMinutes, 0, 0, now.Location())
			filter = bson.M{"name": voting.Name}

			if voting.StartTime.After(voting.EndTime) {
				return nil, "", errors.New("Start time must be before end time")
			}

			document := searchDocumentsForName(collectionName, voting.Name)
			if document["start_time_string"] != voting.StartTimeString {
				document["start_time_string"] = voting.StartTimeString
				document["start_time"] = voting.StartTime
			}
			if document["end_time_string"] != voting.EndTimeString {
				document["end_time_string"] = voting.EndTimeString
				document["end_time"] = voting.EndTime
			}
			if document["timezone_offset"] != voting.TimezoneOffset {
				document["timezone_offset"] = voting.TimezoneOffset
				document["start_time"] = voting.StartTime
				document["end_time"] = voting.EndTime
			}
			update = bson.M{"$set": document}
			response = "Settings for " + voting.Name + " updated successfully!"
		} else {
			return nil, "", errors.New("Start and end times must be filled in and valid")
		}
	} else if collectionName == "user" {
		user, ok := data.(*User)
		if ok {
			document := searchDocumentsForName(collectionName, user.Username)
			if document == nil {
				return nil, "", errors.New(user.Username + " not found!")
			}
			if (user.Remove || user.LastLogin == (time.Time{})) && document["role"] == "admin" {
				return nil, "", errors.New("Admin role " + user.Username + " cannot by modified!")
			}

			if user.Remove {
				res, err := deleteDocumentByName("user", user.Username)
				if res.DeletedCount == 1 {
					response = "Successfully removed " + user.Username + "!"
					return res, response, err
				}
				return nil, "", errors.New(user.Username + " not found!")
			}

			filter = bson.M{"_id": document["_id"]}
			if user.LastLogin == (time.Time{}) {
				update = bson.M{"$set": bson.M{"enabled": user.Enabled}}
			} else {
				update = bson.M{"$set": bson.M{"last_seen": user.LastLogin}}
			}
			response = "User " + user.Username + " updated successfully!"
		}
	} else if collectionName == "location" {
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

			now := time.Now().UTC()
			voting, now := getVotingSettings(now)

			if vote.Value == "up" {
				if now.Before(voting.StartTime) {
					return nil, "", errors.New("Voting has not yet begun")
				}
				if now.After(voting.EndTime) {
					return nil, "", errors.New("Voting has already ended")
				}
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
				if time.Now().Before(voting.StartTime) {
					return nil, "", errors.New("Voting has not begun yet")
				}
				if time.Now().After(voting.EndTime) {
					return nil, "", errors.New("Voting has already ended")
				}
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
		now := time.Now().UTC()
		voting, now := getVotingSettings(now)

		if now.Before(voting.StartTime) || now.After(voting.EndTime) {
			err := "Voting has not yet begun!"
			return nil, errors.New(err)
		}

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
		if result["name"] == name || result["username"] == name {
			return result
		}
	}
	return nil
}

func deleteDocumentByName(collectionName string, name string) (*mongo.DeleteResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var filter bson.M
	if collectionName == "location" {
		filter = bson.M{
			"name": name,
			"date": bson.M{
				"$gt": time.Now().Add(-12 * time.Hour),
				"$lt": time.Now().Add(12 * time.Hour),
			},
		}
	} else if collectionName == "user" {
		filter = bson.M{
			"username": name,
		}
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
	Lat              float64            `json:"lat"`
	Lng              float64            `json:"lng"`
	Rating           float64            `json:"rating"`
	Website          string             `json:"website"`
	URL              string             `json:"url"`
	Photo            string             `json:"photo"`
	PlaceID          string             `json:"place_id" bson:"place_id"`
	UserRatingsTotal int                `json:"user_ratings_total" bson:"user_ratings_total"`
	PriceLevel       int                `json:"price_level" bson:"price_level"`
	FormattedAddress string             `json:"formatted_address" bson:"formatted_address"`
	UpVotes          []Vote             `json:"up_votes" bson:"up_votes"`
	DownVotes        []Vote             `json:"down_votes" bson:"down_votes"`
	VoteCount        int                `json:"vote_count" bson:"vote_count"`
}
