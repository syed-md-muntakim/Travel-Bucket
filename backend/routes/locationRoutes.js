const express = require("express");
const router = express.Router();
const { searchLocation } = require("../controllers/locationController");

router.get("/search", searchLocation);

module.exports = router;
