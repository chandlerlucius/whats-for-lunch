import React from 'react'
import ReactDOM from 'react-dom'
import { formatDate } from './App';

class Chat extends React.Component {
  componentDidMount() {
    ReactDOM.findDOMNode(this).parentNode.scrollTop = ReactDOM.findDOMNode(this).parentNode.scrollHeight;
  }

  componentDidUpdate() {
    const audio = new Audio('aimrcv.wav');
    audio.play();
    ReactDOM.findDOMNode(this).parentNode.scrollTop = ReactDOM.findDOMNode(this).parentNode.scrollHeight;
  }

  render() {
    return (
      <div>
        {this.props.messages && this.props.messages.slice(0).reverse().map((message, index) =>
          <div key={index}>
            <strong>
              {message.user}
            </strong>
            <i className="chat-date">
              {formatDate(message.date)}
            </i>
            <div className="chat-message">
              {message.message}
            </div>
          </div>
        )}
      </div>
    )
  }
}

export default Chat;