const User = require("../models/User");
const Trip = require("../models/Trip");
const bcrypt = require("bcryptjs");


// GET /api/profile - the logged-in user's own profile
const getProfile = async (req, res) => {
  res.json(req.user);
};


// PUT /api/profile - edit editable profile fields
const updateProfile = async (req, res) => {
  const { phone, address, email, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);


  if (phone !== undefined) user.phone = phone;
  if (address !== undefined) user.address = address;
  if (email !== undefined) user.email = email;


  if (newPassword) {
    if (!currentPassword || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    user.password = newPassword; // pre-save hook in the User model will hash it
  }


  await user.save();
  res.json(user);
};


// GET /api/profile/history
// Combined dashboard: trips the user created + trips they joined as a companion,
// each tagged with its current status (Active / Completed / Cancelled).
const getTravelHistory = async (req, res) => {
  const created = await Trip.find({ creator: req.user._id })
    .populate("joinedUsers.user", "username")
    .sort({ travelDate: -1 });


  const joined = await Trip.find({ "joinedUsers.user": req.user._id })
    .populate("creator", "username")
    .sort({ travelDate: -1 });


  res.json({
    created,
    joined,
    summary: {
      totalCreated: created.length,
      totalJoined: joined.length,
      active: [...created, ...joined].filter((t) => t.status === "active").length,
      completed: [...created, ...joined].filter((t) => t.status === "completed").length,
      cancelled: [...created, ...joined].filter((t) => t.status === "cancelled").length,
    },
  });
};


module.exports = { getProfile, updateProfile, getTravelHistory };
