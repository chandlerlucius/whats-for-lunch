import React from 'react';
import RestaurantDetails from './RestaurantDetails'
import { convertFormSubmissionToJSON } from './App'

class Details extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isToggleOn: true };
    this.toggle = this.toggle.bind(this);
  }

  componentDidMount() {
    document.querySelector('.details-container').style.width = '25%';
    convertFormSubmissionToJSON(document.querySelector('.details-container form'));
  }

  toggle() {
    const root = document.querySelector('.details-container');
    this.setState(state => ({
      isToggleOn: !state.isToggleOn
    }));
    if (this.state.isToggleOn) {
      root.style.width = '25%';
    } else {
      root.style.width = '35px';
    }
  }

  render() {
    return [
      <span key="toggle" className="toggle" onClick={this.toggle}>☰</span>,
      <div key="details-container" className="details">
        <img className="photo" alt="Restaurant" src={this.props.place.photos[0].getUrl()} />
        <h1>{this.props.place.name}</h1>
        <RestaurantDetails place={this.props.place} />
        <div className="detail-item">
          <img className="detail-icon" alt="Address" src="//www.gstatic.com/images/icons/material/system_gm/2x/place_gm_blue_24dp.png" />
          <a className="address" target="_blank" rel="noopener noreferrer" href={this.props.place.url}>{this.props.place.formatted_address}</a>
        </div>
        <form method="POST" action="/locations/add">
          <input type="hidden" name="name" value={this.props.place.name}></input>
          <input type="hidden" name="rating" value={this.props.place.rating}></input>
          <input type="hidden" name="user_ratings_total" value={this.props.place.user_ratings_total}></input>
          <input type="hidden" name="price_level" value={this.props.place.price_level}></input>
          <input type="hidden" name="website" value={this.props.place.website}></input>
          <input type="hidden" name="votes" value="1"></input>
          <button className="detail-button">Add to Lunch Suggestions!</button>
        </form>
      </div>
    ]
  }
}

export default Details;