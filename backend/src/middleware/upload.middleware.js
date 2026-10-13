import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/menu');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `menu-${uniqueSuffix}${safeExt}`);
  },
});

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
