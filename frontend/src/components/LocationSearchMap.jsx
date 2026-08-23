import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api/axios";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER = [23.685, 90.3563];

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 12);
  }, [lat, lng, map]);
  return null;
}

export default function LocationSearchMap({ onLocationSelect, initialLocation }) {
  const [query, setQuery] = useState(initialLocation?.displayName || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(
    initialLocation && initialLocation.lat && initialLocation.lng ? initialLocation : null
  );
  const debounceRef = useRef(null);

  const fetchSuggestions = async (text) => {
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get("/location/search", { params: { query: text } });
      setSuggestions(res.data.results);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Location search failed:", err);
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 400);
  };

  const handleSelect = (place) => {
    const location = { displayName: place.displayName, lat: place.lat, lng: place.lng };
    setQuery(place.displayName);
    setSelected(location);
    setShowSuggestions(false);
    onLocationSelect(location);
  };

  const mapCenter = selected ? [selected.lat, selected.lng] : DEFAULT_CENTER;

  return (
    <div className="location-search">
      <label>Destination on Map (search for the exact spot)</label>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          placeholder="e.g. Cox's Bazar Beach, Sundarbans, Sylhet Tea Garden"
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          autoComplete="off"
        />
        {searching && <span className="location-searching">Searching...</span>}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="location-suggestions">
            {suggestions.map((place) => (
              <li key={place.placeId} onClick={() => handleSelect(place)}>
                {place.displayName}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="map-box">
        <MapContainer center={mapCenter} zoom={selected ? 12 : 7} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {selected && (
            <>
              <Marker position={[selected.lat, selected.lng]} />
              <RecenterMap lat={selected.lat} lng={selected.lng} />
            </>
          )}
        </MapContainer>
      </div>

      {selected && <p className="location-picked">📍 Pinned: {selected.displayName}</p>}
    </div>
  );
}