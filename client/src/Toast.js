import React from 'react'


let toastCloseTimeout;

class Toast extends React.Component {

	clickToastX() {
		document.querySelector('.toast-close').click();
	}

	closeToast(event) {
		event.target.parentNode.style.marginBottom = '';
	}

	render() {
		clearTimeout(toastCloseTimeout);
		document.querySelector('.toast-container').style.marginBottom = '0';
		toastCloseTimeout = setTimeout(this.clickToastX, 5000);
		return [
			<h3 key="toast-message" style={{color: this.props.color}}>{this.props.message}</h3>,
			<h3 key="toast-close" className="toast-close" onClick={this.closeToast}>✕</h3>
		]
	}
}

export default Toast;