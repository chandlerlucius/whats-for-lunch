import React from 'react'
import { submitFormAsJson, formatDate } from './App'

class Suggestions extends React.Component {

  handleVote(event) {
    const value = event.target;
    const form = event.target.closest('form');
    const input = form.querySelector('[name="value"]');
    input.value = value.getAttribute('value');
    submitFormAsJson(form);
  }

  getTitle(location) {
    let title = "";
    location.up_votes.forEach(function (vote) {
      title += '▲ ' + vote.user + ' ' + formatDate(vote.date) + '\n';
    });
    location.down_votes.forEach(function (vote) {
      title += '▼ ' + vote.user + ' ' + formatDate(vote.date) + '\n';
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
      style = { 'border-color': 'var(--success-color)', 'color': 'var(--success-color)' };
    } else if (location.vote_count < 0) {
      style = { 'border-color': 'var(--failure-color)', 'color': 'var(--failure-color)' };
    }
    return style;
  }

  render() {
    return (
      this.props.locations && this.props.locations.map((location, index) =>
        <form key={index} action="vote" className="vote-form">
          <div>
            {index === 0 ? <h2 className="vote-checkmark">✔</h2> : <h2> </h2>}
            <h2 title="Click to add or remove up vote" onClick={this.handleVote} value="1" style={this.getArrowStyle(location, 1)}>
              ▲
            </h2>
            <div className="vote-container" style={this.getCountStyle(location)}>
              <h3 title={this.getTitle(location)}>{location.vote_count}</h3>
            </div>
            <h2 title="Click to add or remove down vote" onClick={this.handleVote} value="-1" style={this.getArrowStyle(location, -1)}>
              ▼
            </h2>
          </div>
          <div>
            <h3>{location.name}</h3>
          </div>
          <input type="hidden" name="location" value={location.name}></input>
          <input type="hidden" name="value"></input>
        </form>
      )
    )
  }
}

export default Suggestions;