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
  let href = window.location.href;
  href = href.replace('3000', '9000');

  const token = localStorage.getItem('token');
  const xhr = new XMLHttpRequest();
  xhr.open('POST', href + 'authenticate?token=' + token);
  xhr.onload = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        ReactDOM.render(<App />, document.querySelector('#root'));
      } else {
        ReactDOM.render(<Login />, document.querySelector('#root'));
      }
    }
  }
  xhr.onerror = function () {
    ReactDOM.render(<Login />, document.querySelector('#root'));
  }
  xhr.send();
});
