const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');


// Helper function to check if user is admin
const isAdmin = (user) => {
  const roles = user?.['https://zukex.com/roles'] || 
               user?.['https://zuke.co.za/roles'] || 
               user?.roles || 
               user?.app_metadata?.roles || 
               user?.user_metadata?.roles || 
               [];
  return roles.includes('admin') || roles.includes('Admin');
  };

// Debug route
router.get('/debug', async (req, res) => {
try {
 const { db } = await connectToDatabase();
 console.log('Connected to database:', db.databaseName);

 const collection = db.collection('store_submissions');
 const count = await collection.countDocuments();

 const samples = await collection.find({}).limit(3).toArray();

 const emailFields = [];
 if (samples.length > 0) {
   const personalEmails = await collection.distinct('personal_info.email');
   emailFields.push({ field: 'personal_info.email', emails: personalEmails });

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

// Main businesses route
router.get('/', async (req, res) => {
console.log('=== Business API Called ===');
console.log('Query params:', req.query);

try {
 const { email, user, admin } = req.query;

 // Check if admin is passed in query or from user object
//  let isAdminRequest = admin === 'true';
 let isAdminRequest = (admin === 'true') || (isAdmin === 'true');

 let userData = null;
 if (user) {
   try {
     userData = typeof user === 'string' ? JSON.parse(user) : user;
     isAdminRequest = isAdminRequest || isAdmin(userData);
   } catch (e) {
     console.error('Failed to parse user data:', e);
   }
 }

 const { db } = await connectToDatabase();
 const collection = db.collection('store_submissions');

 console.log('Searching in database:', db.databaseName);
 console.log('Looking for email:', email);
 console.log('Is Admin:', isAdminRequest);

 let businesses = [];

 if (isAdminRequest) {
   businesses = await collection.find({}).toArray();
 } else if (email) {
   businesses = await collection.find({ 'personal_info.email': email }).toArray();
 }

 res.json({
   success: true,
   count: businesses.length,
   isAdmin: isAdminRequest,
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

// Add test document route
router.post('/add-test', async (req, res) => {
try {
 const { db } = await connectToDatabase();
 const collection = db.collection('store_submissions');

 const testDoc = {
   personal_info: {
     first_name: "Test",
     last_name: "User",
     email: "owamjames1@gmail.com",
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