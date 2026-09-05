// frontend/src/pages/TripDetails.jsx
// MEMBER 2 FEATURE FILE — new addition, no other member's code touches this file.
//
// The final "receipt" step of the workflow:
//   Plan trip -> Transport Book/Skip -> Hotel Book/Skip -> Trip Details
// Shows the trip's route/date/time, whichever transport + hotel bookings are
// linked to it (or "Skipped" if none), and the expense breakdown/total.
// Reachable both automatically at the end of the booking flow, and any time
// afterward via "View Details" on the trip in Trip Planning's My Trips list.

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import ExpenseBreakdown from "../components/ExpenseBreakdown";

export default function TripDetails() {
  const { tripId } = useParams();

  const [trip, setTrip] = useState(null);
  const [transportBooking, setTransportBooking] = useState(null);
  const [hotelBooking, setHotelBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [tripRes, transportRes, hotelRes] = await Promise.all([
        api.get(`/trips/${tripId}`),
        api.get("/transport-bookings/mine").catch(() => ({ data: [] })),
        api.get("/hotel-bookings/mine").catch(() => ({ data: [] })),
      ]);

      setTrip(tripRes.data);
      setTransportBooking(
        transportRes.data.find((b) => b.trip && (b.trip._id === tripId || b.trip === tripId)) || null
      );
      setHotelBooking(
        hotelRes.data.find((b) => b.trip && (b.trip._id === tripId || b.trip === tripId)) || null
      );
    } catch (err) {
      setError(err.response?.data?.message || "Could not load trip details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [tripId]);

  const markCompleted = async () => {
    setCompleting(true);
    try {
      await api.patch(`/trips/${tripId}/complete`);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark trip as completed");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <p className="page-loading">Loading trip details...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!trip) return null;

  return (
    <div className="trip-details-page">
      <h1>Trip Details</h1>
      <p className="trip-details-subtitle">Your trip receipt — route, transport, hotel and total cost in one place.</p>

      <div className="card receipt-card">
        <span className={`badge ${trip.status}`}>{trip.status}</span>

        <h3>{trip.departureDistrict} → {trip.destinationDistrict}</h3>
        <p><strong>Date & Time:</strong> {new Date(trip.travelDate).toLocaleDateString()} at {trip.travelTime}</p>
        <p><strong>Mode:</strong> {trip.mode}</p>

        <div className="receipt-section">
          <h4>Transport</h4>
          {transportBooking ? (
            <>
              <p>{transportBooking.transport?.serviceName} ({transportBooking.transport?.transportType})</p>
              <p>{transportBooking.transport?.fromDistrict} → {transportBooking.transport?.toDistrict}</p>
              <p>Departure: {transportBooking.transport?.departureTime}</p>
              <p>Passengers: {transportBooking.passengerCount}</p>
              <p>Status: {transportBooking.bookingStatus.replace("_", " ")}</p>
            </>
          ) : (
            <p className="receipt-skipped">Skipped — no transport booked for this trip.</p>
          )}
        </div>

        <div className="receipt-section">
          <h4>Hotel</h4>
          {hotelBooking ? (
            <>
              <p>{hotelBooking.hotel?.name} ({hotelBooking.hotel?.district})</p>
              <p>{new Date(hotelBooking.checkIn).toLocaleDateString()} → {new Date(hotelBooking.checkOut).toLocaleDateString()} ({hotelBooking.nights} night{hotelBooking.nights > 1 ? "s" : ""})</p>
              <p>{hotelBooking.rooms?.length} room(s), {hotelBooking.totalGuests} guest(s)</p>
              <p>Status: {hotelBooking.status}</p>
            </>
          ) : (
            <p className="receipt-skipped">Skipped — no hotel booked for this trip.</p>
          )}
        </div>

        <div className="receipt-section">
          <ExpenseBreakdown tripId={tripId} />
        </div>

        <div className="receipt-actions">
          {trip.status === "active" && (
            <button onClick={markCompleted} disabled={completing}>
              {completing ? "Marking..." : "Mark Trip as Completed"}
            </button>
          )}
          <Link className="btn-secondary" to="/trips" style={{ display: "inline-block", textDecoration: "none" }}>
            Back to My Trips
          </Link>
        </div>
      </div>
    </div>
  );
}
