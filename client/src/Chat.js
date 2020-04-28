import React from 'react'
import { FaChevronDown } from 'react-icons/fa'
import { formatDate, handleNewData, CHAT } from './App'

let container;
let wasScrolledToBottom;
class Chat extends React.Component {
  keepScrollAtBottom() {
    if (wasScrolledToBottom) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    container.scrollTop = container.scrollHeight - container.clientHeight;
  }

  componentDidMount() {
    this.keepScrollAtBottom();
  }

  componentDidUpdate(prevProps) {
    const collapsed = document.querySelector('.left').style.marginLeft === '-25%';
    const focusScrolledOrCollapsed = !document.hasFocus() || !wasScrolledToBottom || collapsed;
    const newData = handleNewData(CHAT, this.props.messages, prevProps.messages);
    if (newData.length > 0 && focusScrolledOrCollapsed && !document.querySelector('.unread-div')) {
      const div = document.createElement('div');
      const hr1 = document.createElement('hr');
      const h6 = document.createElement('h6');
      const hr2 = document.createElement('hr');
      h6.innerHTML = 'unread';
      div.classList.add('unread-div');
      div.classList.add('flex-center');
      div.appendChild(hr1);
      div.appendChild(h6);
      div.appendChild(hr2);
      const firstNewMessage = document.querySelector('.id-' + newData[0]._id);
      const parent = document.querySelector('.id-' + newData[0]._id).parentNode;
      parent.insertBefore(div, firstNewMessage);
    }
    if (newData.length > 0 && focusScrolledOrCollapsed && !wasScrolledToBottom) {
      document.querySelector('.new-messages-button').style.display = 'flex';
    }

    if (newData.length > 0) {
      const element = document.querySelector('.notification-count');
      handleChatBalloon((parseInt(element.innerHTML) || 0) + newData.length);
    }

    if (!document.hasFocus()) {
      window.addEventListener('focus', function () {
        removeMessageBannersWhenScrolled();
      }, { once: true });
    } else if (!wasScrolledToBottom) {
      removeMessageBannersWhenScrolled();
    } else {
      removeMessageBanners();
    }
    this.keepScrollAtBottom();
  }

  render() {
    container = document.querySelector('.chat-container');
    wasScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
    return [
      this.props.messages && this.props.messages.slice(0).reverse().map((message, index) =>
        <div key={index} className={"flex update-field id-" + message._id}>
          <div className="chat-icon-container">
            <h3 className="chat-icon flex-center" style={{ background: "var(--user-color-" + (message.user_count % 11) + ")" }}>
              {message.user_name.toUpperCase().charAt(0)}
            </h3>
          </div>
          <div className="chat-message">
            <strong className={"chat-status user-status-" + message.user_id} title={"offline"}>
              ●
            </strong>
            <strong>
              {message.user_name}
            </strong>
            <i className="chat-date">
              {formatDate(message.date)}
            </i>
            <div>
              {message.message}
            </div>
          </div>
        </div>
      ),
      <div key="new-messages" className="flex-center new-messages-button" onClick={this.scrollToBottom}>
        <button className="flex-center"><FaChevronDown />    New Messages    <FaChevronDown /></button>
      </div>
    ]
  }
}

const isScrolledToBottom = function () {
  return container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
}

const removeMessageBannersWhenScrolled = function () {
  if (isScrolledToBottom()) {
    removeMessageBanners();
  } else {
    container.addEventListener('scroll', removeMessageBanners);
  }
}

const removeMessageBanners = function () {
  if (isScrolledToBottom()) {
    document.querySelector('.new-messages-button').style.display = 'none';
    container.removeEventListener('scroll', removeMessageBanners);
    handleChatBalloon(0);
  }
}

const handleChatBalloon = function (count) {
  if (count > 0) {
    document.querySelectorAll('.notification-balloon').forEach(function (element) {
      element.style.display = 'block';
    });
    document.querySelectorAll('.notification-count').forEach(function (element) {
      element.style.display = 'block';
      // element.innerHTML = count;
    });
  } else {
    document.querySelectorAll('.notification-balloon').forEach(function (element) {
      element.style.display = 'none';
    });
    document.querySelectorAll('.notification-count').forEach(function (element) {
      element.style.display = 'none';
    });
  }
}

export default Chat;