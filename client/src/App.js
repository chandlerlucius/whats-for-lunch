import React from 'react';
import ReactDOM from 'react-dom'
import Map from './Map'
import Login from './Login'
import Search from './Search'
import Suggestions from './Suggestions'
import './index.css';

let url;
let socket;
let socketTimeout;
class App extends React.Component {
  componentDidMount() {
    ReactDOM.render(<Search />, document.querySelector('.search-container'));

    ReactDOM.render(<Map />, document.querySelector('.map-container'));

    const clearSocketTimeout = function () {
      if (socketTimeout) {
        clearTimeout(socketTimeout);
      }
    }

    const setSocketTimeout = function () {
      console.log('Socket closed. Attempting reconnect in 5 seconds.');
      socketTimeout = setTimeout(function () {
        start();
      }, 5000);
    }

    const start = function () {
      try {
        const token = localStorage.getItem('token');
        socket = new WebSocket(url + '?token=' + token);
        socket.onopen = function () {
          clearSocketTimeout();
        };

        socket.onclose = function (event) {
          if (event.code === 4001) {
            ReactDOM.render(<Login />, document.querySelector('#root'));
          } else {
            setSocketTimeout();
          }
        };

        socket.onerror = function () {
          socket.close();
        };

        socket.onmessage = function (event) {
          const locations = JSON.parse(event.data);
          ReactDOM.render(<Suggestions locations={locations} />, document.querySelector('.suggestions-container'));
        }
      } catch (error) {
        //Ignore error on purpose
      }
    };

    let host = window.location.host;
    host = host.replace('3000', '9000');
    if (window.location.protocol === 'https:') {
      url = `wss://${host}/locations`;
    } else {
      url = `ws://${host}/locations`;
    }
    start();
  }

  render() {
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
    )
  }
}

export const convertFormSubmissionToJSON = function (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const object = {};
    const formData = new FormData(form);
    formData.forEach(function (value, key) {
      object[key] = value;
    });
    const json = JSON.stringify(object);
    socket.send(json);
  });
};

export default App;
