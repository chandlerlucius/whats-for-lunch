import React from 'react'
import ReactDOM from 'react-dom'
import Details from './Details'
import { MdCheck } from 'react-icons/md'
import { MdClose } from 'react-icons/md'
import { submitFormAsJson, formatDate, handleNewData, LOCATION, toggleRightMenu } from './App'

class Suggestions extends React.Component {

  componentDidUpdate(prevProps) {
    handleNewData(LOCATION, this.props.locations, prevProps.locations);
  }

  submitForm(event) {
    const value = event.currentTarget;
    const form = event.currentTarget.closest('form');
    const input = form.querySelector('[name="value"]');
    input.value = value.getAttribute('value');
    submitFormAsJson(form);
  }

  getTitle(location) {
    let title = "";
    location.up_votes.forEach(function (vote) {
      title += '▲ ' + vote.user_name + ' ' + formatDate(vote.date) + '\n';
    });
    location.down_votes.forEach(function (vote) {
      title += '▼ ' + vote.user_name + ' ' + formatDate(vote.date) + '\n';
    });
    return title;
  }

  getArrowStyle(location, value) {
    let style = {};
    if (location.voted === value) {
      style = { color: 'var(--primary-color)' };
    }
    return style;
  }

  getCountStyle(location) {
    let style = {};
    if (location.vote_count > 0) {
      style = { borderColor: 'var(--success-color)', color: 'var(--success-color)' };
    } else if (location.vote_count < 0) {
      style = { borderColor: 'var(--failure-color)', color: 'var(--failure-color)' };
    }
    return style;
  }

  renderDetails(location) {
    ReactDOM.render(<Details place={location} />, document.querySelector('.details-container'));
    if(window.getComputedStyle(document.querySelector('.right')).marginRight !== '0px') {
      toggleRightMenu();
    }
  }

  render() {
    return (
      this.props.locations && this.props.locations.map((location, index) =>
        <form key={index} method="POST" action="vote" className={"vote-form flex update-field id-" + location._id}>
          <div>
            {index === 0 ?
              <h1 className="vote-checkmark" title="Lunch is here!"><MdCheck /></h1>
              :
              <h1 style={{ color: "transparent" }}><MdCheck /></h1>
            }
            <h2 title="Click to add or remove up vote" onClick={this.submitForm} value="up" style={this.getArrowStyle(location, "up")}>
              ▲
            </h2>
            <div className="vote-count flex-center" style={this.getCountStyle(location)}>
              <h3 title={this.getTitle(location)} onClick={() => this.renderDetails(location)}>{location.vote_count}</h3>
            </div>
            <h2 title="Click to add or remove down vote" onClick={this.submitForm} value="down" style={this.getArrowStyle(location, "down")}>
              ▼
            </h2>
          </div>
          <div>
            <h3 onClick={() => this.renderDetails(location)}>{location.name}</h3>
            {location.added ?
              <h1 className="vote-remove" title="Click to remove location" onClick={this.submitForm} value="remove"><MdClose /></h1>
              :
              ""
            }
          </div>
          <input type="hidden" name="location" value={location.name}></input>
          <input type="hidden" name="value"></input>
        </form>
      )
    )
  }
}

export default Suggestions;