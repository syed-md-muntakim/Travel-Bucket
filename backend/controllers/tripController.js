const Trip = require("../models/Trip");

// POST /api/trips
// Create a new trip plan. mode = "solo" or "companion".
// Solo trips may include a list of `members` (couple/family/friend travelling along).
const createTrip = async (req, res) => {
  try {
    const {
      departureDistrict,
      destinationDistrict,
      travelDate,
      travelTime,
      mode,
      members,
      capacityMin,
      capacityMax,
      description,
    } = req.body;

    if (!departureDistrict || !destinationDistrict || !travelDate || !travelTime || !mode) {
      return res.status(400).json({ message: "Missing required trip fields" });
    }
    if (!["solo", "companion"].includes(mode)) {
      return res.status(400).json({ message: "mode must be 'solo' or 'companion'" });
    }

    const tripData = {
      creator: req.user._id,
      departureDistrict,
      destinationDistrict,
      travelDate,
      travelTime,
      mode,
      description: description || "",
    };

    if (mode === "solo") {
      tripData.members = Array.isArray(members) ? members : [];
    } else {
      // Companion (group) trips are capped between 5 and 10 travellers total
      const min = Math.max(5, Number(capacityMin) || 5);
      const max = Math.min(10, Math.max(min, Number(capacityMax) || 10));
      tripData.capacityMin = min;
      tripData.capacityMax = max;
    }

    const trip = await Trip.create(tripData);
    res.status(201).json(trip);
  } catch (err) {
    res.status(500).json({ message: "Failed to create trip", error: err.message });
  }
};

// GET /api/trips/mine - trips the logged-in user created
const getMyTrips = async (req, res) => {
  const trips = await Trip.find({ creator: req.user._id })
    .populate("joinedUsers.user", "username email")
    .sort({ travelDate: 1 });
  res.json(trips);
};
// GET /api/trips/companion - all active companion trips
const getCompanionTrips = async (req, res) => {
  try {
    const trips = await Trip.find({
      mode: "companion",
      status: "active",
    })
      .populate("creator", "username email")
      .populate("joinedUsers.user", "username email")
      .sort({ travelDate: 1 });

    res.json(trips);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load companion trips",
      error: err.message,
    });
  }
};

// GET /api/trips/:id
const getTripById = async (req, res) => {
  const trip = await Trip.findById(req.params.id)
    .populate("creator", "username email")
    .populate("joinedUsers.user", "username email");
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  res.json(trip);
};

// PUT /api/trips/:id - edit a trip plan (only the creator, only before it happens)
const updateTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  if (String(trip.creator) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the trip creator can edit this trip" });
  }
  if (trip.status !== "active") {
    return res.status(400).json({ message: "Only active trips can be edited" });
  }

  const editable = ["departureDistrict", "destinationDistrict", "travelDate", "travelTime", "description", "members"];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) trip[field] = req.body[field];
  });

  await trip.save();
  res.json(trip);
};

// PATCH /api/trips/:id/cancel - cancel own trip before it starts
const cancelTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  if (String(trip.creator) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the trip creator can cancel this trip" });
  }
  if (trip.status === "completed") {
    return res.status(400).json({ message: "Completed trips can't be cancelled" });
  }

  trip.status = "cancelled";
  await trip.save();
  res.json(trip);
};

// PATCH /api/trips/:id/complete - mark a past trip as completed
const completeTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  if (String(trip.creator) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the trip creator can update this trip" });
  }
  trip.status = "completed";
  await trip.save();
  res.json(trip);
};

// POST /api/trips/:id/members - add member to a trip
const addMemberToTrip = async (req, res) => {
  try {
    const { name, relation, idNumber, phoneNumber, address } = req.body;

    if (!name || !idNumber || !phoneNumber || !address) {
      return res.status(400).json({
        message: "Name, ID number, phone number and address are required",
      });
    }

    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (String(trip.creator) !== String(req.user._id)) {
      return res.status(403).json({
        message: "Only the trip creator can add members",
      });
    }

    if (trip.status !== "active") {
      return res.status(400).json({
        message: "Members can only be added to active trips",
      });
    }

    // Only companion trips have a maximum traveller capacity
    if (
      trip.mode === "companion" &&
      trip.travellerCount >= trip.capacityMax
    ) {
      return res.status(400).json({
        message: "This companion trip is already full",
      });
    }

    trip.members.push({
      name,
      relation: relation || "other",
      idNumber,
      phoneNumber,
      address,
    });

    await trip.save();

    res.status(201).json(trip);
  } catch (err) {
    res.status(500).json({
      message: "Failed to add member",
      error: err.message,
    });
  }
};

module.exports = {
  createTrip,
  getMyTrips,
  getCompanionTrips,
  getTripById,
  updateTrip,
  cancelTrip,
  completeTrip,
  addMemberToTrip,
};