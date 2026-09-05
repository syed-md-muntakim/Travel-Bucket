import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";


const initialsOf = (name = "") => {
  const clean = name.replace(/[^a-zA-Z ]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase() || "TB";
};


const formatMonthYear = (date) =>
  date ? new Date(date).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";


const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "";


export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ phone: "", address: "", email: "", currentPassword: "", newPassword: "", emailNotifications: true, smsNotifications: false });
  const [history, setHistory] = useState({ created: [], joined: [], summary: {} });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState("history"); // "history" | "edit"
  const [filter, setFilter] = useState("all"); // "all" | "active" | "completed" | "cancelled"
  const [testStatus, setTestStatus] = useState("");


  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        phone: user.phone,
        address: user.address,
        email: user.email,
        emailNotifications: user.emailNotifications !== false,
        smsNotifications: user.smsNotifications === true,
      }));
    }
    loadHistory();
  }, [user]);


  const loadHistory = async () => {
    const res = await api.get("/profile/history");
    setHistory(res.data);
  };


  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };


  const handleSendTest = async () => {
    setTestStatus("Sending...");
    try {
      const res = await api.post("/profile/notifications/test");
      const emailNote = res.data.email?.sent ? "Email sent." : res.data.email?.reason === "opted-out" ? "Email skipped (opted out)." : "Email not sent (SMTP not configured — check server console).";
      const smsNote = res.data.sms?.sent ? "SMS sent." : res.data.sms?.reason === "opted-out" ? "SMS skipped (not enabled)." : "SMS not sent (GreenWeb not configured — check server console).";
      setTestStatus(`${emailNote} ${smsNote}`);
    } catch (err) {
      setTestStatus(err.response?.data?.message || "Failed to send test notification");
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(""); setError("");
    try {
      const res = await api.put("/profile", form);
      setUser(res.data);
      setForm((f) => ({ ...f, currentPassword: "", newPassword: "" }));
      setMessage("Profile updated successfully");
      setView("history");
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    }
  };


  const trips = [
    ...history.created.map((t) => ({ ...t, roleLabel: "Creator", tripType: t.mode === "companion" ? "Companion trip" : "Solo trip" })),
    ...history.joined.map((t) => ({ ...t, roleLabel: "Companion", tripType: "Companion trip" })),
  ].sort((a, b) => new Date(b.travelDate) - new Date(a.travelDate));


  const visibleTrips = filter === "all" ? trips : trips.filter((t) => t.status === filter);


  const filters = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];


  const displayName = user?.username || "";


  return (
    <div>
      <h1>My Profile & Travel History</h1>


      {/* Identity card */}
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: "50%", background: "#0f766e", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.1rem", fontWeight: 700, flexShrink: 0,
            }}
          >
            {initialsOf(displayName)}
          </div>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{displayName}</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 2 }}>
              Member since {formatMonthYear(user?.memberSince || user?.createdAt)}
              {user?.address ? <>&nbsp;·&nbsp;{user.address}</> : null}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={() => navigate("/stats")}>
            My Statistics
          </button>
          <button className="btn-secondary" onClick={() => setView(view === "edit" ? "history" : "edit")}>
            {view === "edit" ? "Back to history" : "Edit profile"}
          </button>
        </div>
      </div>


      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-box"><div className="num">{history.summary.totalCreated || 0}</div><div className="label">Trips Created</div></div>
        <div className="stat-box"><div className="num">{history.summary.totalJoined || 0}</div><div className="label">Trips Joined</div></div>
        <div className="stat-box"><div className="num">{history.summary.districtsVisited || 0}</div><div className="label">Districts Visited</div></div>
        <div className="stat-box"><div className="num">{history.summary.upcoming || 0}</div><div className="label">Trips Upcoming</div></div>
      </div>


      {view === "history" && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Trip history</h3>
            <div className="tabs" style={{ margin: 0 }}>
              {filters.map((f) => (
                <button
                  key={f.key}
                  className={`tab ${filter === f.key ? "active" : ""}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>


          <table>
            <thead>
              <tr><th>Route</th><th>Trip Type</th><th>Role</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {visibleTrips.map((t) => (
                <tr key={t._id}>
                  <td>{t.departureDistrict} → {t.destinationDistrict}</td>
                  <td>
                    {t.tripType}
                    {t.mode === "companion" && (
                      <span style={{ color: "#6b7280" }}>
                        {" "}({t.travellerCount ?? (1 + (t.joinedUsers?.length || 0))} of {t.capacityMax ?? "—"} joined)
                      </span>
                    )}
                  </td>
                  <td>{t.roleLabel}</td>
                  <td>{formatDate(t.travelDate)}</td>
                  <td><span className={`badge ${t.status}`}>{t.status}</span></td>
                </tr>
              ))}
              {visibleTrips.length === 0 && (
                <tr><td colSpan={5}>No trips in this filter yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}


      {view === "edit" && (
        <div className="card" style={{ maxWidth: 480 }}>
          <p><strong>Username:</strong> {user?.username} (cannot be changed)</p>
          <form onSubmit={handleSubmit}>
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} />


            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} />


            <label>Address</label>
            <input name="address" value={form.address} onChange={handleChange} />


            <hr />
            <label>Current Password (only needed to change password)</label>
            <input type="password" name="currentPassword" value={form.currentPassword} onChange={handleChange} />


            <label>New Password</label>
            <input type="password" name="newPassword" value={form.newPassword} onChange={handleChange} />


            <hr />
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                name="emailNotifications"
                checked={form.emailNotifications}
                onChange={handleChange}
              />
              Email me about registration, companion trip joins/leaves, cancellations and important travel info
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                name="smsNotifications"
                checked={form.smsNotifications}
                onChange={handleChange}
              />
              Also text me the same updates via SMS (sent to the phone number above)
            </label>


            {message && <p className="success">{message}</p>}
            {error && <p className="error">{error}</p>}
            <button type="submit">Save Changes</button>
          </form>


          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
            <button type="button" className="btn-secondary" onClick={handleSendTest}>
              Send test notification (email + SMS)
            </button>
            {testStatus && <p style={{ marginTop: 8, color: "#6b7280", fontSize: "0.85rem" }}>{testStatus}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
