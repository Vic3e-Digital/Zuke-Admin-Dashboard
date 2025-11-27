# Paystack Inline Integration - Visual Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRICING PAGE FLOW                        │
└─────────────────────────────────────────────────────────────────┘

    USER INTERFACE
    ┌──────────────────────────────┐
    │  1. Select Plan & Billing    │
    │  - Choose: Ignite/Spark etc  │
    │  - Choose: 3-month/Yearly    │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │  2. Review Selection         │
    │  - Plan summary displayed    │
    │  - Amount calculated         │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │  3. Select Payment Method    │
    │  - Paystack                  │
    │  - PayFast (coming soon)     │
    │  - Invitation Code           │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │  4. Confirm Payment          │
    │  - Dialog shows details      │
    │  - User confirms             │
    └──────────────┬───────────────┘
                   │
                   ▼

    PAYSTACK INTEGRATION
    ┌──────────────────────────────────────┐
    │  processPayment() Function           │
    ├──────────────────────────────────────┤
    │ 1. Calculate amount in kobo:         │
    │    displayPrice × 100                │
    │                                      │
    │ 2. Validate PaystackPop loaded       │
    │                                      │
    │ 3. Store pending subscription in     │
    │    localStorage                      │
    │                                      │
    │ 4. Initialize PaystackPop.setup()    │
    │    - Public key                      │
    │    - Amount in kobo                  │
    │    - Email & metadata                │
    │    - Callbacks (success/close)       │
    │                                      │
    │ 5. Open payment modal: handler.openIframe()
    └──────────────┬──────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  PAYSTACK PAYMENT MODAL              │
    ├──────────────────────────────────────┤
    │ ┌──────────────────────────────────┐ │
    │ │  💳 Enter Card Details           │ │
    │ ├──────────────────────────────────┤ │
    │ │ Card: 4111 1111 1111 1111       │ │
    │ │ Exp: 12/25                       │ │
    │ │ CVV: 123                         │ │
    │ │ Email: user@example.com          │ │
    │ │ Amount: R1,797.00                │ │
    │ │                                  │ │
    │ │ [  Pay Now  ]  [  Cancel  ]     │ │
    │ └──────────────────────────────────┘ │
    │                                      │
    │ (User enters OTP for verification)  │
    └──────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   SUCCESS              CANCELLED/FAILED
        │                     │
        ▼                     ▼
    ┌─────────────┐      ┌──────────────┐
    │ callback()  │      │ onClose()    │
    │ triggered   │      │ called       │
    └──────┬──────┘      └──────┬───────┘
           │                    │
           ▼                    ▼
    ┌──────────────────────────────────────┐
    │  verifyPaymentAndActivate()          │
    ├──────────────────────────────────────┤
    │ 1. Extract payment reference         │
    │                                      │
    │ 2. POST to /api/activate-subscription
    │    - User email                      │
    │    - Plan selection                  │
    │    - Amount                          │
    │    - Paystack reference              │
    │    - Metadata                        │
    │                                      │
    │ 3. Await backend response            │
    │                                      │
    │ 4. Handle success/failure            │
    └──────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
    SUCCESS              FAILURE
        │                     │
        ▼                     ▼
    ┌──────────────┐    ┌──────────────┐
    │ Show success │    │ Show error   │
    │ message      │    │ message      │
    │              │    │              │
    │ Redirect to  │    │ Ask user to  │
    │ /dashboard   │    │ contact      │
    │              │    │ support      │
    └──────────────┘    └──────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       FRONTEND (pricing.js)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Input                  Payment Calculation                │
