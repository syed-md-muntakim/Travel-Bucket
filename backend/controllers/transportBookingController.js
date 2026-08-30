const axios = require("axios");
const Transport = require("../models/Transport");
const TransportBooking = require("../models/TransportBooking");

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const getDayName = (dateString) => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return DAY_NAMES[date.getDay()];
};

const stripeRequest = async ({ method, path, form }) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    const err = new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to backend/.env."
    );
    err.statusCode = 500;
    throw err;
  }

  const config = {
    method,
    url: `https://api.stripe.com/v1${path}`,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    },
  };

  if (form) {
    config.headers["Content-Type"] = "application/x-www-form-urlencoded";
    config.data = form.toString();
  }

  const response = await axios(config);
  return response.data;
};

const normalizePassengers = (passengers, passengerCount) => {
  if (!Array.isArray(passengers) || passengers.length !== passengerCount) {
    return null;
  }

  const cleaned = passengers.map((passenger) => ({
    name: String(passenger?.name || "").trim(),
    email: String(passenger?.email || "").trim(),
    phone: String(passenger?.phone || "").trim(),
  }));

  if (cleaned.some((passenger) => !passenger.name)) return null;
  return cleaned;
};

const createCheckoutSession = async (req, res) => {
  let pendingBooking = null;

  try {
    const {
      transportId,
      tripId,
      travelDate,
      passengerCount,
      passengers,
    } = req.body;

    const seatsNeeded = Number(passengerCount);

    if (!transportId || !travelDate) {
      return res.status(400).json({
        message: "Transport and travel date are required.",
      });
    }

    if (!Number.isInteger(seatsNeeded) || seatsNeeded < 1 || seatsNeeded > 50) {
      return res.status(400).json({
        message: "Number of passengers must be between 1 and 50.",
      });
    }

    const cleanedPassengers = normalizePassengers(passengers, seatsNeeded);
    if (!cleanedPassengers) {
      return res.status(400).json({
        message:
          "Enter a name for every passenger and make sure passenger details match the passenger count.",
      });
    }

    const transport = await Transport.findById(transportId);
    if (!transport || !transport.active) {
      return res.status(404).json({ message: "Transportation not found." });
    }

    if (transport.availableSeats < seatsNeeded) {
      return res.status(400).json({
        message: `Only ${transport.availableSeats} seat(s) are currently available.`,
      });
    }

    const dayName = getDayName(travelDate);
    if (!dayName) {
      return res.status(400).json({ message: "Invalid travel date." });
    }

    if (!transport.operatingDays.includes(dayName)) {
      return res.status(400).json({
        message: "This transportation service does not operate on the selected date.",
      });
    }

    const totalAmount = transport.price * seatsNeeded;

    pendingBooking = await TransportBooking.create({
      user: req.user._id,
      trip: tripId || null,
      transport: transport._id,
      travelDate: new Date(`${travelDate}T00:00:00`),
      passengerCount: seatsNeeded,
      passengers: cleanedPassengers,
      amount: totalAmount,
      paymentStatus: "pending",
      bookingStatus: "payment_pending",
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const form = new URLSearchParams();
    form.append("mode", "payment");
    form.append("payment_method_types[0]", "card");

    const contactEmail =
      cleanedPassengers.find((passenger) => passenger.email)?.email ||
      req.user.email ||
      "";
    if (contactEmail) {
      form.append("customer_email", contactEmail);
    }

    form.append("line_items[0][quantity]", String(seatsNeeded));
    form.append("line_items[0][price_data][currency]", "bdt");
    form.append(
      "line_items[0][price_data][unit_amount]",
      String(Math.round(transport.price * 100))
    );
    form.append(
      "line_items[0][price_data][product_data][name]",
      `${transport.serviceName} - ${transport.fromDistrict} to ${transport.toDistrict}`
    );
    form.append(
      "line_items[0][price_data][product_data][description]",
      `${transport.transportType.toUpperCase()} | ${transport.departureTime} - ${transport.arrivalTime} | ${seatsNeeded} passenger(s)`
    );

    form.append("metadata[bookingId]", String(pendingBooking._id));
    form.append("metadata[userId]", String(req.user._id));
    form.append("metadata[transportId]", String(transport._id));
    form.append("metadata[passengerCount]", String(seatsNeeded));
    if (tripId) form.append("metadata[tripId]", String(tripId));

    const returnTripQuery = tripId ? `&tripId=${encodeURIComponent(tripId)}` : "";
    form.append(
      "success_url",
      `${frontendUrl}/transport-booking?payment=success&session_id={CHECKOUT_SESSION_ID}${returnTripQuery}`
    );
    form.append(
      "cancel_url",
      `${frontendUrl}/transport-booking?payment=cancelled${returnTripQuery}`
    );

    const session = await stripeRequest({
      method: "post",
      path: "/checkout/sessions",
      form,
    });

    pendingBooking.stripeCheckoutSessionId = session.id;
    await pendingBooking.save();

    return res.status(201).json({
      checkoutUrl: session.url,
      bookingId: pendingBooking._id,
    });
  } catch (err) {
    if (pendingBooking && !pendingBooking.stripeCheckoutSessionId) {
      await TransportBooking.findByIdAndDelete(pendingBooking._id).catch(() => {});
    }

    const stripeMessage = err.response?.data?.error?.message;
    return res.status(err.statusCode || 500).json({
      message: stripeMessage || err.message || "Failed to start Stripe checkout.",
    });
  }
};

const confirmCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: "Stripe session ID is required." });
    }

    const session = await stripeRequest({
      method: "get",
      path: `/checkout/sessions/${encodeURIComponent(sessionId)}`,
    });

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment has not been completed." });
    }

    const bookingId = session.metadata?.bookingId;
    if (!bookingId) {
      return res.status(400).json({
        message: "Booking information is missing from Stripe session.",
      });
    }

    const booking = await TransportBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "This booking belongs to another user." });
    }

    if (booking.bookingStatus === "confirmed") {
      const populated = await TransportBooking.findById(booking._id)
        .populate("transport")
        .populate("trip");
      return res.json(populated);
    }

    const seatsNeeded = booking.passengerCount;

    const updatedTransport = await Transport.findOneAndUpdate(
      {
        _id: booking.transport,
        availableSeats: { $gte: seatsNeeded },
      },
      {
        $inc: { availableSeats: -seatsNeeded },
      },
      { new: true }
    );

    if (!updatedTransport) {
      booking.paymentStatus = "paid";
      booking.bookingStatus = "cancelled";
      await booking.save();
      return res.status(409).json({
        message:
          "Payment succeeded, but there were not enough seats left to confirm all passengers. Please contact the project administrator.",
      });
    }

    const lastSeatIndex =
      updatedTransport.totalSeats - updatedTransport.availableSeats;
    const firstSeatIndex = lastSeatIndex - seatsNeeded + 1;

    booking.seatNumbers = Array.from(
      { length: seatsNeeded },
      (_, index) => `S${String(firstSeatIndex + index).padStart(3, "0")}`
    );
    booking.paymentStatus = "paid";
    booking.bookingStatus = "confirmed";
    booking.stripePaymentIntentId = session.payment_intent || "";
    await booking.save();

    const populated = await TransportBooking.findById(booking._id)
      .populate("transport")
      .populate("trip");

    return res.json(populated);
  } catch (err) {
    const stripeMessage = err.response?.data?.error?.message;
    return res.status(err.statusCode || 500).json({
      message: stripeMessage || err.message || "Failed to confirm ticket booking.",
    });
  }
};

const getMyTransportBookings = async (req, res) => {
  try {
    const bookings = await TransportBooking.find({ user: req.user._id })
      .populate("transport")
      .populate("trip")
      .sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to load your transport bookings.",
      error: err.message,
    });
  }
};

module.exports = {
  createCheckoutSession,
  confirmCheckoutSession,
  getMyTransportBookings,
};
