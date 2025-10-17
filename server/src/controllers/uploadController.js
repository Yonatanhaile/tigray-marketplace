const { generateUploadSignature } = require('../services/cloudinary');
const { generatePresignedUploadUrl, USE_S3 } = require('../services/s3');
const logger = require('../services/logger');
const crypto = require('crypto');

/**
 * Generate signed upload URL (Cloudinary or S3)
 */
const getUploadSignature = async (req, res) => {
  try {
    const { folder = 'marketplace', contentType, fileExtension } = req.body;

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (contentType && !allowedTypes.includes(contentType)) {
      return res.status(400).json({
        error: true,
        message: 'File type not allowed. Only images (JPEG, PNG, WebP) and PDF are allowed.',
      });
    }

    if (USE_S3) {
      // Generate S3 presigned URL
      const key = `${folder}/${req.userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${fileExtension || ''}`;
      const uploadData = generatePresignedUploadUrl(key, contentType || 'application/octet-stream');

      return res.status(200).json({
        error: false,
        provider: 's3',
        ...uploadData,
      });
    } else {
      // Generate Cloudinary signature
      const uploadData = generateUploadSignature(folder);

      return res.status(200).json({
        error: false,
        provider: 'cloudinary',
        ...uploadData,
      });
    }
  } catch (error) {
    logger.error('Upload signature error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to generate upload signature',
      details: error.message,
    });
  }
};

/**
 * Validate uploaded file (webhook endpoint for post-upload validation)
 */
const validateUpload = async (req, res) => {
  try {
    const { url, publicId, size, format } = req.body;

    // Validate file size (max 8MB)
    const maxSize = 8 * 1024 * 1024;
    if (size && size > maxSize) {
      return res.status(400).json({
        error: true,
        message: 'File size exceeds 8MB limit',
      });
    }

    // Validate format
    const allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    if (format && !allowedFormats.includes(format.toLowerCase())) {
      return res.status(400).json({
        error: true,
        message: 'File format not allowed',
      });
    }

    res.status(200).json({
      error: false,
      message: 'File validated successfully',
      url,
      publicId,
    });
  } catch (error) {
    logger.error('Validate upload error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to validate upload',
      details: error.message,
    });
  }
};

module.exports = {
  getUploadSignature,
  validateUpload,
};

