const path = require("path");
const multer = require("multer");


const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// Temporarily stores uploaded files in memory.
// Each file will be available through file.buffer.
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const validMime = allowedMimeTypes.has(file.mimetype);
  const validExtension = allowedExtensions.has(extension);

  if (!validMime || !validExtension) {
    return cb(new Error("Only JPG, JPEG, PNG, and WebP images are allowed."));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per image
    files: 8,
  },
});


module.exports = upload;
