import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

class Login extends React.Component {
  constructor(props) {
    super(props);
    localStorage.removeItem("token");
    this.state = { message: props.message }
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(event) {
    const react = this;
    event.preventDefault();
    const form = event.target;
    const method = form.method;
    const action = form.action.replace('3000', '9000');

    const xhr = new XMLHttpRequest();
    xhr.open(method, action);
    xhr.onload = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          const json = JSON.parse(xhr.responseText);
          localStorage.setItem("token", json.token)
          ReactDOM.render(<App />, document.querySelector('.root'));
        } else {
          const json = JSON.parse(xhr.responseText);
          document.querySelectorAll(".message").forEach(function (element) {
            react.setState({
              message : json.body
            });
          });
        }
      }
    }
    xhr.onerror = function () {
      react.setState({
        message : 'Error connecting to server. Try again later.'
      });
    }
    xhr.send(new FormData(form));
  }
  
  color() {
    if (this.state.message === 'Enter username and password to begin.') {
      return 'var(--secondary-color)';
    }
    return 'var(--failure-color)';
  }

  render() {
    return (
      <form method="POST" action="/login" className="login-form" onSubmit={this.handleSubmit}>
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
        <span className="message" style={{ color: this.color() }}>{this.state.message}</span>
        <hr />
        <button type="reset">Reset</button>
        <button type="submit">Login / Signup</button>
      </form>
    )
  }
}

export default Login;