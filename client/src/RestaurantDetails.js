import React from 'react'

class RestaurantDetails extends React.Component {
  render() {
    //Create stars from rating
    const rating = this.props.place.rating;
    let stars = [];
    for (let i = 0; i < 5; i++) {
      if (rating > i + 1) {
        stars[i] = <img alt="Star" className="star-icon" src="https://maps.gstatic.com/consumer/images/icons/2x/ic_star_rate_14.png" />;
      } else if (rating > i + 0.25) {
        stars[i] = <img alt="Star" className="star-icon" src="https://maps.gstatic.com/consumer/images/icons/2x/ic_star_rate_half_14.png" />;
      } else {
        stars[i] = <img alt="Star" className="star-icon" src="https://maps.gstatic.com/consumer/images/icons/2x/ic_star_rate_empty_14.png" />;
      }
    }

    //Create dollar signs from price
    const priceLevel = this.props.place.price_level;
    let price = '';
    for (let i = 0; i < priceLevel; i++) {
      price += '$';
    }

    //Create url from website
    let url = this.props.place.website;
    if (url && url.match(/http[s]?:\/\/(.+?)\//)[1]) {
      url = url.match(/http[s]?:\/\/(.+?)\//)[1].replace('www.', '');
    }

    return [
      <div key="ratings-container" className="detail-item">
        {this.props.place.rating}
        {stars[0]}{stars[1]}{stars[2]}{stars[3]}{stars[4]}
        ({this.props.place.user_ratings_total})
          • {price}
      </div>,
      <div key="website-container" className="detail-item">
        <img className="detail-icon" alt="Website" src="https://www.gstatic.com/images/icons/material/system_gm/2x/public_gm_blue_24dp.png" />
        <a className="website" target="_blank" rel="noopener noreferrer" href={this.props.place.website}>{url}</a>
      </div>,
    ]
  }
}

export default RestaurantDetails;