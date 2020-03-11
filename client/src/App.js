import React from 'react';
import './App.css';

function App() {
  return (
    <div className="container">
      <h1>What's For Lunch?</h1>
      <div className="suggestions-container"></div>
      <div>
        <input id="restaurant-search" placeholder="Search for restaurant by name" type="text" />
        <input id="food-search" placeholder="Search for restaurant by food type" type="search" />
        <button id="food-search-button">Search</button>
      </div>

      <div className="map-container"></div>
      <div className="details-container">
        <span className="toggle">☰</span>
      </div>
    </div>
  );
}

export default App;
