// src/middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Upload directories
const UPLOAD_DIRS = {
  events: {
    covers: 'uploads/events/covers',
    thumbnails: 'uploads/events/thumbnails',
    logos: 'uploads/events/logos',
    venueMaps: 'uploads/events/venue-maps'
  },
  users: {
    avatars: 'uploads/users/avatars'
  },
  temp: 'uploads/temp'
};

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
    console.log(`created directory: ${dir}`);
  }
};

// Create all upload directories on startup
const initializeUploadDirectories = () => {
  try {
    Object.values(UPLOAD_DIRS.events).forEach(ensureDirectoryExists);
    Object.values(UPLOAD_DIRS.users).forEach(ensureDirectoryExists);
    ensureDirectoryExists(UPLOAD_DIRS.temp);
    console.log('✅ Upload directories initialized');
  } catch (error) {
    console.error('❌ Failed to initialize upload directories:', error);
  }
};

// Initialize on load
initializeUploadDirectories();

// Image processing configurations
const IMAGE_CONFIGS = {
  event_cover: {
    width: 1280,
    height: 720,
    fit: 'cover',
    quality: 85,
    format: 'jpeg'
  },
  event_thumbnail: {
    width: 720,
    height: 958,
    fit: 'cover',
    quality: 85,
    format: 'jpeg'
  },
  event_logo: {
    width: 275,
    height: 275,
    fit: 'cover',
    quality: 90,
    format: 'png'
  },
  venue_map: {
    width: 1920,
    height: 1080,
    fit: 'inside',
    quality: 90,
    format: 'jpeg'
  },
  user_avatar: {
    width: 400,
    height: 400,
    fit: 'cover',
    quality: 90,
    format: 'jpeg'
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIRS.temp);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${file.fieldname}-${Date.now()}-${uniqueId}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 
    'image/png', 'image/webp'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(
      `Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are allowed.`
    ), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024, // 2MB
    files: 10 // Max 10 files per request
  }
});

/**
 * Process and resize uploaded image
 * @param {String} inputPath - Input file path
 * @param {String} outputPath - Output file path
 * @param {Object} config - Image processing config
 * @returns {Promise<String>} Output file path
 */
