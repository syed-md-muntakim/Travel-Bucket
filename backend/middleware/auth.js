const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the "Authorization: Bearer <token>" header on protected routes
// and attaches the logged-in user to req.user.
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User no longer exists" });
    if (!user.isActive) return res.status(403).json({ message: "This account has been disabled" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, invalid or expired token" });
  }
};

// Use after `protect` on any route only admins should reach
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ message: "Admin access only" });
};

module.exports = { protect, adminOnly };
