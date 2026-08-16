const mongoose = require("mongoose");

// Connects to MongoDB using the connection string stored in .env (MONGO_URI).
// This one function is called once, when the server starts.
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1); // stop the server if the DB is unreachable
  }
};

module.exports = connectDB;