const processImage = async (inputPath, outputPath, config) => {
  try {
     // Get image metadata
    const metadata = await sharp(inputPath).metadata();

    // Validate image format
    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
    if (!allowedFormats.includes(metadata.format)) {
      throw new Error(`Unsupported image format: ${metadata.format}`);
    }
    
    // Validate dimensions (optional)
    if (metadata.width < 100 || metadata.height < 100) {
      throw new Error('Image dimensions too small (min 100x100)');
    }
    
    // Configure sharp pipeline
    let pipeline = sharp(inputPath).resize({
      width: config.width,
      height: config.height,
      fit: config.fit,
      position: 'center',
      withoutEnlargement: false
    });
      // .jpeg({ quality: config.quality })
      // .toFile(outputPath);

    switch (config.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ 
          quality: config.quality,
          progressive: true,
          mozjpeg: true
        });
        break;
      case 'png':
        pipeline = pipeline.png({ 
          quality: config.quality,
          compressionLevel: 9,
          progressive: true
        });
        break;
      case 'webp':
        pipeline = pipeline.webp({ 
          quality: config.quality 
        });
        break;
    }

    // Save processed image
    const info = await pipeline.toFile(outputPath);
    
    // Delete temp file
    await fs.unlink(inputPath);

    // return outputPath;
    return {
      path: outputPath,
      size: info.size,
      width: info.width,
      height: info.height,
      format: info.format
    };
  } catch (error) {
    // Clean up on error
    try {
      if (fsSync.existsSync(inputPath)) {
        await fs.unlink(inputPath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }
    throw new Error(`Failed to process image: ${error.message}`);
  }
};

/**
 * Clean up temporary files
 */
const cleanupTempFiles = async (files) => {
  if (!files) return;

  try {
    const fileArray = Array.isArray(files) ? files : Object.values(files).flat();
    
    for (const file of fileArray) {
      if (file.path && fsSync.existsSync(file.path)) {
        await fs.unlink(file.path);
      }
    }
  } catch (error) {
    console.error('Cleanup temp files error:', error);
  }
};

/**
 * Middleware to handle event image uploads
 */
const uploadEventImages = upload.fields([
  { name: 'cover_image', maxCount: 1 },
  { name: 'thumbnail_image', maxCount: 1 },
  { name: 'logo_image', maxCount: 1 },
  { name: 'venue_map_image', maxCount: 1 }
]);

/**
 * Middleware to handle user avatar upload
 */
const uploadUserAvatar = upload.single('avatar');

/**
 * Middleware for single image upload (generic)
 */
const uploadSingleImage = (fieldName = 'image') => {
  return upload.single(fieldName);
};

/**
 * Middleware for multiple images upload (generic)
 */
const uploadMultipleImages = (fieldName = 'images', maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

/**
 * Process event images after upload
 */
const processEventImages = async (req, res, next) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return next();
    }

    console.log('Processing event images:', Object.keys(req.files));

    const processedImages = {};
    const errors = [];
    const timestamp = Date.now();

    const processingTasks = [];

    // Process cover image
    if (req.files.cover_image && req.files.cover_image[0]) {
      processingTasks.push((async () => {
        try {
          const file = req.files.cover_image[0];
          const filename = `${timestamp}-${uuidv4()}.jpg`;
          const outputPath = path.join(UPLOAD_DIRS.events.covers, filename);

          await processImage(file.path, outputPath, IMAGE_CONFIGS.event_cover);
          processedImages.cover_image = `/uploads/events/covers/${filename}`;
        } catch (error) {
          console.log('Error processing cover image:', error.message);
          errors.push(`Cover image: ${error.message}`);
        }
      })());
    }

    // Process thumbnail image
    if (req.files.thumbnail_image && req.files.thumbnail_image[0]) {
      processingTasks.push((async () => {
        try {
          const file = req.files.thumbnail_image[0];
          const filename = `${timestamp}-${uuidv4()}.jpg`;
          const outputPath = path.join(UPLOAD_DIRS.events.thumbnails, filename);

          await processImage(file.path, outputPath, IMAGE_CONFIGS.event_thumbnail);
          processedImages.thumbnail_image = `/uploads/events/thumbnails/${filename}`;
        } catch (error) {
          console.log('Error processing thumbnail image:', error.message);
          errors.push(`Thumbnail image: ${error.message}`);
        }
      })());
    }

    // Process logo image
    if (req.files.logo_image && req.files.logo_image[0]) {
      processingTasks.push((async () => {
        try {
          const file = req.files.logo_image[0];
          const filename = `${timestamp}-${uuidv4()}.png`;
          const outputPath = path.join(UPLOAD_DIRS.events.logos, filename);

          await processImage(file.path, outputPath, IMAGE_CONFIGS.event_logo);
          processedImages.logo_image = `/uploads/events/logos/${filename}`;
        } catch (error) {
          console.log('Error processing logo image:', error.message);
          errors.push(`Logo image: ${error.message}`);
        }
      })());
    }

    // Process venue map image
    if (req.files.venue_map_image && req.files.venue_map_image[0]) {
      processingTasks.push((async () => {
        try {
          const file = req.files.venue_map_image[0];
          const filename = `${timestamp}-${uuidv4()}.jpg`;
          const outputPath = path.join(UPLOAD_DIRS.events.venueMaps, filename);
        
          await processImage(file.path, outputPath, IMAGE_CONFIGS.venue_map);
          processedImages.venue_map_image = `/uploads/events/venue-maps/${filename}`;
        } catch (error) {
          console.log('Error processing venue map image:', error.message);
          errors.push(`Venue map image: ${error.message}`);
        }
      })());
    }

    // Await all processing tasks
    await Promise.all(processingTasks);

    if (errors.length > 0) {
      console.error('Image processing errors: ', errors);

      // clean up any processed images
      await cleanupProcessedImages(processedImages);
      
      await cleanupTempFiles(req.files);

      return res.status(400).json({
        success: false,
        error: {
          message: 'Failed to process some images',
          details: errors
        }
      });
    }

    // Add processed image to request object
    // req.body = {
    //   ...req.body,
    //   ...processedImages
    // };
    Object.assign(req.body, processedImages);

    //Store for potential cleanup
    req.processedImages = processedImages;

    console.log('✅ Processed images:', processedImages); // Debug log

    next();
  } catch (error) {
    console.error('Image processing error:', error.message);
    
    // Clean up any temp files
    if (req.files) {
      await cleanupTempFiles(req.files);
    }
    if (req.processedImages) {
      await cleanupProcessedImages(req.processedImages);
    }

    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process images',
        details: error.message
      }
    });
  }
};

