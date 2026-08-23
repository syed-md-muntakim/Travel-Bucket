const cloudinary = require("../config/cloudinary");

// Upload one image buffer to Cloudinary
function uploadImage(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "travel-bucket/travel-library",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

// Delete one image from Cloudinary
async function deleteImage(publicId) {
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}

// Delete multiple images from Cloudinary
async function deleteImages(images = []) {
  await Promise.all(
    images.map((image) => deleteImage(image.publicId))
  );
}

// Upload multiple files received from Multer
async function uploadFiles(files = []) {
  return Promise.all(
    files.map((file) => uploadImage(file.buffer))
  );
}

module.exports = {
  uploadImage,
  uploadFiles,
  deleteImage,
  deleteImages,
};