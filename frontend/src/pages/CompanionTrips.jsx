import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import WeatherWidget from "../components/WeatherWidget"; // MEMBER 2: OpenWeatherMap widget

const emptyCompanion = { name: "", phone: "", address: "", nid: "" };
const emptyFilters = { departureDistrict: "", destinationDistrict: "", travelDate: "" };

export default function CompanionTrips() {
  const { user } = useAuth();
  const [available, setAvailable] = useState([]);
  const [joined, setJoined] = useState([]);
  const [tab, setTab] = useState("available");
  const [filters, setFilters] = useState(emptyFilters);
  const [message, setMessage] = useState("");
  const [errorByTrip, setErrorByTrip] = useState({});

  // Which trip's "join" form is currently expanded, and its in-progress companion list
  const [openJoinTripId, setOpenJoinTripId] = useState(null);
  const [companionsByTrip, setCompanionsByTrip] = useState({}); // tripId -> [companion, ...]

  const loadAvailable = async () => {
    const params = {};
    if (filters.departureDistrict) params.departureDistrict = filters.departureDistrict;
    if (filters.destinationDistrict) params.destinationDistrict = filters.destinationDistrict;
    if (filters.travelDate) params.travelDate = filters.travelDate;
    const res = await api.get("/companion-trips", { params });
    setAvailable(res.data);
  };

  const loadJoined = async () => {
    const res = await api.get("/companion-trips/joined");
    setJoined(res.data);
  };

  useEffect(() => { loadAvailable(); loadJoined(); }, []);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadAvailable();
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setTimeout(loadAvailable, 0);
  };

  // ---- Join form helpers ----

  const toggleJoinForm = (tripId) => {
    if (openJoinTripId === tripId) {
      setOpenJoinTripId(null);
      return;
    }
    setOpenJoinTripId(tripId);
    if (!companionsByTrip[tripId]) {
      setCompanionsByTrip({ ...companionsByTrip, [tripId]: [] });
    }
    setErrorByTrip({ ...errorByTrip, [tripId]: "" });
  };

  const addCompanionRow = (tripId) => {
    const current = companionsByTrip[tripId] || [];
    setCompanionsByTrip({ ...companionsByTrip, [tripId]: [...current, { ...emptyCompanion }] });
  };

  const removeCompanionRow = (tripId, index) => {
    const current = companionsByTrip[tripId] || [];
    setCompanionsByTrip({ ...companionsByTrip, [tripId]: current.filter((_, i) => i !== index) });
  };

  const updateCompanionField = (tripId, index, field, value) => {
    const current = [...(companionsByTrip[tripId] || [])];
    current[index] = { ...current[index], [field]: value };
    setCompanionsByTrip({ ...companionsByTrip, [tripId]: current });
  };

  const submitJoin = async (trip) => {
    setMessage("");
    setErrorByTrip({ ...errorByTrip, [trip._id]: "" });

    const companions = companionsByTrip[trip._id] || [];
    const seatsRequested = 1 + companions.length;

    if (seatsRequested > trip.seatsRemaining) {
      setErrorByTrip({
        ...errorByTrip,
        [trip._id]: `Only ${trip.seatsRemaining} seat(s) left — you're requesting ${seatsRequested}.`,
      });
      return;
    }
    for (const c of companions) {
      if (!c.name || !c.phone || !c.address || !c.nid) {
        setErrorByTrip({ ...errorByTrip, [trip._id]: "Fill in name, phone, address and NID for every companion." });
        return;
      }
    }

    try {
      await api.post(`/companion-trips/${trip._id}/join`, { companions });
      setMessage(`Joined successfully with ${seatsRequested} seat(s) reserved!`);
      setOpenJoinTripId(null);
      setCompanionsByTrip({ ...companionsByTrip, [trip._id]: [] });
      loadAvailable();
      loadJoined();
    } catch (err) {
      setErrorByTrip({ ...errorByTrip, [trip._id]: err.response?.data?.message || "Could not join trip" });
    }
  };

  const leave = async (id) => {
    if (!confirm("Leave this trip? This frees up your seat and any companions you registered.")) return;
    await api.patch(`/companion-trips/${id}/leave`);
    loadAvailable();
    loadJoined();
  };

  return (
    <div className="companion-page">
      <h1>Companion Trip Joining</h1>
      <p>
        Browse open group/camping trips (limited to 5-10 travellers) and join with your friends —
        just add their details and their seats are booked under your name.
      </p>

      <div className="tabs">
        <button className={`tab ${tab === "available" ? "active" : ""}`} onClick={() => setTab("available")}>Available Trips</button>
        <button className={`tab ${tab === "joined" ? "active" : ""}`} onClick={() => setTab("joined")}>My Joined Trips</button>
      </div>

      {message && <p className="success">{message}</p>}

      {tab === "available" && (
        <>
          <form onSubmit={handleFilterSubmit} className="search-row">
            <div>
              <label>Departure District</label>
              <input
                name="departureDistrict"
                placeholder="e.g. Dhaka"
                value={filters.departureDistrict}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label>Destination District</label>
              <input
                name="destinationDistrict"
                placeholder="e.g. Sylhet"
                value={filters.destinationDistrict}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label>Travel Date</label>
              <input
                type="date"
                name="travelDate"
                value={filters.travelDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="search-actions">
              <button type="submit">Search</button>
              <button type="button" className="btn-secondary" onClick={clearFilters}>Clear</button>
            </div>
          </form>

          <WeatherWidget district={filters.destinationDistrict} />

          <div className="grid" style={{ marginTop: 16 }}>
            {available.length === 0 && <p>No open companion trips match your search.</p>}
            {available.map((t) => (
              <div className="card" key={t._id}>
                <h3>{t.departureDistrict} → {t.destinationDistrict}</h3>
                <p>{new Date(t.travelDate).toLocaleDateString()} at {t.travelTime}</p>
                <p>Organized by {t.creator?.username}</p>
                {t.description && <p>{t.description}</p>}
                <WeatherWidget district={t.destinationDistrict} />
                <p><strong>Seats:</strong> {t.travellerCount} / {t.capacityMax} booked — <strong>{t.seatsRemaining}</strong> remaining</p>

                {openJoinTripId !== t._id ? (
                  <button onClick={() => toggleJoinForm(t._id)}>Join Trip</button>
                ) : (
                  <div className="join-form">
                    <p style={{ margin: "6px 0" }}>
                      You'll take 1 seat. Add friends joining with you below — each one needs their
                      own details and takes one more seat (max {t.seatsRemaining} total for this booking).
                    </p>

                    {(companionsByTrip[t._id] || []).map((c, i) => (
                      <div className="companion-row" key={i}>
                        <input
                          placeholder="Full name"
                          value={c.name}
                          onChange={(e) => updateCompanionField(t._id, i, "name", e.target.value)}
                        />
                        <input
                          placeholder="Phone number"
                          value={c.phone}
                          onChange={(e) => updateCompanionField(t._id, i, "phone", e.target.value)}
                        />
                        <input
                          placeholder="Address"
                          value={c.address}
                          onChange={(e) => updateCompanionField(t._id, i, "address", e.target.value)}
                        />
                        <input
                          placeholder="NID number"
                          value={c.nid}
                          onChange={(e) => updateCompanionField(t._id, i, "nid", e.target.value)}
                        />
                        <button type="button" className="btn-danger" onClick={() => removeCompanionRow(t._id, i)}>Remove</button>
                      </div>
                    ))}

                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => addCompanionRow(t._id)}
                        disabled={1 + (companionsByTrip[t._id]?.length || 0) >= t.seatsRemaining}
                      >
                        + Add a companion
                      </button>
                      <button type="button" onClick={() => submitJoin(t)}>
                        Confirm Join ({1 + (companionsByTrip[t._id]?.length || 0)} seat{(companionsByTrip[t._id]?.length || 0) > 0 ? "s" : ""})
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => toggleJoinForm(t._id)}>Cancel</button>
                    </div>

                    {errorByTrip[t._id] && <p className="error">{errorByTrip[t._id]}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "joined" && (
        <div className="grid" style={{ marginTop: 16 }}>
          {joined.length === 0 && <p>You haven't joined any companion trips yet.</p>}
          {joined.map((t) => {
            const myBooking = t.joinedUsers?.find((j) => j.user?._id === user?._id);
            const myCompanions = myBooking?.companions || [];
            return (
              <div className="card" key={t._id}>
                <span className={`badge ${t.status}`}>{t.status}</span>
                <h3>{t.departureDistrict} → {t.destinationDistrict}</h3>
                <p>{new Date(t.travelDate).toLocaleDateString()} at {t.travelTime}</p>
                <p>Organized by {t.creator?.username}</p>
                <p><strong>Your seats booked:</strong> {1 + myCompanions.length}</p>
                {myCompanions.length > 0 && (
                  <ul>
                    {myCompanions.map((c, i) => (
                      <li key={i}>{c.name} — {c.phone}</li>
                    ))}
                  </ul>
                )}
                {t.status === "active" && (
                  <button className="btn-danger" onClick={() => leave(t._id)}>Leave Trip</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
