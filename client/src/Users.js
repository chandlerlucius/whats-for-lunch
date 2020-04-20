import React from 'react'
import { formatDate, toggleToolsMenu } from './App';
import { FaArrowLeft } from 'react-icons/fa';

class Users extends React.Component {

    render() {
        return [
            <div key="tools-buttons" className="button flex-center-vertical users" onClick={toggleToolsMenu}>
                <FaArrowLeft />
                <h3>Back</h3>
            </div>,
            this.props.users && this.props.users.map((user, index) =>
                <div key={index}>
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
                        </tbody>
                    </table>
                    <br />
                </div>
            )
        ]
    }
}

export default Users;