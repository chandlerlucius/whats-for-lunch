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
import { MdChat } from 'react-icons/md';
import { FiLogOut } from 'react-icons/fi';
import { AiOutlineClose } from 'react-icons/ai';
import { TiThMenuOutline } from 'react-icons/ti';

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
    Notification.requestPermission();
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
          if (!document.querySelector('.details-div')) {
            ReactDOM.render(<Details />, document.querySelector('.details-container'));
          }
        } else if (json.type === 'background') {
          document.querySelectorAll('.chat-status').forEach(function (element) {
            element.style.color = 'var(--user-color-offline)';
            element.title = 'offline';
          });
          if (json.body) {
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
    const overlay = document.querySelector('.overlay');
    if (menu.classList.contains('left-menu-toggled')) {
      menu.classList.remove('left-menu-toggled');
      center.classList.remove('center-menu-left');
      overlay.classList.remove('overlay-toggled');
    } else {
      menu.classList.add('left-menu-toggled');
      center.classList.add('center-menu-left');
      overlay.classList.add('overlay-toggled');
    }
  }

  toggleRightMenu() {
    const menu = document.querySelector('.right');
    const center = document.querySelector('.center');
    const overlay = document.querySelector('.overlay');
    if (menu.classList.contains('right-menu-toggled')) {
      menu.classList.remove('right-menu-toggled');
      center.classList.remove('center-menu-right');
      overlay.classList.remove('overlay-toggled');
    } else {
      menu.classList.add('right-menu-toggled');
      center.classList.add('center-menu-right');
      overlay.classList.add('overlay-toggled');
    }
  }

  closeMenu() {
    const center = document.querySelector('.center');
    const overlay = document.querySelector('.overlay');
    const left = document.querySelector('.left');
    if (left.classList.contains('left-menu-toggled')) {
      left.classList.remove('left-menu-toggled');
      center.classList.remove('center-menu-left');
      overlay.classList.remove('overlay-toggled');
    }
    const right = document.querySelector('.right');
    if (right.classList.contains('right-menu-toggled')) {
      right.classList.remove('right-menu-toggled');
      center.classList.remove('center-menu-right');
      overlay.classList.remove('overlay-toggled');
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
      <nav key="nav" className="flex-center-vertical">
        <h2 className="button" onClick={this.toggleLeftMenu} title="Open Chat"><MdChat /></h2>
        <h2>What's For Lunch?</h2>
        <div className="flex">
          <h2 className="button" onClick={this.toggleRightMenu} title="Open Menu"><TiThMenuOutline /></h2>
          <h2 className="button" onClick={this.logout} title="Logout"><FiLogOut /></h2>
        </div>
      </nav>,
      <div key="left" className="left flex">
        <div className="flex menu-button-div">
          <h2 className="button" onClick={this.toggleLeftMenu} title="Close Menu"><AiOutlineClose /></h2>
        </div>
        <div className="chat-container"></div>
        <form className="chat-form" action="chat">
          <textarea name="message" className="chat-textarea" rows={4} required={true} placeholder="Send a message..." onKeyPress={this.submitWhenEnterPressed}></textarea>
          <button type="submit">Send</button>
        </form>
      </div>,
      <div key="center" className="center">
        <div className="suggestions-container"></div>
        <div className="search-container"></div>
        <div className="map-container flex"></div>
      </div>,
      <div key="right" className="right">
        <div className="flex menu-button-div">
          <h2 className="button" onClick={this.toggleRightMenu} title="Close Menu"><AiOutlineClose /></h2>
          <h2 className="button" onClick={this.logout} title="Logout"><FiLogOut /></h2>
        </div>
        <div className="details-container"></div>
      </div>,
      <div key="toast" className="toast-container flex-center"></div>,
      <div key="overlay" className="overlay" onClick={this.closeMenu}></div>
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
  const map = { 'type': 'background', "active": document.hasFocus() };
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

export const highlightNewData = function (newData, oldData) {
  if (!document.hasFocus() && newData) {
    let newDataArray;
    if (oldData) {
      newDataArray = newData.filter(comparer(oldData));
    } else {
      newDataArray = newData;
    }
    newDataArray.forEach(function (data) {
      if (data.message) {
        showNotification(data.user_name, data.message);
      } else if (data.name) {
        showNotification(data.user_name, data.name + ' was added or had a change in votes!');
      }
      const audio = new Audio('aimrcv.wav');
      audio.play();

      window.addEventListener('focus', function () {
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                  const element = entry.target;
                  element.style.background = 'var(--update-color)';
                  setTimeout(function () {
                    element.style.background = '';
                  }, 3000);
                  observer.unobserve(entry.target);
                }
            });
        });
        document.querySelectorAll('.id-' + data._id).forEach(function (element) {
          observer.observe(element);
        });
      }, { once: true });
    });
    return newDataArray.length > 0;
  }
}

const comparer = function (otherArray) {
  return function (current) {
    return otherArray.filter(function (other) {
      let votes = true;
      if (other.vote_count !== undefined && current.vote_count !== undefined) {
        votes = other.vote_count === current.vote_count;
      }
      return other._id === current._id && votes
    }).length === 0;
  }
}

const showNotification = function (title, body) {
  if (("Notification" in window) && Notification.permission === "granted") {
    new Notification(title, { body: body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

export default App;
