import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Map from './Map';
import Chat from './Chat';
import Toast from './Toast'
import Login from './Login'
import Search from './Search';
import Details from './Details'
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
let logoutTimeout;
let backgroundTimeout;
class App extends React.Component {
  componentDidMount() {
    ReactDOM.render(<Search />, document.querySelector('.search-container'));
    ReactDOM.render(<Map />, document.querySelector('.map-container'));

    const setSocketTimeout = function () {
      console.log('Socket closed. Attempting reconnect in 5 seconds.');
      socketTimeout = setTimeout(function () {
        start();
      }, 5000);
    }

    const start = function () {
      const token = localStorage.getItem('token');
      socket = new WebSocket(url + '?token=' + token);
      socket.onopen = function () {
        clearTimeoutsAndIntervals();
        backgroundWebsocket();
      };

      socket.onclose = function (event) {
        if (event.code === 4001) {
          ReactDOM.render(<Login message={event.reason} color="var(--failure-color)" />, document.querySelector('.root'));
        } else {
          setSocketTimeout();
        }
      };

      socket.onerror = function () {
        const message = "Socket closed. Attempting reconnect in 5 seconds.";
        renderToast(message, "var(--failure-color)")
        setTimeout(function () { renderToast(message + ".", "var(--failure-color)") }, 1000)
        setTimeout(function () { renderToast(message + "..", "var(--failure-color)") }, 2000)
        setTimeout(function () { renderToast(message + "...", "var(--failure-color)") }, 3000)
        setTimeout(function () { renderToast(message + "....", "var(--failure-color)") }, 4000)
        setTimeout(function () { renderToast(message + ".....", "var(--failure-color)") }, 5000)
        socket.close();
      };

      socket.onmessage = function (event) {
        const json = JSON.parse(event.data);
        if (json.token) {
          localStorage.setItem("token", json.token)
        }
        if (json.timeout) {
          resetLogoutTimeout(json.timeout);
        }
        if (json.status === 200) {
          if (json.title === 'chat') {
            document.querySelector('.chat-textarea').value = '';
          }
          if (json.title === 'location') {
            document.querySelector('.location-add').value = '';
          }
          renderToast(json.body, "var(--success-color)")
        } else if (json.status !== undefined) {
          renderToast(json.body, "var(--failure-color)")
        } else if (json.type === 'chat') {
          ReactDOM.render(<Chat messages={json.body} />, document.querySelector('.chat-container'));
        } else if (json.type === 'location') {
          ReactDOM.render(<Suggestions locations={json.body} />, document.querySelector('.suggestions-container'));
          if(!document.querySelector('.details-div')) {
            ReactDOM.render(<Details/>, document.querySelector('.details-container'));
          }
        } else if (json.type === 'background') {
          document.querySelectorAll('.chat-status').forEach(function (element) {
            element.style.color = 'var(--user-color-offline)';
            element.title = 'offline';
          });
          if(json.body) {
            json.body.forEach(function (user) {
              document.querySelectorAll('.user-status-' + user.id).forEach(function (element) {
                element.style.color = 'var(--user-color-' + user.status + ')';
                element.title = '● ' + user.status.charAt(0).toUpperCase() + user.status.slice(1);
                element.title += '\nLast Seen: ' + formatDate(user.date);
              });
            });
          }
          resetBackgroundTimeout(10000);
        }
      }
    };
    start();
    convertFormSubmitToJsonSubmit(document.querySelector('.chat-form'));
  }

  toggleLeftMenu() {
    const menu = document.querySelector('.left');
    const center = document.querySelector('.center');
    if (menu.classList.contains('left-menu-open')) {
      menu.classList.remove('left-menu-open');
      center.classList.add('left-menu-open');
    } else {
      menu.classList.add('left-menu-open');
      center.classList.remove('left-menu-open');
    }
  }

  toggleRightMenu() {
    const menu = document.querySelector('.right');
    const center = document.querySelector('.center');
    if (menu.classList.contains('right-menu-open')) {
      menu.classList.remove('right-menu-open');
      center.classList.add('right-menu-open');
    } else {
      menu.classList.add('right-menu-open');
      center.classList.remove('right-menu-open');
    }
  }

  submitWhenEnterPressed(event) {
    if (event.which === 13 && !event.shiftKey) {
      event.preventDefault();
      const form = event.target.closest('form');
      submitFormAsJson(form);
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
        <h2 className="close toggle" onClick={this.toggleLeftMenu}>🡠</h2>
        <div className="chat-container"></div>
        <form className="chat-form" action="chat">
          <textarea name="message" className="chat-textarea" rows={4} required={true} placeholder="Send a message..." onKeyPress={this.submitWhenEnterPressed}></textarea>
          <button type="submit">Send</button>
        </form>
      </div>,
      <div key="center" className="center">
        <div className="suggestions-container"></div>
        <div className="search-container"></div>
        <div className="map-container"></div>
      </div>,
      <div key="right" className="right right-menu-open">
        <h2 className="close toggle" onClick={this.toggleRightMenu}>🡢</h2>
        <div className="details-container"></div>
      </div>,
      <div key="toast" className="toast-container"></div>
    ]
  }
}

const resetLogoutTimeout = function (timeout) {
  clearTimeout(logoutTimeout);
  logoutTimeout = setTimeout(reloadPage, timeout);
}

const reloadPage = function () {
  window.location.reload();
}

const resetBackgroundTimeout = function (timeout) {
  clearTimeout(backgroundTimeout);
  backgroundTimeout = setTimeout(backgroundWebsocket, timeout);
}

const backgroundWebsocket = function () {
  const map = { 'type': 'background', "active": !document.hidden };
  sendWebsocketMessage(map);
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
  } catch (error) {
    socket.close(4001, "Error connecting to server. Try again later.");
  }
}

export const clearTimeoutsAndIntervals = function () {
  clearTimeout(socketTimeout);
  clearTimeout(logoutTimeout);
  clearTimeout(backgroundTimeout);
}

export const formatDate = function (date) {
  return new Date(date).toLocaleDateString() + " " + new Date(date).getHours() + ":" + ("0" + new Date(date).getMinutes()).slice(-2);
}

export const renderToast = function (message, color) {
  ReactDOM.render(<Toast message={message} color={color} />, document.querySelector('.toast-container'));
}

export const highlightNewData = function(newData, oldData) {
  if (document.hidden && newData) {
    let newDataArray;
    if(oldData) {
      newDataArray = newData.filter(comparer(oldData));
    } else {
      newDataArray = newData;
    }
    newDataArray.forEach(function(location) {
      document.querySelectorAll('.id-' + location._id).forEach(function (element) {
        addShowUpdateEventListener(element);
      });
    });
  }
}

const addShowUpdateEventListener = function (element) {
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      element.style.background = 'var(--update-color)';
      setTimeout(function () {
        element.style.background = '';
      }, 3000);
    }
  }, { once: true });
}

const comparer = function(otherArray) {
  return function (current) {
    return otherArray.filter(function (other) {
      let votes = true;
      if(other.vote_count !== undefined && current.vote_count !== undefined) {
        votes = other.vote_count === current.vote_count; 
      }
      return other._id === current._id && votes
    }).length === 0;
  }
}

export default App;
