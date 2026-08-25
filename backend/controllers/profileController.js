const User = require("../models/User");
const Trip = require("../models/Trip");
const bcrypt = require("bcryptjs");
const { sendGeneralNotification } = require("../utils/emailService");
const { sendGeneralSMS } = require("../utils/smsService");


// GET /api/profile - the logged-in user's own profile
const getProfile = async (req, res) => {
  res.json(req.user);
};


// PUT /api/profile - edit editable profile fields
const updateProfile = async (req, res) => {
  const { phone, address, email, currentPassword, newPassword, emailNotifications, smsNotifications } = req.body;
  const user = await User.findById(req.user._id);


  if (phone !== undefined) user.phone = phone;
  if (address !== undefined) user.address = address;
  if (email !== undefined) user.email = email;
  if (emailNotifications !== undefined) user.emailNotifications = emailNotifications;
  if (smsNotifications !== undefined) user.smsNotifications = smsNotifications;


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


// PATCH /api/profile/notifications/preference
// Dedicated toggle for the Automated Notifications feature — turns
// automated emails and/or SMS (welcome, trip joined/left/cancelled) on
// or off for the logged-in user without touching any other profile fields.
// Either field is optional, so the frontend can update just one channel.
const updateNotificationPreference = async (req, res) => {
  const { emailNotifications, smsNotifications } = req.body;
  if (emailNotifications === undefined && smsNotifications === undefined) {
    return res.status(400).json({ message: "Provide emailNotifications and/or smsNotifications (boolean)" });
  }
  if (emailNotifications !== undefined && typeof emailNotifications !== "boolean") {
    return res.status(400).json({ message: "emailNotifications must be true or false" });
  }
  if (smsNotifications !== undefined && typeof smsNotifications !== "boolean") {
    return res.status(400).json({ message: "smsNotifications must be true or false" });
  }

  const update = {};
  if (emailNotifications !== undefined) update.emailNotifications = emailNotifications;
  if (smsNotifications !== undefined) update.smsNotifications = smsNotifications;

  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });

  res.json({ message: "Notification preferences updated", user });
};


// POST /api/profile/notifications/test
// Demo/sanity-check endpoint for Automated Notifications: sends a sample
// "important travel information" message to the logged-in user, over
// whichever channel(s) they have enabled (email and/or SMS).
const sendTestNotification = async (req, res) => {
  const emailResult = await sendGeneralNotification(
    req.user,
    "Travel Bucket: important travel information",
    "This is a test of the automated email notification system. If you're seeing this, notifications are working correctly."
  );
  const smsResult = await sendGeneralSMS(
    req.user,
    "This is a test SMS from the automated notification system."
  );

  res.json({
    message: "Test notification attempted on all enabled channels — see email/sms below.",
    email: emailResult,
    sms: smsResult,
  });
};


module.exports = { getProfile, updateProfile, getTravelHistory, sendTestNotification, updateNotificationPreference };
