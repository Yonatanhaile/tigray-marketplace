import axios from 'axios';
import { uploadsAPI } from './api';

/**
 * Upload file to Cloudinary
 */
export const uploadToCloudinary = async (file) => {
  try {
    // Get signature from backend
    const signData = await uploadsAPI.getSignature({
      folder: 'marketplace',
    });

    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', signData.timestamp);
    formData.append('signature', signData.signature);
    formData.append('folder', signData.folder);
    if (signData.uploadPreset) {
      formData.append('upload_preset', signData.uploadPreset);
    }

    // Upload to Cloudinary
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${signData.cloudName}/auto/upload`,
      formData
    );

    return {
      url: response.data.secure_url,
      publicId: response.data.public_id,
      format: response.data.format,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Upload file to S3 (if S3 is configured)
 */
export const uploadToS3 = async (file) => {
  try {
    // Get presigned URL from backend
    const signData = await uploadsAPI.getSignature({
      contentType: file.type,
      fileExtension: `.${file.name.split('.').pop()}`,
    });

    // Upload directly to S3
    await axios.put(signData.uploadUrl, file, {
      headers: signData.headers,
    });

    return {
      url: signData.fileUrl,
      key: signData.key,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
};

/**
 * Generic upload function (detects provider from backend response)
 */
export const uploadFile = async (file) => {
  // Validate file size (8MB max)
  const maxSize = 8 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size exceeds 8MB limit');
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed. Only images (JPEG, PNG, WebP) and PDF are allowed.');
  }

  try {
    // Get signature/presigned URL
    const signData = await uploadsAPI.getSignature({
      folder: 'marketplace',
      contentType: file.type,
    });

    if (signData.provider === 's3') {
      return await uploadToS3(file);
    } else {
      return await uploadToCloudinary(file);
    }
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

