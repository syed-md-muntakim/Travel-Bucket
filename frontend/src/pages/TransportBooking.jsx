import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const districts = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogura",
  "Brahmanbaria", "Chandpur", "Chattogram", "Chuadanga", "Cox's Bazar",
  "Cumilla", "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha",
  "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore", "Jhalokathi",
  "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj",
  "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur",
  "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj",
  "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi",
  "Natore", "Nawabganj", "Netrokona", "Nilphamari", "Noakhali", "Pabna",
  "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi",
  "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj",
  "Sunamganj", "Sylhet", "Tangail", "Thakurgaon",
];

const emptyPassenger = () => ({ name: "", email: "", phone: "" });

const formatDuration = (minutes) => {
  const hours = Math.floor(Number(minutes || 0) / 60);
  const mins = Number(minutes || 0) % 60;
  const text = `${hours ? `${hours}h ` : ""}${mins ? `${mins}m` : ""}`.trim();
  return text || "0m";
};

const formatMoney = (amount) => `৳${Number(amount || 0).toLocaleString()}`;

const dateForInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const buildPassengersFromTrip = (trip, fallbackUser) => {
  const list = [];

  const creator = trip?.creator && typeof trip.creator === "object"
    ? trip.creator
    : fallbackUser;

  if (creator) {
    list.push({
      name: creator.username || "",
      email: creator.email || "",
      phone: creator.phone || "",
    });
  }

  (trip?.members || []).forEach((member) => {
    list.push({
      name: member.name || "",
      email: "",
      phone: member.phoneNumber || "",
    });
  });

  (trip?.joinedUsers || []).forEach((joined) => {
    const joinedUser = joined?.user;
    if (!joinedUser || typeof joinedUser !== "object") return;

    const alreadyIncluded = list.some(
      (passenger) =>
        passenger.email &&
        joinedUser.email &&
        passenger.email.toLowerCase() === joinedUser.email.toLowerCase()
    );
    if (alreadyIncluded) return;

    list.push({
      name: joinedUser.username || "",
      email: joinedUser.email || "",
      phone: joinedUser.phone || "",
    });
  });

  if (!list.length) {
    list.push({
      name: fallbackUser?.username || "",
      email: fallbackUser?.email || "",
      phone: fallbackUser?.phone || "",
    });
  }

  const tripCount = Number(trip?.travellerCount) || list.length || 1;
  const finalCount = Math.max(1, Math.min(50, Math.max(tripCount, list.length)));

  while (list.length < finalCount) list.push(emptyPassenger());
  return list.slice(0, finalCount);
};

