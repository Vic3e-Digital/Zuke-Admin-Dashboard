# Paystack Inline Implementation - Quick Reference

## Quick Setup (5 minutes)

### Step 1: Get Your Keys
1. Go to https://dashboard.paystack.com
2. Settings → API Keys & Webhooks
3. Copy your **Public Key** (pk_...)

### Step 2: Update pricing.js
Replace line in `public/pages/pricing.js`:
```javascript
key: 'pk_test_YOUR_PUBLIC_KEY',
```
With your actual public key.

### Step 3: Ensure Backend Endpoint Exists
Your `/api/activate-subscription` endpoint should handle:
```javascript
POST /api/activate-subscription
{
  email, plan, planName, isYearly, amount, 
  paymentReference, paymentMethod, billingPeriod, userId
}
```

## Implementation Details

### What Happens When User Clicks "Proceed to Payment"

```
User clicks "Proceed to Payment"
    ↓
processPayment() called
    ↓
Calculate amount in kobo (× 100)
    ↓
Show confirmation dialog
    ↓
User confirms
    ↓
PaystackPop.setup() initializes
    ↓
handler.openIframe() opens payment modal
    ↓
User enters card details
    ↓
Payment processed by Paystack
    ↓
callback() triggered with reference
    ↓
verifyPaymentAndActivate() called
    ↓
POST to /api/activate-subscription
    ↓
Backend activates subscription
    ↓
Success message + redirect to dashboard
```

## Code Locations

| What | Where |
|------|-------|
| Paystack setup | `pricing.js` line ~365 |
| Amount calculation | `pricing.js` line ~340 |
| Verification function | `pricing.js` line ~595 |
| Scripts loaded | `pricing.html` end of file |

## Key Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `amountInKobo` | `displayPrice × 100` | Paystack requires amounts in kobo |
| `ref` | `ZUKE_[timestamp]_[random]` | Unique reference per transaction |
| `paymentReference` | From Paystack callback | Proof of payment |
| `billingPeriod` | "yearly" or "3-month cycle" | Subscription duration |

## Testing

### Test Card Numbers
| Card | Number | Expiry | CVC |
|------|--------|--------|-----|
| Visa | 4111 1111 1111 1111 | Any future | Any |
| Mastercard | 5531 8866 5433 3010 | Any future | Any |
| OTP | `123456` | - | - |

### Test Flow
1. Go to pricing page
2. Select a plan (e.g., Spark)
3. Select billing period
4. Click "Continue"
5. Select Paystack
6. Click "Proceed to Payment"
7. Enter test card details
8. Confirm OTP (123456)
9. See success message

## Console Logs to Check

Look for these in browser console (F12 → Console):

✅ **Success logs:**
- `Initializing Paystack Inline Payment: {plan, displayPrice, ...}`
- `✅ Payment successful! Reference: [reference]`
- `Verifying payment and activating subscription: {plan, ...}`

❌ **Error logs:**
- `PaystackPop is not loaded` → Script not loading
- `Error validating subscription: ...` → Backend issue
- Network errors → Connection issue

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "PaystackPop is not defined" | Script not loaded - check pricing.html |
| Amount wrong at Paystack | Check kobo conversion (× 100) |
| Payment works but no subscription | Check `/api/activate-subscription` endpoint |
| Modal doesn't open | Check browser console for errors |
| Payment reference missing | Ensure callback is called correctly |

## Production Checklist

- [ ] Replace `pk_test_` with live `pk_live_` key
- [ ] Remove console.log() debugging statements (optional)
- [ ] Test with real cards (small amounts)
- [ ] Set up Paystack webhooks for verification
- [ ] Configure backend email notifications
- [ ] Test cancellation and error scenarios
- [ ] Update terms of service with Paystack info
- [ ] Set up dispute/refund handling process

## File References

**Modified Files:**
- `public/pages/pricing.js` - Main payment logic
- `public/pages/pricing.html` - Scripts and HTML structure

**Documentation:**
- `PAYSTACK_INLINE_SETUP.md` - Full setup guide
- `PAYSTACK_INLINE_QUICKREF.md` - This file

**Related Files:**
- Backend: `/api/activate-subscription` endpoint
- Frontend: Payment confirmation flow
- Dashboard: Post-payment redirect destination

## Next Steps

1. ✅ Scripts are loaded in HTML
2. ✅ Payment function is updated
3. ✅ Verification function is added
4. **TODO**: Update public key in pricing.js
5. **TODO**: Verify backend endpoint exists
6. **TODO**: Test with Paystack test cards
7. **TODO**: Deploy to production with live key
