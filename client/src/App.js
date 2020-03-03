import React from 'react';
import './App.css';

function App() {
  return (
    <form method="POST" action="/location/add" className="container">
      <h1>What's For Lunch?</h1>
      <label htmlFor="name">Location</label>
      <input name="name" id="name" type="text"></input>
      <br/>
      <button>Add</button>
    </form>
  );
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('form').forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      let action = form.action;
      if(action.indexOf('localhost') !== -1) {
        action = action.replace('3000', '8080');
      }
      const xhr = new XMLHttpRequest();
      xhr.open(form.method, action);
      xhr.onload = function() {
        if(xhr.readyState === 4) {
          if(xhr.status === 200) {
            console.log("Added!");
          } else {
            const json = JSON.parse(xhr.responseText);
            alert(json.body);
          }
        }
      };
      xhr.onerror = function() {
        if(xhr.readyState === 4) {
          if(xhr.status === 200) {
            console.log("Failed!");
          } else {
            console.log("Failed!");
          }
        }
      };
      xhr.send(new FormData(form));
    });
  });
});

export default App;
