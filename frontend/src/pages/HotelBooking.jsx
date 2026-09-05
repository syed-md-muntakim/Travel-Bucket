import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";

const emptyRoomDraft = { roomType: "", bedType: "", guests: 1 };
const emptyReviewForm = { rating: 5, experience: "" };

function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return ms > 0 ? Math.round(ms / (1000 * 60 * 60 * 24)) : 0;
}

export default function HotelBooking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // Syed addition
  const tripId = searchParams.get("tripId") || ""; // Syed addition: links this booking to a trip

  const [linkedTrip, setLinkedTrip] = useState(null); // Syed addition

  const [catalog, setCatalog] = useState([]); // hotels
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("find");

  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState([]); // rooms added to this booking so far
  const [roomDraft, setRoomDraft] = useState(emptyRoomDraft);
  const [bookingError, setBookingError] = useState("");
  const [message, setMessage] = useState("");

  const [reviewForm, setReviewForm] = useState(emptyReviewForm);
  const [reviewError, setReviewError] = useState("");

  const loadCatalog = async () => {
    const res = await api.get("/hotel-bookings/catalog");
    setCatalog(res.data);
  };

  const loadBookings = async () => {
    const res = await api.get("/hotel-bookings/mine");
    setBookings(res.data);
  };

  useEffect(() => { loadCatalog(); loadBookings(); }, []);

  // Syed addition: when arriving from the trip workflow (Plan trip -> Transport
  // -> Hotel), fetch the trip and auto-select its destination district if the
  // hotel catalog has a match, so the traveller doesn't have to re-pick it.
  useEffect(() => {
    if (!tripId) return;
    api
      .get(`/trips/${tripId}`)
      .then((res) => setLinkedTrip(res.data))
      .catch(() => setLinkedTrip(null));
  }, [tripId]);

  useEffect(() => {
    if (!linkedTrip || catalog.length === 0 || selectedDistrict) return;
    const match = catalog.find((h) => h.district === linkedTrip.destinationDistrict);
    if (match) setSelectedDistrict(match.district);
  }, [linkedTrip, catalog]);

  const selectedHotel = catalog.find((h) => h.district === selectedDistrict) || null;
  const draftRoomType = selectedHotel?.roomTypes.find((rt) => rt.name === roomDraft.roomType) || null;

  const resetBookingState = () => {
    setCheckIn(""); setCheckOut("");
    setRooms([]); setRoomDraft(emptyRoomDraft);
    setBookingError(""); setMessage("");
  };

  const chooseDistrict = (district) => {
    setSelectedDistrict(district);
    resetBookingState();
    setReviewForm(emptyReviewForm);
    setReviewError("");
  };

  const chooseDraftRoomType = (roomTypeName) => {
    setRoomDraft({ roomType: roomTypeName, bedType: "", guests: 1 });
  };

  const addRoom = () => {
    setBookingError("");
    if (!draftRoomType) return setBookingError("Choose a room type first.");
    if (!roomDraft.bedType) return setBookingError("Choose a bed type for this room.");
    if (roomDraft.guests < 1) return setBookingError("Each room needs at least 1 guest.");
    if (roomDraft.guests > draftRoomType.maxOccupancy) {
      return setBookingError(`A ${draftRoomType.name} room holds at most ${draftRoomType.maxOccupancy} guest(s).`);
    }
    if (rooms.length >= 10) return setBookingError("A single booking can hold at most 10 rooms.");

    setRooms([...rooms, { ...roomDraft }]);
    setRoomDraft(emptyRoomDraft);
  };

  const removeRoom = (index) => setRooms(rooms.filter((_, i) => i !== index));

  const submitBooking = async () => {
    setBookingError(""); setMessage("");
    const nights = nightsBetween(checkIn, checkOut);
    if (nights <= 0) return setBookingError("Choose a valid check-in/check-out date range.");
    if (rooms.length === 0) return setBookingError("Add at least one room to your booking.");

    try {
      const res = await api.post("/hotel-bookings", {
        hotelId: selectedHotel._id,
        checkIn, checkOut, rooms,
        tripId: tripId || undefined, // Syed addition: links this booking to the trip
      });
      const totalGuests = res.data.rooms.reduce((sum, r) => sum + r.guests, 0);
      setMessage(`Booked ${selectedHotel.name} - ${rooms.length} room(s) for ${totalGuests} guest(s), ${nights} night(s)! Check your email/SMS for confirmation.`);
      setSelectedDistrict("");
      resetBookingState();
      loadBookings();
      // Syed addition: continue the workflow to the Trip Details receipt page
      if (tripId) navigate(`/trip-details/${tripId}`);
    } catch (err) {
      setBookingError(err.response?.data?.message || "Failed to book hotel");
    }
  };

  const cancelBooking = async (id) => {
    if (!confirm("Cancel this booking?")) return;
    await api.patch(`/hotel-bookings/${id}/cancel`);
    loadBookings();
  };

  // Syed change: when this hotel step is part of the Plan trip -> Transport ->
  // Hotel -> Trip Details workflow, skipping goes to that trip's receipt page
  // instead of the generic trip list.
  const skipHotelBooking = () => navigate(tripId ? `/trip-details/${tripId}` : "/trips");

  const submitReview = async () => {
    setReviewError("");
    if (!reviewForm.experience.trim()) return setReviewError("Write about your experience.");
    try {
      await api.post(`/hotel-bookings/catalog/${selectedHotel._id}/reviews`, reviewForm);
      setReviewForm(emptyReviewForm);
      loadCatalog();
    } catch (err) {
      setReviewError(err.response?.data?.message || "Failed to post review");
    }
  };

  const previewNights = nightsBetween(checkIn, checkOut);
  const roomsPricePerNight = selectedHotel
    ? rooms.reduce((sum, r) => {
        const rt = selectedHotel.roomTypes.find((x) => x.name === r.roomType);
        return sum + (rt ? selectedHotel.pricePerNight * rt.priceMultiplier : 0);
      }, 0)
    : 0;
  const previewTotal = Math.round(previewNights * roomsPricePerNight);
  const totalGuestsSoFar = rooms.reduce((sum, r) => sum + r.guests, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1>Hotel Booking</h1>
          <p>Pick your district, add one or more rooms with the room and bed type you need, then book.</p>
          {linkedTrip && (
            <p className="selected-trip-note">
              Booking for trip: {linkedTrip.departureDistrict} → {linkedTrip.destinationDistrict}
            </p>
          )}
        </div>
        <button type="button" className="btn-secondary" onClick={skipHotelBooking}>
          Skip hotel booking
        </button>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "find" ? "active" : ""}`} onClick={() => setTab("find")}>Find & Book</button>
        <button className={`tab ${tab === "mine" ? "active" : ""}`} onClick={() => setTab("mine")}>My Bookings</button>
      </div>

      {message && <p className="success">{message}</p>}

      {tab === "find" && (
        <>
          <div style={{ marginTop: 16 }}>
            <label>District</label>
            <select value={selectedDistrict} onChange={(e) => chooseDistrict(e.target.value)}>
              <option value="">Select a district</option>
              {catalog.map((h) => (
                <option key={h._id} value={h.district}>{h.district}</option>
              ))}
            </select>
          </div>

          {selectedHotel && (
            <div className="card hotel-card" style={{ marginTop: 16 }}>
              <h3 style={{ margin: 0 }}>{selectedHotel.name}</h3>
              <p style={{ margin: "4px 0", color: "#6b7280" }}>{selectedHotel.district}</p>
              <p style={{ margin: "4px 0", fontWeight: 700, color: "#0f766e" }}>
                {selectedHotel.pricePerNight} BDT / night (Standard, before room type)
              </p>
              {selectedHotel.amenities?.length > 0 && (
                <div className="amenity-tags">
                  {selectedHotel.amenities.map((a, i) => <span className="amenity-tag" key={i}>{a}</span>)}
                </div>
              )}
              {selectedHotel.description && <p>{selectedHotel.description}</p>}
              {selectedHotel.averageRating !== null && (
                <p className="rating-pill" style={{ display: "inline-block" }}>
                  ★ {selectedHotel.averageRating} ({selectedHotel.reviewCount} review{selectedHotel.reviewCount !== 1 ? "s" : ""})
                </p>
              )}

              <div className="join-form" style={{ marginTop: 12 }}>
                <label>Check-in</label>
                <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                <label>Check-out</label>
                <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
              </div>

              <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                <strong>Rooms</strong>

                {rooms.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {rooms.map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                        <span>Room {i + 1}: {r.roomType}, {r.bedType} bed, {r.guests} guest{r.guests > 1 ? "s" : ""}</span>
                        <button type="button" className="btn-danger" onClick={() => removeRoom(i)}>Remove</button>
                      </div>
                    ))}
                    <p style={{ fontWeight: 600, marginTop: 4 }}>Total guests so far: {totalGuestsSoFar}</p>
                  </div>
                )}

                <div className="join-form" style={{ marginTop: 10 }}>
                  <label>Add a Room — Room Type</label>
                  <select value={roomDraft.roomType} onChange={(e) => chooseDraftRoomType(e.target.value)}>
                    <option value="">Select a room type</option>
                    {selectedHotel.roomTypes.map((rt) => (
                      <option key={rt.name} value={rt.name}>
                        {rt.name} ({rt.priceMultiplier}x, up to {rt.maxOccupancy} guest{rt.maxOccupancy > 1 ? "s" : ""})
                      </option>
                    ))}
                  </select>

                  {draftRoomType && (
                    <>
                      <label>Bed Type</label>
                      <select
                        value={roomDraft.bedType}
                        onChange={(e) => setRoomDraft({ ...roomDraft, bedType: e.target.value })}
                      >
                        <option value="">Select a bed type</option>
                        {draftRoomType.bedOptions.map((bt) => (
                          <option key={bt} value={bt}>{bt}</option>
                        ))}
                      </select>

                      <label>Guests in this room</label>
                      <input
                        type="number"
                        min="1"
                        max={draftRoomType.maxOccupancy}
                        value={roomDraft.guests}
                        onChange={(e) => setRoomDraft({ ...roomDraft, guests: Number(e.target.value) })}
                      />
                    </>
                  )}

                  <button type="button" onClick={addRoom} style={{ marginTop: 6 }}>Add Room</button>
                </div>

                {previewNights > 0 && rooms.length > 0 && (
                  <p style={{ fontWeight: 600, marginTop: 10 }}>
                    {previewNights} night(s), {rooms.length} room(s) — Total: {previewTotal} BDT
                  </p>
                )}
                {bookingError && <p className="error">{bookingError}</p>}
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button type="button" onClick={submitBooking}>Confirm Booking</button>
                </div>
              </div>

              <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                <strong>Reviews</strong>
                {(!selectedHotel.reviews || selectedHotel.reviews.length === 0) && (
                  <p style={{ color: "#6b7280" }}>No reviews yet.</p>
                )}
                {selectedHotel.reviews?.map((r) => (
                  <div key={r._id} style={{ marginTop: 8 }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>⭐ {r.rating}/5 — {r.user?.username}</p>
                    <p style={{ margin: "2px 0" }}>{r.experience}</p>
                  </div>
                ))}

                <div className="join-form" style={{ marginTop: 12 }}>
                  <label>Leave a Review</label>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                  >
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
                  </select>
                  <textarea
                    rows={2}
                    placeholder="Share your experience..."
                    value={reviewForm.experience}
                    onChange={(e) => setReviewForm({ ...reviewForm, experience: e.target.value })}
                  />
                  {reviewError && <p className="error">{reviewError}</p>}
                  <button type="button" onClick={submitReview}>Post Review</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "mine" && (
        <div className="grid" style={{ marginTop: 16 }}>
          {bookings.length === 0 && <p>You haven't booked any hotels yet.</p>}
          {bookings.map((b) => (
            <div className="card" key={b._id}>
              <span className={`badge ${b.status === "booked" ? "active" : "cancelled"}`}>{b.status}</span>
              <h3>{b.hotel?.name}</h3>
              <p style={{ color: "#6b7280" }}>{b.hotel?.district}</p>
              <p>{new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()} ({b.nights} night{b.nights > 1 ? "s" : ""})</p>
              {b.rooms.map((r, i) => (
                <p key={i} style={{ margin: "2px 0" }}>
                  Room {i + 1}: {r.roomType}, {r.bedType} bed, {r.guests} guest{r.guests > 1 ? "s" : ""}
                </p>
              ))}
              <p style={{ fontWeight: 700, color: "#0f766e" }}>Total: {b.totalPrice} BDT</p>
              {b.status === "booked" && (
                <button className="btn-danger" onClick={() => cancelBooking(b._id)}>Cancel Booking</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