│  ├─ Plan ID          ──┐     ├─ monthlyPrice × 3              │
│  ├─ Billing Period  ──┼──► Amount in Rands                    │
│  ├─ Email           ──┘     └─ × 100 = Amount in Kobo        │
│  └─ Auth0 User ID                                              │
│                                                                 │
│  PaystackPop Configuration                                     │
│  ├─ key: 'pk_test_...'                                         │
│  ├─ email: currentUser.email                                   │
│  ├─ amount: amountInKobo                                       │
│  ├─ currency: 'ZAR'                                            │
│  ├─ ref: 'ZUKE_[timestamp]_[random]'                          │
│  ├─ metadata: { plan, planName, billing, userId, ... }       │
│  ├─ callback: (response) => verifyPaymentAndActivate()        │
│  └─ onClose: () => alert('Payment cancelled')                 │
│                                                                 │
│  localStorage Storage                                          │
│  └─ pendingSubscription: {                                     │
│      plan, planName, isYearly, amount,                         │
│      amountInKobo, billingPeriod, timestamp                    │
│    }                                                            │
│                                                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ (iframe popup opens)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PAYSTACK PAYMENT GATEWAY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • Secure payment modal                                        │
│  • Processes card details                                      │
│  • Handles OTP/3D Secure                                       │
│  • Returns: {reference: 'ZUKE_..._...', status: 'success'}   │
│                                                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ (callback triggered)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│               FRONTEND API CALL (pricing.js)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POST /api/activate-subscription                               │
│  {                                                              │
│    email: "user@example.com",                                  │
│    plan: "spark",                                              │
│    planName: "Spark",                                          │
│    isYearly: false,                                            │
│    amount: 1797,              ◄── Amount in Rands             │
│    paymentReference: "ZUKE_1700033486732_a8k9d2j1",          │
│    paymentMethod: "paystack",                                  │
│    billingPeriod: "3-month cycle",                            │
│    userId: "auth0|123456789"                                   │
│  }                                                              │
│                                                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                BACKEND ENDPOINT (Node.js/Express)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Receive payment data                                       │
│                                                                 │
│  2. Verify Payment Reference (optional)                        │
│     └─ Call Paystack API with SECRET_KEY to verify            │
│                                                                 │
│  3. Check User in Database                                     │
│     └─ Find user by email                                      │
│                                                                 │
│  4. Create/Update Subscription                                 │
│     └─ Store subscription with:                               │
│        - User ID                                               │
│        - Plan                                                  │
│        - Amount paid                                           │
│        - Paystack reference                                    │
│        - Start date                                            │
│        - Renewal date                                          │
│                                                                 │
│  5. Update User Status                                         │
│     └─ Set user.subscription = active                          │
│                                                                 │
│  6. Send Confirmation Email                                    │
│     └─ Thank you + subscription details                        │
│                                                                 │
│  7. Return Response:                                           │
│     {                                                           │
│       success: true,                                           │
│       message: "Subscription activated",                       │
│       subscription: { id, plan, status }                       │
│     }                                                           │
│                                                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND RESPONSE HANDLING (pricing.js)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐              ┌──────────────────┐        │
│  │   Success       │              │    Failure       │        │
│  ├─────────────────┤              ├──────────────────┤        │
│  │ • Show success  │              │ • Show error     │        │
│  │   alert         │              │   message        │        │
│  │ • Clear         │              │ • Log error      │        │
│  │   localStorage  │              │ • Ask user to    │        │
│  │ • Redirect to   │              │   contact support│        │
│  │   /dashboard    │              │                  │        │
│  │   after 2sec    │              │ (User can retry) │        │
│  └─────────────────┘              └──────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Class/Function Architecture

```
pricing.js Module
│
├─ Global Variables
│  ├─ auth0Client
│  ├─ currentUser
│  ├─ isYearly
│  ├─ selectedPlan
│  ├─ selectedPaymentMethod
│  └─ plans[] (array of plan objects)
│
├─ Main Functions
│  │
│  ├─ getAuth0Client()
│  │  └─ Initializes Auth0 SDK
│  │
│  ├─ initPricingPage()
│  │  └─ Entry point - initializes entire page
│  │     ├─ Authenticate user with Auth0
│  │     ├─ Load wallet balance
│  │     ├─ Render plans
│  │     ├─ Setup toggles & selections
│  │     ├─ Setup event listeners
│  │     └─ Load current user's plan
│  │
│  ├─ processPayment() ★ UPDATED
│  │  └─ Main payment processing function
│  │     ├─ Calculate amount in kobo
│  │     ├─ Show confirmation dialog
│  │     ├─ Validate PaystackPop
│  │     ├─ Store pending subscription
│  │     ├─ Initialize PaystackPop.setup()
│  │     │  └─ Configure payment params
│  │     │     └─ Setup callback()
│  │     │     └─ Setup onClose()
│  │     └─ handler.openIframe()
│  │
│  ├─ verifyPaymentAndActivate(paymentData) ★ UPDATED
│  │  └─ Handles payment callback
│  │     ├─ Prepare subscription data
│  │     ├─ POST to /api/activate-subscription
│  │     ├─ Handle success
│  │     │  └─ Show success alert
│  │     │  └─ Redirect to dashboard
│  │     └─ Handle error
│  │        └─ Show error message
│  │
│  ├─ Other Support Functions
│  │  ├─ loadWalletBalance()
│  │  ├─ renderPlans()
│  │  ├─ setupBillingToggle()
│  │  ├─ setupFAQs()
│  │  ├─ setupPlanSelection()
│  │  ├─ setupPaymentSelection()
│  │  ├─ setupNavigation()
│  │  ├─ showStep1()
│  │  ├─ showStep2()
│  │  ├─ loadCurrentPlan()
│  │  └─ showComparisonModal()
│
└─ Event Listeners
   ├─ window load → Check payment params & verify
   ├─ Plan selection → Update selected plan
   ├─ Payment method selection → Update payment method
   └─ Button clicks → Trigger flow steps
```

