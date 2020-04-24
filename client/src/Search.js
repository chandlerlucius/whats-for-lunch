import React from 'react'
import { MdMyLocation } from 'react-icons/md'
import { submitFormWithEvent } from './App';
import { getLocationCenterAndClearMap } from './Map';

class Search extends React.Component {

  render() {
    return [
      <form key="location-form" method="POST" action="location" onSubmit={submitFormWithEvent} className="search-form flex">
        <div>
          <input className="location-add" placeholder="Add restaurant manually" type="search" name="name" />
        </div>
        <div>
          <button className="location-add-button" title="Add">Add</button>
        </div>
      </form>,
      <div key="google-location" className="search-form flex">
        <div>
          <input className="location-search" placeholder="Search for restaurant or food type" type="search" />
        </div>
        <div>
          <button className="location-search-button" title="Search">Search</button>
          <button className="location-search-button" title="Center and Clear Map" onClick={getLocationCenterAndClearMap}><MdMyLocation /></button>
        </div>
      </div>,
    ]
  }
}

export default Search;