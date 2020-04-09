import React from 'react'
import {FaChevronDown} from 'react-icons/fa'
import { formatDate, highlightNewData, CHAT } from './App'

let container;
let isScrolledToBottom;
class Chat extends React.Component {
  keepScrollAtBottom() {
    if (isScrolledToBottom) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    container.scrollTop = container.scrollHeight - container.clientHeight;
  }

  componentDidMount() {
    this.keepScrollAtBottom();
    container.addEventListener('scroll', function () {
      if (container.scrollHeight - container.clientHeight <= container.scrollTop + 1) {
        document.querySelector('.new-messages-button').style.display = 'none';
      }
  });
  }

  componentDidUpdate(prevProps) {
    this.keepScrollAtBottom();
    const newData = highlightNewData(CHAT, this.props.messages, prevProps.messages);
    if(newData && !isScrolledToBottom) {
      document.querySelector('.new-messages-button').style.display = 'flex';
    }
  }

  render() {
    container = document.querySelector('.chat-container');
    isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
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
        <button className="flex-center"><FaChevronDown/>    New Messages    <FaChevronDown/></button>
      </div>
    ]
  }
}

export default Chat;