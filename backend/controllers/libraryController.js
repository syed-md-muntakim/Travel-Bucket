const mongoose = require("mongoose");
const Review = require("../models/Review");

const {
  uploadFiles,
  deleteImage,
  deleteImages,
} = require("../services/cloudinaryService");

const MAX_PHOTOS = 8;

// Validate and prepare the review form fields
function parseFields(body) {
  const destination = String(body.destination || "").trim();
  const reviewText = String(body.reviewText || "").trim();
  const tripDate = new Date(String(body.tripDate || ""));
  const rating = Number(body.rating);

  if (!destination) {
    throw new Error("Enter a destination.");
  }

  if (destination.length > 120) {
    throw new Error(
      "Destination can contain at most 120 characters."
    );
  }

  if (!reviewText) {
    throw new Error("Write a review for this trip.");
  }

  if (reviewText.length > 2000) {
    throw new Error(
      "Review can contain at most 2,000 characters."
    );
  }

  if (Number.isNaN(tripDate.valueOf())) {
    throw new Error("Choose a valid trip date.");
  }

  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    throw new Error("Choose a rating from 1 to 5 stars.");
  }

  return {
    destination,
    reviewText,
    tripDate,
    rating,
  };
}

// Convert one or multiple FormData values into an array
function normalizeRepeatedField(value) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return [];
  }

  return [String(value)];
}

// Send controller error responses
function sendControllerError(
  res,
  error,
  fallbackMessage,
  status = 400
) {
  console.error(error);

  return res.status(status).json({
    message: error.message || fallbackMessage,
  });
}

// GET /api/library
// Get all travel-library reviews
const getAllReviews = async (_req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "username")
      .sort({
        createdAt: -1,
      });

    return res.json(reviews);
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to load travel memories.",
      500
    );
  }
};

// GET /api/library/mine
// Get the logged-in user's travel memories
const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      user: req.user._id,
    }).sort({
      tripDate: -1,
      createdAt: -1,
    });

    return res.json(reviews);
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to load your travel library.",
      500
    );
  }
};

// POST /api/library
// Create a memory and upload its photos to Cloudinary
const createReview = async (req, res) => {
  let uploadedImages = [];

  try {
    const fields = parseFields(req.body);
    const files = req.files || [];

    if (files.length === 0) {
      throw new Error(
        "Upload at least one travel photo."
      );
    }

    if (files.length > MAX_PHOTOS) {
      throw new Error(
        `A memory can contain up to ${MAX_PHOTOS} photos.`
      );
    }

    // Upload Multer memory buffers to Cloudinary
    uploadedImages = await uploadFiles(files);

    // Save the Cloudinary URL and public ID in MongoDB
    const review = await Review.create({
      user: req.user._id,
      trip: req.body.trip || undefined,
      ...fields,
      images: uploadedImages,
    });

    return res.status(201).json(review);
  } catch (error) {
    // Remove uploaded Cloudinary photos if MongoDB saving fails
    if (uploadedImages.length > 0) {
      await deleteImages(uploadedImages).catch(
        console.error
      );
    }

    return sendControllerError(
      res,
      error,
      "Failed to create travel memory."
    );
  }
};

// PUT /api/library/:id
// Update a memory, retain selected images and upload new images
const updateReview = async (req, res) => {
  let uploadedImages = [];
  let reviewWasSaved = false;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new Error("Invalid travel memory id.");
    }

    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        message: "Travel memory not found.",
      });
    }

    const fields = parseFields(req.body);
    const files = req.files || [];

    // The frontend sends the MongoDB _id of every image
    // that the user wants to keep.
    const requestedKeepImageIds = new Set(
      normalizeRepeatedField(req.body.keepImageIds)
    );

    // Only retain image IDs that already belong to this review
    const keptImages = review.images.filter((image) =>
      requestedKeepImageIds.has(String(image._id))
    );

    const removedImages = review.images.filter(
      (image) =>
        !requestedKeepImageIds.has(String(image._id))
    );

    const finalPhotoCount =
      keptImages.length + files.length;

    if (finalPhotoCount === 0) {
      throw new Error(
        "Keep or upload at least one travel photo."
      );
    }

    if (finalPhotoCount > MAX_PHOTOS) {
      throw new Error(
        `A memory can contain up to ${MAX_PHOTOS} photos.`
      );
    }

    // Upload newly selected files to Cloudinary
    if (files.length > 0) {
      uploadedImages = await uploadFiles(files);
    }

    // Combine retained Cloudinary images and newly uploaded images
    review.set({
      ...fields,
      images: [
        ...keptImages,
        ...uploadedImages,
      ],
    });

    await review.save();
    reviewWasSaved = true;

    /*
     * The review has already been updated in MongoDB.
     * Now remove the images that the user chose not to keep.
     *
     * A Cloudinary deletion error is logged without undoing
     * the successfully saved MongoDB update.
     */
    if (removedImages.length > 0) {
      await deleteImages(removedImages).catch(
        (deleteError) => {
          console.error(
            "Failed to delete removed Cloudinary images:",
            deleteError
          );
        }
      );
    }

    return res.json(review);
  } catch (error) {
    /*
     * If saving failed, the newly uploaded images are not
     * referenced by MongoDB, so remove them from Cloudinary.
     */
    if (
      !reviewWasSaved &&
      uploadedImages.length > 0
    ) {
      await deleteImages(uploadedImages).catch(
        console.error
      );
    }

    return sendControllerError(
      res,
      error,
      "Failed to update travel memory."
    );
  }
};

// DELETE /api/library/:id/images/:imageId
// Delete one image from a travel memory
const deleteImageFromReview = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid travel memory id.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.imageId)) {
      return res.status(400).json({
        message: "Invalid photo id.",
      });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        message: "Travel memory not found.",
      });
    }

    const imageToDelete = review.images.id(
      req.params.imageId
    );

    if (!imageToDelete) {
      return res.status(404).json({
        message:
          "Photo not found in this travel memory.",
      });
    }

    if (review.images.length <= 1) {
      return res.status(400).json({
        message:
          "A travel memory must keep at least one photo.",
      });
    }

    // Save the public ID before removing the image from MongoDB
    const publicId = imageToDelete.publicId;

    // Remove image subdocument from the review
    review.images.pull(req.params.imageId);
    await review.save();

    // Remove the actual image from Cloudinary
    await deleteImage(publicId).catch(
      (deleteError) => {
        console.error(
          "Failed to delete the Cloudinary image:",
          deleteError
        );
      }
    );

    return res.json(review);
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to delete photo.",
      500
    );
  }
};

// DELETE /api/library/:id
// Delete one complete memory and its Cloudinary photos
const deleteReview = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid travel memory id.",
      });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        message: "Travel memory not found.",
      });
    }

    // Copy image information before deleting the review
    const imagesToDelete = [...review.images];

    // Delete the review from MongoDB
    await review.deleteOne();

    // Delete all associated photos from Cloudinary
    await deleteImages(imagesToDelete).catch(
      (deleteError) => {
        console.error(
          "Failed to delete Cloudinary images:",
          deleteError
        );
      }
    );

    return res.status(204).send();
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to delete travel memory.",
      500
    );
  }
};

module.exports = {
  getAllReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteImage: deleteImageFromReview,
  deleteReview,
};
