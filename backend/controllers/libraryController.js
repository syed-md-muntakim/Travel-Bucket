const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const upload = require("../middleware/upload");

const MAX_PHOTOS = 8;

function parseFields(body) {
  const destination = String(body.destination || "").trim();
  const reviewText = String(body.reviewText || "").trim();
  const tripDate = new Date(String(body.tripDate || ""));
  const rating = Number(body.rating);

  if (!destination) {
    throw new Error("Enter a destination.");
  }
  if (destination.length > 120) {
    throw new Error("Destination can contain at most 120 characters.");
  }
  if (!reviewText) {
    throw new Error("Write a review for this trip.");
  }
  if (reviewText.length > 2000) {
    throw new Error("Review can contain at most 2,000 characters.");
  }
  if (Number.isNaN(tripDate.valueOf())) {
    throw new Error("Choose a valid trip date.");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Choose a rating from 1 to 5 stars.");
  }

  return { destination, reviewText, tripDate, rating };
}

function normalizeRepeatedField(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value === undefined || value === null || value === "") return [];
  return [String(value)];
}

function uploadedFilenames(req) {
  return (req.files || []).map((file) => file.filename);
}

async function deleteStoredImages(filenames) {
  await Promise.all(
    filenames.map(async (filename) => {
      const safeName = path.basename(filename);
      try {
        await fs.unlink(path.join(upload.uploadsDirectory, safeName));
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    })
  );
}

function sendControllerError(res, error, fallbackMessage, status = 400) {
  console.error(error);
  return res.status(status).json({ message: error.message || fallbackMessage });
}

// GET /api/library - retained for compatibility with the group project.
const getAllReviews = async (_req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "username")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    sendControllerError(res, error, "Failed to load travel memories.", 500);
  }
};

// GET /api/library/mine - logged-in user's own travel library.
const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id }).sort({
      tripDate: -1,
      createdAt: -1,
    });
    res.json(reviews);
  } catch (error) {
    sendControllerError(res, error, "Failed to load your travel library.", 500);
  }
};

// POST /api/library - create a memory with 1-8 local photos.
const createReview = async (req, res) => {
  const newImages = uploadedFilenames(req);

  try {
    const fields = parseFields(req.body);

    if (newImages.length === 0) {
      throw new Error("Upload at least one travel photo.");
    }
    if (newImages.length > MAX_PHOTOS) {
      throw new Error(`A memory can contain up to ${MAX_PHOTOS} photos.`);
    }

    const review = await Review.create({
      user: req.user._id,
      trip: req.body.trip || undefined,
      ...fields,
      images: newImages,
    });

    res.status(201).json(review);
  } catch (error) {
    await deleteStoredImages(newImages).catch(console.error);
    sendControllerError(res, error, "Failed to create travel memory.");
  }
};

// PUT /api/library/:id
// keepImages contains the filenames the user wants to retain.
// Newly selected files are appended after the retained images.
const updateReview = async (req, res) => {
  const addedImages = uploadedFilenames(req);

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new Error("Invalid travel memory id.");
    }

    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!review) {
      await deleteStoredImages(addedImages).catch(console.error);
      return res.status(404).json({ message: "Travel memory not found." });
    }

    const fields = parseFields(req.body);
    const requestedKeepImages = new Set(normalizeRepeatedField(req.body.keepImages));

    // Only filenames already belonging to this review are allowed to be kept.
    const keptImages = review.images.filter((filename) => requestedKeepImages.has(filename));
    const removedImages = review.images.filter((filename) => !requestedKeepImages.has(filename));
    const finalImages = [...keptImages, ...addedImages];

    if (finalImages.length === 0) {
      throw new Error("Keep or upload at least one travel photo.");
    }
    if (finalImages.length > MAX_PHOTOS) {
      throw new Error(`A memory can contain up to ${MAX_PHOTOS} photos.`);
    }

    review.set({
      ...fields,
      images: finalImages,
    });

    await review.save();
    await deleteStoredImages(removedImages);

    res.json(review);
  } catch (error) {
    await deleteStoredImages(addedImages).catch(console.error);
    sendControllerError(res, error, "Failed to update travel memory.");
  }
};

// DELETE /api/library/:id/images/:filename
// Retained for compatibility. The redesigned page normally removes photos
// during edit and sends keepImages on PUT.
const deleteImage = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid travel memory id." });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!review) {
      return res.status(404).json({ message: "Travel memory not found." });
    }

    const filename = path.basename(req.params.filename);
    if (!review.images.includes(filename)) {
      return res.status(404).json({ message: "Photo not found in this travel memory." });
    }

    if (review.images.length <= 1) {
      return res.status(400).json({ message: "A travel memory must keep at least one photo." });
    }

    review.images = review.images.filter((image) => image !== filename);
    await review.save();
    await deleteStoredImages([filename]);

    res.json(review);
  } catch (error) {
    sendControllerError(res, error, "Failed to delete photo.", 500);
  }
};

// DELETE /api/library/:id - delete one complete memory and its local files.
const deleteReview = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid travel memory id." });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!review) {
      return res.status(404).json({ message: "Travel memory not found." });
    }

    const imagesToDelete = [...review.images];
    await review.deleteOne();
    await deleteStoredImages(imagesToDelete);

    res.status(204).send();
  } catch (error) {
    sendControllerError(res, error, "Failed to delete travel memory.", 500);
  }
};

module.exports = {
  getAllReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteImage,
  deleteReview,
};
