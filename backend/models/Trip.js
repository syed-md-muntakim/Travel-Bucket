const mongoose = require("mongoose");

// A person added to a SOLO trip (e.g. a family member or partner travelling along).
// These are not app users, just names attached to the trip plan.
const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    relation: {
      type: String,
      enum: ["couple", "family", "friend", "other"],
      default: "other",
    },
    idNumber: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    address: { type: String, required: true },
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    departureDistrict: { type: String, required: true },
    destinationDistrict: { type: String, required: true },
    travelDate: { type: Date, required: true },
    travelTime: { type: String, required: true }, // e.g. "14:30"

    mode: { type: String, enum: ["solo", "companion"], required: true },

    // Only used when mode === "solo"
    members: [memberSchema],

    // Only used when mode === "companion" (group / camping style trips)
    capacityMin: { type: Number, default: 5 },
    capacityMax: { type: Number, default: 10 },
    joinedUsers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    description: { type: String, default: "" },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
);

tripSchema.virtual("travellerCount").get(function () {
  return (
    1 +
    (this.joinedUsers ? this.joinedUsers.length : 0) +
    (this.members ? this.members.length : 0)
  );
});

tripSchema.virtual("isFull").get(function () {
  return this.mode === "companion" && this.travellerCount >= this.capacityMax;
});

tripSchema.set("toJSON", { virtuals: true });
tripSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Trip", tripSchema);
