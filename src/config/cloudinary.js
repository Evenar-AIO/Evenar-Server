const cloudinary = require('cloudinary').v2;
const CloudinaryStorage = require('multer-storage-cloudinary');
const multer = require('multer');

console.log('Initializing Cloudinary with cloud_name:', process.env.CLOUDINARY_CLOUD_NAME);

// Redundant DNS fix for specific networks
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 120000 // Increase timeout to 120s
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'masterticket',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
