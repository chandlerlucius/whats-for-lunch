import React from 'react'
import { formatDate, highlightNewData } from './App';

let container;
let isScrolledToBottom;
class Chat extends React.Component {
  scrollToBottomOfChat() {
    if (isScrolledToBottom) {
      container.scrollTop = container.scrollHeight - container.clientHeight;
    }
  }

  componentDidMount() {
    this.scrollToBottomOfChat();
  }

  componentDidUpdate(prevProps) {
    const audio = new Audio('aimrcv.wav');
    audio.play();
    this.scrollToBottomOfChat();
    highlightNewData(this.props.messages, prevProps.messages);
  }

  render() {
    container = document.querySelector('.chat-container');
    isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
    return (
      this.props.messages && this.props.messages.slice(0).reverse().map((message, index) =>
        <div key={index} className={"flex update-field id-" + message._id}>
          <div className="chat-icon-container">
            <h3 className="chat-icon flex" style={{ background: "var(--user-color-" + (message.user_count % 11) + ")" }}>
              {message.user_name.toUpperCase().charAt(0)}
            </h3>
          </div>
          <div>
            <strong className={"chat-status user-status-" + message.user_id} title={"offline"}>
              ●
            </strong>
            <strong>
              {message.user_name}
            </strong>
            <i className="chat-date">
              {formatDate(message.date)}
            </i>
            <div className="chat-message">
              {message.message}
            </div>
          </div>
        </div>
      )
    )
  }
}

export default Chat;