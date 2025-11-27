# Paystack Inline Integration Setup Guide

## Overview
This document explains the updated Paystack Inline/Popup integration for the pricing page, which provides better control over dynamic payment amounts compared to fixed payment pages.

## What Changed

### Previous Implementation
- Used fixed Paystack payment page URL
- Limited flexibility with dynamic pricing
- Amount had to be pre-configured on Paystack dashboard

### New Implementation
- Uses Paystack Inline/Popup integration (PaystackPop)
- Full control over dynamic amounts from your app
- Real-time calculation of subscription amounts
- Better user experience with inline popup modal

## Files Modified

1. **`public/pages/pricing.js`**
   - Updated `processPayment()` function to use PaystackPop.setup()
   - Added `verifyPaymentAndActivate()` function to handle payment callbacks
   - Supports kobo (cents) conversion for accurate pricing

2. **`public/pages/pricing.html`**
   - Added Paystack script: `https://js.paystack.co/v2/inline.js`
   - Added Auth0 script for user authentication
   - Added module import for pricing.js initialization

## Setup Steps

### 1. Get Your Paystack Public Key
1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings** → **API Keys & Webhooks**
3. Copy your **Public Key** (starts with `pk_`)

### 2. Update the Public Key in pricing.js
Find this line in `public/pages/pricing.js`:
```javascript
key: 'pk_test_YOUR_PUBLIC_KEY', // Replace with your actual Paystack public key
```

Replace `pk_test_YOUR_PUBLIC_KEY` with your actual public key from Paystack dashboard.

### 3. Configure Backend Endpoint
Ensure your backend has the `/api/activate-subscription` endpoint that:
- Accepts POST requests with the following data:
```javascript
{
  email: string,
  plan: string,
  planName: string,
  isYearly: boolean,
  amount: number,
  paymentReference: string, // From Paystack callback
  paymentMethod: 'paystack',
  billingPeriod: string,
  userId: string
}
```

- Returns a JSON response:
```javascript
{
  success: boolean,
  message: string,
  subscription?: {
    id: string,
    plan: string,
    status: string
  }
}
```

### 4. (Optional) Set Up Paystack Webhooks
1. In Paystack Dashboard, go to **Settings** → **API Keys & Webhooks**
2. Set your webhook URL to handle payment events
3. Listen for `charge.success` event to verify payments server-side

## How It Works

### Payment Flow
1. User selects a plan and billing period
2. User chooses Paystack as payment method
3. Click "Proceed to Payment"
4. `processPayment()` function executes:
   - Validates plan and calculates amount
   - Shows a confirmation dialog
   - Initializes PaystackPop with calculated amount
   - Opens an inline payment modal
5. User enters card details in the modal
6. Paystack processes the payment
7. On successful payment, callback is triggered:
   - `verifyPaymentAndActivate()` is called with payment reference
   - Backend endpoint `/api/activate-subscription` is called
   - Subscription is created in your system
   - User is redirected to dashboard

