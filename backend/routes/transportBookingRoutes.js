const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createCheckoutSession,
  confirmCheckoutSession,
  getMyTransportBookings,
} = require("../controllers/transportBookingController");

router.use(protect);

router.post("/checkout", createCheckoutSession);
router.post("/confirm", confirmCheckoutSession);
router.get("/mine", getMyTransportBookings);

module.exports = router;
