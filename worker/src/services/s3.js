const AWS = require('aws-sdk');
const logger = require('./logger');

const USE_S3 = process.env.USE_S3 === 'true';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

if (USE_S3) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION,
  });
}

const s3 = new AWS.S3();

/**
 * Upload buffer to S3
 */
const uploadFile = async (buffer, key, contentType) => {
  if (!USE_S3 || !AWS_S3_BUCKET) {
    throw new Error('S3 is not configured');
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

module.exports = {
  s3,
  USE_S3,
  uploadFile,
};

