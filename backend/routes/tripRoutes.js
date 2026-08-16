const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createTrip,
  getMyTrips,
  getCompanionTrips,
  getTripById,
  updateTrip,
  cancelTrip,
  completeTrip,
  addMemberToTrip,
} = require("../controllers/tripController");

router.use(protect); // every trip-planning route requires login

router.post("/", createTrip);
router.get("/mine", getMyTrips);
router.get("/companion", getCompanionTrips);
router.get("/:id", getTripById);
router.put("/:id", updateTrip);
router.patch("/:id/cancel", cancelTrip);
router.patch("/:id/complete", completeTrip);
router.post("/:id/members", addMemberToTrip,);

module.exports = router;
