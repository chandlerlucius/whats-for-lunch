import React from 'react';
import RestaurantDetails from './RestaurantDetails'
import { convertFormSubmitToJsonSubmit } from './App'

class Details extends React.Component {
  componentDidMount() {
    convertFormSubmitToJsonSubmit(document.querySelector('.location-form'));
  }

  render() {
    return [
      <img key="detail-photo" className="photo" alt="Restaurant" src={this.props.place.photos[0].getUrl()} />,
      <h2 key="detail-name">{this.props.place.name}</h2>,
      <RestaurantDetails place={this.props.place} />,
      <div key="detail-address" className="detail-item">
        <img className="detail-icon" alt="Address" src="//www.gstatic.com/images/icons/material/system_gm/2x/place_gm_blue_24dp.png" />
        <a className="address" target="_blank" rel="noopener noreferrer" href={this.props.place.url}>{this.props.place.formatted_address}</a>
      </div>,
      <form key="detail-form" className="location-form" action="location">
        <input type="hidden" name="name" value={this.props.place.name}></input>
        <input type="hidden" name="rating" value={this.props.place.rating}></input>
        <input type="hidden" name="user_ratings_total" value={this.props.place.user_ratings_total}></input>
        <input type="hidden" name="price_level" value={this.props.place.price_level}></input>
        <input type="hidden" name="website" value={this.props.place.website}></input>
        <button className="detail-button">Add to Lunch Suggestions!</button>
      </form>
    ]
  }
}

export default Details;