import React from 'react'
import RestaurantDetails from './RestaurantDetails'

class Suggestions extends React.Component {
  render() {
    return (
      <div>
        {this.props.locations && this.props.locations.map((location, index) =>
          <div key={index} className="flex">
            <div className="votes-container">
              <h3>▲</h3>
              <h3>{location.votes}</h3>
              <h3>▼</h3>
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