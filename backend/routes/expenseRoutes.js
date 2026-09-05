// backend/routes/expenseRoutes.js
// MEMBER 2 FEATURE FILE — new addition, no other member's code touches this file.

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getTripExpenses } = require("../controllers/expenseController");

router.use(protect);
router.get("/trip/:tripId", getTripExpenses);

module.exports = router;
