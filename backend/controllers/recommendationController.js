const Trip = require("../models/Trip");
const { getUserTripAnalytics } = require("../utils/travelAnalytics");
const { destinations, getDestinationInfo } = require("../data/destinations");

// System-wide popularity of each destination (excluding cancelled trips),
// used both as a "trending" fallback for new users and as a tiebreaker.
const getTrendingDistricts = async (excludeSet = new Set()) => {
  const trips = await Trip.find({ status: { $ne: "cancelled" } }).select("destinationDistrict");
  const counts = {};
  trips.forEach((t) => { counts[t.destinationDistrict] = (counts[t.destinationDistrict] || 0) + 1; });
  return Object.entries(counts)
    .filter(([district]) => !excludeSet.has(district))
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count);
};

const buildRecommendation = (district, reason, matchScore, trendingCount = 0) => {
  const info = getDestinationInfo(district);
  return {
    district,
    category: info.category,
    emoji: info.emoji,
    description: info.description,
    highlight: info.highlight,
    reason,
    matchScore,
    trendingCount,
  };
};

// GET /api/recommendations
// Liza — Travel Recommendation System (Module 3).
// New users (no travel history) get trending/popular destinations. Users
// with history get destinations matching the categories of places they've
// already enjoyed, ranked above generic trending picks.
const getRecommendations = async (req, res) => {
  try {
    const analytics = await getUserTripAnalytics(req.user._id);
    const isNewUser = analytics.visitedSet.size === 0;

    if (isNewUser) {
      const trending = await getTrendingDistricts(analytics.visitedSet);
      const recommendations = trending
        .slice(0, 6)
        .map((t) =>
          buildRecommendation(
            t.district,
            "Trending pick among Travel Bucket travellers — a great place to start.",
            0,
            t.count
          )
        );

      // Not enough trip history in the whole system yet to fill 6 — top up
      // with curated picks so a brand-new deployment still looks useful.
      if (recommendations.length < 6) {
        Object.keys(destinations)
          .filter((d) => !recommendations.some((r) => r.district === d))
          .slice(0, 6 - recommendations.length)
          .forEach((d) =>
            recommendations.push(
              buildRecommendation(d, "A popular Travel Bucket destination worth exploring first.", 0)
            )
          );
      }

      return res.json({
        newUser: true,
        preferredMode: null,
        topCategory: null,
        recommendations,
        meta: { totalTripsAnalyzed: analytics.total, destinationsVisited: 0 },
      });
    }

    // Tally how much weight each category carries based on visit frequency.
    const categoryCounts = {};
    analytics.destinationRanking.forEach(({ district, count }) => {
      const info = getDestinationInfo(district);
      categoryCounts[info.category] = (categoryCounts[info.category] || 0) + count;
    });
    const rankedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);
    const topCategory = rankedCategories[0] || null;

    // One example already-visited district per category, for the "reason" text.
    const exampleByCategory = {};
    analytics.destinationRanking.forEach(({ district }) => {
      const info = getDestinationInfo(district);
      if (!exampleByCategory[info.category]) exampleByCategory[info.category] = district;
    });

    const trending = await getTrendingDistricts(analytics.visitedSet);
    const trendingMap = new Map(trending.map((t) => [t.district, t.count]));

    const candidates = Object.keys(destinations)
      .filter((d) => !analytics.visitedSet.has(d))
      .map((district) => {
        const info = getDestinationInfo(district);
        const rank = rankedCategories.indexOf(info.category);
        const score = rank === -1 ? 0 : Math.max(3 - rank, 1);
        return { district, score, popularity: trendingMap.get(district) || 0 };
      })
      .sort((a, b) => b.score - a.score || b.popularity - a.popularity);

    const recommendations = candidates.slice(0, 6).map(({ district, score, popularity }) => {
      const info = getDestinationInfo(district);
      const reason =
        score > 0
          ? `Because you enjoyed ${info.category.replace("-", " ")} destinations like ${exampleByCategory[info.category]}`
          : "Trending among other Travel Bucket travellers";
      return buildRecommendation(district, reason, score, popularity);
    });

    res.json({
      newUser: false,
      preferredMode: analytics.preferredMode,
      topCategory,
      recommendations,
      meta: { totalTripsAnalyzed: analytics.total, destinationsVisited: analytics.uniqueDestinations },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to build recommendations", error: err.message });
  }
};

module.exports = { getRecommendations };
