import React from 'react'
import ReactDOM from 'react-dom'

class Toast extends React.Component {
	closeToast(event) {
		event.target.parentNode.style.marginBottom = '';
	}

	render() {
		return [
			<h3 key="toast-message">{this.props.message}</h3>,
			<h3 key="toast-close" className="toast-close" onClick={this.closeToast}>✕</h3>
		]
	}
}

export default Toast;