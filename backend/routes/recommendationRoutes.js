const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getRecommendations } = require("../controllers/recommendationController");

router.use(protect);

router.get("/", getRecommendations);

module.exports = router;
