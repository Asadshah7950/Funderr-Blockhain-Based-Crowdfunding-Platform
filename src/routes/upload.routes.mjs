import express from 'express';
import cloudinary from '../config/cloudinary.config.mjs';
import multer from 'multer';
import { Readable } from 'stream';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased for PDFs)
  },
  fileFilter: (req, file, cb) => {
    // Accept images (jpg, jpeg, png, gif, webp) and PDFs
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, GIF, WEBP) and PDF documents are allowed!'), false);
    }
  }
});

// Upload organization certificate
router.post('/upload-certificate', (req, res, next) => {
  upload.single('certificate')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.log('[Upload] Multer error:', err.code, err.message);
      return res.status(400).json({ 
        message: `Upload error: ${err.message}`,
        error: err.code
      });
    } else if (err) {
      console.log('[Upload] File validation error:', err.message);
      return res.status(400).json({ 
        message: err.message,
        error: 'File validation failed'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('[Upload] Request received');
    console.log('[Upload] File:', req.file ? `${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)` : 'No file');
    console.log('[Upload] Body:', req.body);
    
    if (!req.file) {
      console.log('[Upload] Error: No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Convert buffer to stream
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);

    // Determine resource type based on file mimetype
    const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
    
    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'funderr/certificates',
          resource_type: resourceType,
          // Only apply transformations to images, not PDFs
          ...(resourceType === 'image' && {
            transformation: [
              { width: 1000, height: 1000, crop: 'limit' },
              { quality: 'auto' }
            ]
          })
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      bufferStream.pipe(uploadStream);
    });

    res.status(200).json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      resourceType: uploadResult.resource_type
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Check if it's a multer error (file validation)
    if (error.message.includes('Only image files')) {
      return res.status(400).json({ 
        message: error.message,
        error: 'Invalid file type'
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to upload certificate',
      error: error.message 
    });
  }
});

// Delete certificate (optional cleanup)
router.delete('/delete-certificate/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const result = await cloudinary.uploader.destroy(publicId);
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      message: 'Failed to delete certificate',
      error: error.message 
    });
  }
});

// Upload spending receipt (for accountability module)
router.post('/upload-receipt', (req, res, next) => {
  upload.single('receipt')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.log('[Upload] Multer error:', err.code, err.message);
      return res.status(400).json({ 
        message: `Upload error: ${err.message}`,
        error: err.code
      });
    } else if (err) {
      console.log('[Upload] File validation error:', err.message);
      return res.status(400).json({ 
        message: err.message,
        error: 'File validation failed'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('[Upload] Receipt upload request received');
    console.log('[Upload] File:', req.file ? `${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)` : 'No file');
    
    if (!req.file) {
      console.log('[Upload] Error: No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Convert buffer to stream
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);

    // Determine resource type based on file mimetype
    const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
    
    // Upload to Cloudinary in receipts folder
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'funderr/receipts',
          resource_type: resourceType,
          // Only apply transformations to images, not PDFs
          ...(resourceType === 'image' && {
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto' }
            ]
          })
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      bufferStream.pipe(uploadStream);
    });

    res.status(200).json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      resourceType: uploadResult.resource_type
    });
  } catch (error) {
    console.error('Receipt upload error:', error);
    
    if (error.message.includes('Only image files')) {
      return res.status(400).json({ 
        message: error.message,
        error: 'Invalid file type'
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to upload receipt',
      error: error.message 
    });
  }
});

// Delete receipt (optional cleanup)
router.delete('/delete-receipt/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    // Handle nested public IDs (funderr/receipts/xxx)
    const fullPublicId = publicId.includes('/') ? publicId : `funderr/receipts/${publicId}`;
    const result = await cloudinary.uploader.destroy(fullPublicId);
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({ 
      message: 'Failed to delete receipt',
      error: error.message 
    });
  }
});

export default router;