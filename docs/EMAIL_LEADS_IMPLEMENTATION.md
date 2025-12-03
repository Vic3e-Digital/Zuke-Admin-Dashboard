# Email Leads Implementation - Tabbed Interface

## Overview
Implemented a tabbed interface for the Email Leads tool with two main modes:
1. **One-to-One Email** - Send individual emails using Mailgun
2. **Bulk Send** - Send bulk emails to Google Sheets recipients via webhook

## ✅ Features Implemented

### 1. Tab Navigation
- Clean tab interface switching between one-to-one and bulk sending
- Active tab highlighting with orange accent
- Smooth transitions between tabs

### 2. One-to-One Email Tab
**What it does:**
- Sends a single email directly using the business's saved Mailgun configuration
- Validates Mailgun settings before sending
- Shows warnings if Mailgun is not configured

**Fields:**
- Recipient Email (required)
- Email Subject (required)
- Email Body (required, textarea with HTML/text support)

**Process:**
1. User fills in recipient email, subject, and body
2. System checks if Mailgun is configured in database
3. Sends email directly via Mailgun API using business settings
4. Shows success/error feedback

**API Endpoint:** `POST /api/marketing/send-one-email`

### 3. Bulk Send Tab
**What it does:**
- Sends bulk emails to recipients from a Google Sheet
- Forwards request to n8n webhook with Mailgun configuration
- Supports template personalization with variables

**Fields:**
- Google Sheet Link (required)
- Email Subject (required)
- Email Template (optional with personalization support)

**Process:**
1. User provides Google Sheet URL and email details
2. System checks if Mailgun is configured
3. Forwards request to webhook along with Mailgun config
4. Webhook processes the sheet and sends emails using provided Mailgun settings

**API Endpoint:** `POST /api/marketing/email-leads`

## 🔧 Technical Implementation

### Frontend Changes (`email-leads.html`)
1. **Tab Structure:**
   - Added tab navigation buttons
   - Two separate forms for each mode
   - Individual status displays per tab

2. **Mailgun Configuration Check:**
   - Fetches business settings on page load
   - Validates Mailgun config exists and is enabled
   - Shows warning banner if not configured
   - Blocks sending if Mailgun not set up

3. **Form Handling:**
   - Separate submit handlers for each tab
   - Different validation logic per mode
   - Includes Mailgun config in API requests

### Backend Changes (`api/marketing-api.js`)

#### New Endpoint: `POST /api/marketing/send-one-email`
**Purpose:** Send individual emails directly via Mailgun

**Request Body:**
```json
{
  "businessId": "string",
  "recipientEmail": "string",
  "subject": "string",
  "body": "string",
  "mailgunConfig": {
    "api_key": "string",
    "api_domain": "string",
    "email_domain": "string",
    "from_email": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "string"
}
```

**How it works:**
1. Validates all required fields
2. Validates Mailgun configuration
3. Initializes Mailgun client with business settings
4. Sends email directly
5. Returns success/error

#### Updated Endpoint: `POST /api/marketing/email-leads`
**Changes:**
- Now accepts `mailgunConfig` in request body
- Validates Mailgun config before forwarding
- Includes Mailgun settings in webhook payload
- Webhook can now use business-specific Mailgun credentials

**Request Body:**
```json
{
  "sheetsUrl": "string",
  "emailSubject": "string",
  "emailTemplate": "string (optional)",
  "userEmail": "string",
  "businessId": "string",
  "mailgunConfig": {
    "api_key": "string",
    "api_domain": "string",
    "email_domain": "string",
    "from_email": "string"
  }
}
```

## 🔐 Security & Validation

### Mailgun Configuration Check
Both tabs check if Mailgun is configured:
```javascript
async function checkMailgunConfig() {
  const response = await fetch(`/api/business-settings/${businessId}`);
  const data = await response.json();
  
  if (data.business?.automation_settings?.mailgun_config) {
    mailgunConfig = data.business.automation_settings.mailgun_config;
    
    if (!mailgunConfig.enabled || !mailgunConfig.api_key) {
      showWarning('Mailgun is not configured...');
      return false;
    }
    
    return true;
  }
  return false;
}
```

### Database Structure
Mailgun settings are stored in `store_submissions` collection:
```javascript
{
  _id: ObjectId,
  automation_settings: {
    mailgun_config: {
      api_key: "string (encrypted)",
      api_domain: "string",
      email_domain: "string",
      from_email: "string",
      enabled: boolean,
      last_updated: ISODate
    }
  }
}
```

## 🎨 UI/UX Features

### Warning System
- Displays warning banner if Mailgun not configured
- Shows at top of active tab
- Links to Settings page for configuration

### Status Messages
- Per-tab status displays
- Color-coded: info (blue), success (green), error (red)
- Clear, actionable messages

### Button States
- Disabled during processing
- Text changes to show progress ("Sending...", "Processing...")
- Re-enabled after completion

## 📋 Usage Instructions

### For One-to-One Emails:
1. Configure Mailgun in Settings > Automation
2. Navigate to Marketing Tools > Email Leads
3. Select "One-to-One Email" tab
4. Enter recipient email, subject, and body
5. Click "Send Email"
6. Email sent immediately via Mailgun

### For Bulk Emails:
1. Configure Mailgun in Settings > Automation
2. Prepare Google Sheet with email addresses
3. Navigate to Marketing Tools > Email Leads
4. Select "Bulk Send" tab
5. Paste Google Sheet link
6. Enter email subject and template (optional)
7. Click "Send Bulk Emails"
8. Request forwarded to webhook with Mailgun config

## 🔄 Integration Points

### Depends On:
- `/api/business-settings/:businessId` - Fetch Mailgun config
- Mailgun API - Direct email sending (one-to-one)
- n8n webhook - Bulk email processing

### Used By:
- Marketing Tools interface
- Business automation system

## 🚀 Testing Checklist

- [ ] One-to-one email sends successfully
- [ ] Bulk email forwards to webhook correctly
- [ ] Warning shows if Mailgun not configured
- [ ] Tab switching works smoothly
- [ ] Form validation prevents empty submissions
- [ ] Status messages display correctly
- [ ] Button states update during processing
- [ ] Mailgun config fetched from database
- [ ] Error handling works for API failures

## 📝 Future Enhancements

1. **Email Templates Library** - Pre-built templates for common use cases
2. **Email Preview** - Preview before sending
3. **Send Test Email** - Test configuration before bulk send
4. **Scheduling** - Schedule emails for later
5. **Analytics** - Track opens, clicks, bounces
6. **Contact Lists** - Manage recipient lists in UI
7. **Personalization Helper** - UI for adding variables

## 🔗 Related Files

- `/public/pages/marketing/marketing-tools/email-leads.html` - Frontend UI
- `/api/marketing-api.js` - Backend endpoints
- `/api/routes/business-settings.js` - Mailgun config management
- `/public/pages/settings/components/automation-panel.js` - Mailgun setup UI

## 📞 Support

If Mailgun is not configured:
1. Go to Settings page
2. Navigate to Automation tab
3. Fill in Mailgun API settings:
   - API Key
   - API Domain (e.g., api.mailgun.net)
   - Email Domain (e.g., mail.yourdomain.com)
   - From Email (e.g., noreply@yourdomain.com)
4. Enable Mailgun
5. Test connection
6. Save settings
