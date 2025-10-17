const AWS = require('aws-sdk');
const logger = require('./logger');

const USE_S3 = process.env.USE_S3 === 'true';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

// Configure AWS SDK
if (USE_S3) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION,
  });
} else {
  logger.info('S3 uploads disabled. Using Cloudinary.');
}

const s3 = new AWS.S3();

/**
 * Generate presigned URL for direct client upload to S3
 */
const generatePresignedUploadUrl = (key, contentType, expiresIn = 300) => {
  if (!USE_S3 || !AWS_S3_BUCKET) {
    throw new Error('S3 is not configured.');
  }

  const params = {
    Bucket: AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
    Expires: expiresIn,
    ACL: 'public-read',
  };

  const uploadUrl = s3.getSignedUrl('putObject', params);

  // Generate the final URL (CloudFront if configured, otherwise S3)
  let fileUrl;
  if (CLOUDFRONT_URL) {
    fileUrl = `${CLOUDFRONT_URL}/${key}`;
  } else {
    fileUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  }

  return {
    uploadUrl,
    fileUrl,
    key,
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
  };
};

/**
 * Upload buffer directly to S3
 */
const uploadFile = async (buffer, key, contentType) => {
  if (!USE_S3 || !AWS_S3_BUCKET) {
    throw new Error('S3 is not configured.');
  }

  try {
    const params = {
      Bucket: AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    };

    const result = await s3.upload(params).promise();

    let fileUrl = result.Location;
    if (CLOUDFRONT_URL) {
      fileUrl = `${CLOUDFRONT_URL}/${key}`;
    }

    return {
      url: fileUrl,
      key: result.Key,
      bucket: result.Bucket,
      etag: result.ETag,
    };
  } catch (error) {
    logger.error('S3 upload error:', error);
    throw error;
  }
};

/**
 * Delete file from S3
 */
const deleteFile = async (key) => {
  if (!USE_S3 || !AWS_S3_BUCKET) {
    throw new Error('S3 is not configured.');
  }

  try {
    const params = {
      Bucket: AWS_S3_BUCKET,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    return { success: true, key };
  } catch (error) {
    logger.error('S3 delete error:', error);
    throw error;
  }
};

/**
 * Generate presigned GET URL for private files
 */
const generatePresignedDownloadUrl = (key, expiresIn = 3600) => {
  if (!USE_S3 || !AWS_S3_BUCKET) {
    throw new Error('S3 is not configured.');
  }

  const params = {
    Bucket: AWS_S3_BUCKET,
    Key: key,
    Expires: expiresIn,
  };

  return s3.getSignedUrl('getObject', params);
};

module.exports = {
  s3,
  USE_S3,
  generatePresignedUploadUrl,
  uploadFile,
  deleteFile,
  generatePresignedDownloadUrl,
};

