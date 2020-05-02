import React from 'react';

let props;

class Directions extends React.Component {
    componentDidMount() {
        props = this.props;
        navigator.geolocation.getCurrentPosition(this.showDirections);
    }

    componentDidUpdate(prevProps) {
        props = this.props;
        if(JSON.stringify(prevProps) !== JSON.stringify(props) ) {
            navigator.geolocation.getCurrentPosition(this.showDirections);
        }
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

    render() {
        return (
            <div className="directions"></div>
        )
    }
}

export default Directions;