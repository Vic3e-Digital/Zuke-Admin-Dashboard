const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');



router.get('/debug', async (req, res) => {
  try {
    const { connectToDatabase } = require('../lib/mongodb');
    const { db } = await connectToDatabase();
    
    console.log('Connected to database:', db.databaseName);
    
    const collection = db.collection('store_submissions');
    const count = await collection.countDocuments();
    
    // Get a few sample documents
    const samples = await collection.find({}).limit(3).toArray();
    
    // Extract all emails to see what format they're in
    const emailFields = [];
    if (samples.length > 0) {
      // Check personal_info.email
      const personalEmails = await collection.distinct('personal_info.email');
      emailFields.push({ field: 'personal_info.email', emails: personalEmails });
      
      // Check marketplace_platform_user_info if it exists
      const marketplaceEmails = await collection.distinct('marketplace_platform_user_info.user_email');
      emailFields.push({ field: 'marketplace_platform_user_info.user_email', emails: marketplaceEmails });
    }
    
    res.json({
      success: true,
      database: db.databaseName,
      collection: 'store_submissions',
      totalDocuments: count,
      sampleDocuments: samples,
      emailFields: emailFields,
      documentStructure: samples.length > 0 ? Object.keys(samples[0]) : []
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});
// Main route - get businesses by email
router.get('/', async (req, res) => {
  console.log('=== Business API Called ===');
  console.log('Query params:', req.query);
  
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('store_submissions');
    
    console.log('Searching in database:', db.databaseName);
    console.log('Collection: store_submissions');
    console.log('Looking for email:', email);
    
    // Try multiple possible email locations based on your document structure
    const businesses = await collection.find({ 
      $or: [
        { 'personal_info.email': email },
        { 'marketplace_platform_user_info.user_email': email },
        { 'personal_info.email': { $regex: new RegExp(`^${email}$`, 'i') } },
        { 'marketplace_platform_user_info.user_email': { $regex: new RegExp(`^${email}$`, 'i') } }
      ]
    }).toArray();
    
    console.log(`Found ${businesses.length} businesses for email: ${email}`);
    
    res.json({ 
      success: true,
      count: businesses.length,
      businesses: businesses
    });
    
  } catch (error) {
    console.error('Error in businesses API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch businesses',
      message: error.message 
    });
  }
});

// Stats route
router.get('/stats', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('store_submissions');

    const [total, active, processing] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ 'processing_status.status': 'active' }),
      collection.countDocuments({ 'processing_status.status': 'processing' })
    ]);

    res.json({
      success: true,
      data: { 
        total, 
        active, 
        processing,
        inactive: total - active - processing
      }
    });
  } catch (error) {
    console.error("Error fetching business stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics"
    });
  }
});


router.post('/add-test', async (req, res) => {
  try {
    const { connectToDatabase } = require('../lib/mongodb');
    const { db } = await connectToDatabase();
    const collection = db.collection('store_submissions');
    
    const testDoc = {
      personal_info: {
        first_name: "Test",
        last_name: "User",
        email: "opeolu.victory@gmail.com",
        phone: "+27123456789",
        address: "123 Test Street"
      },
      store_info: {
        name: "Test Store",
        slug: "test-store",
        category: ["Electronics", "Gadgets"],
        description: "This is a test store",
        address: "456 Store Street"
      },
      media_files: {
        store_logo: "https://via.placeholder.com/150",
        store_banner: "https://via.placeholder.com/600x200"
      },
      social_media: {
        instagram: "@teststore",
        twitter: "@teststore"
      },
      processing_status: {
        status: "active",
        plan: "Premium",
        created_at: new Date()
      }
    };
    
    const result = await collection.insertOne(testDoc);
    
    res.json({
      success: true,
      message: "Test document added",
      insertedId: result.insertedId,
      document: testDoc
    });
  } catch (error) {
    console.error('Error adding test doc:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;