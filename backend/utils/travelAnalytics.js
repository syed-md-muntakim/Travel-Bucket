const Trip = require("../models/Trip");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Liza — shared behind both Module 3 features (Travel Recommendation System
// and Travel Statistics Dashboard) so they analyze the same trip history the
// same way instead of drifting apart.
// Builds one user's full trip-behavior profile: everything they created plus
// everything they joined as a companion.
const getUserTripAnalytics = async (userId) => {
  const created = await Trip.find({ creator: userId }).sort({ travelDate: -1 });
  const joined = await Trip.find({ "joinedUsers.user": userId }).sort({ travelDate: -1 });
  const allTrips = [...created, ...joined];

  const total = allTrips.length;
  const nonCancelled = allTrips.filter((t) => t.status !== "cancelled");

  const statusCounts = { active: 0, completed: 0, cancelled: 0 };
  allTrips.forEach((t) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });

  const modeCounts = { solo: 0, companion: 0 };
  allTrips.forEach((t) => { modeCounts[t.mode] = (modeCounts[t.mode] || 0) + 1; });

  // Destinations actually travelled to (or planned) count as a taste signal;
  // cancelled trips don't.
  const destinationFrequency = {};
  nonCancelled.forEach((t) => {
    destinationFrequency[t.destinationDistrict] = (destinationFrequency[t.destinationDistrict] || 0) + 1;
  });
  const destinationRanking = Object.entries(destinationFrequency)
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count);

  const visitedSet = new Set(destinationRanking.map((d) => d.district));

  // Last 12 calendar months, oldest first, zero-filled so the chart has no gaps.
  const monthlyMap = {};
  const monthNameMap = {};
  nonCancelled.forEach((t) => {
    const d = new Date(t.travelDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
    monthNameMap[MONTH_NAMES[d.getMonth()]] = (monthNameMap[MONTH_NAMES[d.getMonth()]] || 0) + 1;
  });

  const timeline = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    timeline.push({
      key,
      label: `${MONTH_NAMES[d.getMonth()].slice(0, 3)} '${String(d.getFullYear()).slice(2)}`,
      count: monthlyMap[key] || 0,
    });
  }

  const mostActiveMonthName =
    Object.entries(monthNameMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const completionRate = total ? Number(((statusCounts.completed / total) * 100).toFixed(1)) : 0;

  const preferredMode =
    modeCounts.solo === modeCounts.companion
      ? (modeCounts.solo === 0 ? null : "solo")
      : (modeCounts.solo > modeCounts.companion ? "solo" : "companion");

  return {
    allTrips,
    created,
    joined,
    total,
    statusCounts,
    modeCounts,
    destinationRanking,
    visitedSet,
    uniqueDestinations: visitedSet.size,
    timeline,
    mostActiveMonthName,
    completionRate,
    preferredMode,
    mostVisitedDestination: destinationRanking[0] || null,
  };
};

module.exports = { getUserTripAnalytics, MONTH_NAMES };
