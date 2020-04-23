import React from 'react';
import { submitFormWithEvent } from './App';
import timezones from './data/timezones.json';

const timezoneData = JSON.parse(JSON.stringify(timezones));
class Settings extends React.Component {

    setTimezoneOptions() {
        for (let i = 0; i < timezoneData.length; i++) {
            const option = document.querySelector('.' + timezoneData[i].abbr);
            const millis = timezoneData[i].offset * 60 * 60 * 1000 + new Date().getTimezoneOffset() * 60 * 1000;
            const d = new Date(new Date().getTime() + millis);
            const month = new Intl.DateTimeFormat('en', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d)
            option.text = timezoneData[i].abbr + ' (' + month + ')';
        }
    }

    getClientOffset() {
        //Silly code needed to figure out the correct time accounting for DST
        const jan = new Date(new Date().getFullYear(), 0, 1).getTimezoneOffset();
        const jul = new Date(new Date().getFullYear(), 6, 1).getTimezoneOffset();
        return -(Math.max(jan, jul)) / 60;
    }

    setInputValues() {
        if (this.props.settings) {
            document.querySelector('.start_time_string').value = this.props.settings[0].start_time_string;
            document.querySelector('.end_time_string').value = this.props.settings[0].end_time_string;
        }

        let clientOffset = this.getClientOffset();
        if (this.props.settings && this.props.settings[0].timezone_offset) {
            clientOffset = this.props.settings[0].timezone_offset;
        }
        for (let i = 0; i < timezoneData.length; i++) {
            const option = document.createElement('option');
            option.value = timezoneData[i].offset;
            option.classList.add(timezoneData[i].abbr);
            document.querySelector('.timezone').add(option);
            if (clientOffset === timezoneData[i].offset) {
                option.selected = true;
            }
        }
        timezoneInterval = setInterval(this.setTimezoneOptions, 1000 * 60);
        this.setTimezoneOptions();
    }

    componentDidMount() {
        this.setInputValues();
    }

    componentDidUpdate() {
        this.setInputValues();
    }

    render() {
        return (
            <form key="time-form" method="POST" action="settings" onSubmit={submitFormWithEvent} className="time-form">
                <div>
                    <label htmlFor="username">Voting Start Time</label>
                    <input type="time" name="start_time_string" className="start_time_string" required={true}></input>
                </div>
                <div>
                    <label htmlFor="username">Voting End Time</label>
                    <input type="time" name="end_time_string" className="end_time_string" required={true}></input>
                </div>
                <div>
                    <label htmlFor="username">Voting Timezone</label>
                    <select name="timezone_offset" className="timezone" required={true}></select>
                </div>
                <button type="submit">Save</button>
            </form>
        )
    }
}

export let timezoneInterval;

export default Settings;