## Amount Conversion Example

```
User selects Spark plan, 3-month cycle:

Step 1: Get plan prices
  monthlyPrice = 599
  yearlyPrice = 5990

Step 2: Calculate display price
  isYearly = false
  threeMonthPrice = monthlyPrice × 3 = 599 × 3 = 1797
  displayPrice = 1797 ZAR

Step 3: Show to user
  "Spark - R1,797 every 3 months"

Step 4: Convert to Kobo for Paystack
  amountInKobo = displayPrice × 100 = 1797 × 100 = 179,700 kobo

Step 5: Send to Paystack
  PaystackPop.setup({
    amount: 179700,  // in kobo
    currency: 'ZAR'  // Rand currency
  })

Step 6: Paystack displays
  "Please pay 179,700 kobo (R1,797.00)"

Step 7: Backend receives
  amount: 1797 (original Rands value)
```

## Error Handling Flow

```
Payment Process Error Scenarios
│
├─ PaystackPop Not Loaded
│  ├─ Cause: Script failed to load
│  ├─ Detection: typeof PaystackPop === 'undefined'
│  ├─ User Message: "Paystack payment gateway is loading..."
│  ├─ Log: console.error('PaystackPop is not loaded')
│  └─ Action: Suggest retry
│
├─ Payment Cancelled by User
│  ├─ Cause: User closes modal without completing payment
│  ├─ Detection: onClose() callback triggered
│  ├─ User Message: "Payment was cancelled"
│  ├─ Cleanup: Remove localStorage pendingSubscription
│  └─ Action: Allow retry
│
├─ Payment Failed (Gateway Error)
│  ├─ Cause: Card declined, network error, etc
│  ├─ Detection: Paystack error callback
│  ├─ User Message: Paystack displays error
│  ├─ Log: Console shows Paystack error
│  └─ Action: Allow retry with different card
│
├─ Subscription Activation Failed
│  ├─ Cause: Backend error, user not found, etc
│  ├─ Detection: /api/activate-subscription returns failure
│  ├─ User Message: "Payment received but subscription activation failed"
│  ├─ Log: console.error('Error activating subscription')
│  └─ Action: Contact support with reference
│
└─ Network/Connection Error
   ├─ Cause: Internet disconnection during request
   ├─ Detection: fetch() throws error
   ├─ User Message: Error message with details
   ├─ Log: console.error('Error activating subscription')
   └─ Action: Retry or contact support
```

## Metadata Tracking

```
Paystack Metadata Object
{
  "plan": "spark",              // Plan identifier
  "plan_name": "Spark",         // Human-readable name
  "billing": "3-month cycle",   // Billing frequency
  "user_id": "auth0|xxxxx",    // Auth0 unique ID
  "original_amount": 1797,      // Amount in Rands
  "first_name": "John",         // Customer name
  "last_name": "Doe",           // Customer surname
  "phone": "0712345678"         // Contact number
}

Purpose:
├─ Track which plan was purchased
├─ Know billing frequency
├─ Link to Auth0 user
├─ Verify correct amount charged
├─ Identify customer
└─ Contact customer if needed
```

## Key Variables Summary

| Variable | Type | Where | Purpose |
|----------|------|-------|---------|
| `displayPrice` | Number | processPayment() | Amount in Rands |
| `amountInKobo` | Number | processPayment() | Amount × 100 |
| `ref` | String | PaystackPop.setup() | Unique transaction ID |
| `selectedPlan` | String | global | Current plan selected |
| `selectedPaymentMethod` | String | global | Payment method (paystack) |
| `currentUser` | Object | global | Auth0 user object |
| `isYearly` | Boolean | global | Billing period flag |
| `handler` | Object | processPayment() | PaystackPop instance |

---

**Visual Guide Created**: Use these diagrams to understand the complete flow and architecture of the Paystack Inline implementation.
