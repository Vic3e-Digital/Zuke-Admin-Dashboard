# n8n Email Tracking Integration

## Complete n8n Workflow with Duplicate Prevention

This guide shows you how to integrate email tracking into your n8n workflow.

## Workflow Overview

```
1. Get Leads from Google Sheet
2. ✅ Check Duplicates (NEW)
3. ✅ Filter Already Sent (NEW)
4. Send Emails (Only to new leads)
5. ✅ Record Sends (NEW)
```

## Step-by-Step n8n Configuration

### Node 1: Get Leads from Google Sheet
```
Standard Google Sheets node - no changes needed
```

### Node 2: Check Duplicates API Call

**Node Type:** HTTP Request  
**Method:** POST  
**URL:** `https://your-domain.com/api/email-tracking/check-duplicates`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body (JSON):**
```javascript
={
  "businessId": "{{ $node['Webhook'].json['businessId'] }}",
  "emails": {{ 
    JSON.stringify(
      $input.all()
        .map(item => item.json.Email || item.json.email || item.json.profile?.email)
        .filter(email => email && email.trim())
    ) 
  }}
}
```

**Options:**
- ✅ Always Output Data: ON
- Response Format: JSON

### Node 3: Filter Already Sent Leads

**Node Type:** Code (JavaScript)  
**Mode:** Run Once for All Items

```javascript
// Get all leads from the Google Sheets node
const allLeads = $('Google Sheets').all();

// Get the duplicate check results from the previous node
const duplicateCheckResult = $input.first().json;
const alreadySent = duplicateCheckResult.alreadySent || [];

// Create a Set for faster lookup
const alreadySentSet = new Set(
  alreadySent.map(email => email.toLowerCase().trim())
);

// Filter leads
const newLeads = [];
const skippedLeads = [];

for (const lead of allLeads) {
  const email = (
    lead.json.Email || 
    lead.json.email || 
    lead.json.profile?.email || 
    ''
  ).toLowerCase().trim();
  
  if (!email) {
    skippedLeads.push({
      ...lead.json,
      skipReason: 'No email address'
    });
  } else if (alreadySentSet.has(email)) {
    skippedLeads.push({
      ...lead.json,
      skipReason: 'Already sent',
      email: email
    });
  } else {
    newLeads.push(lead.json);
  }
}

// Log statistics
console.log('📊 Email Filter Stats:');
console.log(`   Total leads: ${allLeads.length}`);
console.log(`   New leads: ${newLeads.length}`);
console.log(`   Already sent: ${skippedLeads.filter(l => l.skipReason === 'Already sent').length}`);
console.log(`   No email: ${skippedLeads.filter(l => l.skipReason === 'No email address').length}`);

// Return both new leads (for sending) and skipped leads (for logging)
return [
  {
    json: {
      newLeads: newLeads,
      skippedLeads: skippedLeads,
      stats: {
        total: allLeads.length,
        new: newLeads.length,
        alreadySent: skippedLeads.filter(l => l.skipReason === 'Already sent').length,
        noEmail: skippedLeads.filter(l => l.skipReason === 'No email address').length
      }
    }
  }
];
```

### Node 4: Split New Leads Array

**Node Type:** Split Out  
**Field to Split:** `newLeads`

This will convert the array of new leads into individual items for sending.

### Node 5: Send Emails (Mailgun/SMTP)

```
Your existing email sending node - no changes needed
Just make sure it's connected to the Split Out node
```

### Node 6: Record Sent Emails

**Node Type:** HTTP Request  
**Method:** POST  
**URL:** `https://your-domain.com/api/email-tracking/record-sends`

**When to Run:** After all emails are sent (use "Wait for Completion")

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body (JSON):**
```javascript
={
  "businessId": "{{ $node['Webhook'].json['businessId'] }}",
  "campaignId": "campaign_{{ $now.toUnixInteger() }}",
  "emailSubject": "{{ $node['Webhook'].json['emailSubject'] }}",
  "emails": {{ 
    JSON.stringify(
      $input.all().map(item => ({
        email: item.json.to || item.json.Email || item.json.email,
        name: item.json.Name || item.json.name || item.json.first_name || '',
        status: item.json.status || 'sent',
        mailgunId: item.json.id || item.json.messageId || null
      }))
    ) 
  }}
}
```

### Node 7: Send Summary Email (Optional)

**Node Type:** Email  
**To:** Business owner or admin

```javascript
// Email body
Subject: Email Campaign Complete

Campaign Results:
- Total leads processed: {{ $node['Filter Already Sent Leads'].json['stats']['total'] }}
- New emails sent: {{ $node['Filter Already Sent Leads'].json['stats']['new'] }}
- Already sent (skipped): {{ $node['Filter Already Sent Leads'].json['stats']['alreadySent'] }}
- Invalid emails (skipped): {{ $node['Filter Already Sent Leads'].json['stats']['noEmail'] }}

Campaign ID: {{ $node['Record Sent Emails'].json['campaignId'] }}
```

