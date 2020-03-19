import React from 'react';
import ReactDOM from 'react-dom';
import Login from './Login';
import App from './App';
import * as serviceWorker from './serviceWorker';

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

document.addEventListener('DOMContentLoaded', function() {
  authenticate();
});

const authenticate = function () {
  const href = window.location.href.replace('3000', '9000');
  const token = localStorage.getItem('token');
  if(token === null) {
    ReactDOM.render(<Login message='Enter username and password to begin.' color='var(--secondary-color)'/>, document.querySelector('.root'));
  }

  const xhr = new XMLHttpRequest();
  xhr.timeout = 500;
  xhr.open('POST', href + 'authenticate?token=' + token);
  xhr.onload = function () {
    if (xhr.readyState === 4) {
      const json = JSON.parse(xhr.responseText);
      if (xhr.status === 200) {
        ReactDOM.render(<App timeout={json.timeout}/>, document.querySelector('.root'));
      } else {
        ReactDOM.render(<Login message={json.body} color='var(--failure-color)'/>, document.querySelector('.root'));
      }
    }
  }
  xhr.onerror = function () {
    ReactDOM.render(<Login message="Error connecting to server. Try again later." color='var(--failure-color)'/>, document.querySelector('.root'));
  }
  xhr.ontimeout = function () {
    ReactDOM.render(<Login message="Error connecting to server. Try again later." color='var(--failure-color)'/>, document.querySelector('.root'));
  }
  xhr.send();
}
