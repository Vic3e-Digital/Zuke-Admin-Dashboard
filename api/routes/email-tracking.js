const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

/**
 * POST /api/email-tracking/check-duplicates
 * Check which emails have already been sent for a business
 */
router.post('/check-duplicates', async (req, res) => {
  try {
    const { businessId, emails } = req.body;
    
    if (!businessId || !emails || !Array.isArray(emails)) {
      return res.status(400).json({ 
        error: 'businessId and emails array required' 
      });
    }

    const db = req.app.locals.db;
    const collection = db.collection('email_tracking');

    // Find the tracking document for this business
    const tracking = await collection.findOne({ businessId });

    if (!tracking || !tracking.emails) {
      return res.json({ 
        alreadySent: [], 
        newEmails: emails,
        stats: {
          checked: emails.length,
          alreadySent: 0,
          new: emails.length
        }
      });
    }

    // Check which emails have been sent
    const alreadySent = [];
    const newEmails = [];

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim();
      const emailKey = normalizedEmail.replace(/\./g, '_DOT_');
      
      if (tracking.emails[emailKey]) {
        alreadySent.push(normalizedEmail);
      } else {
        newEmails.push(normalizedEmail);
      }
    }

    res.json({
      alreadySent,
      newEmails,
      stats: {
        checked: emails.length,
        alreadySent: alreadySent.length,
        new: newEmails.length
      }
    });

  } catch (error) {
    console.error('Error checking duplicates:', error);
    res.status(500).json({ 
      error: 'Failed to check duplicates',
      details: error.message 
    });
  }
});

/**
 * POST /api/email-tracking/record-sends
 * Record sent emails for a business
 */
router.post('/record-sends', async (req, res) => {
  try {
    const { businessId, emails, campaignId, emailSubject } = req.body;

    if (!businessId || !emails || !Array.isArray(emails)) {
      return res.status(400).json({ 
        error: 'businessId and emails array required' 
      });
    }

    const db = req.app.locals.db;
    const trackingCollection = db.collection('email_tracking');
    const historyCollection = db.collection('email_history');

    const now = new Date();
    const generatedCampaignId = campaignId || `campaign_${Date.now()}`;

    // Build bulk operations for email tracking
    const bulkOps = emails.map(emailRecord => {
      const normalizedEmail = (emailRecord.email || emailRecord).toLowerCase().trim();
      const emailKey = normalizedEmail.replace(/\./g, '_DOT_');
      
      return {
        updateOne: {
          filter: { businessId },
          update: {
            $set: {
              [`emails.${emailKey}.lastSent`]: now,
              [`emails.${emailKey}.lastStatus`]: emailRecord.status || 'sent',
              lastUpdated: now
            },
            $setOnInsert: {
              [`emails.${emailKey}.firstSent`]: now,
              businessId: businessId
            },
            $inc: {
              [`emails.${emailKey}.sendCount`]: 1,
              totalSends: 1
            }
          },
          upsert: true
        }
      };
    });

    await trackingCollection.bulkWrite(bulkOps);

    // Record campaign history
    await historyCollection.insertOne({
      businessId,
      campaignId: generatedCampaignId,
      emailSubject: emailSubject || 'No subject',
      sentAt: now,
      recipients: emails.map(e => ({
        email: (e.email || e).toLowerCase().trim(),
        name: e.name || '',
        status: e.status || 'sent',
        mailgunId: e.mailgunId || null
      })),
      stats: {
        total: emails.length,
        sent: emails.filter(e => (e.status || 'sent') === 'sent').length,
        failed: emails.filter(e => e.status === 'failed').length
      }
    });

    res.json({
      success: true,
      recorded: emails.length,
      campaignId: generatedCampaignId
    });

  } catch (error) {
    console.error('Error recording sends:', error);
    res.status(500).json({ 
      error: 'Failed to record sends',
      details: error.message 
    });
  }
});

/**
 * GET /api/email-tracking/history/:businessId
 * Get send history for a business
 */
router.get('/history/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const db = req.app.locals.db;
    const historyCollection = db.collection('email_history');

    const campaigns = await historyCollection
      .find({ businessId })
      .sort({ sentAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    const total = await historyCollection.countDocuments({ businessId });

    res.json({
      campaigns,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + campaigns.length < total
      }
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch history',
      details: error.message 
    });
  }
});

/**
 * GET /api/email-tracking/check/:businessId/:email
 * Check if specific email was sent to
 */
router.get('/check/:businessId/:email', async (req, res) => {
  try {
    const { businessId, email } = req.params;
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = normalizedEmail.replace(/\./g, '_DOT_');

    const db = req.app.locals.db;
    const collection = db.collection('email_tracking');

    const tracking = await collection.findOne(
      { businessId },
      { projection: { [`emails.${emailKey}`]: 1 } }
    );

    if (tracking?.emails?.[emailKey]) {
      res.json({
        sent: true,
        details: tracking.emails[emailKey]
      });
    } else {
      res.json({ sent: false });
    }

  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ 
      error: 'Failed to check email',
      details: error.message 
    });
  }
});

/**
 * GET /api/email-tracking/stats/:businessId
 * Get email tracking statistics for a business
 */
router.get('/stats/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    const db = req.app.locals.db;
    const trackingCollection = db.collection('email_tracking');
    const historyCollection = db.collection('email_history');

    // Get tracking document
    const tracking = await trackingCollection.findOne({ businessId });

    // Get campaign count
    const campaignCount = await historyCollection.countDocuments({ businessId });

    // Get recent campaigns
    const recentCampaigns = await historyCollection
      .find({ businessId })
      .sort({ sentAt: -1 })
      .limit(5)
      .toArray();

    const uniqueEmails = tracking?.emails ? Object.keys(tracking.emails).length : 0;

    res.json({
      uniqueEmailsSent: uniqueEmails,
      totalSends: tracking?.totalSends || 0,
      campaignCount,
      recentCampaigns: recentCampaigns.map(c => ({
        campaignId: c.campaignId,
        subject: c.emailSubject,
        sentAt: c.sentAt,
        recipientCount: c.recipients?.length || 0,
        stats: c.stats
      })),
      lastUpdated: tracking?.lastUpdated || null
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/email-tracking/reset/:businessId
 * Reset email tracking for a business (use with caution)
 */
router.delete('/reset/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { confirm } = req.query;

    if (confirm !== 'yes') {
      return res.status(400).json({ 
        error: 'Confirmation required. Add ?confirm=yes to reset tracking.' 
      });
    }

    const db = req.app.locals.db;
    const trackingCollection = db.collection('email_tracking');

    await trackingCollection.deleteOne({ businessId });

    res.json({
      success: true,
      message: 'Email tracking reset for business',
      businessId
    });

  } catch (error) {
    console.error('Error resetting tracking:', error);
    res.status(500).json({ 
      error: 'Failed to reset tracking',
      details: error.message 
    });
  }
});

module.exports = router;
