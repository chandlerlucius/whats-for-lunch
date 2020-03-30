import React from 'react'

class Search extends React.Component {
  render() {
    return [
      <div key="manual-location" className="search-form">
        <div>
          <input className="location-add" placeholder="Add restaurant manually" type="search" />
        </div>
        <div>
          <button className="location-add-button">Add</button>
        </div>
      </div>,
      <div key="google-location" className="search-form">
        <div>
          <input className="location-search" placeholder="Search for restaurant or food type" type="search" />
        </div>
        <div>
          <button className="location-search-button">Search</button>
        </div>
      </div>,
    ]
  }
}

export default Search;