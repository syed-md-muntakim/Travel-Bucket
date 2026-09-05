const { getUserTripAnalytics } = require("../utils/travelAnalytics");

// GET /api/stats
// Liza — Travel Statistics Dashboard (Module 3).
// Turns the logged-in user's trip history into the numbers the dashboard
// charts and insight cards need. Built on the same analytics helper the
// Travel Recommendation System uses, so the two features stay in sync.
const getTravelStats = async (req, res) => {
  try {
    const a = await getUserTripAnalytics(req.user._id);

    res.json({
      totals: {
        totalTrips: a.total,
        active: a.statusCounts.active || 0,
        completed: a.statusCounts.completed || 0,
        cancelled: a.statusCounts.cancelled || 0,
      },
      tripType: {
        solo: a.modeCounts.solo || 0,
        companion: a.modeCounts.companion || 0,
      },
      destinations: {
        uniqueVisited: a.uniqueDestinations,
        mostVisited: a.destinationRanking.slice(0, 5),
      },
      completionRate: a.completionRate,
      monthlyActivity: a.timeline,
      insights: {
        mostVisitedDestination: a.mostVisitedDestination?.district || null,
        preferredTravelType: a.preferredMode,
        mostActivePeriod: a.mostActiveMonthName,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to build travel stats", error: err.message });
  }
};

module.exports = { getTravelStats };
