const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../lib/mongodb');

// GET /api/products/get-products-services
// Fetch all products and services for a specific business
router.get('/get-products-services', async (req, res) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Business ID is required' 
      });
    }

    console.log('📦 Fetching products/services for business:', businessId);

    const db = await getDatabase();
    
    // Fetch products
    const products = await db.collection('products_log')
      .find({ businessId })
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch services
    const services = await db.collection('services_log')
      .find({ businessId })
      .sort({ createdAt: -1 })
      .toArray();

    // Format response
    const formattedProducts = products.map(p => ({
      id: p._id,
      name: p.productData?.name || 'Unnamed Product',
      type: 'product',
      description: p.productData?.description || '',
      price: p.productData?.price || null,
      images: p.productData?.images || [],
      cloudinaryImages: p.productData?.cloudinaryImages || [],
      createdAt: p.createdAt
    }));

    const formattedServices = services.map(s => ({
      id: s._id,
      name: s.serviceData?.name || 'Unnamed Service',
      type: 'service',
      description: s.serviceData?.description || '',
      pricing: s.serviceData?.pricing || [],
      images: s.serviceData?.images || [],
      cloudinaryImages: s.serviceData?.cloudinaryImages || [],
      createdAt: s.createdAt
    }));

    const allItems = [...formattedProducts, ...formattedServices]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`✅ Found ${formattedProducts.length} products and ${formattedServices.length} services`);

    res.json({ 
      success: true, 
      items: allItems,
      products: formattedProducts,
      services: formattedServices,
      total: allItems.length
    });

  } catch (error) {
    console.error('❌ Error fetching products/services:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch products and services',
      details: error.message 
    });
  }
});

module.exports = router;
