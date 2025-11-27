# Paystack Auto-Renewal - Quick Start Guide

## What Was Implemented

You now have a complete **Paystack Inline payment system** with **subscription auto-renewal management**.

---

## Key Features

### ✅ For Customers
- **Paystack Inline Payment** - Secure popup payment (no redirect)
- **Auto-Renewal Option** - Choose recurring or one-time payment
- **Subscription Management** - Cancel renewal anytime
- **Access Preservation** - Keep access until billing period ends
- **Clear Pricing** - Transparent 3-month or yearly options

### ✅ For Business
- **Recurring Revenue** - Automatic subscription renewals
- **Flexible Cancellation** - Reduce churn with customer-friendly cancellations
- **Transaction History** - Complete audit trail of payments
- **Database Integration** - Automatic wallet and subscription tracking

---

## Files Created/Modified

| File | Change | Status |
|------|--------|--------|
| `api/cancel-subscription.js` | ✅ NEW | Created |
| `api/routes/subscription-activation.js` | ✨ UPDATED | Added auto_renew support |
| `public/pages/pricing.js` | ✨ UPDATED | Complete Paystack + auto-renewal implementation |
| `public/pages/pricing.html` | ✨ UPDATED | Paystack v1 script |
| `server.js` | ✨ UPDATED | Added cancel-subscription route |

---

## How to Use

### 1. Start the Server
```bash
npm start
```
Server runs on port 3000

### 2. Access Pricing Page
```
http://localhost:3000/public/pages/pricing.html
```
(Users must be authenticated via Auth0)

### 3. Test Payment Flow

**With test card:**
- Card: `4111 1111 1111 1111`
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)

**Steps:**
1. Select a plan (Ignite, Spark, Growth, or Blaze)
2. Choose billing cycle (3-month or yearly)
3. Choose payment method (Paystack or Invitation Code)
4. **Auto-renewal dialog appears** - Click OK for recurring
5. Paystack popup opens
6. Enter test card details
7. Subscription activates immediately
8. Redirected to dashboard

---

## Database Changes

When a user subscribes, their wallet document gets:

```javascript
{
  auto_renew: true,              // User wants recurring charges
  subscription_status: "active",
  subscription_start_date: "...",
  subscription_end_date: "...",
  billing_period: "3-month cycle",
  transactions: [
    {
      type: "subscription",
      metadata: {
        auto_renew: true,
        paystack_reference: "...",
        plan: "spark",
        ...
      }
    }
  ]
}
```

---

## Testing Scenarios

### Scenario 1: New Subscription (Auto-Renew ON)
✅ Select plan → Choose 3-month → Paystack → **Click OK on auto-renewal** → Pay → Done

### Scenario 2: New Subscription (Auto-Renew OFF)
✅ Select plan → Choose yearly → Paystack → **Click Cancel on auto-renewal** → Pay → Done

### Scenario 3: Cancel Auto-Renewal
✅ User with active plan → Click "Cancel Subscription" → Confirm → Done
   - Auto-renewal disabled
   - Access continues until end date
   - Can resubscribe anytime

### Scenario 4: Resubscribe After Cancellation
✅ Select new plan → Payment flow → Successful

---

## API Endpoints Quick Reference

### Get Paystack Public Key
```
GET /api/paystack-key
```
Returns the Paystack public key to initialize payment popup

### Activate Subscription (After Payment)
```
POST /api/activate-subscription
{
  email: "user@example.com",
  plan: "spark",
  planName: "Spark",
  isYearly: false,
  amount: 1797,
  paymentReference: "ZUKE_...",
  billingPeriod: "3-month cycle",
  autoRenew: true,              ← NEW
  userId: "auth0|..."
}
```

### Cancel Subscription
```
POST /api/cancel-subscription
{
  email: "user@example.com"
}
```
Disables auto-renewal while preserving access until end date

### Get Wallet (Includes Auto-Renew Status)
```
GET /api/wallet?email=user@example.com
```
Returns wallet with `auto_renew` field

---

## Important Notes

### Environment Variables Required
Make sure your `.env` has:
```
PAYSTACK_PUBLIC_KEY=pk_test_xxx (or pk_live_xxx for production)
PAYSTACK_SECRET_KEY=sk_test_xxx (or sk_live_xxx for production)
```

### Paystack Script Version
Uses **v1** (`https://js.paystack.co/v1/inline.js`) for compatibility

### Auto-Renewal Default
- **Default**: `false` (one-time payment)
- **User chooses**: Via confirm dialog during checkout
- **Stored in DB**: `auto_renew` field in wallet

---

## What Happens in the Background

```
1. User selects plan and payment method
   ↓
2. Confirm dialog: "Enable auto-renewal?"
   (Sets autoRenew variable)
   ↓
3. Paystack popup initializes with amount
   (PaystackPop.setup with metadata including autoRenew)
   ↓
4. User pays via Paystack
   (Paystack calls callback with reference)
   ↓
5. Frontend calls /api/activate-subscription
   (Sends paymentReference + autoRenew flag)
   ↓
6. Backend verifies payment & creates subscription
   (Stores auto_renew in user_wallets)
   ↓
7. User redirected to dashboard
   (Payment complete, subscription active)
   ↓
8. Next visit to pricing page:
   - Shows current plan badge
   - Shows auto-renew status
   - Displays cancel button if auto-renew enabled
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Paystack popup doesn't open | Check browser console, ensure v1 script loaded |
| Auto-renewal not saving | Verify backend receives `autoRenew` in request |
| Cancel button not showing | Check `auto_renew` field in MongoDB, ensure `subscription_status: "active"` |
| Payment fails | Use test card: 4111 1111 1111 1111 |
| Wallet not creating | Check MongoDB connection and `user_wallets` collection |

---

## Next Steps

1. **Test the payment flow** with Paystack test credentials
2. **Verify database** - Check MongoDB for wallet updates
3. **Test cancellation** - Cancel an active subscription
4. **Go live** - Update Paystack keys to live mode
5. **Monitor** - Check logs for payment processing issues

---

## Support Commands

### Check if server is running
```bash
curl http://localhost:3000/api/paystack-key
```

### Check MongoDB for user wallet
```javascript
db.user_wallets.findOne({ email: "user@example.com" })
```

### View auto-renewal subscriptions
```javascript
db.user_wallets.find({ auto_renew: true, subscription_status: "active" })
```

---

## Summary

You now have:
✅ Paystack Inline payments
✅ Auto-renewal subscription management
✅ User-friendly cancellation (with access preservation)
✅ Complete transaction history
✅ Wallet management with MongoDB
✅ API endpoints for all operations

Ready to accept payments! 🚀