/**
 * Process user avatar after upload
 */
const processUserAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    console.log('Processing user avatar');

    const file = req.file;
    const filename = `${Date.now()}-${uuidv4()}.jpg`;
    const outputPath = path.join(UPLOAD_DIRS.users.avatars, filename);
    await processImage(file.path, outputPath, IMAGE_CONFIGS.user_avatar);
    
    req.processedAvatar = `/uploads/users/avatars/${filename}`;
    req.body.avatar_url = req.processedAvatar;

    console.log('Avatar processed:', req.processedAvatar);
    next();

  } catch (error) {
    console.error('Avatar processing error:', error.message);
    
    // Clean up temp file
    if (req.file){
      await cleanupTempFiles([req.file]);
    }

    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process avatar',
        details: error.message
      }
    });
  }
};

/**
 * Delete file
 * @param {String} filePath - File path to delete
 */
const deleteFile = async (filePath) => {
  try {
    if (!filePath) return false;

     // ✅ Validate path không có ".."
    if (filePath.includes('..') || !filePath.startsWith('/uploads/')) {
      console.error('Invalid file path:', filePath);
      return false;
    }

    // Convert URL path to filesystem path
    const fsPath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    
     // ✅ Đảm bảo file nằm trong thư mục uploads
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fsPath.startsWith(uploadsDir)) {
      console.error('Path traversal attempt:', filePath);
      return false;
    }

    if (fsSync.existsSync(fsPath)) {
      await fs.unlink(fsPath);
      console.log(`Deleted file: ${fsPath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Delete file error:', error.message);
    return false;
  }
};

/**
 * Clean up processed images 
 * */
const cleanupProcessedImages = async (processedImages) => {
  if (!processedImages) return;
  
  const deletePromises = Object.values(processedImages).map(filePath =>
    deleteFile(filePath)
  );

  await Promise.allSettled(deletePromises);
}

/**
 * Clean up old files for an entity
 * @param {Object} oldData - Old entity data with image URLs
 * @param {Object} newData - New entity data with image URLs
 */
const cleanupOldImages = async (oldData, newData) => {
  const imageFields = [
    'cover_image', 'thumbnail_image', 
    'logo_image', 'venue_map_image', 'avatar_url'];
  
  const deletePromises = imageFields
    .filter(field => oldData[field] && newData[field] && oldData[field] !== newData[field])
    .map(field => deleteFile(oldData[field]));

  await Promise.allSettled(deletePromises);
};


/**
 * Validate image dimensions
 * @param {String} imagePath - Path to image
 * @param {Object} requirements - Required dimensions
 * @returns {Promise<Boolean>} Is valid
 */
const validateImageDimensions = async (imagePath, requirements) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    
    const { minWidth, minHeight, maxWidth, maxHeight } = requirements;
    
    if (minWidth && metadata.width < minWidth) return false;
    if (minHeight && metadata.height < minHeight) return false;
    if (maxWidth && metadata.width > maxWidth) return false;
    if (maxHeight && metadata.height > maxHeight) return false;
    
    return true;
  } catch (error) {
    console.error('Image validation error:', error);
    return false;
  }
};

module.exports = {
  uploadEventImages,
  uploadUserAvatar,
  uploadSingleImage,
  uploadMultipleImages,

  processEventImages,
  processUserAvatar,

  deleteFile,
  cleanupOldImages,
  cleanupProcessedImages,
  cleanupTempFiles,

  validateImageDimensions,
  IMAGE_CONFIGS,
  UPLOAD_DIRS
};