// backend/routes/achievementRoutes.js
// MEMBER 2 FEATURE FILE — new addition, no other member's code touches this file.

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getMyAchievements } = require("../controllers/achievementController");

router.use(protect);
router.get("/me", getMyAchievements);

module.exports = router;
