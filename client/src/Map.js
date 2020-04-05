import React from 'react';
import ReactDOM from 'react-dom';
import Details from './Details'

class Map extends React.Component {
  render() {
    return [
      <div className="map" key="map"></div>,
      <div className="info-window-container" key="info-window-container"></div>,
      <div className="listings-container" key="listings">
        <table className="listings-table">
          <tbody className="listings"></tbody>
        </table>
      </div>,
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
        content: document.querySelector('.info-window-container')
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
            markers[i] = new window.google.maps.Marker({
              label: markerLetter,
              position: results[i].geometry.location,
              animation: window.google.maps.Animation.DROP,
            });

            markers[i].placeResult = results[i];
            window.google.maps.event.addListener(markers[i], 'click', showInfoWindow);
            setTimeout(dropMarker(i), i * 100);
            addResult(results[i], i);
          }
          ReactDOM.render(<Details listings={true} />, document.querySelector('.details-container'));
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
      var results = document.querySelector('.listings');
      var markerLetter = String.fromCharCode('A'.charCodeAt(0) + (i % 26));

      var tr = document.createElement('tr');
      tr.style.backgroundColor = (i % 2 === 0 ? 'var(--secondary-color)' : 'var(--menu-color)');
      tr.onclick = function () {
        window.google.maps.event.trigger(markers[i], 'click');
      };

      var iconTd = document.createElement('td');
      var nameTd = document.createElement('td');
      var icon = document.createElement('img');
      icon.src = 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi-dotless2_hdpi.png';
      var name = document.createTextNode(result.name);
      iconTd.appendChild(icon);
      var letter = document.createElement('span');
      letter.innerHTML = markerLetter;
      iconTd.appendChild(letter);
      nameTd.appendChild(name);
      tr.appendChild(iconTd);
      tr.appendChild(nameTd);
      results.appendChild(tr);
    }

    function clearResults() {
      var results = document.querySelector('.listings');
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
          ReactDOM.render(<Details place={place} window={true} />, document.querySelector('.info-window-container'));
        });
    }

    initMap();
  }
}

export default Map;