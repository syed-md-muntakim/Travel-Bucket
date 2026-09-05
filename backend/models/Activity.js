const mongoose = require("mongoose");

// One entry in a user's Travel Achievement & Activity Log.
// `points` is 0 for actions we log for the activity feed but that don't earn
// points — per the project's point system, only planning a trip and posting
// a review earn points.
const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["trip_planned", "trip_joined", "review_added", "trip_completed"],
      required: true,
    },
    points: { type: Number, default: 0 },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: null },
    description: { type: String, default: "" }, // short human-readable line for the activity feed
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
