import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import Map from './Map';
import Suggestions from './Suggestions';
import './index.css';
import * as serviceWorker from './serviceWorker';

let url;
let socket;
let socketTimeout;

ReactDOM.render(<App />, document.querySelector('#root'));

ReactDOM.render(<Map />, document.querySelector('.map-container'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

if (window) {
  window.addEventListener('DOMContentLoaded', function () {
      let host = window.location.host;
      host = host.replace('3000', '9000');
      if (window.location.protocol === 'https:') {
          url = `wss://${host}/locations`;
      } else {
        url = `ws://${host}/locations`;
      }
      start();
  });
}

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
    socket = new WebSocket(url);
    socket.onopen = function () {
      clearSocketTimeout();
    };

    socket.onclose = function () {
      setSocketTimeout();
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

const convertFormSubmission = function (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const object = {};
    const formData = new FormData(form);
    formData.forEach(function(value, key){
        object[key] = value;
    });
    const json = JSON.stringify(object);
    socket.send(json);
  });
};

export default convertFormSubmission;
  