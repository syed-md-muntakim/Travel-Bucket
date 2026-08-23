import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapPreview({ lat, lng, label }) {
  return (
    <div className="map-preview">
      <MapContainer
        center={[lat, lng]}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} />
      </MapContainer>
      {label && <p className="location-picked">📍 {label}</p>}
    </div>
  );
}