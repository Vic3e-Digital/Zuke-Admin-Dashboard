# Email Tracking Implementation Guide

## Overview
This email tracking system prevents duplicate sends and provides campaign history using a hybrid MongoDB approach.

## Database Collections

### 1. `email_tracking` (Quick Lookup)
Stores unique emails sent per business in a single document:
```javascript
{
  businessId: "691dbc7eda6be37bfb836084",
  emails: {
    "john_DOT_doe@company_DOT_com": {
      firstSent: ISODate("2025-12-01"),
      lastSent: ISODate("2025-12-03"),
      sendCount: 3,
      lastStatus: "sent"
    }
  },
  totalSends: 150,
  lastUpdated: ISODate("2025-12-03")
}
```

### 2. `email_history` (Campaign Logs)
Stores detailed campaign history:
```javascript
{
  businessId: "691dbc7eda6be37bfb836084",
  campaignId: "campaign_1733247231057",
  emailSubject: "Ultra 2026 Invitation",
  sentAt: ISODate("2025-12-03"),
  recipients: [
    { email: "john@company.com", name: "John", status: "sent", mailgunId: "abc123" }
  ],
  stats: {
    total: 50,
    sent: 48,
    failed: 2
  }
}
```

## API Endpoints

### 1. Check Duplicates (Before Sending)
```javascript
POST /api/email-tracking/check-duplicates
Body: {
  "businessId": "691dbc7eda6be37bfb836084",
  "emails": ["john@company.com", "jane@company.com", "bob@company.com"]
}

Response: {
  "alreadySent": ["john@company.com"],
  "newEmails": ["jane@company.com", "bob@company.com"],
  "stats": {
    "checked": 3,
    "alreadySent": 1,
    "new": 2
  }
}
```

### 2. Record Sends (After Sending)
```javascript
POST /api/email-tracking/record-sends
Body: {
  "businessId": "691dbc7eda6be37bfb836084",
  "campaignId": "campaign_20251203",
  "emailSubject": "Ultra 2026 Invitation",
  "emails": [
    { "email": "jane@company.com", "name": "Jane Doe", "status": "sent", "mailgunId": "xyz789" },
    { "email": "bob@company.com", "name": "Bob Smith", "status": "failed" }
  ]
}

Response: {
  "success": true,
  "recorded": 2,
  "campaignId": "campaign_20251203"
}
```

### 3. Get Campaign History
```javascript
GET /api/email-tracking/history/:businessId?limit=10&skip=0

Response: {
  "campaigns": [...],
  "pagination": {
    "total": 25,
    "limit": 10,
    "skip": 0,
    "hasMore": true
  }
}
```

### 4. Check Specific Email
```javascript
GET /api/email-tracking/check/:businessId/:email

Response: {
  "sent": true,
  "details": {
    "firstSent": "2025-12-01T10:30:00.000Z",
    "lastSent": "2025-12-03T15:45:00.000Z",
    "sendCount": 3,
    "lastStatus": "sent"
  }
}
```

### 5. Get Statistics
```javascript
GET /api/email-tracking/stats/:businessId

Response: {
  "uniqueEmailsSent": 150,
  "totalSends": 325,
  "campaignCount": 12,
  "recentCampaigns": [...],
  "lastUpdated": "2025-12-03T16:53:51.057Z"
}
```

### 6. Reset Tracking (Use with Caution)
```javascript
DELETE /api/email-tracking/reset/:businessId?confirm=yes

Response: {
  "success": true,
  "message": "Email tracking reset for business",
  "businessId": "691dbc7eda6be37bfb836084"
}
```

## Setup Instructions

### Step 1: Create Database Indexes
Run the setup script to create optimal indexes:
```bash
node scripts/setup-email-tracking-indexes.js
```

### Step 2: Integration Options

#### Option A: n8n Workflow Integration

**Before Sending Emails (Check Duplicates):**
```javascript
// HTTP Request Node in n8n
POST https://your-api.com/api/email-tracking/check-duplicates
Body: {
  "businessId": "{{ $json.businessId }}",
  "emails": {{ JSON.stringify($input.all().map(item => item.json.email).filter(e => e)) }}
}
```

