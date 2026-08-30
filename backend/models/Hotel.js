const mongoose = require("mongoose");

// A single guest's review of a hotel.
const hotelReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    experience: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// One selectable room type for a hotel (Hotel Booking feature).
// priceMultiplier scales the hotel's base pricePerNight, e.g. 1.4 = 40% more than Standard.
const roomTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Standard", "Deluxe", "Suite"
    priceMultiplier: { type: Number, required: true, min: 0.1, default: 1 },
    bedOptions: [{ type: String, trim: true }], // e.g. ["Single", "Twin", "Double", "Queen", "King"]
    maxOccupancy: { type: Number, required: true, min: 1, default: 2 }, // how many guests this room type can hold
  },
  { _id: false }
);

// A hotel that the Hotel Booking feature books against. Posted/managed by admins;
// normally one per district, but admins aren't restricted to that.
const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    district: { type: String, required: true, trim: true },
    pricePerNight: { type: Number, required: true, min: 0 }, // base price, before room type multiplier
    amenities: [{ type: String, trim: true }], // e.g. "Free WiFi", "Pool", "Breakfast Included"
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    reviews: [hotelReviewSchema],
    roomTypes: {
      type: [roomTypeSchema],
      default: () => [
        { name: "Standard", priceMultiplier: 1, bedOptions: ["Single", "Twin"], maxOccupancy: 2 },
        { name: "Deluxe", priceMultiplier: 1.4, bedOptions: ["Twin", "Double", "Queen"], maxOccupancy: 3 },
        { name: "Suite", priceMultiplier: 1.8, bedOptions: ["Queen", "King"], maxOccupancy: 4 },
      ],
    },
  },
  { timestamps: true }
);

hotelSchema.virtual("averageRating").get(function () {
  if (!this.reviews || this.reviews.length === 0) return null;
  const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / this.reviews.length) * 10) / 10;
});

hotelSchema.virtual("reviewCount").get(function () {
  return this.reviews ? this.reviews.length : 0;
});

hotelSchema.set("toJSON", { virtuals: true });
hotelSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Hotel", hotelSchema);
