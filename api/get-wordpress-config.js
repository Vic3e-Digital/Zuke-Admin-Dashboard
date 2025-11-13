const express = require('express');
const router = express.Router();

router.get('/get-wordpress-config', async (req, res) => {
  try {
    // Return WordPress config from environment
    res.json({
      url: process.env.WORDPRESS_URL,
      username: process.env.WORDPRESS_USERNAME,
      password: process.env.WORDPRESS_APP_PASSWORD
    });
  } catch (error) {
    console.error('Error fetching WordPress config:', error);
    res.status(500).json({ error: 'Failed to get WordPress config' });
  }
});

module.exports = router;