# Creative Hub Contact Details System - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         ZUKE CREATIVE HUB                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐         ┌─────────────────────────┐   │
│  │   BUSINESS USERS     │         │    MODEL CREATIVES      │   │
│  │                      │         │                         │   │
│  │ • View model gallery │         │ • Register in hub       │   │
│  │ • See model details  │         │ • Portfolio display     │   │
│  │ • Request contact ◄──┼─────────┼─► Contact info (blurred)│   │
│  │ • Pay R10 for access │         │ • Receive requests      │   │
│  │ • Get contact info   │         │ • Track earnings        │   │
│  │                      │         │                         │   │
│  └──────────────────────┘         └─────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Click "Request" Button
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: requestModelDetails()                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 1. Get business email from Auth0 session                        │
│ 2. Get model name, ID, email from modal                         │
│ 3. POST to /api/mailgun/request-contact-details                │
│ 4. Show "Processing..." state                                   │
│ 5. On success: Notify, refresh wallet, close modal             │
│ 6. On error: Show error message, reset button                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP POST
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│        BACKEND: /api/mailgun/request-contact-details           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 1. VALIDATE INPUT                                               │
│    ├─ Check businessEmail exists                                │
│    ├─ Check modelId exists                                      │
│    └─ Check modelEmail exists                                   │
│                                                                   │
│ 2. WALLET CHECK                                                 │
│    ├─ Query user_wallets by businessEmail                       │
│    ├─ Verify balance >= 10                                      │
│    └─ Return error if insufficient funds                        │
│                                                                   │
│ 3. CALCULATE REVENUE                                            │
│    ├─ model_revenue = 10 × 0.65 = 6.50  (65%)                  │
│    └─ zuke_revenue = 10 × 0.35 = 3.50   (35%)                  │
│                                                                   │
│ 4. CREATE TRANSACTION                                           │
│    ├─ transaction_id: txn_{timestamp}_{random}                 │
│    ├─ type: "contact_request"                                  │
│    ├─ amount: 10                                                │
│    ├─ model_revenue: 6.50                                       │
│    └─ zuke_revenue: 3.50                                        │
│                                                                   │
│ 5. UPDATE WALLET                                                │
│    ├─ Deduct 10 from balance                                    │
│    ├─ Add transaction to transactions[]                         │
│    └─ Update timestamp                                          │
│                                                                   │
│ 6. LOG REQUEST IN CREATIVE_MODELS                               │
│    ├─ Add to contact_requests[]                                 │
│    ├─ Increment total_requests counter                          │
│    └─ Add to pending_payment amount                             │
│                                                                   │
│ 7. SEND EMAILS                                                  │
│    ├─ To Business:                                              │
│    │  ├─ Subject: "Contact Details: [Model Name]"              │
│    │  ├─ Body: Model email, amount, transaction ID             │
│    │  └─ Via Mailgun                                            │
│    │                                                             │
│    └─ To Model:                                                 │
│       ├─ Subject: "Your Contact Details Were Requested"        │
│       ├─ Body: Business email, revenue split, payment timeline │
│       └─ Via Mailgun                                            │
│                                                                   │
│ 8. RETURN RESPONSE                                              │
│    ├─ success: true                                             │
│    ├─ transaction_id: txn_...                                   │
│    ├─ amount: 10                                                │
│    ├─ model_revenue: 6.50                                       │
│    ├─ zuke_revenue: 3.50                                        │
│    └─ new_balance: 89.00                                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Success Response
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: Handle Success Response                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 1. Show success notification                                    │
│    └─ "Contact details sent! R10 deducted from wallet."        │
│                                                                   │
│ 2. Clear wallet cache                                           │
│    └─ window.dataManager.clearWalletCache()                    │
│                                                                   │
│ 3. Close modal (after 2 seconds)                                │
│    └─ modelDetailsModal.style.display = 'none'                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Email Delivery
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MAILGUN DELIVERY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ BUSINESS EMAIL                    MODEL EMAIL                   │
│ ─────────────────────────────────────────────────              │
│ To: business@example.com          To: model@example.com        │
│ From: noreply@mg.zuke.com         From: noreply@mg.zuke.com    │
│                                                                  │
│ Subject:                          Subject:                      │
│ Contact Details: Model Name       Your Contact Details         │
│                                   Were Requested                │
│                                                                  │
│ Body:                             Body:                         │
│ • Model Email                     • Business Email              │
│ • Amount: R10                     • Amount Charged: R10         │
│ • Transaction ID                  • Model Revenue: R6.50 (65%)  │
│                                   • Status: Pending Processing   │
│                                   • Payment Timeline: 5-7 days   │
│                                   • Transaction ID               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Data Persistence
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MONGODB COLLECTIONS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ user_wallets                      creative_models               │
│ ───────────────────────────────────────────────────────────    │
│ {                                 {                             │
│   email: "business@...",          _id: ObjectId,               │
│   balance: 89.00,  ◄────┐         name: "Model Name",          │
│   transactions: [        │         contact_requests: [         │
│     {                    │           {                         │
│       type: "contact_request",      request_id: "txn_...",    │
│       amount: 10,                   business_email: "...",     │
│       model_revenue: 6.50,          model_revenue: 6.50,       │
│       zuke_revenue: 3.50,           zuke_revenue: 3.50,        │
│       timestamp: "2024-01-15T...",  requested_at: "2024-...",  │
│       metadata: {                   paid: false                │
│         modelId: "...",           }                            │
│         modelEmail: "..."        ],                            │
│       }                           revenue_tracking: {          │
│     ]                               total_requests: 5,          │
│   }                                 pending_payment: 32.50,    │
│                                     paid_amount: 0              │
│                                   }                             │
│                                 }                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

```
Business User
    ↓ [Clicks Request]
Frontend: requestModelDetails()
    ↓ [POST with business email, model id/email]
Backend: /api/mailgun/request-contact-details
    ├─ Validate wallet
    ├─ Calculate split (65/35)
    ├─ Deduct wallet
    ├─ Log in creative_models
    └─ Send emails
    ↓ [Response with transaction ID]
Frontend: Success handling
    ├─ Show notification
    ├─ Clear cache
    └─ Close modal
    ↓ [Emails delivered]
Mailgun
    ├─ Business receives contact details
    └─ Model receives confirmation + revenue info
    ↓ [Data stored]
MongoDB
    ├─ Transaction in user_wallets
    └─ Request in creative_models
```

## Environment Variables

```
┌────────────────────────────────────────┐
│         .env Configuration              │
├────────────────────────────────────────┤
│ MAILGUN_API_KEY=key-xxx...             │
│ MAILGUN_DOMAIN=mg.yourdomain.com       │
│ MAILGUN_FROM_EMAIL=noreply@mg...       │
└────────────────────────────────────────┘
                    ↓
         ┌──────────────────────┐
         │ api/mailgun.js       │
         │ sendEmail() function │
         └──────────────────────┘
                    ↓
         ┌──────────────────────┐
         │ Mailgun API          │
         │ Email Delivery       │
         └──────────────────────┘
```

## Error Handling Flow

```
                    Request
                       ↓
              ┌────────────────┐
              │ Validate Input │
              └────────┬───────┘
                       ↓
              ┌────────────────┐ Not Found
         ┌────┤ Check Wallet   ├──────► 404 Error
         │    └────────┬───────┘
         │             ↓
         │    ┌────────────────┐ Insufficient
         └────┤ Check Balance  ├──────► 400 Error
              └────────┬───────┘
                       ↓ OK
              ┌────────────────┐
              │ Process Request│
              └────────┬───────┘
                       ↓
              ┌────────────────┐ Error
         ┌────┤ Send Emails    ├──────► 500 Error
         │    └────────┬───────┘
         │             ↓ Success
         │    ┌────────────────┐
         └────┤ Return Success │
              └────────────────┘
```

## Revenue Tracking Example

```
Transaction #1:
├─ Business pays: R10.00
├─ Model gets:   R6.50 (65%)
└─ Zuke gets:    R3.50 (35%)

Transaction #2:
├─ Business pays: R10.00
├─ Model gets:   R6.50 (65%)
└─ Zuke gets:    R3.50 (35%)

After 5 Transactions:
├─ Total collected: R50.00
├─ Model pending:   R32.50 (5 × 6.50)
└─ Zuke pending:    R17.50 (5 × 3.50)

Payout (Future Feature):
├─ Model receives: R32.50 (via bank transfer)
├─ Zuke receives:  R17.50 (to company account)
└─ Mark paid: true in database
```

---

**This architecture ensures:**
- ✅ Transparent revenue split
- ✅ Secure wallet transactions
- ✅ Complete audit trail
- ✅ Email confirmation for both parties
- ✅ Scalable for future payment processing
