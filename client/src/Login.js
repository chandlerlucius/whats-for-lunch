import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { clearTimeoutsAndIntervals } from './App.js'

class Login extends React.Component {
  constructor(props) {
    super(props);
    localStorage.removeItem("token");
    this.state = { message: props.message, color: props.color }
    this.onSubmit = this.onSubmit.bind(this);
    this.onReset = this.onReset.bind(this);
    clearTimeoutsAndIntervals();
  }

  componentDidUpdate() {
    clearTimeoutsAndIntervals();
  }

  onSubmit(event) {
    const react = this;
    const form = event.target;
    const method = form.method;
    const action = form.action.replace('3000', '9000');
    event.preventDefault();
    const messageTimeout1 = setTimeout(function() {
      react.setState({
        message: '●',
        color: ''
      });
    }, 0);
    const messageTimeout2 = setTimeout(function() {
      react.setState({
        message: '●●',
        color: ''
      });
    }, 500);
    const messageTimeout3 = setTimeout(function() {
      react.setState({
        message: '●●●',
        color: ''
      });
    }, 1000);
    const messageTimeout4 = setTimeout(function() {
      react.setState({
        message: '●●●●',
        color: ''
      });
    }, 1500);
    const messageTimeout5 = setTimeout(function() {
      react.setState({
        message: '●●●●●',
        color: ''
      });
    }, 2000);

    const xhr = new XMLHttpRequest();
    xhr.open(method, action);
    xhr.onload = function () {
      if (xhr.readyState === 4) {
        clearTimeout(messageTimeout1);
        clearTimeout(messageTimeout2);
        clearTimeout(messageTimeout3);
        clearTimeout(messageTimeout4);
        clearTimeout(messageTimeout5);
        if (xhr.status === 200) {
          const json = JSON.parse(xhr.responseText);
          localStorage.setItem("token", json.token);
          ReactDOM.render(<App timeout={json.timeout} />, document.querySelector('.root'));
        } else {
          const json = JSON.parse(xhr.responseText);
          react.setState({
            message: json.body,
            color: 'var(--failure-color)'
          });
        }
      }
    }
    xhr.onerror = function () {
      clearTimeout(messageTimeout1);
      clearTimeout(messageTimeout2);
      clearTimeout(messageTimeout3);
      clearTimeout(messageTimeout4);
      clearTimeout(messageTimeout5);
      react.setState({
        message: 'Error connecting to server. Try again later.',
        color: 'var(--failure-color)'
      });
    }
    xhr.send(new FormData(form));
  }

  onReset() {
    this.setState({
      message: 'Enter username and password to begin.',
      color: 'var(--secondary-color)'
    });
  }

  render() {
    return (
      <form method="POST" action="/login" className="login-form" onSubmit={this.onSubmit} onReset={this.onReset}>
        <h1>What's For Lunch?</h1>
        <div className="input-container">
          <input name="username" type="text" placeholder=" " required={true} minLength="3" autoFocus={true}></input>
          <label htmlFor="username">Username</label>
          <span>Must have 3 or more characters</span>
        </div>
        <div className="input-container">
          <input name="password" type="password" placeholder=" " required={true} minLength="3"></input>
          <label htmlFor="password">Password</label>
          <span>Must have 3 or more characters</span>
        </div>
        <span className="login-message" style={{ color: this.state.color }}>{this.state.message}</span>
        <hr />
        <button type="reset">Reset</button>
        <button type="submit">Login / Signup</button>
      </form>
    )
  }
}

export default Login;