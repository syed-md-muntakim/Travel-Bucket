const User = require("../models/User");
const Trip = require("../models/Trip");
const Review = require("../models/Review");

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

module.exports = {
  getAllUsers,
  setUserActive,
  getAllTrips,
  getAllReviews,
  deleteReviewAsAdmin,
  getStats,
};
