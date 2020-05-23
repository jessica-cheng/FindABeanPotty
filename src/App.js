import React from 'react';
import {GoogleMap, useLoadScript, Marker, InfoWindow} from "@react-google-maps/api";
import { formatRelative } from "date-fns";

import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption
} from "@reach/combobox";
import "@reach/combobox/styles.css"
import mapStyles from './mapStyles'


// set library as const variable bc when react rerenders it does a div sometimes
// to see if it needs to rerender and arrays in objects that are used as literals
// sometimes appear to react as an object esp with google maps library
const libraries = ["places"] // library enables the places search when load google script
const mapContainerStyle = {
  width: "100vw",
  height: "100vw"
};
const center = {
  lat: 42.361145,
  lng: -71.057083
};

const options = {
  styles: mapStyles,
  disableDefaultUI: true,
  zoomControl: true
};

function App() {
  // 2 variables to know when google scipt is ready
  const {isLoaded, loadError} = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries, 
  });

  // hooks can only be defined within component
  const [markers, setMarkers] = React.useState([]);

  // state to store what is current selected marker user wants to see details for
  const [selected, setSelected] = React.useState(null);

  // hook to avoid recreating fxn on every rerender of the applicaton
  // callback used for function that shouldn't change unless properties inside [] change
  // if do nothing {} function will always retain same value, never triggering rerender
  const onMapClick = React.useCallback((event) => {
    //console.log(event);
    // state setter function
    // to base new state off of current state, 
    // pass function in where old state is passed in as a value
    setMarkers((current) => [...current, {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
      time: new Date() // set date as unique marker
    }])
  });

  // retain ref to map instance
  const mapRef = React.useRef();
  // callback function when map loads that gives us map that we can assign to above ref
  // without causing rerender
  const onMapLoad = React.useCallback((map) => {
    mapRef.current = map;
  }, []);

  const panTo = React.useCallback(({lat, lng}) => {
    mapRef.current.panTo({lat, lng});
    mapRef.current.setZoom(20);
  }, []);

  if (loadError) return "Error loading maps";
  if (!isLoaded) return "Loading Maps";
  return (
    <div>
      <h1>
        Find A Bean Potty{" "}
        <span role="img" aria-label="restroom">
          🚻
        </span>
        </h1>
        <Search panTo={panTo}/>
        <Locate panTo={panTo}/>
      <GoogleMap 
        mapContainerStyle={mapContainerStyle} 
        zoom={14} 
        center={center}
        options={options}
        onClick={onMapClick}
        onLoad={onMapLoad}>
          {markers.map(marker => 
            <Marker 
              key={marker.time.toISOString()} 
              position={{lat: marker.lat, lng: marker.lng}}
              icon={{
                url:'/toilet.png',
                scaledSize: new window.google.maps.Size(30,30),
                origin: new window.google.maps.Point(0,0), // centers the marker at mouse
                anchor: new window.google.maps.Point(15,15) // center of image
              }}
              onClick={() => {
                setSelected(marker); // set marker as it's iterating on map and pass in marker clicked
              }}
              />)}
              {/* if selected has value show info window*/}
              {selected ? (
                <InfoWindow 
                  position={{lat: selected.lat, lng: selected.lng}} 
                  onCloseClick={() => {
                    setSelected(null); // set selected to null so can reopen
                }}>
                <div>
                  <h2>Restroom here</h2>
                  <p>Added {formatRelative(selected.time, new Date())}</p>
                </div>
              </InfoWindow>) : null}
        </GoogleMap>
    </div>
  );
}

function Locate({panTo}) {
  return (
    // when click on geolocation btn it will tell navigator to get current position
    // on success callback, get posn and will pan to the posn's lat and lng
    <button className="locate" onClick={() => {
      // most modern browsers have navigator and geolocation built 
      // navigator.geolocation.getCurrentPosition(success, error, options);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log(position);
          panTo({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }, () => null, options);
    }}>
      <img src="compass.png" alt="compass - locate me"/>
    </button>
  );
}

function Search({panTo}) {
  const {
    ready, 
    value, 
    suggestions: { status, data }, 
    setValue, 
    clearSuggestions} 
    = usePlacesAutocomplete({
    requestOptions: {
      location: { // will prefer places user is passing in (e.g. Boston)
        lat: () => 42.361145,
        lng: () => -71.057083,
      },
      radius: 200 * 1000 // unit in meter
    }
  });

  return (
    <div className="search">
      <Combobox 
        // make async fn bc using promises
        onSelect={async (address) => { // when select place
          setValue(address, false); // updates state without calling google api to query
          clearSuggestions() // clears so no longer showing all suggestions
          try {
            const results = await getGeocode({address});
            const {lat, lng} = await getLatLng(results[0]); // convert to lat and lng
            console.log(results[0]);
            console.log(lat, lng);
            panTo({lat, lng}) // reposition in map
          } catch(error) {
            console.log("error!")
          }
          console.log(address)
      }}>
        <ComboboxInput value={value} onChange={(e) => { // wait for user type
          setValue(e.target.value);
        }}
        disabled={!ready}
        placeholder="Enter an address"
        />
        {/* receives all suggestions given by google places */}
        <ComboboxPopover> 
          <ComboboxList>
            {status === "OK" && data.map(({id, description}) => (
              <ComboboxOption key={id} value={description} />
            ))}
          </ComboboxList>
        </ComboboxPopover>
      </Combobox>
    </div>
  )
}

export default App;
