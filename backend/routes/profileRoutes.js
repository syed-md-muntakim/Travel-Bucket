const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getProfile, updateProfile, getTravelHistory } = require("../controllers/profileController");


router.use(protect);


router.get("/", getProfile);
router.put("/", updateProfile);
router.get("/history", getTravelHistory);


module.exports = router;
