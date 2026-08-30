const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getBestTransportation,
  searchTransports,
  getTransportById,
} = require("../controllers/transportController");

router.use(protect);

router.post("/recommend", getBestTransportation);
router.get("/search", searchTransports);
router.get("/:id", getTransportById);

module.exports = router;
