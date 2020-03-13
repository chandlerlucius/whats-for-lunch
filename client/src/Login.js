import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import './App.css';

class Login extends React.Component {
  componentDidMount() {
    const form = document.querySelector('.login-container form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      let action = form.action.replace('3000', '9000');

      const xhr = new XMLHttpRequest();
      xhr.open(form.method, action);
      xhr.onload = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            const json = JSON.parse(xhr.responseText);
            localStorage.setItem("token", json.token)
            ReactDOM.render(<App />, document.querySelector('#root'));
          }
        }
      }
      xhr.send(new FormData(form));
    });
  }

  render() {
    return (
      <div className="login-container container">
        <h1>What's For Lunch?</h1>
        <form method="POST" action="/login">
          <input name="username" type="text" required={true}></input>
          <input name="password" type="password" required={true}></input>
          <button>Login / Signup</button>
        </form>
      </div>
    )
  }
}

export default Login;