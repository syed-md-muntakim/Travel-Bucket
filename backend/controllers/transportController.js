const Transport = require("../models/Transport");

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// A recommendation must leave no earlier than the requested departure time
// and no more than three hours later.
const MAX_DEPARTURE_DIFFERENCE_MINUTES = 180;

const normalizeDistrict = (value = "") => value.trim();

const parseTimeToMinutes = (time) => {
  if (!/^\d{2}:\d{2}$/.test(time || "")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const getDayName = (dateString) => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return DAY_NAMES[date.getDay()];
};

// Feature 1: Best Transportation
// No desired-duration input and no cost score are used.
// Among services close to the requested departure time, the recommendation
// is the service that gets the traveller to the destination earliest.
const getBestTransportation = async (req, res) => {
  try {
    const {
      fromDistrict,
      toDistrict,
      travelDate,
      departureTime,
      passengerCount = 1,
    } = req.body;

    if (!fromDistrict || !toDistrict || !travelDate || !departureTime) {
      return res.status(400).json({
        message:
          "Departure location, destination, departure date and departure time are required.",
      });
    }

    const requestedDeparture = parseTimeToMinutes(departureTime);
    const dayName = getDayName(travelDate);
    const seatsNeeded = Math.max(1, Math.min(50, Number(passengerCount) || 1));

    if (requestedDeparture === null) {
      return res.status(400).json({ message: "Invalid departure time." });
    }
    if (!dayName) {
      return res.status(400).json({ message: "Invalid departure date." });
    }

    const routeServices = await Transport.find({
      fromDistrict: normalizeDistrict(fromDistrict),
      toDistrict: normalizeDistrict(toDistrict),
      operatingDays: dayName,
      active: true,
      availableSeats: { $gte: seatsNeeded },
    }).lean();

    if (!routeServices.length) {
      return res.status(404).json({
        message:
          "No transportation is available for the selected route, date and number of passengers.",
      });
    }

    const ranked = routeServices
      .map((service) => {
        const serviceDeparture = parseTimeToMinutes(service.departureTime);
        if (serviceDeparture === null) return null;

        const departureDifferenceMinutes = serviceDeparture - requestedDeparture;

        // This score represents the total time from the user's requested
        // departure time until the service reaches the destination:
        // waiting time + journey duration. Lower is better.
        const recommendationScore =
          departureDifferenceMinutes + service.durationMinutes;

        return {
          ...service,
          departureDifferenceMinutes,
          recommendationScore,
        };
      })
      .filter(Boolean)
      .filter(
        (service) =>
          service.departureDifferenceMinutes >= 0 &&
          service.departureDifferenceMinutes <= MAX_DEPARTURE_DIFFERENCE_MINUTES
      )
      .sort((a, b) => {
        if (a.recommendationScore !== b.recommendationScore) {
          return a.recommendationScore - b.recommendationScore;
        }
        if (a.departureDifferenceMinutes !== b.departureDifferenceMinutes) {
          return a.departureDifferenceMinutes - b.departureDifferenceMinutes;
        }
        return a.durationMinutes - b.durationMinutes;
      });

    if (!ranked.length) {
      return res.status(404).json({
        message: "No transportation is available close to the selected departure time.",
      });
    }

    return res.json({
      recommendation: ranked[0],
      criteriaUsed: {
        fromDistrict: normalizeDistrict(fromDistrict),
        toDistrict: normalizeDistrict(toDistrict),
        travelDate,
        departureTime,
        passengerCount: seatsNeeded,
      },
      alternatives: ranked.slice(1, 4),
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to find the best transportation.",
      error: err.message,
    });
  }
};

// Feature 2: Search available transport tickets.
const searchTransports = async (req, res) => {
  try {
    const {
      fromDistrict,
      toDistrict,
      travelDate,
      transportType,
      departureTime,
      passengerCount = 1,
    } = req.query;

    if (!fromDistrict || !toDistrict || !travelDate) {
      return res.status(400).json({
        message: "Departure location, destination and travel date are required.",
      });
    }

    const dayName = getDayName(travelDate);
    if (!dayName) {
      return res.status(400).json({ message: "Invalid travel date." });
    }

    const seatsNeeded = Math.max(1, Math.min(50, Number(passengerCount) || 1));

    const query = {
      fromDistrict: normalizeDistrict(fromDistrict),
      toDistrict: normalizeDistrict(toDistrict),
      operatingDays: dayName,
      active: true,
      availableSeats: { $gte: seatsNeeded },
    };

    if (["bus", "train", "flight"].includes(transportType)) {
      query.transportType = transportType;
    }

    let services = await Transport.find(query).lean();

    const requestedDeparture = departureTime
      ? parseTimeToMinutes(departureTime)
      : null;

    if (departureTime && requestedDeparture === null) {
      return res.status(400).json({ message: "Invalid departure time." });
    }

    services = services
      .map((service) => {
        const serviceDeparture = parseTimeToMinutes(service.departureTime);
        return {
          ...service,
          departureDifferenceMinutes:
            requestedDeparture === null || serviceDeparture === null
              ? null
              : serviceDeparture - requestedDeparture,
        };
      })
      .filter((service) =>
        requestedDeparture === null
          ? true
          : service.departureDifferenceMinutes !== null &&
            service.departureDifferenceMinutes >= 0
      )
      .sort((a, b) => {
        if (requestedDeparture !== null) {
          return a.departureDifferenceMinutes - b.departureDifferenceMinutes;
        }
        return a.departureTime.localeCompare(b.departureTime);
      });

    return res.json(services);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to search transportation.",
      error: err.message,
    });
  }
};

const getTransportById = async (req, res) => {
  try {
    const transport = await Transport.findById(req.params.id);
    if (!transport) {
      return res.status(404).json({ message: "Transportation not found." });
    }
    return res.json(transport);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to load transportation.",
      error: err.message,
    });
  }
};

module.exports = {
  getBestTransportation,
  searchTransports,
  getTransportById,
};
