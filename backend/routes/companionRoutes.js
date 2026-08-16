const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  listAvailableCompanionTrips,
  listJoinedTrips,
  joinTrip,
  leaveTrip,
} = require("../controllers/companionController");

router.use(protect);

router.get("/", listAvailableCompanionTrips);
router.get("/joined", listJoinedTrips);
router.post("/:id/join", joinTrip);
router.patch("/:id/leave", leaveTrip);

module.exports = router;
