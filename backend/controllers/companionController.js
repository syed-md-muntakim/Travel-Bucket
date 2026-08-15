const Trip = require("../models/Trip");

// GET /api/companion-trips
// Browse companion (group/camping) trips that are still open, newest first.
// Optional query filters: departureDistrict, destinationDistrict, travelDate (exact day)
const listAvailableCompanionTrips = async (req, res) => {
  const { departureDistrict, destinationDistrict, travelDate } = req.query;

  const query = { mode: "companion", status: "active" };

  if (departureDistrict) query.departureDistrict = new RegExp(departureDistrict, "i");
  if (destinationDistrict) query.destinationDistrict = new RegExp(destinationDistrict, "i");

  if (travelDate) {
    // Match any trip scheduled on that calendar day (ignore time-of-day)
    const start = new Date(travelDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    query.travelDate = { $gte: start, $lt: end };
  }

  const trips = await Trip.find(query)
    .populate("creator", "username email")
    .populate("joinedUsers.user", "username email")
    .sort({ travelDate: 1 });

  // Only show trips that still have at least one free seat (isFull is a virtual)
  const available = trips.filter((t) => !t.isFull);
  res.json(available);
};

// GET /api/companion-trips/joined - trips the logged-in user has booked seats on
const listJoinedTrips = async (req, res) => {
  const trips = await Trip.find({ "joinedUsers.user": req.user._id })
    .populate("creator", "username email")
    .populate("joinedUsers.user", "username email")
    .sort({ travelDate: 1 });
  res.json(trips);
};

// POST /api/companion-trips/:id/join
// body: { companions: [{ name, phone, address, nid }, ...] }  (companions is optional)
// The logged-in user always takes 1 seat; each companion takes one more seat.
const joinTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  if (trip.mode !== "companion") {
    return res.status(400).json({ message: "This is not a companion trip" });
  }
  if (trip.status !== "active") {
    return res.status(400).json({ message: "This trip is no longer open" });
  }
  if (String(trip.creator) === String(req.user._id)) {
    return res.status(400).json({ message: "You created this trip, no need to join it" });
  }
  const alreadyJoined = trip.joinedUsers.some((j) => String(j.user) === String(req.user._id));
  if (alreadyJoined) {
    return res.status(400).json({ message: "You already joined this trip. Leave it first if you need to change your seats." });
  }

  const companions = Array.isArray(req.body.companions) ? req.body.companions : [];

  // Every companion needs full details before they can reserve a seat
  for (const c of companions) {
    if (!c.name || !c.phone || !c.address || !c.nid) {
      return res.status(400).json({
        message: "Each companion needs a name, phone, address and NID number",
      });
    }
  }

  const seatsRequested = 1 + companions.length; // the user themselves + their companions
  const seatsRemaining = trip.capacityMax - trip.travellerCount; // uses the model's virtual

  if (seatsRequested > seatsRemaining) {
    return res.status(400).json({
      message:
        seatsRemaining <= 0
          ? "This trip is already full"
          : `Only ${seatsRemaining} seat(s) left on this trip — you requested ${seatsRequested}`,
    });
  }

  trip.joinedUsers.push({ user: req.user._id, companions });
  await trip.save();
  res.json(trip);
};

// PATCH /api/companion-trips/:id/leave
// Leaving frees up ALL seats booked under this user (themselves + their companions)
const leaveTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  const before = trip.joinedUsers.length;
  trip.joinedUsers = trip.joinedUsers.filter((j) => String(j.user) !== String(req.user._id));

  if (trip.joinedUsers.length === before) {
    return res.status(400).json({ message: "You had not joined this trip" });
  }

  await trip.save();
  res.json(trip);
};

module.exports = { listAvailableCompanionTrips, listJoinedTrips, joinTrip, leaveTrip };