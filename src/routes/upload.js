const express = require('express');
const router = express.Router();
const { cloudinary } = require('../config/cloudinary');
const { localStorageUpload } = require('../config/localStorage');
const { verifyToken } = require('../middleware/auth.middleware');
const fs = require('fs');

router.post('/', verifyToken, (req, res) => {
  // 1. ALWAYS save locally first (This ensures we consume the stream once and have the data)
  localStorageUpload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Local storage upload failed:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Upload to server failed.',
        error: err.message 
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const localPath = req.file.path;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const localUrl = `${baseUrl}/uploads/${req.file.filename}`;

    try {
      // 2. Try to sync this local file to Cloudinary
      console.log('Attempting to sync local file to Cloudinary:', req.file.filename);
      
      const cloudinaryResponse = await cloudinary.uploader.upload(localPath, {
        folder: 'masterticket',
        resource_type: 'auto'
      });

      // 3. Success! Delete the local file to save space and return Cloudinary URL
      fs.unlink(localPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting local temporary file:', unlinkErr);
      });

      return res.status(200).json({
        success: true,
        data: {
          url: cloudinaryResponse.secure_url,
          public_id: cloudinaryResponse.public_id,
          is_local: false
        }
      });

    } catch (cloudinaryErr) {
      // 4. Cloudinary Sync Failed (Timeout, network, etc.)
      // Gracefully FALLBACK to the local URL we already have
      console.error('Cloudinary sync failed, using LOCAL fallback:', cloudinaryErr.message);
      
      return res.status(200).json({
        success: true,
        data: {
          url: localUrl,
          public_id: req.file.filename,
          is_local: true,
          notice: 'Stored on local server due to cloud sync timeout'
        }
      });
    }
  });
});

module.exports = router;
