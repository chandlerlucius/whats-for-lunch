import React from 'react';
import { submitFormWithEvent } from './App'
import carriers from './data/carriers.json';

const carrierData = JSON.parse(JSON.stringify(carriers));
let props;

class Directions extends React.Component {
    componentDidMount() {
        props = this.props;
        navigator.geolocation.getCurrentPosition(this.showDirections);
        this.setupCarrierOptions();
    }

    componentDidUpdate(prevProps) {
        props = this.props;
        if(JSON.stringify(prevProps) !== JSON.stringify(props) ) {
            navigator.geolocation.getCurrentPosition(this.showDirections);
        }
        this.selectClientValues();
    }

    showDirections(position) {
        var directionsService = new window.google.maps.DirectionsService();
        var directionsRenderer = new window.google.maps.DirectionsRenderer();
        var map = new window.google.maps.Map(document.querySelector('.directions'));
        directionsRenderer.setMap(map);

        let lat = position.coords.latitude;
        if (props.place && props.place.lat !== 0) {
            lat = props.place.lat;
        }
        let lng = position.coords.longitude;
        if (props.place && props.place.lng !== 0) {
            lng = props.place.lng;
        }
        directionsService.route(
            {
                origin: { lat: position.coords.latitude, lng: position.coords.longitude },
                destination: { lat: lat, lng: lng },
                travelMode: 'DRIVING'
            },
            function (response, status) {
                if (status === 'OK') {
                    directionsRenderer.setDirections(response);
                } else {
                    console.log('Directions request failed due to ' + status);
                }
            }
        );
    }

    setupCarrierOptions() {
        const clientCarrier = "";
        for (let i = 0; i < carrierData.length; i++) {
            const option = document.createElement('option');
            option.text = carrierData[i].name;
            option.value = carrierData[i].email;
            option.classList.add(carrierData[i].email.replace(/[.]/g, '-'));
            document.querySelector('.carrier').append(option);
            if (clientCarrier === carrierData[i].name) {
                option.selected = true;
            }
        }
    }

    selectClientValues() {
        const clientCarrier = "";
        for (let i = 0; i < carrierData.length; i++) {
            const option = document.querySelector('.' + carrierData[i].email.replace(/[.]/g, '-'));
            if (clientCarrier === carrierData[i].name) {
                option.selected = true;
            }
        }
    }

    render() {
        let name = "";
        if(this.props && this.props.place) {
            name = this.props.place.name;
        }
        let url = "";
        if(this.props && this.props.place) {
            url = this.props.place.url;
        }
        return [
            <form key="sms-form" method="POST" action="sms" onSubmit={submitFormWithEvent} className="sms-form flex-center-horizontal">
                <input type="number" name="number" required={true} placeholder="# Format: 5125125123"></input>
                <input type="hidden" name="title" value={name}></input>
                <input type="hidden" name="url" value={url}></input>
                <select name="carrier" className="carrier" required={true}></select>
                <button>Send to Phone</button>
            </form>,
            <div key="directions" className="directions"></div>
        ]
    }
}

export default Directions;