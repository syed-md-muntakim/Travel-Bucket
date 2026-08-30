require("dotenv").config();
const mongoose = require("mongoose");
const Transport = require("../models/Transport");
const transportData = require("../data/transports.json");

async function seedTransport() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    await Transport.deleteMany({ dataSource: "demo" });
    const inserted = await Transport.insertMany(transportData);
    console.log(`Inserted ${inserted.length} transport records.`);
  } catch (error) {
    console.error("Transport seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedTransport();
