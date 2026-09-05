const mongoose = require("mongoose");
const Hotel = require("../models/Hotel");
const HotelBooking = require("../models/HotelBooking");
const { sendGeneralNotification } = require("../utils/emailService");
const { sendGeneralSMS } = require("../utils/smsService");

function sendControllerError(res, error, fallbackMessage, status = 400) {
  console.error(error);
  return res.status(status).json({ message: error.message || fallbackMessage });
}

function nightsBetween(checkIn, checkOut) {
  const MS_PER_NIGHT = 1000 * 60 * 60 * 24;
  return Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_NIGHT);
}

// GET /api/hotel-bookings/catalog - browse the hotel catalog
const listDistricts = async (req, res) => {
  try {
    const { district } = req.query;
    const filter = {};
    if (district) filter.district = new RegExp(district.trim(), "i");

    const hotels = await Hotel.find(filter).populate("reviews.user", "username").sort({ district: 1 });
    res.json(hotels);
  } catch (error) {
    sendControllerError(res, error, "Failed to load hotels.", 500);
  }
};

// GET /api/hotel-bookings/catalog/:district - a hotel for a district
const getHotelByDistrict = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ district: new RegExp(`^${req.params.district.trim()}$`, "i") }).populate(
      "reviews.user",
      "username"
    );
    if (!hotel) return res.status(404).json({ message: "No hotel found for that district." });
    res.json(hotel);
  } catch (error) {
    sendControllerError(res, error, "Failed to load hotel.", 500);
  }
};

// POST /api/hotel-bookings/catalog/:hotelId/reviews - a guest leaves a review for a hotel
const addReview = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.hotelId)) {
      return res.status(400).json({ message: "Invalid hotel id." });
    }

    const rating = Number(req.body.rating);
    const experience = String(req.body.experience || "").trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Choose a rating from 1 to 5." });
    }
    if (!experience) return res.status(400).json({ message: "Write about your experience." });
    if (experience.length > 1000) {
      return res.status(400).json({ message: "Experience can contain at most 1,000 characters." });
    }

    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel) return res.status(404).json({ message: "Hotel not found." });

    hotel.reviews.push({ user: req.user._id, rating, experience });
    await hotel.save();
    await hotel.populate("reviews.user", "username");

    res.status(201).json(hotel);
  } catch (error) {
    sendControllerError(res, error, "Failed to post review.");
  }
};

