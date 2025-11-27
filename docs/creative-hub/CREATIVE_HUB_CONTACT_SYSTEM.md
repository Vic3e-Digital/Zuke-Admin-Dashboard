# Creative Hub Contact Details System - Implementation Guide

## Overview
The Creative Hub Contact Details system allows businesses to request model contact information with automatic wallet deduction, revenue split tracking, and email notifications via Mailgun.

## Architecture

### Components Implemented

#### 1. **Frontend - Contact Details Request Flow**
- **File:** `public/pages/settings/components/creative-panel.js`
- **Function:** `window.requestModelDetails(modelId, modelEmail)`
- **Location:** Global function attached to window object
- **Triggers:** "Request" button on blurred contact info in model details modal

**Flow:**
1. User clicks "Request" button on model's blurred email/phone
2. `requestModelDetails()` captures:
   - Business email from Auth0 session storage
   - Model ID and email from function parameters
   - Model name from modal data attribute
3. Sends POST request to `/api/mailgun/request-contact-details`
4. On success:
   - Shows notification with amount deducted
   - Clears wallet cache for UI refresh
   - Closes modal after 2 seconds
5. On error: Shows error notification and resets button state

**Key Features:**
- Automatic error handling with user-friendly messages
- Button state management (disabled/enabled, text changes)
- Wallet cache clearing for immediate balance updates
- 2-second delay before modal close to show success message

#### 2. **Backend - Mailgun API Endpoint**
- **File:** `api/mailgun.js`
- **Route:** POST `/api/mailgun/request-contact-details`
- **Dependencies:** mailgun.js, express, mongodb

**Request Body:**
```json
{
  "businessEmail": "business@example.com",
  "modelId": "ObjectId",
  "modelEmail": "model@example.com",
  "amount": 10,
  "modelName": "Model Name"
}
```

**Response (Success):**
```json
{
  "success": true,
  "transaction_id": "txn_1234567890_abc123",
  "amount": 10,
  "model_revenue": 6.50,
  "zuke_revenue": 3.50,
  "new_balance": 89.00,
  "message": "Contact details sent successfully"
}
```

**Processing Steps:**

1. **Validate Input:**
   - Ensure businessEmail, modelId, modelEmail are provided
   - Default amount to 10 (R10)

2. **Check Business Wallet:**
   - Query `user_wallets` collection by businessEmail
   - Verify sufficient balance (>= amount)
   - Return 404 if wallet not found
   - Return 400 if insufficient funds

3. **Calculate Revenue Split:**
   - Model Revenue: amount × 0.65 (65%)
   - Zuke Revenue: amount × 0.35 (35%)

4. **Create Transaction Record:**
   - Transaction ID: `txn_{timestamp}_{random}`
   - Type: 'contact_request'
   - Includes: amount, model_revenue, zuke_revenue, metadata

5. **Update Business Wallet:**
   - Deduct amount from balance
   - Push transaction to transactions array
   - Update timestamp

6. **Log in Creative Models Collection:**
   - Add contact request record to model's contact_requests array
   - Track: request_id, business_email, revenue split, requested_at, paid status
   - Increment: total_requests counter, pending_payment amount

7. **Send Email to Business:**
   - Subject: "Contact Details: {ModelName}"
   - Body: HTML formatted with model contact info
   - Includes: Email address, amount deducted, transaction ID

8. **Send Confirmation to Model:**
   - Subject: "Your Contact Details Were Requested"
   - Body: HTML formatted with business info and payment details
   - Shows: Business email, amount, model revenue (65%), status
   - Includes: Transaction ID and payment processing timeline

#### 3. **Database Schema Updates**

**user_wallets Collection - Transactions Array:**
```javascript
{
  transaction_id: "txn_...",
  type: "contact_request",
  amount: 10,
  model_revenue: 6.50,
  zuke_revenue: 3.50,
  balance_after: 89.00,
  description: "Contact details request for Model Name",
  timestamp: "2024-01-15T10:30:00Z",
  metadata: {
    modelId: "ObjectId",
    modelEmail: "model@example.com",
    modelName: "Model Name"
  }
}
```

**creative_models Collection - New Fields:**
```javascript
{
  // Existing fields...
  contact_requests: [
    {
      request_id: "txn_...",
      business_email: "business@example.com",
      model_revenue: 6.50,
      zuke_revenue: 3.50,
      requested_at: "2024-01-15T10:30:00Z",
      paid: false
    }
  ],
  revenue_tracking: {
    total_requests: 5,
    pending_payment: 32.50,
    paid_amount: 65.00
  }
}
```

## Environment Variables Required

Add to `.env` file:

```env
# Mailgun Configuration
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM_EMAIL=noreply@mg.yourdomain.com
```

## Installation & Setup

### 1. Install Mailgun Package
```bash
npm install mailgun.js
```

### 2. Update Server Configuration
- ✅ Already added import in `server.js`
- ✅ Already registered route at `/api/mailgun`

