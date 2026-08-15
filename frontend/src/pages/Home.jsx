import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="hero">
      <h1>Plan, share, and relive your travels</h1>
      <p>
        Travel Bucket helps you organize solo and companion trips, join group
        travels with other members, and keep a digital library of your travel
        memories complete with photos and reviews.
      </p>

      {!user && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Link className="btn" to="/register">Get Started</Link>
          <Link className="btn btn-secondary" to="/login">Login</Link>
        </div>
      )}
      {user && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Link className="btn" to="/trips">Plan a Trip</Link>
          <Link className="btn btn-secondary" to="/companion-trips">Find Companion Trips</Link>
        </div>
      )}

      <div className="feature-list">
        <div className="card">
          <h3>🗺️ Trip Planning</h3>
          <p>Plan solo or companion trips with departure/destination, date and time.</p>
        </div>
        <div className="card">
          <h3>🧑‍🤝‍🧑 Companion Trips</h3>
          <p>Join open group trips (5-10 travellers) created by other members.</p>
        </div>
        <div className="card">
          <h3>📸 Travel Library</h3>
          <p>Upload photos and write reviews to build your travel memory collection.</p>
        </div>
        <div className="card">
          <h3>👤 Profile & History</h3>
          <p>Track every trip you created or joined, and its current status.</p>
        </div>
      </div>
    </div>
  );
}
