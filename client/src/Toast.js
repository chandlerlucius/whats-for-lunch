import React from 'react'
import { AiOutlineClose } from 'react-icons/ai'

export let toastCloseTimeout;

class Toast extends React.Component {

	closeToast(event) {
		event.currentTarget.parentNode.style.marginBottom = '';
	}

	render() {
		clearTimeout(toastCloseTimeout);
		document.querySelector('.toast-container').style.marginBottom = '0';
		toastCloseTimeout = setTimeout(clickToastX, 5000);
		return [
			<h3 key="toast-message" style={{ color: this.props.color }}>{this.props.message}</h3>,
			<h3 key="toast-close" className="toast-close flex-center" onClick={this.closeToast}><AiOutlineClose /></h3>
		]
	}
}

export const clickToastX = function() {
	if(document.querySelector('.toast-close')) {
		document.querySelector('.toast-close').click();
	}
}

export default Toast;