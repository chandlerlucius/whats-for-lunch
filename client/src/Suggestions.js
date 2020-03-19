import React from 'react'
import RestaurantDetails from './RestaurantDetails'
import { sendWebsocketMessage } from './App'

class Suggestions extends React.Component {

  handleVote(event) {
    const map = {};
    if (event.target.innerHTML === '▲') {
      map['vote'] = 'up';
    } else if (event.target.innerHTML === '▼') {
      map['vote'] = 'down';
    }
    map['type'] = 'votes';
    sendWebsocketMessage(map);
  }

  render() {
    return (
      <div>
        {this.props.locations && this.props.locations.map((location, index) =>
          <div key={index} className="votes-container">
            <div>
              <h3 onClick={this.handleVote}>▲</h3>
              <h3>{location.votes}</h3>
              <h3 onClick={this.handleVote}>▼</h3>
            </div>
            <div>
              <h3>{location.name}</h3>
              <RestaurantDetails place={location} />
            </div>
          </div>
        )}
      </div>
    )
  }
}

export default Suggestions;