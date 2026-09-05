import { useEffect, useState } from "react";
import api from "../api/axios";

const emptyHotelForm = { name: "", district: "", pricePerNight: "", description: "", amenities: "" };

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [hotels, setHotels] = useState([]);

  const [hotelForm, setHotelForm] = useState(emptyHotelForm);
  const [hotelFormError, setHotelFormError] = useState("");
  const [showHotelForm, setShowHotelForm] = useState(false);

  const loadAll = async () => {
    const [s, u, t, r, h] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/trips"),
      api.get("/admin/reviews"),
      api.get("/admin/hotels"),
    ]);
    setStats(s.data); setUsers(u.data); setTrips(t.data); setReviews(r.data); setHotels(h.data);
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

  const handleHotelFormChange = (e) => setHotelForm({ ...hotelForm, [e.target.name]: e.target.value });

  const submitHotel = async (e) => {
    e.preventDefault();
    setHotelFormError("");
    try {
      await api.post("/admin/hotels", hotelForm);
      setHotelForm(emptyHotelForm);
      setShowHotelForm(false);
      loadAll();
    } catch (err) {
      setHotelFormError(err.response?.data?.message || "Failed to post hotel");
    }
  };

  const removeHotel = async (id) => {
    if (!confirm("Delete this hotel? Its bookings will keep their history but the hotel will no longer be bookable.")) return;
    await api.delete(`/admin/hotels/${id}`);
    loadAll();
  };

  const removeHotelReview = async (hotelId, reviewId) => {
    if (!confirm("Remove this hotel review?")) return;
    await api.delete(`/admin/hotels/${hotelId}/reviews/${reviewId}`);
    loadAll();
  };

  return (
    <div>
      <h1>Admin Verification Dashboard</h1>
      <p>Monitor registered users, trips, travel library activity, and hotels across the whole system.</p>

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
        <button className={`tab ${tab === "hotels" ? "active" : ""}`} onClick={() => setTab("hotels")}>Hotels</button>
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

      {tab === "hotels" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => { setShowHotelForm(!showHotelForm); setHotelFormError(""); }}>
              {showHotelForm ? "Cancel" : "Post New Hotel"}
            </button>
          </div>

          {showHotelForm && (
            <form onSubmit={submitHotel} className="card" style={{ marginBottom: 16 }}>
              <label>Hotel Name</label>
              <input name="name" value={hotelForm.name} onChange={handleHotelFormChange} required />

              <label>District</label>
              <input name="district" value={hotelForm.district} onChange={handleHotelFormChange} required />

              <label>Price / Night (BDT)</label>
              <input type="number" min="0" name="pricePerNight" value={hotelForm.pricePerNight} onChange={handleHotelFormChange} required />

              <label>Amenities (comma separated)</label>
              <input name="amenities" placeholder="Free WiFi, Pool, Breakfast Included" value={hotelForm.amenities} onChange={handleHotelFormChange} />

              <label>Description</label>
              <textarea name="description" value={hotelForm.description} onChange={handleHotelFormChange} rows={3} />

              {hotelFormError && <p className="error">{hotelFormError}</p>}
              <button type="submit" style={{ marginTop: 8 }}>Post Hotel</button>
            </form>
          )}

          <div className="grid">
            {hotels.map((h) => (
              <div className="card hotel-card" key={h._id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <h3 style={{ margin: 0 }}>{h.name}</h3>
                  {h.averageRating !== null && <span className="rating-pill">★ {h.averageRating} ({h.reviewCount})</span>}
                </div>
                <p style={{ margin: "4px 0", color: "#6b7280" }}>{h.district}</p>
                <p style={{ margin: "4px 0", fontWeight: 700, color: "#0f766e" }}>{h.pricePerNight} BDT / night</p>
                {h.amenities?.length > 0 && (
                  <div className="amenity-tags">
                    {h.amenities.map((a, i) => <span className="amenity-tag" key={i}>{a}</span>)}
                  </div>
                )}
                <button className="btn-danger" style={{ marginTop: 8 }} onClick={() => removeHotel(h._id)}>Delete Hotel</button>

                {h.reviews?.length > 0 && (
                  <div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
                    <strong>Reviews ({h.reviews.length})</strong>
                    {h.reviews.map((r) => (
                      <div key={r._id} style={{ marginTop: 6, fontSize: 14 }}>
                        <p style={{ margin: 0 }}>⭐ {r.rating}/5 — {r.user?.username}</p>
                        <p style={{ margin: "2px 0" }}>{r.experience}</p>
                        <button className="btn-danger" onClick={() => removeHotelReview(h._id, r._id)}>Delete Review</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
