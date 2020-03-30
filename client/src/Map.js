import React from 'react';
import ReactDOM from 'react-dom';
import Details from './Details'

class Map extends React.Component {
  render() {
    return [
      <div className="map" key="map"></div>,
      <div className="listing" key="listing">
        <table id="resultsTable">
          <tbody id="results"></tbody>
        </table>
      </div>
    ];
  }

  componentDidMount() {
    var map, places, infoWindow;
    var markers = [];

    function setCenter(position) {
      map.setCenter({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
      map.setZoom(12);
    }

    function initMap() {
      map = new window.google.maps.Map(document.querySelector('.map'), {
        center: {
          lat: 37.1,
          lng: -95.7
        },
        zoom: 3
      });
      navigator.geolocation.getCurrentPosition(setCenter);

      infoWindow = new window.google.maps.InfoWindow({
        content: document.getElementById('info-content')
      });

      places = new window.google.maps.places.PlacesService(map);

      const foodSearch = document.querySelector('.location-search');
      foodSearch.addEventListener('search', function () {
        search(foodSearch.value);
      });

      const foodSearchButton = document.querySelector('.location-search-button');
      foodSearchButton.addEventListener('click', function () {
        search(foodSearch.value);
      });
    }

    function search(keyword) {
      if (keyword === '') {
        return;
      }

      var search = {
        bounds: map.getBounds(),
        keyword: keyword,
        type: 'restaurant'
      };

      places.nearbySearch(search, function (results, status) {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          clearResults();
          clearMarkers();
          for (var i = 0; i < results.length; i++) {
            var markerLetter = String.fromCharCode('A'.charCodeAt(0) + (i % 26));
            var markerIcon = 'https://developers.google.com/maps/documentation/javascript/images/marker_green' + markerLetter + '.png';
            
            markers[i] = new window.google.maps.Marker({
              position: results[i].geometry.location,
              animation: window.google.maps.Animation.DROP,
              icon: markerIcon
            });
            
            markers[i].placeResult = results[i];
            window.google.maps.event.addListener(markers[i], 'click', showInfoWindow);
            setTimeout(dropMarker(i), i * 100);
            addResult(results[i], i);
          }
          ReactDOM.render(<Details listings={true}/>, document.querySelector('.details-container'));
        }
      });
    }

    function clearMarkers() {
      for (var i = 0; i < markers.length; i++) {
        if (markers[i]) {
          markers[i].setMap(null);
        }
      }
      markers = [];
    }

    function dropMarker(i) {
      return function () {
        markers[i].setMap(map);
      };
    }

    function addResult(result, i) {
      var results = document.getElementById('results');
      var markerLetter = String.fromCharCode('A'.charCodeAt(0) + (i % 26));
      var markerIcon = 'https://developers.google.com/maps/documentation/javascript/images/marker_green' + markerLetter + '.png';

      var tr = document.createElement('tr');
      tr.style.backgroundColor = (i % 2 === 0 ? '#F0F0F0' : '#FFFFFF');
      tr.onclick = function () {
        window.google.maps.event.trigger(markers[i], 'click');
      };

      var iconTd = document.createElement('td');
      var nameTd = document.createElement('td');
      var icon = document.createElement('img');
      icon.src = markerIcon;
      icon.setAttribute('class', 'placeIcon');
      icon.setAttribute('className', 'placeIcon');
      var name = document.createTextNode(result.name);
      iconTd.appendChild(icon);
      nameTd.appendChild(name);
      tr.appendChild(iconTd);
      tr.appendChild(nameTd);
      results.appendChild(tr);
    }

    function clearResults() {
      var results = document.getElementById('results');
      while (results.childNodes[0]) {
        results.removeChild(results.childNodes[0]);
      }
    }

    function showInfoWindow() {
      var marker = this;
      places.getDetails({
        placeId: marker.placeResult.place_id
      },
        function (place, status) {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
            return;
          }
          infoWindow.open(map, marker);
          ReactDOM.render(<Details place={place} />, document.querySelector('.details-container'));
        });
    }

    initMap();
  }
}

export default Map;