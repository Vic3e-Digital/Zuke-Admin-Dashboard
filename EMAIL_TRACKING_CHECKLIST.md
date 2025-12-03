# Email Tracking Setup Checklist

## ✅ What's Already Done

- ✅ Email tracking routes created (`api/routes/email-tracking.js`)
- ✅ Routes registered in server.js
- ✅ Database indexes script created (`scripts/setup-email-tracking-indexes.js`)
- ✅ Helper utilities created (`api/utils/email-tracking.utils.js`)
- ✅ Documentation created

## 🚀 Quick Start (3 Steps)

### Step 1: Create Database Indexes
```bash
node scripts/setup-email-tracking-indexes.js
```

**Expected Output:**
```
🔧 Connecting to database...
📊 Creating indexes for email_tracking collection...
✅ Created index: businessId_unique
✅ Created index: lastUpdated_desc
📊 Creating indexes for email_history collection...
✅ Created index: businessId_sentAt
✅ Created index: campaignId
✅ Created index: sentAt_desc
✅ All indexes created successfully!
```

### Step 2: Restart Your Server
```bash
npm start
```

### Step 3: Test the API
```bash
# Test check-duplicates endpoint
curl -X POST http://localhost:3000/api/email-tracking/check-duplicates \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "691dbc7eda6be37bfb836084",
    "emails": ["test1@example.com", "test2@example.com"]
  }'

# Expected response:
# {
#   "alreadySent": [],
#   "newEmails": ["test1@example.com", "test2@example.com"],
#   "stats": { "checked": 2, "alreadySent": 0, "new": 2 }
# }
```

## 📋 Available Endpoints

Once server is running, you have access to:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/email-tracking/check-duplicates` | POST | Check which emails already sent |
| `/api/email-tracking/record-sends` | POST | Record emails after sending |
| `/api/email-tracking/history/:businessId` | GET | Get campaign history |
| `/api/email-tracking/check/:businessId/:email` | GET | Check specific email |
| `/api/email-tracking/stats/:businessId` | GET | Get statistics |
| `/api/email-tracking/reset/:businessId?confirm=yes` | DELETE | Reset tracking |

## 🔧 Integration Options

### Option A: n8n Workflow (Recommended)
See: `docs/n8n/EMAIL_TRACKING_N8N_SETUP.md`

### Option B: Direct API Integration
Modify your `/api/marketing/email-leads` endpoint to use the tracking utilities:

```javascript
const emailTracking = require('./utils/email-tracking.utils');

// Before sending emails
const { toSend, skipped } = await emailTracking.prepareEmailBatch(
  businessId,
  leads,
  'email'
);

// Send only to toSend array
// ... your email sending logic ...

// After sending
await emailTracking.recordBatchSend(
  businessId,
  toSend,
  sendResults,
  emailSubject,
  campaignId
);
```

### Option C: Frontend Dashboard Widget
Add email stats to your business dashboard:

```javascript
// In your dashboard JavaScript
async function loadEmailStats(businessId) {
  const res = await fetch(`/api/email-tracking/stats/${businessId}`);
  const stats = await res.json();
  
  document.getElementById('unique-emails').textContent = stats.uniqueEmailsSent;
  document.getElementById('total-sends').textContent = stats.totalSends;
  document.getElementById('campaigns').textContent = stats.campaignCount;
}
```

## 📚 Documentation Files

- **Main Guide:** `docs/EMAIL_TRACKING_IMPLEMENTATION.md`
- **n8n Setup:** `docs/n8n/EMAIL_TRACKING_N8N_SETUP.md`
- **Code Examples:** `api/utils/email-tracking.utils.js`

## 🧪 Testing

### Manual Test (Using curl)

**1. Check duplicates (should return all as new):**
```bash
curl -X POST http://localhost:3000/api/email-tracking/check-duplicates \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-business-123",
    "emails": ["test@example.com"]
  }'
```

**2. Record a send:**
```bash
curl -X POST http://localhost:3000/api/email-tracking/record-sends \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-business-123",
    "campaignId": "test-campaign-1",
    "emailSubject": "Test Email",
    "emails": [
      {
        "email": "test@example.com",
        "name": "Test User",
        "status": "sent"
      }
    ]
  }'
```

**3. Check again (should now show as already sent):**
```bash
curl -X POST http://localhost:3000/api/email-tracking/check-duplicates \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-business-123",
    "emails": ["test@example.com"]
  }'
```

**4. Get stats:**
```bash
curl http://localhost:3000/api/email-tracking/stats/test-business-123
```

**5. Clean up test data:**
```bash
curl -X DELETE "http://localhost:3000/api/email-tracking/reset/test-business-123?confirm=yes"
```

## 🎯 Next Steps

1. [ ] Run database setup script
2. [ ] Restart server
3. [ ] Test endpoints with curl
4. [ ] Choose integration method (n8n or API)
5. [ ] Implement in your workflow
6. [ ] Test with real data (small batch first)
7. [ ] Monitor logs for any issues
8. [ ] Add frontend UI for statistics (optional)

## 🆘 Need Help?

- Check server logs for errors: `console.log` statements in `api/routes/email-tracking.js`
- Verify MongoDB connection: Check that `app.locals.db` is available
- Test database queries: Use MongoDB Compass or shell
- Review documentation: All details in `docs/EMAIL_TRACKING_IMPLEMENTATION.md`

## 🎉 You're Done!

Your email tracking system is ready to use. The hybrid approach will:
- ✅ Prevent duplicate emails
- ✅ Track send history per business
- ✅ Store campaign details
- ✅ Provide analytics and statistics
- ✅ Scale to 500K-1M emails per business