export default function TransportBooking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const confirmingSessionRef = useRef("");

  const tripId = searchParams.get("tripId") || "";

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripLoading, setTripLoading] = useState(false);

  const [search, setSearch] = useState({
    fromDistrict: "",
    toDistrict: "",
    travelDate: "",
    departureTime: "",
    transportType: "all",
  });

  const [passengerCount, setPassengerCount] = useState(1);
  const [passengers, setPassengers] = useState([emptyPassenger()]);

  const [recommendation, setRecommendation] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");

  const [results, setResults] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [myBookings, setMyBookings] = useState([]);

  const clearTransportChoices = () => {
    setRecommendation(null);
    setRecommendationError("");
    setResults([]);
    setSelectedTransport(null);
  };

  const updateSearch = (field, value) => {
    setSearch((prev) => ({ ...prev, [field]: value }));
    if (["fromDistrict", "toDistrict", "travelDate", "departureTime"].includes(field)) {
      clearTransportChoices();
    }
  };

  const updatePassengerCount = (rawCount) => {
    const nextCount = Math.max(1, Math.min(50, Number(rawCount) || 1));
    setPassengerCount(nextCount);
    setPassengers((prev) => {
      const next = prev.slice(0, nextCount);
      while (next.length < nextCount) next.push(emptyPassenger());
      return next;
    });
    clearTransportChoices();
  };

  const updatePassenger = (index, field, value) => {
    setPassengers((prev) =>
      prev.map((passenger, passengerIndex) =>
        passengerIndex === index
          ? { ...passenger, [field]: value }
          : passenger
      )
    );
  };

  const loadMyBookings = async () => {
    try {
      const res = await api.get("/transport-bookings/mine");
      setMyBookings(res.data);
    } catch (err) {
      console.error("Failed to load transport bookings:", err);
    }
  };

  useEffect(() => {
    loadMyBookings();
  }, []);

  useEffect(() => {
    if (tripId) return;

    setPassengers((prev) => {
      const next = [...prev];
      next[0] = {
        name: next[0]?.name || user?.username || "",
        email: next[0]?.email || user?.email || "",
        phone: next[0]?.phone || user?.phone || "",
      };
      return next;
    });
  }, [user, tripId]);

  useEffect(() => {
    if (!tripId) return;

    setTripLoading(true);
    setError("");

    api
      .get(`/trips/${tripId}`)
      .then((res) => {
        const trip = res.data;
        setSelectedTrip(trip);
        setSearch({
          fromDistrict: trip.departureDistrict || "",
          toDistrict: trip.destinationDistrict || "",
          travelDate: dateForInput(trip.travelDate),
          departureTime: trip.travelTime || "",
          transportType: "all",
        });

        const tripPassengers = buildPassengersFromTrip(trip, user);
        setPassengerCount(tripPassengers.length);
        setPassengers(tripPassengers);
        setRecommendation(null);
        setRecommendationError("");
        setResults([]);
        setSelectedTransport(null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Selected trip could not be loaded.");
      })
      .finally(() => setTripLoading(false));
  }, [tripId, user]);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (payment === "cancelled") {
      setMessage("Payment was cancelled. No ticket was confirmed.");
      setSearchParams((params) => {
        params.delete("payment");
        return params;
      });
      return;
    }

    if (
      payment !== "success" ||
      !sessionId ||
      confirmingSessionRef.current === sessionId
    ) {
      return;
    }

    confirmingSessionRef.current = sessionId;
    setBookingLoading(true);
    setError("");

    api
      .post("/transport-bookings/confirm", { sessionId })
      .then((res) => {
        setConfirmedBooking(res.data);
        setMessage("Payment successful. Your transport ticket is confirmed.");
        loadMyBookings();
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not confirm the ticket after payment.");
      })
      .finally(() => {
        setBookingLoading(false);
        setSearchParams((params) => {
          params.delete("payment");
          params.delete("session_id");
          return params;
        });
      });
  }, [searchParams, setSearchParams]);

  const findBestTransportation = async (e) => {
    e?.preventDefault();
    setRecommendation(null);
    setRecommendationError("");
    setMessage("");

    if (
      !search.fromDistrict ||
      !search.toDistrict ||
      !search.travelDate ||
      !search.departureTime
    ) {
      setRecommendationError(
        "Enter departure location, destination, departure date and departure time."
      );
      return;
    }

    setRecommendationLoading(true);

    try {
      const res = await api.post("/transports/recommend", {
        fromDistrict: search.fromDistrict,
        toDistrict: search.toDistrict,
        travelDate: search.travelDate,
        departureTime: search.departureTime,
        passengerCount,
      });
      setRecommendation(res.data.recommendation);
    } catch (err) {
      setRecommendationError(
        err.response?.data?.message || "Failed to find the best transportation."
      );
    } finally {
      setRecommendationLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setConfirmedBooking(null);

    try {
      const params = new URLSearchParams({
        fromDistrict: search.fromDistrict,
        toDistrict: search.toDistrict,
        travelDate: search.travelDate,
        passengerCount: String(passengerCount),
      });

      if (search.transportType !== "all") {
        params.append("transportType", search.transportType);
      }
      if (search.departureTime) {
        params.append("departureTime", search.departureTime);
      }

      const res = await api.get(`/transports/search?${params.toString()}`);
      setResults(res.data);
      setSelectedTransport(null);

      if (!res.data.length) {
        setMessage("No tickets are available for the selected route, date and passenger count.");
      }
    } catch (err) {
      setResults([]);
      setError(err.response?.data?.message || "Failed to search transport tickets.");
    } finally {
      setLoading(false);
    }
  };

  const chooseRecommendedTransport = () => {
    if (!recommendation) return;
    setSelectedTransport(recommendation);
    setError("");
    window.setTimeout(() => {
      document
        .getElementById("book-selected-ticket")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const startCheckout = async (e) => {
    e.preventDefault();
    if (!selectedTransport) return;

    const invalidPassenger = passengers.find((passenger) => !passenger.name.trim());
    if (invalidPassenger) {
      setError("Enter a name for every passenger before payment.");
      return;
    }

    if (!search.travelDate) {
      setError("Choose a travel date before booking this ticket.");
      return;
    }

    setBookingLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.post("/transport-bookings/checkout", {
        transportId: selectedTransport._id,
        tripId: tripId || undefined,
        travelDate: search.travelDate,
        passengerCount,
        passengers,
      });

      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to open Stripe checkout.");
      setBookingLoading(false);
    }
  };

  const skipTransportation = () => navigate("/hotel-booking");

  const totalPrice = selectedTransport
    ? selectedTransport.price * passengerCount
    : 0;

  return (
    <div>
      <div className="transport-page-header">
        <div>
          <h1>Transport Ticket Booking</h1>
          {selectedTrip && (
            <p className="selected-trip-note">
              Selected trip: {selectedTrip.departureDistrict} → {selectedTrip.destinationDistrict}
            </p>
          )}
        </div>
        <button type="button" className="btn-secondary" onClick={skipTransportation}>
          Skip Transportation
        </button>
      </div>

      {tripLoading && <p className="page-loading">Loading selected trip...</p>}
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {confirmedBooking && (
        <div className="card ticket-confirmation">
          <span className="badge completed">Confirmed</span>
          <h3>E-Ticket</h3>
          <p><strong>Booking ID:</strong> {confirmedBooking._id}</p>
          <p>
            <strong>Route:</strong> {confirmedBooking.transport?.fromDistrict} → {confirmedBooking.transport?.toDistrict}
          </p>
          <p>
            <strong>Service:</strong> {confirmedBooking.transport?.serviceName} ({confirmedBooking.transport?.transportType})
          </p>
          <p><strong>Departure:</strong> {confirmedBooking.transport?.departureTime}</p>
          <p><strong>Passengers:</strong> {confirmedBooking.passengerCount}</p>
          <p><strong>Paid:</strong> {formatMoney(confirmedBooking.amount)}</p>

          <div className="ticket-passengers">
            {confirmedBooking.passengers?.map((passenger, index) => (
              <div key={`${passenger.name}-${index}`}>
                <strong>{passenger.name}</strong>
                <span>Seat: {confirmedBooking.seatNumbers?.[index] || "Assigned"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= BEST TRANSPORTATION ================= */}
      <div className="card best-transport-page-card">
        <h3>Best Transportation</h3>
        <p className="best-transport-help">
          Uses departure location, destination, date and departure time to find the most suitable available service.
        </p>

        <form className="transport-search-form" onSubmit={findBestTransportation}>
          <div>
            <label>Departure Location</label>
            <select
              value={search.fromDistrict}
              onChange={(e) => updateSearch("fromDistrict", e.target.value)}
              required
            >
              <option value="">Select departure district</option>
              {districts.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Destination</label>
            <select
              value={search.toDistrict}
              onChange={(e) => updateSearch("toDistrict", e.target.value)}
              required
            >
              <option value="">Select destination district</option>
              {districts.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Departure Date</label>
            <input
              type="date"
              value={search.travelDate}
              onChange={(e) => updateSearch("travelDate", e.target.value)}
              required
            />
          </div>

          <div>
            <label>Departure Time</label>
            <input
              type="time"
              value={search.departureTime}
              onChange={(e) => updateSearch("departureTime", e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={recommendationLoading || tripLoading}>
            {recommendationLoading ? "Checking..." : "Suggest Best Transportation"}
          </button>
        </form>

        {recommendationError && <p className="error">{recommendationError}</p>}

        {recommendation && (
          <div className="recommendation-result">
            <span className="transport-type">{recommendation.transportType}</span>
            <h3>{recommendation.serviceName}</h3>
            <p>{recommendation.operator}</p>
            <p><strong>{recommendation.fromDistrict} → {recommendation.toDistrict}</strong></p>
            <p>Departure: {recommendation.departureTime}</p>
            <p>Arrival: {recommendation.arrivalTime}</p>
            <p>Travel duration: {formatDuration(recommendation.durationMinutes)}</p>
            <p className="fare-info">Fare for booking: {formatMoney(recommendation.price)} per passenger</p>
            <button type="button" onClick={chooseRecommendedTransport}>
              Book This Ticket
            </button>
          </div>
        )}
      </div>

      {/* ================= TRANSPORT TICKET BOOKING ================= */}
      <div className="card transport-booking-card">
        <h3>Transport Ticket Booking</h3>

        <form className="transport-search-form" onSubmit={handleSearch}>
          <div>
            <label>Departure Location</label>
            <select
              value={search.fromDistrict}
              onChange={(e) => updateSearch("fromDistrict", e.target.value)}
              required
            >
              <option value="">Select departure district</option>
              {districts.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Destination</label>
            <select
              value={search.toDistrict}
              onChange={(e) => updateSearch("toDistrict", e.target.value)}
              required
            >
              <option value="">Select destination district</option>
              {districts.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Travel Date</label>
            <input
              type="date"
              value={search.travelDate}
              onChange={(e) => updateSearch("travelDate", e.target.value)}
              required
            />
          </div>

          <div>
            <label>Departure Time</label>
            <input
              type="time"
              value={search.departureTime}
              onChange={(e) => updateSearch("departureTime", e.target.value)}
            />
          </div>

          <div>
            <label>Transport Type</label>
            <select
              value={search.transportType}
              onChange={(e) => setSearch((prev) => ({ ...prev, transportType: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="bus">Bus</option>
              <option value="train">Train</option>
              <option value="flight">Flight</option>
            </select>
          </div>

          <div>
            <label>No. of Passengers</label>
            <input
              type="number"
              min="1"
              max="50"
              value={passengerCount}
              onChange={(e) => updatePassengerCount(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading || tripLoading}>
            {loading ? "Searching..." : "Search Tickets"}
          </button>
        </form>

        <div className="passenger-details-section">
          <h4>Passenger Details</h4>
          <div className="passenger-list">
            {passengers.map((passenger, index) => (
              <div className="passenger-row" key={index}>
                <strong>Passenger {index + 1}</strong>
                <input
                  placeholder="Name"
                  value={passenger.name}
                  onChange={(e) => updatePassenger(index, "name", e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Email (if available)"
                  value={passenger.email}
                  onChange={(e) => updatePassenger(index, "email", e.target.value)}
                />
                <input
                  placeholder="Phone (if available)"
                  value={passenger.phone}
                  onChange={(e) => updatePassenger(index, "phone", e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <>
          <h2>Available Tickets</h2>
          <div className="transport-results">
            {results.map((transport) => (
              <div className="card transport-result-card" key={transport._id}>
                <span className="transport-type">{transport.transportType}</span>
                <h3>{transport.serviceName}</h3>
                <p>{transport.operator}</p>
                <p><strong>{transport.fromDistrict} → {transport.toDistrict}</strong></p>
                <p>{transport.departureTime} → {transport.arrivalTime}</p>
                <p>Duration: {formatDuration(transport.durationMinutes)}</p>
                <p>Fare: {formatMoney(transport.price)} per passenger</p>
                <p>{transport.availableSeats} seats available</p>
                <button type="button" onClick={() => setSelectedTransport(transport)}>
                  Book Now
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedTransport && (
        <div className="card booking-panel" id="book-selected-ticket">
          <h3>Book Selected Ticket</h3>
          <p>
            <strong>{selectedTransport.serviceName}</strong> — {selectedTransport.fromDistrict} → {selectedTransport.toDistrict}
          </p>
          <p>
            {selectedTransport.departureTime} → {selectedTransport.arrivalTime}
          </p>
          <p>
            {passengerCount} passenger{passengerCount !== 1 ? "s" : ""} × {formatMoney(selectedTransport.price)} = <strong>{formatMoney(totalPrice)}</strong>
          </p>

          {selectedTransport.availableSeats < passengerCount ? (
            <p className="error">
              This service does not have enough seats for {passengerCount} passengers.
            </p>
          ) : (
            <form onSubmit={startCheckout}>
              <button type="submit" disabled={bookingLoading}>
                {bookingLoading ? "Opening Stripe..." : `Pay ${formatMoney(totalPrice)}`}
              </button>
            </form>
          )}
        </div>
      )}

      <h2>My Transport Bookings</h2>
      <div className="grid">
        {myBookings.length === 0 && <p>No transport bookings yet.</p>}
        {myBookings.map((booking) => (
          <div className="card" key={booking._id}>
            <span className={`badge ${booking.bookingStatus === "confirmed" ? "completed" : "active"}`}>
              {booking.bookingStatus.replace("_", " ")}
            </span>
            <h3>{booking.transport?.serviceName || "Transport booking"}</h3>
            <p>
              {booking.transport?.fromDistrict} → {booking.transport?.toDistrict}
            </p>
            <p>{new Date(booking.travelDate).toLocaleDateString()}</p>
            <p>Passengers: {booking.passengerCount}</p>
            <p>Payment: {booking.paymentStatus}</p>
            {booking.seatNumbers?.length > 0 && (
              <p>Seats: {booking.seatNumbers.join(", ")}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