## Complete n8n JSON Export

```json
{
  "name": "Email Leads with Duplicate Prevention",
  "nodes": [
    {
      "parameters": {},
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [240, 300]
    },
    {
      "parameters": {
        "sheetId": "={{ $json.sheetsUrl }}",
        "options": {}
      },
      "name": "Google Sheets",
      "type": "n8n-nodes-base.googleSheets",
      "position": [460, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://your-domain.com/api/email-tracking/check-duplicates",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({\n  \"businessId\": $node['Webhook'].json['businessId'],\n  \"emails\": $input.all().map(item => item.json.Email || item.json.email).filter(e => e)\n}) }}",
        "options": {
          "response": {
            "response": {
              "neverError": true
            }
          }
        }
      },
      "name": "Check Duplicates",
      "type": "n8n-nodes-base.httpRequest",
      "position": [680, 300]
    },
    {
      "parameters": {
        "jsCode": "// Filter logic from above"
      },
      "name": "Filter Already Sent",
      "type": "n8n-nodes-base.code",
      "position": [900, 300]
    },
    {
      "parameters": {
        "fieldToSplitOut": "newLeads",
        "options": {}
      },
      "name": "Split New Leads",
      "type": "n8n-nodes-base.splitOut",
      "position": [1120, 300]
    },
    {
      "parameters": {
        "fromEmail": "={{ $node['Webhook'].json['mailgunConfig']['from_email'] }}",
        "toEmail": "={{ $json.Email || $json.email }}",
        "subject": "={{ $node['Webhook'].json['emailSubject'] }}",
        "text": "={{ $node['Webhook'].json['emailTemplate'] }}"
      },
      "name": "Send Email",
      "type": "n8n-nodes-base.emailSend",
      "position": [1340, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://your-domain.com/api/email-tracking/record-sends",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({\n  \"businessId\": $node['Webhook'].json['businessId'],\n  \"campaignId\": 'campaign_' + Date.now(),\n  \"emailSubject\": $node['Webhook'].json['emailSubject'],\n  \"emails\": $input.all().map(item => ({\n    email: item.json.to || item.json.Email,\n    name: item.json.Name || '',\n    status: 'sent'\n  }))\n}) }}"
      },
      "name": "Record Sends",
      "type": "n8n-nodes-base.httpRequest",
      "position": [1560, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Google Sheets", "type": "main", "index": 0 }]]
    },
    "Google Sheets": {
      "main": [[{ "node": "Check Duplicates", "type": "main", "index": 0 }]]
    },
    "Check Duplicates": {
      "main": [[{ "node": "Filter Already Sent", "type": "main", "index": 0 }]]
    },
    "Filter Already Sent": {
      "main": [[{ "node": "Split New Leads", "type": "main", "index": 0 }]]
    },
    "Split New Leads": {
      "main": [[{ "node": "Send Email", "type": "main", "index": 0 }]]
    },
    "Send Email": {
      "main": [[{ "node": "Record Sends", "type": "main", "index": 0 }]]
    }
  }
}
```

## Testing Your Workflow

### Test 1: First Run (All New)
1. Upload a Google Sheet with 10 test emails
2. Run the workflow
3. Check that all 10 emails are sent
4. Verify recording: `GET /api/email-tracking/stats/:businessId`

### Test 2: Second Run (All Duplicates)
1. Run the same workflow with the same sheet
2. Check that 0 emails are sent
3. Verify stats show 10 already sent

### Test 3: Mixed Run
1. Upload sheet with 5 old emails + 5 new emails
2. Run the workflow
3. Check that only 5 emails are sent (the new ones)

## Troubleshooting

### Issue: All emails marked as "already sent" on first run
**Solution:** Check that businessId is correctly passed from webhook

### Issue: Duplicates not being detected
**Solution:** 
1. Check email normalization (case-insensitive, trimmed)
2. Verify businessId matches exactly
3. Check MongoDB for the tracking document

### Issue: Recording fails silently
**Solution:**
1. Check API logs in your server console
2. Verify email array format matches expected structure
3. Test recording endpoint directly with Postman

## View Results

### Check Individual Email
```bash
curl https://your-domain.com/api/email-tracking/check/:businessId/john@example.com
```

### Get Campaign Stats
```bash
curl https://your-domain.com/api/email-tracking/stats/:businessId
```

### View Campaign History
```bash
curl https://your-domain.com/api/email-tracking/history/:businessId
```

## Next Steps

1. Import this workflow into n8n
2. Update URLs to match your domain
3. Test with a small batch
4. Add error handling nodes
5. Set up monitoring/alerts
6. Build a dashboard to view statistics
