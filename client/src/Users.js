import React from 'react'
import { formatDate, submitFormAsJson } from './App';

class Users extends React.Component {

    submitForm(event) {
        const element = event.currentTarget;
        const form = element.closest('form');
        if(element.classList.contains('remove')) {
            const input = form.querySelector('[name="remove"]');
            input.value = true;
        }
        submitFormAsJson(form);
    }

    render() {
        return (
            this.props.users && this.props.users.map((user, index) =>
                <form key={index} method="POST" action="user" >
                    <h1 className="chat-icon chat-icon-large flex-center" style={{ background: "var(--user-color-" + (user.count % 11) + ")" }}>
                        {user.username.toUpperCase().charAt(0)}
                    </h1>
                    <table>
                        <tbody>
                            <tr>
                                <td>Username:</td>
                                <td><strong>@{user.username}</strong></td>
                            </tr>
                            <tr>
                                <td>Status:</td>
                                <td>
                                    <strong className={"user-status user-display-status-" + user._id}></strong>
                                </td>
                            </tr>
                            <tr>
                                <td>Role:</td>
                                <td><strong>{user.role}</strong></td>
                            </tr>
                            <tr>
                                <td>Last Seen:</td>
                                <td><strong className={"user-last-seen-" + user._id}>{formatDate(user.last_seen)}</strong></td>
                            </tr>
                            <tr>
                                <td>Created:</td>
                                <td><strong>{formatDate(user.date)}</strong></td>
                            </tr>
                            <tr>
                                <td>Enabled:</td>
                                <td><input type="checkbox" name="enabled" checked={user.enabled} onChange={this.submitForm}></input></td>
                            </tr>
                            <tr>
                                <td></td>
                                <td>
                                    <input type="hidden" name="remove" value={false}></input>
                                    <button type="button" className="remove" onClick={this.submitForm}>Remove User</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <br />
                    <input type="hidden" name="username" value={user.username}></input>
                </form>
            )
        )
    }
}

export default Users;