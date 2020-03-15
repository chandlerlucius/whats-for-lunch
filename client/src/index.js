import React from 'react';
import ReactDOM from 'react-dom';
import Login from './Login';
import App from './App';
import * as serviceWorker from './serviceWorker';

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

document.addEventListener('DOMContentLoaded', function (event) {
  const href = window.location.href.replace('3000', '9000');
  const token = localStorage.getItem('token');
  if(token === null) {
    ReactDOM.render(<Login message='Enter username and password to begin.'/>, document.querySelector('.root'));
  }

  const xhr = new XMLHttpRequest();
  xhr.timeout = 500;
  xhr.open('POST', href + 'authenticate?token=' + token);
  xhr.onload = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        ReactDOM.render(<App />, document.querySelector('.root'));
      } else {
        const json = JSON.parse(xhr.responseText);
        ReactDOM.render(<Login message={json.body}/>, document.querySelector('.root'));
      }
    }
  }
  xhr.onerror = function () {
    ReactDOM.render(<Login message="Error connecting to server. Try again later."/>, document.querySelector('.root'));
  }
  xhr.ontimeout = function () {
    ReactDOM.render(<Login message="Error connecting to server. Try again later."/>, document.querySelector('.root'));
  }
  xhr.send();
});
