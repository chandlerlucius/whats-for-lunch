import React from 'react'

class Search extends React.Component {
  render() {
    return [
      <input id="restaurant-search" placeholder="Search for restaurant by name" type="text" />,
      <input id="food-search" placeholder="Search for restaurant by food type" type="search" />,
      <button id="food-search-button">Search</button>
    ]
  }
}

export default Search;