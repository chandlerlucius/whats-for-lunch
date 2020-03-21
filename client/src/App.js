import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Map from './Map';
import Chat from './Chat';
import Toast from './Toast'
import Login from './Login'
import Search from './Search';
import Suggestions from './Suggestions';

let url;
let socket;
let host = window.location.host;
host = host.replace('3000', '9000');
if (window.location.protocol === 'https:') {
  url = `wss://${host}/ws`;
} else {
  url = `ws://${host}/ws`;
}

let socketTimeout;
let authenticateInterval;
class App extends React.Component {
  componentDidMount() {
    const authenticateWebsocket = function () {
      const map = { 'type': 'authenticate' };
      sendWebsocketMessage(map);
    }

    const resetAuthTimeout = function (timeout) {
      clearInterval(authenticateInterval);
      authenticateInterval = setInterval(authenticateWebsocket, timeout);
    }

    resetAuthTimeout(this.props.timeout);

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
            ReactDOM.render(<Login message={event.reason} color='var(--failure-color)' />, document.querySelector('.root'));
          } else {
            setSocketTimeout();
          }
        };

        socket.onerror = function () {
          socket.close();
        };

        socket.onmessage = function (event) {
          const json = JSON.parse(event.data);
          if (json.token) {
            localStorage.setItem("token", json.token)
          }
          if (json.timeout) {
            resetAuthTimeout(json.timeout);
          }
          if (json.type === 'success') {
            if (json.body === 'chat') {
              document.querySelector('.chat-textarea').value = '';
            }
          } else if (json.type === 'error') {
            ReactDOM.render(<Toast message={json.body} />, document.querySelector('.toast-container'));
            document.querySelector('.toast-container').style.marginBottom = '0';
          } else if (json.type === 'chat') {
            ReactDOM.render(<Chat messages={json.body} />, document.querySelector('.chat-container'));
          } else if (json.type === 'location') {
            ReactDOM.render(<Suggestions locations={json.body} />, document.querySelector('.suggestions-container'));
          }
        }
      } catch (error) {
        //Ignore error on purpose
      }
    };
    start();

    convertFormSubmitToJsonSubmit(document.querySelector('.chat-form'));
  }

  toggleLeftMenu(event) {
    const menu = document.querySelector('.left');
    if (menu.classList.contains('left-menu-open')) {
      event.target.innerHTML = '💬';
      menu.classList.remove('left-menu-open');
    } else {
      event.target.innerHTML = '🡠';
      menu.classList.add('left-menu-open');
    }
  }

  toggleRightMenu() {
    const menu = document.querySelector('.right');
    if (menu.classList.contains('right-menu-open')) {
      menu.classList.remove('right-menu-open');
    } else {
      menu.classList.add('right-menu-open');
    }
  }

  render() {
    return [
      <nav key="nav">
        <h2 className="toggle" onClick={this.toggleLeftMenu}>💬</h2>
        <h2>What's For Lunch?</h2>
        <h2 className="toggle" onClick={this.toggleRightMenu}>☰</h2>
      </nav>,
      <div key="left" className="left left-menu-open">
        {/* <h2 className="close toggle" onClick={this.toggleLeftMenu}>✕</h2> */}
        <div className="chat-container"></div>
        <form className="chat-form" action="chat">
          <textarea name="message" className="chat-textarea"></textarea>
          <button type="submit">Send</button>
        </form>
      </div>,
      <div key="center" className="center">
        <div className="suggestions-container"></div>
        <div className="search-container"></div>
        <div className="map-container"></div>
      </div>,
      <div key="right" className="right right-menu-open">
        <h2 className="close toggle" onClick={this.toggleRightMenu}>✕</h2>
        <div className="details-container"></div>
      </div>,
      <div key="toast" className="toast-container"></div>
    ]
  }
}

export const convertFormSubmitToJsonSubmit = function (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitFormAsJson(form);
  });
}

export const submitFormAsJson = function (form) {
  const map = {};
  const formData = new FormData(form);
  formData.forEach(function (value, key) {
    map[key] = value;
  });
  map['type'] = form.action.split('/').pop();
  sendWebsocketMessage(map);
}

export const sendWebsocketMessage = function (map) {
  try {
    const json = JSON.stringify(map);
    socket.send(json);
  } catch(error) {
    socket.close(4001, "Error connecting to server. Try again later.");
  }
}

export const clearTimeoutsAndIntervals = function () {
  clearTimeout(socketTimeout);
  clearInterval(authenticateInterval);
}

export const formatDate = function(date) {
  return new Date(date).toLocaleDateString() + " " + new Date(date).getHours() + ":" + ("0" + new Date(date).getMinutes()).slice(-2);
}

export default App;
