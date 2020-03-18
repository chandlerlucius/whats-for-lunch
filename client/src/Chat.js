import React from 'react'
import ReactDOM from 'react-dom'

class Chat extends React.Component {
  componentDidMount() {
    ReactDOM.findDOMNode(this).parentNode.scrollTop = ReactDOM.findDOMNode(this).parentNode.scrollHeight;
  }

  render() {
    return (
      <div key="messages">
        {this.props.messages && this.props.messages.map((message, index) =>
          <div key={index}>
            <strong>
              {message.user}
            </strong>
            <i className="chat-date">
              {new Date(message.date).toLocaleDateString() + " " + new Date(message.date).getHours() + ":" + ("0" + new Date(message.date).getMinutes()).slice(-2)}
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