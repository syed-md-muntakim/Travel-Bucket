const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getProfile, updateProfile, getTravelHistory, sendTestNotification, updateNotificationPreference } = require("../controllers/profileController");


router.use(protect);


router.get("/", getProfile);
router.put("/", updateProfile);
router.get("/history", getTravelHistory);
router.patch("/notifications/preference", updateNotificationPreference);
router.post("/notifications/test", sendTestNotification);


module.exports = router;
