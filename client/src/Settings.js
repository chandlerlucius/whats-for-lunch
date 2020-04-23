import React from 'react';
import { submitFormWithEvent } from './App';
import timezones from './data/timezones.json';

class Settings extends React.Component {

    getClientOffset() {
        //Silly code needed to figure out the correct time accounting for DST
        const jan = new Date(new Date().getFullYear(), 0, 1).getTimezoneOffset();
        const jul = new Date(new Date().getFullYear(), 6, 1).getTimezoneOffset();
        return -(Math.max(jan, jul)) / 60;
    }

    componentDidMount() {
        let clientOffset = this.getClientOffset();
        if (this.props.settings && this.props.settings[0].voting_timezone_offset) {
            clientOffset = this.props.settings[0].voting_timezone_offset;
        }
        const data = JSON.parse(JSON.stringify(timezones));
        for (let i = 0; i < data.length; i++) {
            const option = document.createElement('option');
            option.text = data[i].abbr + ' - ' + data[i].name;
            option.value = data[i].offset;
            document.querySelector('.timezone').add(option);
            if (clientOffset === data[i].offset) {
                option.selected = true;
            }
        }
    }

    render() {
        let startTime = "";
        let endTime = "";
        if (this.props.settings) {
            startTime = this.props.settings[0].voting_start_time;
            startTime = new Date(startTime).toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            });
            endTime = this.props.settings[0].voting_end_time;
            endTime = new Date(endTime).toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            });
        }
        return (
            <form key="time-form" method="POST" action="settings" onSubmit={submitFormWithEvent} className="time-form">
                <div>
                    <label htmlFor="username">Voting Start Time</label>
                    <input type="time" name="start-time" defaultValue={startTime}></input>
                </div>
                <div>
                    <label htmlFor="username">Voting End Time</label>
                    <input type="time" name="end-time" defaultValue={endTime}></input>
                </div>
                <div>
                    <label htmlFor="username">Voting Timezone</label>
                    <select name="timezone" className="timezone"></select>
                </div>
                <button type="submit">Save</button>
            </form>
        )
    }
}

export default Settings;