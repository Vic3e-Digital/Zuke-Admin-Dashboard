const express = require('express');
const router = express.Router();

/**
 * GET /api/config/cloudinary
 * Returns Cloudinary configuration from environment variables
 */
router.get('/cloudinary', (req, res) => {
  try {
    res.json({
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
      cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
    });
  } catch (error) {
    console.error('Error retrieving Cloudinary config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve configuration'
    });
  }
});

module.exports = router;