### Amount Calculation
Amounts are converted to **kobo** (Paystack's smallest unit):
```javascript
const amountInKobo = Math.round(displayPrice * 100);
// Example: R99.99 → 9999 kobo
```

## Key Code Sections

### PaystackPop Setup (pricing.js)
```javascript
const handler = PaystackPop.setup({
  key: 'pk_test_YOUR_PUBLIC_KEY',
  email: currentUser.email,
  amount: amountInKobo, // In kobo
  currency: 'ZAR',
  ref: 'ZUKE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
  metadata: {
    plan: selectedPlan,
    plan_name: plan.name,
    billing: billingPeriod,
    user_id: currentUser.sub,
    original_amount: displayPrice,
    first_name: firstName,
    last_name: lastName,
    phone: phone
  },
  callback: function(response) {
    verifyPaymentAndActivate({
      plan: selectedPlan,
      isYearly: isYearly,
      amount: displayPrice,
      reference: response.reference,
      planName: plan.name,
      billingPeriod: billingPeriod
    });
  },
  onClose: function() {
    console.log('Payment modal closed');
    alert('Payment was cancelled. Your subscription is not active.');
    localStorage.removeItem('pendingSubscription');
  }
});

handler.openIframe();
```

### Verification Function (pricing.js)
```javascript
async function verifyPaymentAndActivate(paymentData) {
  const subscriptionData = {
    email: currentUser.email,
    plan: paymentData.plan,
    planName: paymentData.planName,
    isYearly: paymentData.isYearly,
    amount: paymentData.amount,
    paymentReference: paymentData.reference,
    paymentMethod: 'paystack',
    billingPeriod: paymentData.billingPeriod,
    userId: currentUser.sub
  };
  
  const response = await fetch('/api/activate-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscriptionData)
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert(`✅ Payment successful!\n\nYour ${paymentData.planName} subscription has been activated.`);
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 2000);
  } else {
    alert(`⚠️ Payment received but subscription activation failed.\n\nError: ${data.message}`);
  }
}
```

## Payment Metadata
The following metadata is sent with each payment for tracking:
- `plan`: Selected plan ID (ignite, spark, growth, blaze)
- `plan_name`: Human-readable plan name
- `billing`: Billing period (yearly or 3-month cycle)
- `user_id`: User's Auth0 ID
- `original_amount`: Amount in Rands (for verification)
- `first_name`, `last_name`: User details
- `phone`: Contact phone number (if available)

## Testing

### Test Mode
To test with Paystack test keys:
1. Use test public key: `pk_test_...`
2. Use test card numbers:
   - Visa: `4111 1111 1111 1111` (any future expiry, any CVC)
   - Mastercard: `5531 8866 5433 3010`
3. Test OTP: `123456`

### Debugging
Check browser console for logs:
- `Payment Calculation:` - Shows amount calculations
- `Initializing Paystack Inline Payment:` - Confirms PaystackPop is ready
- `✅ Payment successful!` - Confirms payment completed
- `Error:` logs - Check for any issues

## Environment Variables
Consider storing the Paystack public key in an environment variable:
```javascript
// Instead of hardcoding, use:
const paystackKey = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_YOUR_PUBLIC_KEY';
```

## Troubleshooting

### PaystackPop is not defined
- Ensure the Paystack script is loaded: `https://js.paystack.co/v2/inline.js`
- Check network tab in browser DevTools for script loading errors
- Verify pricing.html includes the script tag

### Payment amount is incorrect
- Check the amount calculation in `processPayment()`
- Verify kobo conversion: `amount * 100`
- Check localStorage `pendingSubscription` contains correct amount

### Subscription not activating
- Verify `/api/activate-subscription` endpoint exists
- Check backend logs for activation errors
- Ensure payment reference is being sent correctly
- Verify user email matches between Auth0 and backend

### User sees "Payment was cancelled"
- This is normal if user closes the modal without completing payment
- User can try again by clicking "Proceed to Payment"
- Check browser logs for any JS errors

## Best Practices

1. **Always convert to kobo**: Paystack requires amounts in kobo (cents)
2. **Store payment reference**: Keep Paystack reference for disputes/reconciliation
3. **Verify on backend**: Always verify payments server-side using Paystack API
4. **Handle edge cases**: Check for network errors, timeouts, etc.
5. **Log transactions**: Log all payment attempts and results for auditing
6. **Test thoroughly**: Test with real test cards before going live
7. **Use webhooks**: Implement Paystack webhooks for additional verification

## Security Notes

⚠️ **Important**: 
- Never expose your Paystack **Secret Key** in frontend code
- Only use the **Public Key** in browser JavaScript
- Always verify payments on the backend using your Secret Key
- Use HTTPS in production
- Store payment references securely

## Further Resources

- [Paystack Documentation](https://paystack.com/docs)
- [Paystack Inline Integration](https://paystack.com/docs/inline-js)
- [Paystack Test Cards](https://paystack.com/docs/testing)
- [Paystack Webhooks](https://paystack.com/docs/webhooks)

## Support

For issues or questions:
1. Check Paystack dashboard for transaction details
2. Review browser console for error messages
3. Check backend server logs
4. Contact Paystack support if payment gateway issue suspected
