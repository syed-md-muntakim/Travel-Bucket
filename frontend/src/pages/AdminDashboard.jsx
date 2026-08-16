import { useEffect, useState } from "react";
import api from "../api/axios";

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [reviews, setReviews] = useState([]);

  const loadAll = async () => {
    const [s, u, t, r] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/trips"),
      api.get("/admin/reviews"),
    ]);
    setStats(s.data); setUsers(u.data); setTrips(t.data); setReviews(r.data);
  };

  useEffect(() => { loadAll(); }, []);

  const toggleUserActive = async (id, isActive) => {
    await api.patch(`/admin/users/${id}/status`, { isActive: !isActive });
    loadAll();
  };

  const removeReview = async (id) => {
    if (!confirm("Remove this travel library entry?")) return;
    await api.delete(`/admin/reviews/${id}`);
    loadAll();
  };

  return (
    <div>
      <h1>Admin Verification Dashboard</h1>
      <p>Monitor registered users, trips, and travel library activity across the whole system.</p>

      <div className="stats-row">
        <div className="stat-box"><div className="num">{stats.userCount ?? "-"}</div><div className="label">Total Users</div></div>
        <div className="stat-box"><div className="num">{stats.tripCount ?? "-"}</div><div className="label">Total Trips</div></div>
        <div className="stat-box"><div className="num">{stats.activeCompanionTrips ?? "-"}</div><div className="label">Open Companion Trips</div></div>
        <div className="stat-box"><div className="num">{stats.reviewCount ?? "-"}</div><div className="label">Library Entries</div></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>Registered Users</button>
        <button className={`tab ${tab === "trips" ? "active" : ""}`} onClick={() => setTab("trips")}>Trips & Companion Plans</button>
        <button className={`tab ${tab === "reviews" ? "active" : ""}`} onClick={() => setTab("reviews")}>Travel Library</button>
      </div>

      {tab === "users" && (
        <div className="card">
          <table>
            <thead><tr><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.username}</td><td>{u.email}</td><td>{u.phone}</td><td>{u.role}</td>
                  <td>{u.isActive ? "Active" : "Disabled"}</td>
                  <td>
                    {u.role !== "admin" && (
                      <button className={u.isActive ? "btn-danger" : ""} onClick={() => toggleUserActive(u._id, u.isActive)}>
                        {u.isActive ? "Disable" : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "trips" && (
        <div className="card">
          <table>
            <thead><tr><th>Route</th><th>Date</th><th>Mode</th><th>Creator</th><th>Travellers</th><th>Status</th></tr></thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t._id}>
                  <td>{t.departureDistrict} → {t.destinationDistrict}</td>
                  <td>{new Date(t.travelDate).toLocaleDateString()}</td>
                  <td>{t.mode}</td>
                  <td>{t.creator?.username}</td>
                  <td>{t.mode === "companion" ? `${t.travellerCount} / ${t.capacityMax}` : "-"}</td>
                  <td><span className={`badge ${t.status}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "reviews" && (
        <div className="grid">
          {reviews.map((r) => (
            <div className="card" key={r._id}>
              <h3>{r.destination}</h3>
              <p>{r.reviewText}</p>
              <p>By {r.user?.username} — ⭐ {r.rating}/5</p>
              <button className="btn-danger" onClick={() => removeReview(r._id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