### 3. Configure Mailgun Credentials
1. Get API key from [Mailgun Dashboard](https://dashboard.mailgun.com)
2. Get domain (e.g., `mg.yourdomain.com`)
3. Add to `.env`:
   ```
   MAILGUN_API_KEY=your-api-key
   MAILGUN_DOMAIN=mg.yourdomain.com
   MAILGUN_FROM_EMAIL=noreply@mg.yourdomain.com
   ```

### 4. Verify MongoDB Collections
Ensure MongoDB has:
- `user_wallets` collection with user records
- `creative_models` collection with model applications

## Frontend Integration

### Modal UI Changes
- Blurred email/phone display with `filter: blur(4px)`
- Orange "Request" button to trigger contact request
- Button is disabled during processing
- Success/error notifications show transaction status

### Data Attributes
- Model details modal contains: `data-model-name` attribute on h2 heading
- Model cards have: `data-model-id` attribute for identification
- Contact info button passes: `modelId` and `modelEmail` to requestModelDetails()

## Error Handling

### Frontend Errors (Caught)
- Missing Auth0 user session → Shows "Please log in" alert
- API errors → Shows error message from server
- Network errors → Shows generic error message
- Insufficient funds → Handled by backend, shown to user

### Backend Errors (HTTP Status)
- 400: Missing required fields or insufficient funds
- 404: Business wallet not found
- 500: Server error (Mailgun config, database error, etc.)

## Email Templates

### Business Email (Contact Details)
- Clean HTML template with orange Zuke branding
- Shows model contact email
- Lists transaction ID and amount deducted
- Professional footer with support info

### Model Email (Confirmation)
- Clean HTML template with orange Zuke branding
- Shows business email and amount charged
- Displays 65% revenue to model
- Status: "Pending Processing"
- Timeline: 5-7 business days for payment

## Testing Checklist

- [ ] Install Mailgun package: `npm install mailgun.js`
- [ ] Add Mailgun environment variables to `.env`
- [ ] Restart server: `npm run dev`
- [ ] Load Creative Hub in business dashboard
- [ ] Click info icon on any model card
- [ ] Scroll to "Email Details" section
- [ ] Click "Request" button
- [ ] Verify:
  - [ ] R10 deducted from wallet
  - [ ] Modal closes after 2 seconds
  - [ ] Business receives email with model contact
  - [ ] Model receives confirmation email
  - [ ] Transaction appears in wallet history
  - [ ] creative_models record updated with request

## Mailgun Setup Instructions

### 1. Create Mailgun Account
- Go to [mailgun.com](https://mailgun.com)
- Sign up for free account
- Verify your domain (or use sandbox domain for testing)

### 2. Get API Credentials
1. Log in to Mailgun Dashboard
2. Go to "API" in left menu
3. Copy API Key (format: `key-xxxx...`)
4. Get domain (format: `mg.yourdomain.com`)
5. Get "From" email (format: `noreply@mg.yourdomain.com`)

### 3. Update Environment Variables
```bash
# .env file
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM_EMAIL=noreply@mg.yourdomain.com
```

### 4. Test Email Sending
- Use sandbox domain first (emails only to authorized recipients)
- Verify domain once ready for production
- Monitor email logs in Mailgun dashboard

## Performance Considerations

- **Wallet Deduction:** Atomic operation with single database write
- **Email Sending:** Async operation, doesn't block response
- **Database Indexes:** Recommend indexes on:
  - `user_wallets.email`
  - `creative_models._id`
  - `creative_models.contact_requests.request_id`

## Security Notes

1. **API Authentication:** Consider adding Auth0 middleware to `/api/mailgun` endpoint
2. **Rate Limiting:** Add rate limiter to prevent abuse
3. **Input Validation:** All fields sanitized before email templates
4. **Email Verification:** Ensure emails are properly formatted
5. **Wallet Access:** Only authenticated users can deduct from their wallet

## Future Enhancements

1. **Payout System:**
   - Implement payment distribution to models (65% revenue)
   - Track and automate payout schedule

2. **Request Tracking:**
   - Admin dashboard to view all contact requests
   - Model dashboard to see who requested their info
   - View payment history and pending amounts

3. **Disputes & Refunds:**
   - Allow refund requests if contact invalid
   - Admin review and approval process

4. **Analytics:**
   - Track popular models
   - Monitor conversion rates
   - Revenue reports by period

5. **Notifications:**
   - SMS notifications to models
   - Push notifications to business
   - Wallet low-balance alerts

## Troubleshooting

### "Mailgun not configured" Error
- Check `.env` file has MAILGUN_API_KEY and MAILGUN_DOMAIN
- Verify environment variables are loaded: `console.log(process.env.MAILGUN_DOMAIN)`
- Restart server after updating .env

### Emails Not Received
- Check Mailgun dashboard logs for delivery status
- Verify "From" email matches domain
- Check spam/junk folder
- For sandbox domain, recipient must be authorized

### Wallet Not Updated
- Check MongoDB connection
- Verify user_wallets collection exists
- Check business email is correct
- Monitor server logs for errors

### Modal Not Closing
- Check browser console for JavaScript errors
- Verify modal ID is `modelDetailsModal`
- Check that `event.target` is properly referenced

## Database Migration (if needed)

If adding to existing system with models:

```javascript
// Initialize revenue_tracking for existing models
db.creative_models.updateMany(
  { revenue_tracking: { $exists: false } },
  {
    $set: {
      contact_requests: [],
      revenue_tracking: {
        total_requests: 0,
        pending_payment: 0,
        paid_amount: 0
      }
    }
  }
);
```

## Files Modified/Created

### Created
- `api/mailgun.js` - Mailgun integration and email sending

### Modified
- `server.js` - Added mailgun route registration
- `public/pages/settings/components/creative-panel.js` - Added requestModelDetails() function and data-model-name attribute
- `README.md` - Added Mailgun environment variables documentation

### No Changes Required
- `api/wallet.js` - Already has deduct endpoint
- `api/creative-models-api.js` - Existing collection queries work
- Database collections - New fields added during transaction

## Support & Documentation

For Mailgun support: https://www.mailgun.com/support/
For API reference: https://documentation.mailgun.com/

## Version History

- **v1.0.0** (Initial Release)
  - Contact details request system
  - Wallet deduction with 65/35 revenue split
  - Email notifications via Mailgun
  - Request logging in creative_models collection