**Filter Node (Code Node):**
```javascript
const allLeads = $('Get Sheet Data').all();
const alreadySent = $json.alreadySent || [];
const alreadySentSet = new Set(alreadySent.map(e => e.toLowerCase()));

const newLeads = [];
const skippedLeads = [];

for (const lead of allLeads) {
  const email = (lead.json.email || '').toLowerCase();
  
  if (!email) {
    skippedLeads.push({ ...lead.json, skipReason: 'No email' });
  } else if (alreadySentSet.has(email)) {
    skippedLeads.push({ ...lead.json, skipReason: 'Already sent' });
  } else {
    newLeads.push(lead.json);
  }
}

return {
  json: {
    newLeads,
    skippedLeads,
    stats: {
      total: allLeads.length,
      new: newLeads.length,
      alreadySent: skippedLeads.filter(l => l.skipReason === 'Already sent').length,
      noEmail: skippedLeads.filter(l => l.skipReason === 'No email').length
    }
  }
};
```

**After Sending Emails (Record Sends):**
```javascript
// HTTP Request Node in n8n
POST https://your-api.com/api/email-tracking/record-sends
Body: {
  "businessId": "{{ $json.businessId }}",
  "campaignId": "{{ $json.campaignId }}",
  "emailSubject": "{{ $json.subject }}",
  "emails": {{ JSON.stringify($input.all().map(item => ({
    email: item.json.email,
    name: item.json.name,
    status: item.json.status || 'sent',
    mailgunId: item.json.mailgunId
  }))) }}
}
```

#### Option B: Direct API Integration

If you want to add tracking directly to your `/api/marketing/email-leads` endpoint, you can modify it to:

1. **Before forwarding to n8n webhook:** Call `/api/email-tracking/check-duplicates`
2. **Pass filtered emails** to the webhook
3. **After webhook completes:** Call `/api/email-tracking/record-sends`

See `docs/EMAIL_TRACKING_INTEGRATION.md` for detailed examples.

## Frontend Integration

### Display Email Statistics
```javascript
// In your business dashboard
async function loadEmailStats(businessId) {
  const response = await fetch(`/api/email-tracking/stats/${businessId}`);
  const stats = await response.json();
  
  // Display:
  // - Unique emails sent: stats.uniqueEmailsSent
  // - Total sends: stats.totalSends
  // - Campaign count: stats.campaignCount
  // - Recent campaigns: stats.recentCampaigns
}
```

### Check Before Manual Send
```javascript
async function checkIfAlreadySent(businessId, email) {
  const response = await fetch(`/api/email-tracking/check/${businessId}/${email}`);
  const result = await response.json();
  
  if (result.sent) {
    console.log(`Already sent ${result.details.sendCount} times`);
    console.log(`Last sent: ${result.details.lastSent}`);
    // Show warning to user
  }
}
```

## Benefits

✅ **Fast duplicate detection** - Single document lookup per business  
✅ **Detailed campaign history** - Track every send with full context  
✅ **Scalable** - Can handle 500K-1M emails per business  
✅ **Send frequency tracking** - Know how many times you've emailed someone  
✅ **Campaign analytics** - View send stats and history  

## Troubleshooting

### Issue: Emails stored with _DOT_ replacement
**Reason:** MongoDB doesn't allow dots in field names  
**Solution:** This is handled automatically. The API normalizes emails for you.

### Issue: Want to reset tracking for testing
**Solution:** Use the reset endpoint with confirmation:
```bash
DELETE /api/email-tracking/reset/:businessId?confirm=yes
```

### Issue: Need to remove specific email from tracking
**Solution:** Currently, use MongoDB directly or implement a new endpoint:
```javascript
// In email-tracking.js
router.delete('/remove/:businessId/:email', async (req, res) => {
  const { businessId, email } = req.params;
  const emailKey = email.toLowerCase().trim().replace(/\./g, '_DOT_');
  
  await trackingCollection.updateOne(
    { businessId },
    { $unset: { [`emails.${emailKey}`]: "" }, $inc: { totalSends: -1 } }
  );
  
  res.json({ success: true });
});
```

## Next Steps

1. ✅ Routes created and registered
2. ✅ Database indexes script ready
3. Run `node scripts/setup-email-tracking-indexes.js`
4. Choose integration approach (n8n or direct API)
5. Test with a small batch of emails
6. Add frontend UI to display statistics
