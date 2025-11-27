const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// ========== REGISTER NEW MODEL ==========
router.post('/register', async (req, res) => {
  try {
    const registrationData = req.body;

    console.log('📥 Received model registration request:', {
      email: registrationData.personalInfo?.email,
      fullName: registrationData.personalInfo?.fullName,
      hasHeadshot: registrationData.portfolio?.headshot
    });

    if (!registrationData.personalInfo || !registrationData.personalInfo.email) {
      return res.status(400).json({ 
        error: 'Missing required fields: personalInfo with email' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // Generate a unique ID for this model application
    const modelId = new ObjectId();

    // ✅ WRITE to creative_models collection
    const result = await db.collection('creative_models').insertOne({
      _id: modelId,
      personalInfo: registrationData.personalInfo,
      portfolio: registrationData.portfolio,
      professional: registrationData.professional,
      agreements: registrationData.agreements,
      metadata: {
        ...registrationData.metadata,
        status: 'pending-review',
        applicationId: modelId.toString(),
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Model registration submitted to creative_models collection');

    // Optional: Send confirmation email or webhook
    const webhookUrl = "https://aigents.southafricanorth.azurecontainer.io/webhook/Model-Registration"; // Update as needed
    let webhookSent = false;

    if (webhookUrl) {
      try {
        const webhookPayload = {
          event: 'model_registration_submitted',
          modelId: modelId.toString(),
          email: registrationData.personalInfo.email,
          fullName: registrationData.personalInfo.fullName,
          timestamp: new Date().toISOString()
        };

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });

        if (webhookResponse.ok) {
          webhookSent = true;
          console.log('✅ Webhook sent');
        }
      } catch (error) {
        console.error('⚠️ Webhook error (non-blocking):', error.message);
      }
    }

    res.json({
      success: true,
      message: 'Model registration submitted successfully',
      modelId: modelId.toString(),
      email: registrationData.personalInfo.email,
      status: 'pending-review',
      webhookSent: webhookSent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Model registration error:', error);
    res.status(500).json({ 
      error: 'Failed to submit model registration',
      details: error.message 
    });
  }
});

// ========== GET MODEL REGISTRATION DATA ==========
router.get('/get/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;

    if (!modelId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: modelId' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // ✅ READ from creative_models
    const model = await db.collection('creative_models').findOne({
      _id: new ObjectId(modelId)
    });

    if (!model) {
      return res.status(404).json({ 
        error: 'Model application not found' 
      });
    }

    res.json({
      success: true,
      model: model,
      status: model.metadata?.status || 'unknown',
      submittedAt: model.metadata?.submittedAt || null
    });

  } catch (error) {
    console.error('❌ Get model error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve model application',
      details: error.message 
    });
  }
});

// ========== GET MODEL BY EMAIL ==========
router.get('/by-email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ 
        error: 'Missing required parameter: email' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // ✅ READ from creative_models
    const models = await db.collection('creative_models').find({
      'personalInfo.email': email
    }).toArray();

    res.json({
      success: true,
      models: models,
      count: models.length
    });

  } catch (error) {
    console.error('❌ Get models by email error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve models',
      details: error.message 
    });
  }
});

// ========== UPDATE MODEL STATUS (Admin) ==========
router.post('/update-status', async (req, res) => {
  try {
    const { modelId, status, notes } = req.body;

    if (!modelId || !status) {
      return res.status(400).json({ 
        error: 'Missing required fields: modelId, status' 
      });
    }

    const validStatuses = ['pending-review', 'approved', 'rejected', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // ✅ UPDATE creative_models
    const result = await db.collection('creative_models').updateOne(
      { _id: new ObjectId(modelId) },
      {
        $set: {
          'metadata.status': status,
          'metadata.statusUpdatedAt': new Date(),
          'metadata.reviewNotes': notes || null,
          'metadata.updatedAt': new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'Model application not found' 
      });
    }

    console.log('✅ Model status updated:', { modelId, status });

    res.json({
      success: true,
      message: 'Model status updated successfully',
      modelId: modelId,
      newStatus: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update status error:', error);
    res.status(500).json({ 
      error: 'Failed to update model status',
      details: error.message 
    });
  }
});

// ========== GET ALL MODELS (Admin) ==========
router.get('/all', async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // Build filter
    const filter = {};
    if (status) {
      filter['metadata.status'] = status;
    }

    // ✅ READ from creative_models
    const models = await db.collection('creative_models')
      .find(filter)
      .sort({ 'metadata.submittedAt': -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .toArray();

    const total = await db.collection('creative_models').countDocuments(filter);

    res.json({
      success: true,
      models: models,
      pagination: {
        total: total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        returned: models.length
      }
    });

  } catch (error) {
    console.error('❌ Get all models error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve models',
      details: error.message 
    });
  }
});

// ========== GET REGISTRATION STATUS ==========
router.get('/status/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;

    if (!modelId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: modelId' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // ✅ READ from creative_models
    const model = await db.collection('creative_models').findOne({
      _id: new ObjectId(modelId)
    });

    if (!model) {
      return res.status(404).json({ 
        error: 'Model application not found' 
      });
    }

    res.json({
      success: true,
      modelId: modelId,
      status: model.metadata?.status || 'unknown',
      submittedAt: model.metadata?.submittedAt || null,
      statusUpdatedAt: model.metadata?.statusUpdatedAt || null,
      reviewNotes: model.metadata?.reviewNotes || null
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check registration status',
      details: error.message 
    });
  }
});

module.exports = router;
