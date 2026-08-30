const mongoose = require("mongoose");

const transportSchema = new mongoose.Schema(
  {
    transportType: {
      type: String,
      enum: ["bus", "train", "flight"],
      required: true,
      index: true,
    },
    operator: { type: String, required: true },
    serviceName: { type: String, required: true },
    serviceCode: { type: String, required: true, unique: true },

    fromDistrict: { type: String, required: true, index: true },
    toDistrict: { type: String, required: true, index: true },

    departureTime: { type: String, required: true }, // HH:mm
    arrivalTime: { type: String, required: true }, // HH:mm
    durationMinutes: { type: Number, required: true, min: 1 },

    // Used for ticket booking/payment only. It is not part of the
    // Best Transportation recommendation score.
    price: { type: Number, required: true, min: 0 },

    totalSeats: { type: Number, required: true, min: 1 },
    availableSeats: { type: Number, required: true, min: 0 },

    operatingDays: {
      type: [String],
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      required: true,
    },

    active: { type: Boolean, default: true },
    dataSource: { type: String, default: "demo" },
  },
  { timestamps: true }
);

transportSchema.index({ fromDistrict: 1, toDistrict: 1, active: 1 });

module.exports = mongoose.model("Transport", transportSchema);
