const mongoose = require("mongoose");

// One travel-library memory owned by a registered user.
// Images are stored locally under backend/uploads for Module 1.
const reviewSchema = new mongoose.Schema(
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
    },
    destination: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    tripDate: {
      type: Date,
      required: true,
    },
    reviewText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    // Local filenames. Example: 1723123456789-uuid.jpg
    // These can later be replaced by Cloudinary URLs/public IDs in Module 2.
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images) => images.length >= 1 && images.length <= 8,
        message: "A travel memory must contain between 1 and 8 photos.",
      },
    },
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, tripDate: -1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
