import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Chat from './Chat';
import Toast, { toastCloseTimeout } from './Toast';
import Users from './Users';
import Login from './Login';
import Search from './Search';
import Details from './Details'
import GoogleMap from './Map';
import Suggestions from './Suggestions';
import { MdChat } from 'react-icons/md';
import { FiLogOut } from 'react-icons/fi';
import { FaComment } from 'react-icons/fa';
import { MdSettings } from 'react-icons/md';
import { GiKnifeFork } from 'react-icons/gi';
import { FaArrowLeft } from 'react-icons/fa';
import { FaArrowRight } from 'react-icons/fa';
import { TiThMenuOutline } from 'react-icons/ti';

let url;
export let socket;
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
    ReactDOM.render(<GoogleMap />, document.querySelector('.map-container'));

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
        } else if(event.code !== 4002) {
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
        } else if (json.type === 'user') {
          ReactDOM.render(<Users users={json.body} />, document.querySelector('.users-container'));
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
          document.querySelectorAll('.user-status').forEach(function (element) {
            element.style.color = 'var(--user-color-offline)';
            element.innerHTML = '● Offline';
          });
          if (json.body) {
            json.body.forEach(function (user) {
              document.querySelectorAll('.user-status-' + user.id).forEach(function (element) {
                element.style.color = 'var(--user-color-' + user.status + ')';
                element.title = '● ' + user.status.charAt(0).toUpperCase() + user.status.slice(1);
                element.title += '\nLast Seen: ' + formatDate(user.last_seen);
              });
              document.querySelectorAll('.user-display-status-' + user.id).forEach(function (element) {
                element.style.color = 'var(--user-color-' + user.status + ')';
                element.innerHTML = '● ' + user.status.charAt(0).toUpperCase() + user.status.slice(1);
              });
              document.querySelectorAll('.user-last-seen-' + user.id).forEach(function (element) {
                element.innerHTML = formatDate(user.last_seen)
              });
            });
          }
          resetBackgroundTimeout(10000);
        }
      }
    };
    start();
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

  logout() {
    ReactDOM.render(<Login message='Enter username and password to begin.' color='var(--secondary-color)' />, document.querySelector('.root'));
  }

  render() {
    return [
      <nav key="nav" className="flex-center-vertical">
        <div className="flex">
          <h2 className={"button " + TOOLS} onClick={toggleLeftMenu} title="Open Tools"><MdSettings /></h2>
          <h2 className={"button notification-icon " + CHAT} onClick={toggleLeftMenu} title="Open Chat">
            <MdChat />
            <FaComment className="notification-balloon" />
            <span className="notification-count"></span>
          </h2>
        </div>
        <h2>What's For Lunch?</h2>
        <div className="flex">
          <h2 className="button" onClick={toggleRightMenu} title="Open Menu"><TiThMenuOutline /></h2>
          <h2 className="button" onClick={this.logout} title="Logout"><FiLogOut /></h2>
        </div>
      </nav>,
      <div key="left" className="left flex">
        <div className="flex menu-button-div">
          <h2 className={"button " + TOOLS} onClick={openChatOrTools} title="Open Tools"><MdSettings /></h2>
          <h2 className={"button notification-icon " + CHAT} onClick={openChatOrTools} title="Open Chat">
            <MdChat />
            <FaComment className="notification-balloon" />
            <span className="notification-count"></span>
          </h2>
          <h2 className="button" onClick={toggleLeftMenu} title="Close Menu"><GiKnifeFork /></h2>
        </div>
        <div className="tools-container hidden">
          <div className="button flex-center-vertical users" onClick={toggleToolsMenu}>
            <h3>Users</h3>
            <FaArrowRight />
          </div>
          <div className="button flex-center-vertical settings" onClick={toggleToolsMenu}>
            <h3>Settings</h3>
            <FaArrowRight />
          </div>
          <div className="button flex-center-vertical back hidden" onClick={toggleToolsMenu}>
            <FaArrowLeft />
            <h3>Back</h3>
          </div>
          <div className="users-container hidden"></div>
          <div className="settings-container hidden"></div>
        </div>
        <div className="chat-container"></div>
        <form method="POST" action="chat" onSubmit={submitFormWithEvent} className="chat-form">
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
          <h2 className="button" onClick={toggleRightMenu} title="Close Menu"><GiKnifeFork /></h2>
          <h2 className="button" onClick={this.logout} title="Logout"><FiLogOut /></h2>
        </div>
        <div className="details-container"></div>
      </div>,
      <div key="toast" className="toast-container flex-center"></div>,
      <div key="overlay" className="overlay" onClick={this.closeMenu}></div>
    ]
  }
}

export const CHAT = 'chat';
export const TOOLS = 'tools';
export const LOCATION = 'location';
const ADD = 1;
const REMOVE = 2;
const CHANGE = 3;
const notificationCounts = new Map();

