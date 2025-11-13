const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../lib/mongodb');

// POST /api/products/log
router.post('/log', async (req, res) => {
  try {
    console.log('📝 ===== PRODUCTS LOG ENDPOINT HIT =====');
    console.log('📦 Content-Type:', req.headers['content-type']);
    console.log('📦 Body type:', typeof req.body);
    console.log('📦 Body keys:', Object.keys(req.body || {}));
    
    const productData = req.body;
    
    if (!productData || Object.keys(productData).length === 0) {
      console.error('❌ Empty payload in log endpoint!');
      return res.status(400).json({ 
        success: false, 
        error: 'No data provided' 
      });
    }
    
    console.log('📦 Product name:', productData.productData?.name);
    console.log('📦 Business ID:', productData.businessId);
    console.log('📦 Image IDs:', productData.productData?.wordpressImageIds);
    
    // Save to MongoDB
    const db = await getDatabase();
    const result = await db.collection('products_log').insertOne({
      ...productData,
      createdAt: new Date(),
      status: 'logged'
    });
    
    console.log('✅ Product logged to database:', result.insertedId);
    
    res.json({ 
      success: true, 
      message: 'Product logged successfully',
      logId: result.insertedId
    });
    
  } catch (error) {
    console.error('❌ Error logging product:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to log product',
      details: error.message 
    });
  }
});

module.exports = router;