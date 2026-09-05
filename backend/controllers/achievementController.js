// backend/controllers/achievementController.js
// MEMBER 2 FEATURE FILE — new addition, no other member's code touches this file.

const Activity = require("../models/Activity");
const { getBadgeStatus, BADGES } = require("../services/achievementService");

// GET /api/achievements/me
// Returns the logged-in user's total points, their 5-badge progress, and a
// recent activity feed (trips planned/joined, reviews posted, trips completed).
const getMyAchievements = async (req, res) => {
  try {
    const { totalPoints, nextBadge } = await getBadgeStatus(req.user._id);

    const log = await Activity.find({ user: req.user._id })
      .populate("trip", "departureDistrict destinationDistrict")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      totalPoints,
      badges: BADGES.map((b) => ({ ...b, unlocked: totalPoints >= b.threshold })),
      nextBadge,
      log,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load achievements", error: err.message });
  }
};

module.exports = { getMyAchievements };
