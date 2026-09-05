const User = require("../models/User");
const Trip = require("../models/Trip");
const Review = require("../models/Review");
const Hotel = require("../models/Hotel");

// GET /api/admin/users - list all registered users + their details
const getAllUsers = async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
};

// PATCH /api/admin/users/:id/status - enable/disable a user account
const setUserActive = async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

// GET /api/admin/trips - every trip (solo + companion) created in the system
const getAllTrips = async (req, res) => {
  const trips = await Trip.find()
    .populate("creator", "username email")
    .populate("joinedUsers.user", "username email")
    .sort({ createdAt: -1 });
  res.json(trips);
};

// GET /api/admin/reviews - moderate travel library content
const getAllReviews = async (req, res) => {
  const reviews = await Review.find().populate("user", "username email").sort({ createdAt: -1 });
  res.json(reviews);
};

// DELETE /api/admin/reviews/:id - admin can remove inappropriate library entries
const deleteReviewAsAdmin = async (req, res) => {

//Sadat: cloud Api update
  const review = await Review.findById(req.params.id);
  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }
  const imagesToDelete = [...review.images];
  await review.deleteOne();
  await deleteImages(imagesToDelete);
  res.json({ message: "Review and associated photos removed by admin" });
};


// GET /api/admin/stats - small overview for the top of the dashboard
const getStats = async (req, res) => {
  const [userCount, tripCount, activeCompanionTrips, reviewCount] = await Promise.all([
    User.countDocuments(),
    Trip.countDocuments(),
    Trip.countDocuments({ mode: "companion", status: "active" }),
    Review.countDocuments(),
  ]);
  res.json({ userCount, tripCount, activeCompanionTrips, reviewCount });
};

// ---- Hotel management (Hotel Booking feature) ----

// GET /api/admin/hotels - every hotel, with its reviews, for the admin dashboard
const getAllHotels = async (req, res) => {
  const hotels = await Hotel.find()
    .populate("reviews.user", "username email")
    .sort({ district: 1 });
  res.json(hotels);
};

// POST /api/admin/hotels - admin posts a new hotel
const createHotelAsAdmin = async (req, res) => {
  try {
    const { name, district, pricePerNight, description, amenities } = req.body;

    const trimmedName = String(name || "").trim();
    const trimmedDistrict = String(district || "").trim();
    const price = Number(pricePerNight);
    const parsedAmenities = Array.isArray(amenities)
      ? amenities.map((a) => String(a).trim()).filter(Boolean)
      : String(amenities || "")
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean);

    if (!trimmedName) return res.status(400).json({ message: "Enter the hotel's name." });
    if (!trimmedDistrict) return res.status(400).json({ message: "Enter the hotel's district." });
    if (Number.isNaN(price) || price < 0) {
      return res.status(400).json({ message: "Enter a valid price per night." });
    }

    const hotel = await Hotel.create({
      name: trimmedName,
      district: trimmedDistrict,
      pricePerNight: price,
      description: String(description || "").trim(),
      amenities: parsedAmenities,
    });

    res.status(201).json(hotel);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || "Failed to post hotel." });
  }
};

// DELETE /api/admin/hotels/:id - admin removes a hotel (and its bookings' history stays intact)
const deleteHotelAsAdmin = async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) return res.status(404).json({ message: "Hotel not found." });
  await hotel.deleteOne();
  res.json({ message: "Hotel removed by admin" });
};

// DELETE /api/admin/hotels/:hotelId/reviews/:reviewId - admin removes an inappropriate hotel review
const deleteHotelReviewAsAdmin = async (req, res) => {
  const { hotelId, reviewId } = req.params;
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) return res.status(404).json({ message: "Hotel not found." });

  const review = hotel.reviews.id(reviewId);
  if (!review) return res.status(404).json({ message: "Review not found." });

  review.deleteOne();
  await hotel.save();
  res.json({ message: "Review removed by admin" });
};

module.exports = {
  getAllUsers,
  setUserActive,
  getAllTrips,
  getAllReviews,
  deleteReviewAsAdmin,
  getStats,
  getAllHotels,
  createHotelAsAdmin,
  deleteHotelAsAdmin,
  deleteHotelReviewAsAdmin,
};
