import React from 'react'

class Search extends React.Component {
  render() {
    return [
      <input key="restaurant-seach" id="restaurant-search" placeholder="Search for restaurant by name" type="text" />,
      <input key="food-search" id="food-search" placeholder="Search for restaurant by food type" type="search" />,
      <button key="food-search-button" id="food-search-button">Search</button>
    ]
  }
}

export default Search;