const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  getAllReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteImage,
  deleteReview,
} = require("../controllers/libraryController");

function uploadImages(req, res, next) {
  upload.array("images", 8)(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message || "Photo upload failed." });
    }
    next();
  });
}

// Keep the existing public endpoint so other group-project code is not broken.
router.get("/", getAllReviews);

// Everything below this point belongs to the authenticated user's library.
router.use(protect);
router.get("/mine", getMyReviews);
router.post("/", uploadImages, createReview);
router.put("/:id", uploadImages, updateReview);
router.delete("/:id/images/:imageId", deleteImage);
router.delete("/:id", deleteReview);

module.exports = router;
