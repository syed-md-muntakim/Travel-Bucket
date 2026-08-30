const mongoose = require("mongoose");

const passengerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const transportBookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },
    transport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transport",
      required: true,
    },
    travelDate: { type: Date, required: true },

    passengerCount: { type: Number, required: true, min: 1, max: 50 },
    passengers: {
      type: [passengerSchema],
      required: true,
      validate: {
        validator(passengers) {
          return Array.isArray(passengers) && passengers.length === this.passengerCount;
        },
        message: "Passenger details must match the number of passengers.",
      },
    },

    seatNumbers: { type: [String], default: [] },
    amount: { type: Number, required: true, min: 0 },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    bookingStatus: {
      type: String,
      enum: ["payment_pending", "confirmed", "cancelled"],
      default: "payment_pending",
    },

    stripeCheckoutSessionId: { type: String, default: "" },
    stripePaymentIntentId: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TransportBooking", transportBookingSchema);
