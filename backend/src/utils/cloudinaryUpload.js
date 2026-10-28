import { Readable } from 'stream';
import cloudinary from '../config/cloudinary.js';

/**
 * Uploads an image buffer directly to Cloudinary using upload_stream.
 *
 * @param {Buffer} buffer - The image file buffer in memory
 * @param {string} folder - The destination folder in Cloudinary (default: 'apexpos/menu')
 * @returns {Promise<object>} Resolves with Cloudinary upload result containing secure_url and public_id
 */
export const uploadToCloudinary = (buffer, folder = 'apexpos/menu') => {
  return new Promise((resolve, reject) => {
    if (!buffer) {
      return reject(new Error('No image buffer provided for Cloudinary upload'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

/**
 * Deletes an image from Cloudinary by its public ID.
 *
 * @param {string} publicId - The Cloudinary public_id
 * @returns {Promise<object|null>} Resolves with deletion result or null on failure/skip
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId || typeof publicId !== 'string') {
    return null;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    return result;
  } catch (error) {
    console.error(`Failed to delete Cloudinary asset [${publicId}]:`, error.message || error);
    return null;
  }
};

/**
 * Utility helper to safely extract Cloudinary public ID from a URL as a fallback
 * for legacy records that only stored the secure_url.
 *
 * @param {string} url - The image URL
 * @returns {string|null} The extracted public ID or null
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
    return null;
  }

  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;

    let pathAfterUpload = parts[1];
    // Remove version prefix e.g. v1712345678/
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

    // If transformations are included before folder e.g. f_auto,q_auto/apexpos/...
    if (pathAfterUpload.includes('/') && !pathAfterUpload.startsWith('apexpos/')) {
      const folderIdx = pathAfterUpload.indexOf('apexpos/');
      if (folderIdx !== -1) {
        pathAfterUpload = pathAfterUpload.slice(folderIdx);
      }
    }

    // Strip extension
    const lastDotIndex = pathAfterUpload.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      pathAfterUpload = pathAfterUpload.substring(0, lastDotIndex);
    }

    return pathAfterUpload || null;
  } catch {
    return null;
  }
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicIdFromUrl,
};
