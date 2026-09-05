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
const locationRoutes = require("./routes/locationRoutes"); // Liza: Map API
const weatherRoutes = require("./routes/weatherRoutes"); // Syed: OpenWeatherMap integration (new line)
const recommendationRoutes = require("./routes/recommendationRoutes"); // Liza: Travel Recommendation System (Module 3)
const statsRoutes = require("./routes/statsRoutes"); // Liza: Travel Statistics Dashboard (Module 3)
const hotelBookingRoutes = require("./routes/hotelBookingRoutes"); // Ayon: Hotel Booking feature (catalog + bookings)
const transportRoutes = require("./routes/transportRoutes"); // Istihad: Best Transportation + transport search
const transportBookingRoutes = require("./routes/transportBookingRoutes"); // Istihad: Transport Ticket Booking
const achievementRoutes = require("./routes/achievementRoutes"); // Syed: Travel Achievement & Activity Log (new line)
const expenseRoutes = require("./routes/expenseRoutes"); // Syed: Travel Expense Tracker (new line)

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded travel photos statically, e.g. http://localhost:5000/uploads/xyz.jpg
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---- Common workflows ----
app.use("/api/auth", authRoutes); // registration & login
app.use("/api/admin", adminRoutes); // admin verification dashboard

// ---- Main features (one per group member) ----
app.use("/api/trips", tripRoutes); // Feature 1: Trip Planning & Management
app.use("/api/companion-trips", companionRoutes); // Feature 2: Companion Trip Joining
app.use("/api/library", libraryRoutes); // Feature 3: Travel Library Management
app.use("/api/profile", profileRoutes); // Feature 4: Profile & Travel History
app.use("/api/location", locationRoutes); // Liza: Map API
app.use("/api/weather", weatherRoutes); // Syed: OpenWeatherMap forecast widget (new line)
app.use("/api/recommendations", recommendationRoutes); // Liza: Travel Recommendation System
app.use("/api/stats", statsRoutes);                     // Liza: Travel Statistics Dashboard
app.use("/api/hotel-bookings", hotelBookingRoutes); //Ayon: Hotel Booking (catalog + bookings)
app.use("/api/transports", transportRoutes); // Istihad: transportation recommendation/search
app.use("/api/transport-bookings", transportBookingRoutes); // Istihad: ticket checkout/confirmation
app.use("/api/achievements", achievementRoutes); // Syed: Travel Achievement & Activity Log (new line)
app.use("/api/expenses", expenseRoutes);         // Syed: Travel Expense Tracker (new line)

app.get("/api/health", (req, res) => res.json({ status: "Travel Bucket API is running" }));

// Fallback error handler (e.g. multer file-type errors)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Something went wrong" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));