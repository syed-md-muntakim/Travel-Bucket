// backend/controllers/expenseController.js
// MEMBER 2 FEATURE FILE — new addition, no other member's code touches this file.
//
// Travel Expense Tracker: rather than asking the user to re-type costs by
// hand, this aggregates the REAL cost of a trip from the transport and hotel
// bookings actually linked to it (Member 3's TransportBooking, Member 4's
// HotelBooking), then adds a miscellaneous cost:
//
//   miscCost = max(10,000 BDT, 10% of (transportCost + hotelCost))
//
// so miscCost is always at least 10,000 BDT even if nothing else was booked yet.

const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const TransportBooking = require("../models/TransportBooking");
const HotelBooking = require("../models/HotelBooking");

const MIN_MISC_COST = 10000; // BDT

// GET /api/expenses/trip/:tripId
const getTripExpenses = async (req, res) => {
  try {
    const { tripId } = req.params;
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({ message: "Invalid trip id" });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    // Only the trip's creator can see its expense breakdown
    if (String(trip.creator) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the trip creator can view its expenses" });
    }

    // Only count bookings that are actually confirmed/active — a cancelled or
    // still-pending-payment booking shouldn't count toward the trip's cost.
    const [transportBookings, hotelBookings] = await Promise.all([
      TransportBooking.find({ trip: tripId, bookingStatus: "confirmed" }).populate("transport"),
      HotelBooking.find({ trip: tripId, status: "booked" }).populate("hotel"),
    ]);

    const transportCost = transportBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const hotelCost = hotelBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const miscCost = Math.max(MIN_MISC_COST, Math.round(0.1 * (transportCost + hotelCost)));
    const total = transportCost + hotelCost + miscCost;

    res.json({
      transportCost,
      hotelCost,
      miscCost,
      total,
      transportBookings,
      hotelBookings,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to calculate trip expenses", error: err.message });
  }
};

module.exports = { getTripExpenses };
