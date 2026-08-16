const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { username, email, password, phone, address } = req.body;

    if (!username || !email || !password || !phone || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ message: "Username or email already registered" });
    }

    const user = await User.create({ username, email, password, phone, address });

    return res.status(201).json({
      user,
      token: generateToken(user._id),
    });
  } catch (err) {
    return res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

// POST /api/auth/login
// Accepts either username or email in the "identifier" field, plus password.
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Username/email and password are required" });
    }

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    // Deliberately vague error so we don't reveal whether the username exists
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid username/email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "This account has been disabled by an admin" });
    }

    return res.json({
      user,
      token: generateToken(user._id),
    });
  } catch (err) {
    return res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// GET /api/auth/me  (used by the frontend to restore a session on refresh)
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { registerUser, loginUser, getMe };
