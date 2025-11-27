const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// ========== ADD MODEL TO BUSINESS ==========
router.post('/add-to-business', async (req, res) => {
  try {
    const { businessId, model, modelId } = req.body;

    console.log('📥 Received add model to business request:', {
      businessId,
      modelId,
      modelName: model?.name
    });

    if (!businessId || !modelId || !model) {
      return res.status(400).json({ 
        error: 'Missing required fields: businessId, modelId, model' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // ✅ Verify business exists in store_submissions (READ)
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      console.error('❌ Business not found in store_submissions');
      return res.status(404).json({ 
        error: 'Business not found',
        businessId: businessId
      });
    }

    console.log('✅ Business found:', business.store_info?.name);

    // Verify model exists in creative_models (READ)
    const modelDoc = await db.collection('creative_models').findOne({
      _id: new ObjectId(modelId)
    });

    if (!modelDoc) {
      console.warn('⚠️ Model not found in creative_models, but proceeding with user data');
    }

    // Prepare the model object to store
    const creativeModelEntry = {
      modelId: modelId,
      name: model.name,
      email: model.email,
      type: model.type,
      location: model.location,
      tags: model.tags || [],
      description: model.description,
      imageUrl: model.imageUrl,
      id: modelId,
      addedAt: new Date(),
      addedBy: business.user_email || 'unknown'
    };

    // ✅ WRITE/UPDATE store_submissions - Add to business_creatives array
    const result = await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $push: {
          business_creatives: creativeModelEntry
        },
        $set: {
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'Failed to update business profile' 
      });
    }

    console.log('✅ Model added to business_creatives:', {
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId
    });

    res.json({
      success: true,
      message: 'Model added to business successfully',
      businessId: businessId,
      modelId: modelId,
      modelName: model.name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Add model to business error:', error);
    res.status(500).json({ 
      error: 'Failed to add model to business',
      details: error.message 
    });
  }
});

// ========== GET BUSINESS CREATIVES ==========
router.get('/by-business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: businessId' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // ✅ READ from store_submissions
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return res.status(404).json({ 
        error: 'Business not found' 
      });
    }

    const creatives = business.business_creatives || [];

    res.json({
      success: true,
      businessId: businessId,
      businessName: business.store_info?.name,
      creatives: creatives,
      count: creatives.length
    });

  } catch (error) {
    console.error('❌ Get business creatives error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve business creatives',
      details: error.message 
    });
  }
});

// ========== REMOVE MODEL FROM BUSINESS ==========
router.post('/remove-from-business', async (req, res) => {
  try {
    const { businessId, modelId } = req.body;

    if (!businessId || !modelId) {
      return res.status(400).json({ 
        error: 'Missing required fields: businessId, modelId' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // ✅ UPDATE store_submissions - Remove from business_creatives array
    const result = await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $pull: {
          business_creatives: { modelId: modelId }
        },
        $set: {
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'Business not found' 
      });
    }

    console.log('✅ Model removed from business:', { businessId, modelId });

    res.json({
      success: true,
      message: 'Model removed from business successfully',
      businessId: businessId,
      modelId: modelId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Remove model from business error:', error);
    res.status(500).json({ 
      error: 'Failed to remove model from business',
      details: error.message 
    });
  }
});

// ========== UPDATE MODEL STATUS IN BUSINESS ==========
router.post('/update-model-status', async (req, res) => {
  try {
    const { businessId, modelId, status } = req.body;

    if (!businessId || !modelId || !status) {
      return res.status(400).json({ 
        error: 'Missing required fields: businessId, modelId, status' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // ✅ UPDATE store_submissions - Update model status in array
    const result = await db.collection('store_submissions').updateOne(
      { 
        _id: new ObjectId(businessId),
        'business_creatives.modelId': modelId
      },
      {
        $set: {
          'business_creatives.$.status': status,
          'business_creatives.$.updatedAt': new Date(),
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'Business or model not found' 
      });
    }

    console.log('✅ Model status updated:', { businessId, modelId, status });

    res.json({
      success: true,
      message: 'Model status updated successfully',
      businessId: businessId,
      modelId: modelId,
      newStatus: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update model status error:', error);
    res.status(500).json({ 
      error: 'Failed to update model status',
      details: error.message 
    });
  }
});

module.exports = router;
