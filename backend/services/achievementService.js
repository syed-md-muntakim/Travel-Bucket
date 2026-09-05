// backend/services/achievementService.js
// MEMBER 2 FEATURE FILE — new addition, no other member's code touches this file.

const mongoose = require("mongoose");
const Activity = require("../models/Activity");

// Point values for each action that earns points. Kept intentionally small
// per the project spec: only planning a trip and posting a review earn points.
// Joining a trip and completing a trip are still logged (for the activity
// feed / "keeps track of..." requirement) but are worth 0 points.
const POINTS = {
  trip_planned: 3,
  review_added: 2,
  trip_joined: 0,
  trip_completed: 0,
};

// The 5 achievement badges, in ascending order of the points needed to unlock them.
const BADGES = [
  { name: "It's Time to Travel", threshold: 10 },
  { name: "Wander More", threshold: 60 },
  { name: "Wild & Free", threshold: 100 },
  { name: "Feel Travel", threshold: 150 },
  { name: "Free Spirit", threshold: 200 },
];

// Records one activity-log entry and awards its points.
// Callers should treat this as fire-and-forget (`.catch(console.error)`) so a
// logging hiccup never blocks the actual trip/review/join request.
const logActivity = async (userId, type, { trip = null, description = "" } = {}) => {
  const points = POINTS[type] ?? 0;
  await Activity.create({ user: userId, type, points, trip, description });
};

// Returns the user's total points plus which badges that unlocks.
const getBadgeStatus = async (userId) => {
  const result = await Activity.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, totalPoints: { $sum: "$points" } } },
  ]);
  const totalPoints = result[0]?.totalPoints || 0;

  const unlockedBadges = BADGES.filter((b) => totalPoints >= b.threshold);
  const nextBadge = BADGES.find((b) => totalPoints < b.threshold) || null;

  return { totalPoints, unlockedBadges, nextBadge };
};

module.exports = { logActivity, getBadgeStatus, POINTS, BADGES };
