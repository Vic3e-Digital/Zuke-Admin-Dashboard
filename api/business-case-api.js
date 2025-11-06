const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// ========== GET BUSINESS CASE DATA ==========
router.get('/get', async (req, res) => {
  try {
    const { businessId } = req.query;

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
    const submission = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!submission) {
      return res.status(404).json({ 
        error: 'Business not found' 
      });
    }

    // ✅ Try to get existing business case from business_cases
    let businessCase = {};
    const existingCase = await db.collection('business_cases').findOne({
      business_id: businessId
    });

    if (existingCase) {
      businessCase = existingCase.business_case || {};
    } else if (submission.initial_business_case) {
      // Fallback to data in store_submissions if no business_cases entry
      businessCase = submission.initial_business_case;
    }

    res.json({
      success: true,
      businessCase: businessCase,
      businessInfo: {
        name: submission.store_info?.name || '',
        description: submission.store_info?.description || '',
        category: submission.store_info?.category || [],
        logo: submission.media_files?.store_logo || '',
        banner: submission.media_files?.store_banner || ''
      },
      webhookUrl: submission.automation_settings?.n8n_config?.webhook_url || null,
      processingStatus: submission.processing_status || {}
    });

  } catch (error) {
    console.error('❌ Get business case error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve business case',
      details: error.message 
    });
  }
});

// ========== SAVE DRAFT ==========
router.post('/save-draft', async (req, res) => {
  try {
    const { businessId, userEmail, businessCase } = req.body;

    console.log('📥 Received save-draft request:', {
      businessId,
      userEmail,
      hasBusinessCase: !!businessCase
    });

    if (!businessId || !businessCase) {
      return res.status(400).json({ 
        error: 'Missing required fields: businessId, businessCase' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // ✅ Verify business exists in store_submissions (READ)
    const submission = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!submission) {
      console.error('❌ Business not found in store_submissions');
      return res.status(404).json({ 
        error: 'Business not found',
        businessId: businessId
      });
    }

    console.log('✅ Business found, saving draft to business_cases for:', userEmail);

    // ✅ Clean the businessCase object
    const cleanBusinessCase = { ...businessCase };
    delete cleanBusinessCase.more_details_needed;

    // ✅ WRITE to business_cases collection
    const result = await db.collection('business_cases').updateOne(
      { business_id: businessId },
      {
        $set: {
          business_id: businessId,
          business_case: cleanBusinessCase,  // ✅ Use cleaned version
          status: 'draft',
          last_saved_at: new Date(),
          last_saved_by: userEmail,
          updated_at: new Date()
        },
        $setOnInsert: {
          created_at: new Date(),
          created_by: userEmail
        }
      },
      { upsert: true }
    );

    console.log('✅ Business case draft saved to business_cases collection');

    res.json({
      success: true,
      message: 'Draft saved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Save draft error:', error);
    res.status(500).json({ 
      error: 'Failed to save draft',
      details: error.message 
    });
  }
});

// ========== SUBMIT BUSINESS CASE ==========
router.post('/submit', async (req, res) => {
  try {
    const { businessId, userEmail, businessCase } = req.body;

    console.log('📥 Received submit request:', {
      businessId,
      userEmail,
      hasBusinessCase: !!businessCase
    });

    if (!businessId || !businessCase) {
      return res.status(400).json({ 
        error: 'Missing required fields: businessId, businessCase' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // ✅ READ from store_submissions
    const submission = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!submission) {
      console.error('❌ Business not found in store_submissions');
      return res.status(404).json({ 
        error: 'Business not found',
        businessId: businessId
      });
    }

    console.log('✅ Business found, submitting to business_cases for:', userEmail);

    // ✅ Clean the businessCase object - remove unwanted fields
    const cleanBusinessCase = { ...businessCase };
    delete cleanBusinessCase.more_details_needed;

    // ✅ WRITE to business_cases collection
    const result = await db.collection('business_cases').updateOne(
      { business_id: businessId },
      {
        $set: {
          business_id: businessId,
          business_case: cleanBusinessCase,  // ✅ Use cleaned version
          status: 'completed',
          completed_at: new Date(),
          completed_by: userEmail,
          updated_at: new Date()
        },
        $setOnInsert: {
          created_at: new Date(),
          created_by: userEmail
        }
        // ✅ Removed $unset - no longer needed
      },
      { upsert: true }
    );

    console.log('✅ Business case submitted to business_cases collection');

    // Webhook logic (read from store_submissions)
    const webhookUrl = "https://aigents.southafricanorth.azurecontainer.io/webhook/Business-Case-Generator"
    let webhookSent = false;

    if (webhookUrl) {
      try {
        const webhookPayload = {
          event: 'business_case_completed',
          businessId: businessId,
          submittedBy: userEmail,
          businessCase: cleanBusinessCase,  // ✅ Use cleaned version
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
        console.error('❌ Webhook error:', error);
      }
    }

    res.json({
      success: true,
      message: 'Business case submitted successfully',
      businessCase: cleanBusinessCase,  // ✅ Return cleaned version
      webhookSent: webhookSent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Submit error:', error);
    res.status(500).json({ 
      error: 'Failed to submit business case',
      details: error.message 
    });
  }
});

// ========== GET COMPLETION STATUS ==========
router.get('/status', async (req, res) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: businessId' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // ✅ READ from business_cases
    const businessCaseDoc = await db.collection('business_cases').findOne({
      business_id: businessId
    });

    const businessCase = businessCaseDoc?.business_case || {};
    
    const requiredFields = [
      'what_you_do',
      'the_challenge',
      'your_solution',
      'why_people_will_choose_you',
      'your_customers',
      'how_you_make_money',
      'products_services',
      'customer_profile',
      'growth_goals'
    ];

    let completedFields = 0;
    requiredFields.forEach(field => {
      if (businessCase[field] && businessCase[field].trim().length > 20) {
        completedFields++;
      }
    });

    const completionPercentage = Math.round((completedFields / requiredFields.length) * 100);

    res.json({
      success: true,
      completed: businessCaseDoc?.status === 'completed',
      completionPercentage: completionPercentage,
      completedFields: completedFields,
      totalFields: requiredFields.length,
      lastSaved: businessCaseDoc?.last_saved_at || null,
      completedAt: businessCaseDoc?.completed_at || null
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check status',
      details: error.message 
    });
  }
});

// ========== DELETE/RESET BUSINESS CASE ==========
router.post('/reset', async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: businessId' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // ✅ DELETE from business_cases
    const result = await db.collection('business_cases').deleteOne({
      business_id: businessId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        error: 'No business case found to reset' 
      });
    }

    console.log('✅ Business case reset:', businessId);

    res.json({
      success: true,
      message: 'Business case reset successfully'
    });

  } catch (error) {
    console.error('❌ Reset error:', error);
    res.status(500).json({ 
      error: 'Failed to reset business case',
      details: error.message 
    });
  }
});

module.exports = router;