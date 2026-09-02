const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getTravelStats } = require("../controllers/statsController");

router.use(protect);

router.get("/", getTravelStats);

module.exports = router;
