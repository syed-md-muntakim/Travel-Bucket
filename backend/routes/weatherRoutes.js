// backend/routes/weatherRoutes.js
// MEMBER 2 FEATURE FILE — new addition, no other member's code touches this file.

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getWeather } = require("../controllers/weatherController");

router.use(protect);

router.get("/", getWeather);

module.exports = router;
