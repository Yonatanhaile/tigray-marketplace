const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
} else {
  logger.warn('⚠️  Cloudinary URL not configured');
}

/**
 * Upload file buffer to Cloudinary
 */
const uploadFile = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'invoices',
      resource_type: options.resourceType || 'raw',
      ...(options.publicId && { public_id: options.publicId }),
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
};

module.exports = {
  cloudinary,
  uploadFile,
};

