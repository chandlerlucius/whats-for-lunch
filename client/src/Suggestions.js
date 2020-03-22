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

  getStyle(location, value) {
    let style = {};
    if (location.voted === 1 && value === 1) {
      style = { color: 'var(--success-color)' };
    }
    if (location.voted === -1 && value === -1) {
      style = { color: 'var(--failure-color)' };
    }
    return style;
  }

  render() {
    return (
      this.props.locations && this.props.locations.map((location, index) =>
        <form key={index} action="vote" className="vote-form">
          <div>
            <h2 title="Click to add or remove up vote" onClick={this.handleVote} value="1" style={this.getStyle(location, 1)}>▲</h2>
            <div className="vote-container">
              <h3 title={this.getTitle(location)}>{location.vote_count}</h3>
            </div>
            <h2 title="Click to add or remove down vote" onClick={this.handleVote} value="-1" style={this.getStyle(location, -1)}>▼</h2>
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