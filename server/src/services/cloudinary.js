const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
} else {
  logger.warn('⚠️  Cloudinary URL not configured. File uploads may fail.');
}

/**
 * Generate signed upload parameters for direct client-side upload
 */
const generateUploadSignature = (folder = 'marketplace') => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || undefined;

    const params = {
      timestamp,
      folder,
      ...(uploadPreset && { upload_preset: uploadPreset }),
    };

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET || cloudinary.config().api_secret
    );

    return {
      signature,
      timestamp,
      folder,
      cloudName: cloudinary.config().cloud_name,
      apiKey: cloudinary.config().api_key,
      ...(uploadPreset && { uploadPreset }),
    };
  } catch (error) {
    logger.error('Error generating Cloudinary signature:', error);
    throw error;
  }
};

/**
 * Upload file buffer to Cloudinary
 */
const uploadFile = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'marketplace',
      resource_type: options.resourceType || 'auto',
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
            width: result.width,
            height: result.height,
            bytes: result.bytes,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete file from Cloudinary
 */
const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    logger.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

/**
 * Generate optimized image URL with transformations
 */
const getOptimizedImageUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    width: options.width || 800,
    height: options.height,
    crop: options.crop || 'limit',
    quality: options.quality || 'auto:good',
    fetch_format: 'auto',
    ...options,
  });
};

module.exports = {
  cloudinary,
  generateUploadSignature,
  uploadFile,
  deleteFile,
  getOptimizedImageUrl,
};