export const toggleLeftMenu = function (event) {
  openChatOrTools(event);
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

export const toggleRightMenu = function () {
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

const openChatOrTools = function (event) {
  const element = event.currentTarget;
  if (element.classList.contains(CHAT)) {
    document.querySelector('.tools-container').classList.add('hidden');
    document.querySelector('.chat-container').classList.remove('hidden');
    document.querySelector('.chat-form').classList.remove('hidden');
  } else if (element.classList.contains(TOOLS)) {
    document.querySelector('.tools-container').classList.remove('hidden');
    document.querySelector('.chat-container').classList.add('hidden');
    document.querySelector('.chat-form').classList.add('hidden');
  }
}

export const toggleToolsMenu = function (event) {
  const target = event.currentTarget;
  if(target.classList.contains('back')) {
    document.querySelector('.back').classList.add('hidden');
    document.querySelector('.users-container').classList.add('hidden');
    document.querySelector('.settings-container').classList.add('hidden');
    document.querySelector('.users').classList.remove('hidden');
    document.querySelector('.settings').classList.remove('hidden');
  } else {
    let clazz;
    if(target.classList.contains('users')) {
      clazz = '.users-container';
    } else if(target.classList.contains('settings')) {
      clazz = '.settings-container';
    }
    const element = document.querySelector(clazz);
    if (element.classList.contains('hidden')) {
      element.classList.remove('hidden');
      document.querySelector('.users').classList.add('hidden');
      document.querySelector('.settings').classList.add('hidden');
    } else {
      element.classList.add('hidden');
      document.querySelector('.users').classList.remove('hidden');
      document.querySelector('.settings').classList.remove('hidden');
    }
    document.querySelector('.back').classList.remove('hidden');
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

export const submitFormWithEvent = function(event) {
  event.preventDefault();
  submitFormAsJson(event.target);
}

export const submitFormAsJson = function (form) {
  const map = {};
  const formData = new FormData(form);
  formData.forEach(function (value, key) {
    if(value === 'on' || value === 'true') {
      value = true;
    }
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
  clearTimeout(toastCloseTimeout);
}

export const formatDate = function (date) {
  return new Date(date).toLocaleDateString() + " " + new Date(date).getHours() + ":" + ("0" + new Date(date).getMinutes()).slice(-2);
}

export const renderToast = function (message, color) {
  ReactDOM.render(<Toast message={message} color={color} />, document.querySelector('.toast-container'));
}

export const handleNewData = function (type, newData, oldData) {
  let newDataArray = [];
  let oldDataArray = [];
  let changedDataArray = [];
  if (oldData && newData) {
    newDataArray = newData.filter(compareID(oldData));
    oldDataArray = oldData.filter(compareID(newData));
    changedDataArray = newData.filter(compareVote(oldData));
  } else if (newData) {
    newDataArray = newData;
  } else if (oldData) {
    oldDataArray = oldData;
  }

  if (!document.hasFocus()) {
    newDataArray.forEach(function (data) {
      handleNotifications(type, data, ADD);
    });
    oldDataArray.forEach(function (data) {
      handleNotifications(type, data, REMOVE);
    });
    changedDataArray.forEach(function (data) {
      handleNotifications(type, data, CHANGE);
    });
  }
  if (type === CHAT) {
    newDataArray.forEach(function (data) {
      handleHighlighting(type, data);
    });
  }
  return newDataArray;
}

const handleNotifications = function (type, data, operation) {
  const count = notificationCounts.get(data._id);
  switch (operation) {
    case ADD:
      notificationCounts.set(data._id, count ? count + 1 : 1);
      if (type === CHAT) {
        showNotification('New Message: \n@' + data.user_name, '"' + data.message + '"', 'chat-icon.png');
      } else if (type === LOCATION) {
        showNotification('New Location: \n' + data.name, '@' + data.user_name + ' added it!', 'location-icon.png');
      }
      handleHighlighting(data);
      break;
    case REMOVE:
      notificationCounts.delete(data._id);
      if (type === LOCATION) {
        showNotification('Removed Location: \n' + data.name, '@' + data.user_name + ' removed it!', 'location-icon.png');
      }
      break;
    case CHANGE:
      notificationCounts.set(data._id, count ? count + 1 : 1);
      if (type === LOCATION) {
        showNotification('Updated Location: \n' + data.name, '@' + data.user_name + ' voted!', 'location-icon.png');
      }
      handleHighlighting(data);
      break;
    default:
      break;
  }
  updateTitle();
  const audio = new Audio('aimrcv.wav');
  audio.play();
}

const handleHighlighting = function (data) {
  if (!document.hasFocus()) {
    window.addEventListener('focus', function () {
      highlightWhenElementScrolledTo(data);
    }, { once: true });
  } else {
    highlightWhenElementScrolledTo(data);
  }
}

const highlightWhenElementScrolledTo = function (data) {
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const element = entry.target;
        element.style.background = 'var(--update-color)';
        setTimeout(function () {
          element.style.background = '';
        }, 3000);
        observer.unobserve(entry.target);
        notificationCounts.delete(data._id);
        updateTitle();
      }
    });
  });
  document.querySelectorAll('.id-' + data._id).forEach(function (element) {
    observer.observe(element);
  });
}

const updateTitle = function () {
  let count = 0;
  notificationCounts.forEach(function (value) {
    count += value;
  });
  document.title = document.title.replace(/\(\d+?\) /, '');
  if (count > 0) {
    document.title = '(' + count + ') ' + document.title;
  }
}

const compareVote = function (otherArray) {
  return function (current) {
    return otherArray.filter(function (other) {
      let votes = true;
      if (other.vote_count !== undefined && current.vote_count !== undefined) {
        votes = other.vote_count === current.vote_count;
      }
      return votes;
    }).length === 0;
  }
}

const compareID = function (otherArray) {
  return function (current) {
    return otherArray.filter(function (other) {
      return other._id === current._id
    }).length === 0;
  }
}

const showNotification = function (title, body, icon) {
  if (("Notification" in window) && Notification.permission === "granted") {
    const notification = new Notification(title, { body: body, icon: document.location.href + icon });
    notification.onclick = function () {
      window.focus();
    };
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

export default App;
