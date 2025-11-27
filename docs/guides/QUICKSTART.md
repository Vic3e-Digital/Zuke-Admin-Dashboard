# Creative Hub - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Install Mailgun Package (Already Done ✅)
```bash
npm install mailgun.js
```

### Step 2: Get Mailgun Credentials
1. Go to https://mailgun.com
2. Sign up (free account)
3. Copy API Key: `key-xxx...`
4. Copy Domain: `mg.yourdomain.com`

### Step 3: Update .env File
Add these lines to your `.env`:
```env
MAILGUN_API_KEY=key-xxxxxxxxxxxx
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM_EMAIL=noreply@mg.yourdomain.com
```

### Step 4: Restart Server
```bash
npm run dev
```

### Step 5: Test It
1. Open dashboard in browser
2. Go to Settings → Creative Hub
3. Click model info icon (orange circle)
4. Scroll down to "Email Details" 
5. Click "Request" button
6. Verify:
   - ✅ R10 deducted from wallet
   - ✅ Email sent to business
   - ✅ Email sent to model
   - ✅ Modal closes after 2 seconds

## 🎯 What It Does

When a business requests model contact details:

1. **Charges R10** from business wallet
2. **Splits revenue**: 65% to model, 35% to Zuke
3. **Sends email** to business with model contact
4. **Sends email** to model with confirmation
5. **Logs request** for tracking and reporting

## 📧 Email Flow

### Business Gets:
```
Subject: Contact Details: [Model Name]
Body: Email address, amount deducted, transaction ID
```

### Model Gets:
```
Subject: Your Contact Details Were Requested
Body: Business email, amount charged, their revenue (65%), payment timeline
```

## 💾 Database Changes

### Creates Transaction in user_wallets:
```javascript
{
  type: "contact_request",
  amount: 10,
  model_revenue: 6.50,
  zuke_revenue: 3.50,
  timestamp: "2024-01-15T10:30:00Z"
}
```

### Logs Request in creative_models:
```javascript
{
  request_id: "txn_...",
  business_email: "business@example.com",
  model_revenue: 6.50,
  zuke_revenue: 3.50
}
```

## ✅ Verification Checklist

Run this to verify setup:
```bash
./verify-creative-hub-setup.sh
```

Should show all ✅ marks.

## 🔧 Files Modified

- ✅ `api/mailgun.js` - Created
- ✅ `server.js` - Updated (2 lines)
- ✅ `public/pages/settings/components/creative-panel.js` - Updated
- ✅ `README.md` - Updated
- ✅ `package.json` - mailgun.js added

## 📖 Full Documentation

For detailed info, see:
- `IMPLEMENTATION_SUMMARY.md` - Overview
- `CREATIVE_HUB_CONTACT_SYSTEM.md` - Full technical docs
- `README.md` - Setup instructions

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Emails not sending | Check .env has Mailgun credentials |
| Wallet not deducting | Verify user_wallets collection exists |
| Modal not closing | Clear browser cache, restart server |
| Cannot click Request button | Check user is logged in via Auth0 |
| Button says "Processing..." forever | Check server logs for Mailgun errors |

## 💡 Pro Tips

1. **Test Mode**: Use Mailgun sandbox domain first (no real emails sent)
2. **Check Logs**: View Mailgun dashboard for email delivery status
3. **Monitor Wallets**: Database shows all transactions with revenue split
4. **Debug Mode**: Add `console.log()` in requestModelDetails() for testing

## 🚀 You're Ready!

Everything is implemented and installed. Just:
1. Add Mailgun credentials
2. Restart server
3. Test the flow
4. Monitor emails in Mailgun dashboard

## 📞 Need Help?

1. Check server console logs
2. Look at Mailgun dashboard for email status
3. See CREATIVE_HUB_CONTACT_SYSTEM.md for detailed troubleshooting
4. Verify wallet and creative_models collections exist in MongoDB

---

**Status**: Ready to use after adding Mailgun credentials! 🎉
