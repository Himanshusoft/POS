import multer from 'multer';
import path from 'path';

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Configure in-memory storage for streaming directly to Cloudinary
const storage = multer.memoryStorage();

// File filter for format validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidMime = ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase());
  const isValidExt = ALLOWED_EXTENSIONS.includes(ext);

  if (isValidMime && isValidExt) {
    return cb(null, true);
  }

  const error = new Error('Please upload a JPG, PNG, or WEBP image under 5 MB.');
  error.statusCode = 400;
  error.code = 'INVALID_FILE_TYPE';
  return cb(error, false);
};

// Multer upload instance with 5MB limit
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Express middleware wrapper that handles Multer errors gracefully
export const uploadMenuImage = (fieldName = 'image') => {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldName);

    uploadSingle(req, res, (err) => {
      if (!err) {
        return next();
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Image size exceeds the 5 MB limit. Please upload an image under 5 MB.',
            error: { code: 'FILE_TOO_LARGE' },
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error',
          error: { code: err.code },
        });
      }

      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Invalid file uploaded. Allowed formats: JPG, PNG, WEBP up to 5 MB.',
        error: { code: err.code || 'UPLOAD_ERROR' },
      });
    });
  };
};

export default uploadMenuImage;
