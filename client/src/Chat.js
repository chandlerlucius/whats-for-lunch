import React from 'react'
import { formatDate } from './App';

class Chat extends React.Component {
  scrollToBottomOfChat() {
    const container = document.querySelector('.chat-container');
    container.scrollTop = container.scrollHeight;
  }

  componentDidMount() {
    this.scrollToBottomOfChat();
  }

  componentDidUpdate() {
    const audio = new Audio('aimrcv.wav');
    audio.play();
    this.scrollToBottomOfChat();
  }

  render() {
    return (
      this.props.messages && this.props.messages.slice(0).reverse().map((message, index) =>
        <div key={index} className="chat-inner-container">
          <div className="chat-icon-container">
            <h3 className="chat-icon" style={{ background: "var(--user-color-" + (message.user_count % 11) + ")" }}>
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