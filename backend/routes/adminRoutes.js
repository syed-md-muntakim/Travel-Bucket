const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getAllUsers,
  setUserActive,
  getAllTrips,
  getAllReviews,
  deleteReviewAsAdmin,
  getStats,
} = require("../controllers/adminController");

// Every route below requires a logged-in admin
router.use(protect, adminOnly);

router.get("/stats", getStats);
router.get("/users", getAllUsers);
router.patch("/users/:id/status", setUserActive);
router.get("/trips", getAllTrips);
router.get("/reviews", getAllReviews);
router.delete("/reviews/:id", deleteReviewAsAdmin);

module.exports = router;
