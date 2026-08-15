require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const tripRoutes = require("./routes/tripRoutes");
const companionRoutes = require("./routes/companionRoutes");
const libraryRoutes = require("./routes/libraryRoutes");
const profileRoutes = require("./routes/profileRoutes");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded travel photos statically, e.g. http://localhost:5000/uploads/xyz.jpg
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---- Common workflows ----
app.use("/api/auth", authRoutes);       // registration & login
app.use("/api/admin", adminRoutes);     // admin verification dashboard

// ---- Main features (one per group member) ----
app.use("/api/trips", tripRoutes);           // Feature 1: Trip Planning & Management
app.use("/api/companion-trips", companionRoutes); // Feature 2: Companion Trip Joining
app.use("/api/library", libraryRoutes);      // Feature 3: Travel Library Management
app.use("/api/profile", profileRoutes);      // Feature 4: Profile & Travel History

app.get("/api/health", (req, res) => res.json({ status: "Travel Bucket API is running" }));

// Fallback error handler (e.g. multer file-type errors)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Something went wrong" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
