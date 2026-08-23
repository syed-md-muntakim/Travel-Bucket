import { useEffect, useState } from "react";
import api from "../api/axios";
import LocationSearchMap from "../components/LocationSearchMap";
import MapPreview from "../components/MapPreview";
import WeatherWidget from "../components/WeatherWidget"; // Syed addition: OpenWeatherMap widget

const emptyForm = {
  departureDistrict: "",
  destinationDistrict: "",
  travelDate: "",
  travelTime: "",
  mode: "solo",
  description: "",
  capacityMin: 5,
  capacityMax: 10,
  destinationLocation: null,
};

const districts = [
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokathi",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narail",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Nawabganj",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
];

export default function TripPlanner() {
  const [trips, setTrips] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // tripId -> member information
  const [memberInputs, setMemberInputs] = useState({});

  const loadTrips = async () => {
    try {
      const res = await api.get("/trips/mine");
      setTrips(res.data);
    } catch (err) {
      console.error("Failed to load trips:", err);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };
  const handleLocationSelect = (location) => {
  setForm((prev) => ({ ...prev, destinationLocation: location }));
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/trips", form);

      setForm(emptyForm);

      loadTrips();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create trip"
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelTrip = async (id) => {
    if (!confirm("Cancel this trip?")) return;

    try {
      await api.patch(`/trips/${id}/cancel`);
      loadTrips();
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to cancel trip"
      );
    }
  };

  const completeTrip = async (id) => {
    try {
      await api.patch(`/trips/${id}/complete`);
      loadTrips();
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to complete trip"
      );
    }
  };

  // Add member with ID, phone and address
  const addMember = async (tripId) => {
    const input = memberInputs[tripId];

    if (
      !input?.name ||
      !input?.idNumber ||
      !input?.phoneNumber ||
      !input?.address
    ) {
      alert(
        "Please fill in member name, ID number, phone number and address."
      );
      return;
    }

    try {
      await api.post(`/trips/${tripId}/members`, input);

      // Clear the inputs after adding
      setMemberInputs({
        ...memberInputs,
        [tripId]: {
          name: "",
          relation: "other",
          idNumber: "",
          phoneNumber: "",
          address: "",
        },
      });

      loadTrips();
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to add member"
      );
    }
  };

  return (
    <div>
      <h1>Trip Planning & Management</h1>

      {/* ================= PLAN NEW TRIP ================= */}

      <div className="card">
        <h3>Plan a new trip</h3>

        <form onSubmit={handleSubmit}>
          {/* Departure District */}
          <label>Departure District</label>

          <select
            name="departureDistrict"
            value={form.departureDistrict}
            onChange={handleChange}
            required
          >
            <option value="">
              Select departure district
            </option>

            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>

          {/* Destination District */}
          <label>Destination District</label>

          <select
            name="destinationDistrict"
            value={form.destinationDistrict}
            onChange={handleChange}
            required
          >
            <option value="">
              Select destination district
            </option>

            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
            <LocationSearchMap
  onLocationSelect={handleLocationSelect}
  initialLocation={form.destinationLocation}
/>
          {/* Syed addition: live weather preview for the destination being typed */}
          <WeatherWidget district={form.destinationDistrict} />

          {/* Travel Date */}
          <label>Travel Date</label>

          <input
            type="date"
            name="travelDate"
            value={form.travelDate}
            onChange={handleChange}
            required
          />

          {/* Travel Time */}
          <label>Travel Time</label>

          <input
            type="time"
            name="travelTime"
            value={form.travelTime}
            onChange={handleChange}
            required
          />

          {/* Travel Mode */}
          <label>Travel Mode</label>

          <select
            name="mode"
            value={form.mode}
            onChange={handleChange}
          >
            <option value="solo">
              Solo (you, optionally + couple/family)
            </option>

            <option value="companion">
              Companion (open group trip, 5-10 people)
            </option>
          </select>

          {/* Companion Settings */}
          {form.mode === "companion" && (
            <>
              <label>Minimum travellers (5-10)</label>

              <input
                type="number"
                name="capacityMin"
                min={5}
                max={10}
                value={form.capacityMin}
                onChange={handleChange}
              />

              <label>Maximum travellers (5-10)</label>

              <input
                type="number"
                name="capacityMax"
                min={5}
                max={10}
                value={form.capacityMax}
                onChange={handleChange}
              />
            </>
          )}

          {/* Description */}
          <label>Description (optional)</label>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Trip"}
          </button>
        </form>
      </div>

      {/* ================= MY TRIPS ================= */}

      <h2>My Trips</h2>

      <div className="grid">
        {trips.length === 0 && (
          <p>You haven't planned any trips yet.</p>
        )}

        {trips.map((t) => (
          <div className="card" key={t._id}>
            {/* Status */}
            <span className={`badge ${t.status}`}>
              {t.status}
            </span>

            {/* Route */}
            <h3>
              {t.departureDistrict} → {t.destinationDistrict}
            </h3>

            {/* Date and Time */}
            <p>
              {new Date(t.travelDate).toLocaleDateString()} at{" "}
              {t.travelTime}
            </p>

            {/* Mode */}
            <p>
              <strong>Mode:</strong> {t.mode}
            </p>

            {/* Description */}
            {t.description && <p>{t.description}</p>}
            {t.destinationLocation?.lat && t.destinationLocation?.lng && (
  <MapPreview
    lat={t.destinationLocation.lat}
    lng={t.destinationLocation.lng}
    label={t.destinationLocation.displayName}
  />
)}

            {/* ================= SOLO TRIP ================= */}

            {t.mode === "solo" && (
              <div>
                <strong>Members:</strong>

                <ul>
                  {t.members?.length ? (
                    t.members.map((m, i) => (
                      <li
                        key={i}
                        style={{ marginBottom: 12 }}
                      >
                        <strong>{m.name}</strong> (
                        {m.relation})

                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 14,
                          }}
                        >
                          <div>
                            <strong>ID Number:</strong>{" "}
                            {m.idNumber}
                          </div>

                          <div>
                            <strong>Phone Number:</strong>{" "}
                            {m.phoneNumber}
                          </div>

                          <div>
                            <strong>Address:</strong>{" "}
                            {m.address}
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li>Just you</li>
                  )}
                </ul>

                {/* ================= ADD MEMBER ================= */}

                {t.status === "active" && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginBottom: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Member Name */}
                    <input
                      placeholder="Member name"
                      value={
                        memberInputs[t._id]?.name || ""
                      }
                      onChange={(e) =>
                        setMemberInputs({
                          ...memberInputs,
                          [t._id]: {
                            ...memberInputs[t._id],
                            name: e.target.value,
                          },
                        })
                      }
                    />

                    {/* Relation */}
                    <select
                      value={
                        memberInputs[t._id]?.relation ||
                        "other"
                      }
                      onChange={(e) =>
                        setMemberInputs({
                          ...memberInputs,
                          [t._id]: {
                            ...memberInputs[t._id],
                            relation: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="couple">
                        Couple
                      </option>

                      <option value="family">
                        Family
                      </option>

                      <option value="friend">
                        Friend
                      </option>

                      <option value="other">
                        Other
                      </option>
                    </select>

                    {/* ID Number */}
                    <input
                      placeholder="ID Number"
                      value={
                        memberInputs[t._id]?.idNumber || ""
                      }
                      onChange={(e) =>
                        setMemberInputs({
                          ...memberInputs,
                          [t._id]: {
                            ...memberInputs[t._id],
                            idNumber: e.target.value,
                          },
                        })
                      }
                    />

                    {/* Phone Number */}
                    <input
                      placeholder="Phone Number"
                      value={
                        memberInputs[t._id]?.phoneNumber ||
                        ""
                      }
                      onChange={(e) =>
                        setMemberInputs({
                          ...memberInputs,
                          [t._id]: {
                            ...memberInputs[t._id],
                            phoneNumber: e.target.value,
                          },
                        })
                      }
                    />

                    {/* Address */}
                    <input
                      placeholder="Address"
                      value={
                        memberInputs[t._id]?.address || ""
                      }
                      onChange={(e) =>
                        setMemberInputs({
                          ...memberInputs,
                          [t._id]: {
                            ...memberInputs[t._id],
                            address: e.target.value,
                          },
                        })
                      }
                    />

                    {/* Add Button */}
                    <button
                      type="button"
                      onClick={() => addMember(t._id)}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ================= COMPANION TRIP ================= */}
            {/* ================= COMPANION TRIP ================= */}

{t.mode === "companion" && (
  <div>
    {/* Traveller Count */}
    <p>
      <strong>Travellers:</strong>{" "}
      {t.travellerCount} / {t.capacityMax}{" "}
      (min {t.capacityMin})
    </p>

    {/* Companion Members */}
    <div style={{ marginTop: 10 }}>
      <strong>Members:</strong>

      <ul>
        {t.members?.length ? (
          t.members.map((m, i) => (
            <li
              key={i}
              style={{ marginBottom: 12 }}
            >
              <strong>{m.name}</strong> ({m.relation})

              <div
                style={{
                  marginTop: 5,
                  fontSize: 14,
                }}
              >
                <div>
                  <strong>ID Number:</strong>{" "}
                  {m.idNumber}
                </div>

                <div>
                  <strong>Phone Number:</strong>{" "}
                  {m.phoneNumber}
                </div>

                <div>
                  <strong>Address:</strong>{" "}
                  {m.address}
                </div>
              </div>
            </li>
          ))
        ) : (
          <li>No members added yet.</li>
        )}
      </ul>
    </div>

    {/* Add Companion Member */}
    {t.status === "active" &&
      t.travellerCount < t.capacityMax && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          {/* Member Name */}
          <input
            placeholder="Member name"
            value={memberInputs[t._id]?.name || ""}
            onChange={(e) =>
              setMemberInputs({
                ...memberInputs,
                [t._id]: {
                  ...memberInputs[t._id],
                  name: e.target.value,
                },
              })
            }
          />

          {/* Relation */}
          <select
            value={
              memberInputs[t._id]?.relation ||
              "other"
            }
            onChange={(e) =>
              setMemberInputs({
                ...memberInputs,
                [t._id]: {
                  ...memberInputs[t._id],
                  relation: e.target.value,
                },
              })
            }
          >
            <option value="couple">Couple</option>
            <option value="family">Family</option>
            <option value="friend">Friend</option>
            <option value="other">Other</option>
          </select>

          {/* ID Number */}
          <input
            placeholder="ID Number"
            value={
              memberInputs[t._id]?.idNumber || ""
            }
            onChange={(e) =>
              setMemberInputs({
                ...memberInputs,
                [t._id]: {
                  ...memberInputs[t._id],
                  idNumber: e.target.value,
                },
              })
            }
          />

          {/* Phone Number */}
          <input
            placeholder="Phone Number"
            value={
              memberInputs[t._id]?.phoneNumber || ""
            }
            onChange={(e) =>
              setMemberInputs({
                ...memberInputs,
                [t._id]: {
                  ...memberInputs[t._id],
                  phoneNumber: e.target.value,
                },
              })
            }
          />

          {/* Address */}
          <input
            placeholder="Address"
            value={
              memberInputs[t._id]?.address || ""
            }
            onChange={(e) =>
              setMemberInputs({
                ...memberInputs,
                [t._id]: {
                  ...memberInputs[t._id],
                  address: e.target.value,
                },
              })
            }
          />

          {/* Add Button */}
          <button
            type="button"
            onClick={() => addMember(t._id)}
          >
            Add
          </button>
        </div>
      )}
  </div>
)}

            {/* ================= ACTION BUTTONS ================= */}

            {t.status === "active" && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <button
                  className="btn-secondary"
                  onClick={() => completeTrip(t._id)}
                >
                  Mark Completed
                </button>

                <button
                  className="btn-danger"
                  onClick={() => cancelTrip(t._id)}
                >
                  Cancel Trip
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
