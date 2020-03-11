import React from 'react';
import './App.css';

function App() {
  return (
    <div className="container">
      <h1>What's For Lunch?</h1>
      <div className="suggestions-container"></div>
      <div className="search-container"></div>
      <div className="map-container"></div>
      <div className="details-container">
        <span className="toggle">☰</span>
      </div>
    </div>
  );
}

export default App;
