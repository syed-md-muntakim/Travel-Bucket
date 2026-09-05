const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  listDistricts,
  getHotelByDistrict,
  addReview,
  createBooking,
  getMyBookings,
  cancelBooking,
} = require("../controllers/hotelBookingController");

router.use(protect);

// Catalog (read-only, browse hotels)
router.get("/catalog", listDistricts); // GET /api/hotel-bookings/catalog -> list of hotels (name, district, price, roomTypes, reviews)
router.get("/catalog/:district", getHotelByDistrict); // GET /api/hotel-bookings/catalog/Sylhet -> one hotel
router.post("/catalog/:hotelId/reviews", addReview); // POST a review for a hotel

// Bookings
router.post("/", createBooking);
router.get("/mine", getMyBookings);
router.patch("/:id/cancel", cancelBooking);

module.exports = router;
