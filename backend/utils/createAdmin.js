// Run with: node utils/createAdmin.js
// Creates (or promotes) an admin account so you can test the Admin Verification Dashboard.
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const email = "admin@travelbucket.com";
  let user = await User.findOne({ email });

  if (user) {
    user.role = "admin";
    await user.save();
    console.log("Existing user promoted to admin:", email);
  } else {
    user = await User.create({
      username: "admin",
      email,
      password: "Admin@123", // change this after first login
      phone: "0000000000",
      address: "N/A",
      role: "admin",
    });
    console.log("Admin account created:");
    console.log("  username: admin");
    console.log("  email:", email);
    console.log("  password: Admin@123");
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
