const mongoose = require("mongoose");

// One room within a booking: its own room type, bed type, and how many guests
// go in it. A booking can mix several of these (e.g. 2 Single rooms + 1 Double
// room for a group of 2 solo travellers and a couple).
const bookedRoomSchema = new mongoose.Schema(
  {
    roomType: { type: String, required: true, trim: true }, // e.g. "Deluxe"
    bedType: { type: String, required: true, trim: true }, // e.g. "Queen"
    guests: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

// A user's booking against the hotel catalog (Hotel Booking feature).
const hotelBookingSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Optional link back to the Trip this booking belongs to (part of the
    // Plan Trip -> Transport -> Hotel -> Trip Details workflow). Left null
    // for hotel bookings made outside that flow, e.g. from the Navbar link.
    // Syed: added for the Travel Expense Tracker (new field).
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: null },
    rooms: {
      type: [bookedRoomSchema],
      required: true,
      validate: {
        validator: (rooms) => Array.isArray(rooms) && rooms.length > 0,
        message: "A booking needs at least one room.",
      },
    },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["booked", "cancelled"], default: "booked" },
  },
  { timestamps: true }
);

hotelBookingSchema.virtual("totalGuests").get(function () {
  return this.rooms.reduce((sum, r) => sum + r.guests, 0);
});

hotelBookingSchema.set("toJSON", { virtuals: true });
hotelBookingSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("HotelBooking", hotelBookingSchema);
