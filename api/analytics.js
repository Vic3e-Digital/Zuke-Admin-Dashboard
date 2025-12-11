const express = require('express');
const router = express.Router();
const { getDatabase } = require('../lib/mongodb');

// ========== OVERVIEW ENDPOINTS ==========

// Get total videos generated
router.get('/overview/videos', async (req, res) => {
  try {
    const db = await getDatabase();
    const count = await db.collection('veo_generations').countDocuments();
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching videos count:', error);
    res.json({ success: false, count: 0, error: error.message });
  }
});

// Get total emails sent
router.get('/overview/emails', async (req, res) => {
  try {
    const db = await getDatabase();
    
    // Count from email_campaigns and email_history
    const [campaignCount, historyStats] = await Promise.all([
      db.collection('email_campaigns').countDocuments(),
      db.collection('email_history').aggregate([
        { $group: { _id: null, totalSent: { $sum: "$stats.sent" } } }
      ]).toArray()
    ]);
    
    const totalFromHistory = historyStats.length > 0 ? historyStats[0].totalSent : 0;
    const totalCount = campaignCount + totalFromHistory;
    
    res.json({ success: true, count: totalCount });
  } catch (error) {
    console.error('Error fetching emails count:', error);
    res.json({ success: false, count: 0, error: error.message });
  }
});

// Get total social posts generated
router.get('/overview/social', async (req, res) => {
  try {
    const db = await getDatabase();
    const count = await db.collection('social_posts').countDocuments();
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching social posts count:', error);
    res.json({ success: false, count: 0, error: error.message });
  }
});

// Get total audio files transcribed
router.get('/overview/audio', async (req, res) => {
  try {
    const db = await getDatabase();
    const count = await db.collection('audio_transcriptions').countDocuments();
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching audio files count:', error);
    res.json({ success: false, count: 0, error: error.message });
  }
});

// Get total creative models registered
router.get('/overview/models', async (req, res) => {
  try {
    const db = await getDatabase();
    const count = await db.collection('creative_models').countDocuments();
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching models count:', error);
    res.json({ success: false, count: 0, error: error.message });
  }
});

// Get total images generated
router.get('/overview/images', async (req, res) => {
  try {
    const db = await getDatabase();
    
    // Check multiple possible collections for image data
    const [
      imageGenerations,
      creativeModels,
      socialPosts
    ] = await Promise.all([
      db.collection('image_generations').countDocuments().catch(() => 0),
      db.collection('creative_models').countDocuments({ 
        $or: [
          { 'portfolio.headshots.0': { $exists: true } },
          { 'portfolio.additionalPhotos.0': { $exists: true } }
        ]
      }).catch(() => 0),
      db.collection('social_posts').countDocuments({ 
        contentType: 'image' 
      }).catch(() => 0)
    ]);
    
    // Sum up all image-related counts
    const totalCount = imageGenerations + creativeModels + socialPosts;
    
    res.json({ 
      success: true, 
      count: totalCount,
      breakdown: {
        image_generations: imageGenerations,
        creative_model_images: creativeModels,
        social_images: socialPosts
      }
    });
  } catch (error) {
    console.error('Error fetching images count:', error);
    res.json({ success: false, count: 0, error: error.message });
  }
});

// ========== DETAILED ANALYTICS ENDPOINTS ==========

// Videos analytics
router.get('/videos/status-breakdown', async (req, res) => {
  try {
    const db = await getDatabase();
    const statusBreakdown = await db.collection('veo_generations').aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray();
    
    const result = {
      processing: 0,
      completed: 0,
      failed: 0
    };
    
    statusBreakdown.forEach(item => {
      if (item._id in result) {
        result[item._id] = item.count;
      }
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching video status breakdown:', error);
    res.json({ success: false, error: error.message });
  }
});

// Video generation revenue
router.get('/videos/revenue', async (req, res) => {
  try {
    const db = await getDatabase();
    const revenueData = await db.collection('veo_generations').aggregate([
      { $match: { charged: true } },
      { $group: { _id: null, total: { $sum: "$cost" } } }
    ]).toArray();
    
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;
    
    res.json({ 
      success: true, 
      revenue: totalRevenue,
      formatted: `R${totalRevenue.toFixed(2)}`
    });
  } catch (error) {
    console.error('Error fetching video revenue:', error);
    res.json({ success: false, error: error.message });
  }
});

// Creative models analytics
router.get('/models/contact-requests', async (req, res) => {
  try {
    const db = await getDatabase();
    const contactRequests = await db.collection('creative_models').aggregate([
      { $unwind: "$contact_requests" },
      { $match: { "contact_requests.status": "pending" } },
      { $count: "total" }
    ]).toArray();
    
    const pendingCount = contactRequests.length > 0 ? contactRequests[0].total : 0;
    
    res.json({ success: true, count: pendingCount });
  } catch (error) {
    console.error('Error fetching contact requests:', error);
    res.json({ success: false, count: 0, error: error.message });
  }
});

// Audio transcription analytics
router.get('/audio/total-duration', async (req, res) => {
  try {
    const db = await getDatabase();
    const durationData = await db.collection('audio_transcriptions').aggregate([
      { $group: { _id: null, totalMinutes: { $sum: "$duration" } } }
    ]).toArray();
    
    const totalMinutes = durationData.length > 0 ? durationData[0].totalMinutes : 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    res.json({ 
      success: true, 
      totalMinutes,
      formatted: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    });
  } catch (error) {
    console.error('Error fetching audio duration:', error);
    res.json({ success: false, error: error.message });
  }
});

// Financial overview
router.get('/financial/total-revenue', async (req, res) => {
  try {
    const db = await getDatabase();
    
    // Get all debit transactions (money spent by users = revenue for platform)
    const revenueData = await db.collection('user_wallets').aggregate([
      { $unwind: "$transactions" },
      { $match: { "transactions.type": "debit" } },
      { $group: { _id: null, total: { $sum: "$transactions.amount" } } }
    ]).toArray();
    
    const totalRevenue = revenueData.length > 0 ? Math.abs(revenueData[0].total) : 0;
    
    res.json({ 
      success: true, 
      revenue: totalRevenue,
      formatted: `R${totalRevenue.toFixed(2)}`
    });
  } catch (error) {
    console.error('Error fetching total revenue:', error);
    res.json({ success: false, error: error.message });
  }
});

// Business analytics
router.get('/business/status-breakdown', async (req, res) => {
  try {
    const db = await getDatabase();
    const statusBreakdown = await db.collection('store_submissions').aggregate([
      { $group: { _id: "$processing_status.status", count: { $sum: 1 } } }
    ]).toArray();
    
    const result = {
      active: 0,
      processing: 0,
      inactive: 0
    };
    
    statusBreakdown.forEach(item => {
      if (item._id && item._id in result) {
        result[item._id] = item.count;
      } else if (!item._id) {
        result.inactive += item.count;
      }
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching business status breakdown:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;