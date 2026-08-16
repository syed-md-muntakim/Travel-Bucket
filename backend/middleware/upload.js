const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const uploadsDirectory = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDirectory),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeExtension = allowedExtensions.has(extension) ? extension : "";
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${safeExtension}`;
    cb(null, uniqueName);
  },
});

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

upload.uploadsDirectory = uploadsDirectory;

module.exports = upload;
