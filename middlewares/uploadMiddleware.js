const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const prodPersistentDir = '/home/u726900424/domains/houserenter.in/persistent_uploads';
const baseUploads = fs.existsSync('/home/u726900424/domains/houserenter.in')
  ? prodPersistentDir
  : path.join(__dirname, '..', 'public', 'uploads');

// Create upload paths dynamically
const uploadDirs = [
  path.join(baseUploads, 'properties'),
  path.join(baseUploads, 'reels'),
  path.join(baseUploads, 'blogs'),
  path.join(baseUploads, 'services'),
  path.join(baseUploads, 'profile'),
  path.join(baseUploads, 'banners')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer storage to load files directly into memory buffer
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp|gif|mp4|mov|avi|quicktime/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only standard image and video files are supported!'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Max size 50MB for video support
  fileFilter: fileFilter
});

// Helper function to compress images using sharp and save to disk in WebP format
async function processImage(buffer, folder, prefix = 'img') {
  const fileName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const destDir = path.join(baseUploads, folder);
  const destPath = path.join(destDir, fileName);

  try {
    await sharp(buffer, { failOn: 'none' })
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .toFormat('webp')
      .webp({ quality: 80 })
      .toFile(destPath);
  } catch (sharpErr) {
    // Fallback: try without resize constraints for problematic formats
    console.warn('Sharp primary processing failed, trying fallback:', sharpErr.message);
    await sharp(buffer, { failOn: 'none' })
      .toFormat('webp')
      .webp({ quality: 75 })
      .toFile(destPath);
  }

  return `/uploads/${folder}/${fileName}`;
}

// Helper function to crop and compress profile images to a standard 300x300 square
async function processProfileImage(buffer) {
  const fileName = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const destDir = path.join(baseUploads, 'profile');
  const destPath = path.join(destDir, fileName);

  await sharp(buffer)
    .resize(300, 300, { fit: 'cover' }) // Square crop avatar
    .toFormat('webp')
    .webp({ quality: 80 })
    .toFile(destPath);

  return `/uploads/profile/${fileName}`;
}

// Helper function to save raw video files to disk
async function processVideo(buffer, originalname, folder) {
  const fileExt = path.extname(originalname).toLowerCase();
  const fileName = `vid-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
  const destDir = path.join(baseUploads, folder);
  const destPath = path.join(destDir, fileName);

  await fs.promises.writeFile(destPath, buffer);
  return `/uploads/${folder}/${fileName}`;
}

module.exports = {
  upload,
  processImage,
  processProfileImage,
  processVideo
};
