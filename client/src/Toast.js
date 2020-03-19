import React from 'react'

class Toast extends React.Component {

	componentDidMount() {
		setTimeout(this.clickToastX, 5000);
	}

	componentDidUpdate() {
		setTimeout(this.clickToastX, 5000);
	}

	clickToastX() {
		document.querySelector('.toast-close').click();
	}

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