// POST /api/hotel-bookings - book a hotel with one or more rooms
// body: { hotelId, checkIn, checkOut, rooms: [{ roomType, bedType, guests }] }
const createBooking = async (req, res) => {
  try {
    const { hotelId, checkIn, checkOut, rooms, tripId } = req.body; // Syed: tripId is new

    if (!hotelId || !mongoose.isValidObjectId(hotelId)) {
      return res.status(400).json({ message: "Choose a valid hotel to book." });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (Number.isNaN(checkInDate.valueOf()) || Number.isNaN(checkOutDate.valueOf())) {
      return res.status(400).json({ message: "Choose valid check-in and check-out dates." });
    }
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ message: "Check-out date must be after check-in date." });
    }
    if (!Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ message: "Add at least one room to your booking." });
    }
    if (rooms.length > 10) {
      return res.status(400).json({ message: "A single booking can hold at most 10 rooms." });
    }

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) return res.status(404).json({ message: "Hotel not found." });

    // Validate every room against the hotel's catalog and build the priced list
    const validatedRooms = [];
    let roomPriceTotal = 0;

    for (const room of rooms) {
      const guestCount = Number(room.guests) || 1;
      const roomTypeDef = hotel.roomTypes.find((rt) => rt.name === room.roomType);

      if (!roomTypeDef) {
        return res.status(400).json({ message: `"${room.roomType}" isn't a valid room type for this hotel.` });
      }
      if (!roomTypeDef.bedOptions.includes(room.bedType)) {
        return res.status(400).json({ message: `"${room.bedType}" isn't a valid bed type for ${roomTypeDef.name}.` });
      }
      if (guestCount < 1) {
        return res.status(400).json({ message: "Each room needs at least 1 guest." });
      }
      if (guestCount > roomTypeDef.maxOccupancy) {
        return res.status(400).json({
          message: `A ${roomTypeDef.name} room holds at most ${roomTypeDef.maxOccupancy} guest(s) - reduce guests or add another room.`,
        });
      }

      validatedRooms.push({ roomType: roomTypeDef.name, bedType: room.bedType, guests: guestCount });
      roomPriceTotal += hotel.pricePerNight * roomTypeDef.priceMultiplier;
    }

    const nights = nightsBetween(checkInDate, checkOutDate);
    const totalPrice = Math.round(nights * roomPriceTotal);

    // Syed: only attach a valid trip id — silently ignore a bad/missing one
    // rather than failing the whole booking over it.
    const validTripId = tripId && mongoose.isValidObjectId(tripId) ? tripId : null;

    const booking = await HotelBooking.create({
      hotel: hotel._id,
      user: req.user._id,
      trip: validTripId,
      rooms: validatedRooms,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      totalPrice,
    });

    // Reuses the Module 2 notification service: confirm the hotel booking
    // over whichever channel(s) the user has enabled. Fire-and-forget so a
    // slow provider never delays the booking response.
    const roomSummary = validatedRooms
      .map((r) => `${r.roomType} room (${r.bedType} bed, ${r.guests} guest${r.guests > 1 ? "s" : ""})`)
      .join("; ");
    const message = `Your booking at ${hotel.name} (${hotel.district}) - ${roomSummary} - for ${nights} night(s), ${checkInDate.toDateString()} to ${checkOutDate.toDateString()}, is confirmed. Total: ${totalPrice} BDT.`;
    sendGeneralNotification(req.user, "Travel Bucket: Hotel booking confirmed", message).catch((err) =>
      console.error("Hotel booking email failed:", err.message)
    );
    sendGeneralSMS(req.user, message).catch((err) => console.error("Hotel booking SMS failed:", err.message));

    await booking.populate("hotel");
    res.status(201).json(booking);
  } catch (error) {
    sendControllerError(res, error, "Failed to create booking.");
  }
};

// GET /api/hotel-bookings/mine - the logged-in user's own bookings
const getMyBookings = async (req, res) => {
  try {
    const bookings = await HotelBooking.find({ user: req.user._id })
      .populate("hotel")
      .populate("trip", "departureDistrict destinationDistrict") // Syed: added for workflow linkage
      .sort({ checkIn: -1 });
    res.json(bookings);
  } catch (error) {
    sendControllerError(res, error, "Failed to load your bookings.", 500);
  }
};

// PATCH /api/hotel-bookings/:id/cancel
const cancelBooking = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id." });
    }

    const booking = await HotelBooking.findOne({ _id: req.params.id, user: req.user._id }).populate("hotel");
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "This booking is already cancelled." });
    }

    booking.status = "cancelled";
    // Skip full re-validation: older bookings saved before the multi-room feature
    // won't have a populated `rooms` array, and we're only changing `status` here anyway.
    await booking.save({ validateBeforeSave: false });

    // The hotel may have since been removed by an admin - don't let that break cancellation.
    if (booking.hotel) {
      const message = `Your booking at ${booking.hotel.name} (${booking.hotel.district}) for ${booking.checkIn.toDateString()} to ${booking.checkOut.toDateString()} has been cancelled.`;
      sendGeneralNotification(req.user, "Travel Bucket: Hotel booking cancelled", message).catch((err) =>
        console.error("Hotel cancel email failed:", err.message)
      );
      sendGeneralSMS(req.user, message).catch((err) => console.error("Hotel cancel SMS failed:", err.message));
    }

    res.json(booking);
  } catch (error) {
    sendControllerError(res, error, "Failed to cancel booking.", 500);
  }
};

module.exports = { listDistricts, getHotelByDistrict, addReview, createBooking, getMyBookings, cancelBooking };
