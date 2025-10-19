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
  // Validate file size (10MB max for mobile compatibility)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit. Please compress your image.');
  }

  // Validate file type - More permissive for mobile devices
  // Mobile cameras can send various MIME types, so we check the file extension too
  const fileName = file.name.toLowerCase();
  const allowedTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp', 
    'image/heic',  // iOS photos
    'image/heif',  // iOS photos
    'application/pdf'
  ];
  
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.pdf'];
  
  const hasValidType = allowedTypes.includes(file.type) || file.type === '';
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  
  // If MIME type is empty (common on mobile), check file extension
  if (!hasValidType && !hasValidExtension) {
    throw new Error('Please select an image file (JPG, PNG, WebP, or HEIC)');
  }

  try {
    // Get signature/presigned URL
    const signData = await uploadsAPI.getSignature({
      folder: 'marketplace',
      contentType: file.type || 'image/jpeg', // Default to jpeg if type is missing
    });

    if (signData.provider === 's3') {
      return await uploadToS3(file);
    } else {
      return await uploadToCloudinary(file);
    }
  } catch (error) {
    console.error('Upload error:', error);
    
    // Better error messages for users
    if (error.response?.status === 413) {
      throw new Error('File too large. Please use a smaller image.');
    } else if (error.response?.status === 415) {
      throw new Error('Image format not supported. Please use JPG, PNG, or WebP.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Upload failed. Please check your internet connection and try again.');
    }
  }
};

