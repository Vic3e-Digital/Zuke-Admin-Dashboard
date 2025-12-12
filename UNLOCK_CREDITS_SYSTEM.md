# Unlock Credits System - Documentation

## Overview
The Unlock Credits system is a gamification feature inspired by Apollo.io that rewards users with credits (R50 each) when they complete onboarding tasks. This encourages users to fully configure their account and activate key features.

## System Components

### 1. Backend API (`api/unlock-credits.js`)
Handles all server-side logic for the checklist system.

**Endpoints:**
- `GET /api/unlock-credits` - Get checklist status for a business
- `POST /api/unlock-credits/unlock` - Unlock credits for a completed item
- `GET /api/unlock-credits/progress` - Get overall progress summary

**Checklist Items:**
| Item ID | Title | Description | Reward | Validation |
|---------|-------|-------------|--------|------------|
| `social_media` | Connect Social Media | Connect at least 2 social media profiles | R50 | Checks `automation_settings.social_media` for 2+ connected platforms |
| `automation` | Setup Automation | Enable automation settings and configure webhook | R50 | Checks `automation_settings.n8n_config` is enabled with webhook URL |
| `creative_model` | Choose Creative Model | Select at least one AI creative model | R50 | Checks `creative_settings.selected_models` has at least 1 model |

### 2. MongoDB Collection
**Collection Name:** `business_unlock_checklist`

**Schema:**
```javascript
{
  business_id: String,           // MongoDB ObjectId as string
  user_email: String,            // User's email
  items: {
    social_media: {
      completed: Boolean,        // Task requirements met
      unlocked: Boolean,         // Credits claimed
      completed_at: ISODate      // When credits were claimed
    },
    automation: { ... },
    creative_model: { ... }
  },
  total_credits_earned: Number,  // Total R earned
  created_at: ISODate,
  updated_at: ISODate
}
```

### 3. Frontend UI

**Page:** `public/pages/unlock-credits.html`
- Beautiful card-based interface
- Progress tracking header showing completion percentage
- Real-time status updates
- Animated progress bars and card transitions

**JavaScript:** `public/js/unlock-credits.js`
- Fetches checklist data
- Renders dynamic cards
- Handles unlock button clicks
- Shows success/error notifications
- Updates wallet balance

**Navigation:** Added to `dashboard.html`
- Menu item below "Settings"
- Star icon for visual appeal

### 4. Integration Points

**Server Registration:** `server.js`
```javascript
app.use('/api/unlock-credits', require('./api/unlock-credits'));
```

**Dashboard Integration:** `public/js/dashboard.js`
- Added route case for "unlock-credits" page
- Loads `unlock-credits.html` content
- Initializes `unlock-credits.js` module

## How It Works

### User Flow:
1. User signs up and adds their business
2. User navigates to "Unlock Credits" from dashboard menu
3. System shows 3 checklist cards with current status
4. User completes tasks (e.g., connects 2 social media accounts)
5. "Unlock Now" button becomes active
6. User clicks button to claim R50 credits
7. Credits are added to wallet via existing `wallet.js` logic
8. Item is marked as "unlocked" (can only claim once)

### Technical Flow:
```
User Action → Frontend JS → API Endpoint → Validation Logic → 
Wallet Credit → MongoDB Update → Response → UI Update
```

## Credit Award Logic

Credits are awarded using the **existing wallet system** (`api/wallet.js`):

```javascript
// Award credits
const transaction = {
  transaction_id: `unlock_${itemId}_${Date.now()}...`,
  type: 'credit',
  amount: 50,  // R50 per item
  balance_after: newBalance,
  description: `Unlock Credits: ${itemConfig.title}`,
  metadata: {
    source: 'unlock_credits',
    item_id: itemId,
    business_id: businessId
  }
};

// Update wallet balance
await walletCollection.updateOne(
  { email: email },
  {
    $set: { balance: newBalance, updated_at: new Date() },
    $push: { transactions: transaction }
  }
);
```

## One-Time Unlock Protection

Each item can only be unlocked **once per business**:

1. Check `checklist.items[itemId].unlocked` status
2. If already `true`, return error: "Credits already unlocked"
3. If `false`, validate requirements, award credits, mark as `true`

## Validation Logic

### Social Media (2+ platforms connected)
```javascript
const connectedPlatforms = Object.values(
  business.automation_settings.social_media
).filter(platform => platform.connected === true).length;

return connectedPlatforms >= 2;
```

### Automation (Enabled + Webhook URL)
```javascript
return business.automation_settings.n8n_config.enabled === true &&
       business.automation_settings.n8n_config.webhook_url?.length > 0;
```

### Creative Model (At least 1 selected)
```javascript
return business.creative_settings.selected_models.length > 0;
```

## Testing Checklist

- [ ] Navigate to "Unlock Credits" page
- [ ] Verify checklist cards display correctly
- [ ] Check status badges (Pending/Ready/Unlocked)
- [ ] Complete a task (e.g., connect 2 social profiles)
- [ ] Verify button changes to "Unlock Now"
- [ ] Click "Unlock Now" and confirm R50 added to wallet
- [ ] Verify transaction appears in wallet history
- [ ] Try clicking unlock again - should show error
- [ ] Check MongoDB for `business_unlock_checklist` entry

## Future Enhancements

1. **More Checklist Items:**
   - Complete business profile
   - Generate first AI creative
   - Send first marketing email
   - Set up payment method

2. **Dynamic Rewards:**
   - Store reward amounts in database
   - Offer bonus credits for completing all tasks
   - Time-limited bonuses

3. **Notification System:**
   - Email when credits are earned
   - Push notifications for available unlocks
   - Dashboard badge showing available unlocks

4. **Analytics:**
   - Track completion rates per item
   - Identify drop-off points
   - A/B test different reward amounts

## Files Created/Modified

### Created:
- `api/unlock-credits.js` - Backend API
- `public/pages/unlock-credits.html` - Frontend UI
- `public/js/unlock-credits.js` - Frontend logic

### Modified:
- `server.js` - Added API route
- `public/dashboard.html` - Added navigation menu item
- `public/js/dashboard.js` - Added page loader and initialization

## MongoDB Index Recommendations

For optimal performance, create these indexes:

```javascript
db.business_unlock_checklist.createIndex({ business_id: 1, user_email: 1 }, { unique: true });
db.business_unlock_checklist.createIndex({ user_email: 1 });
```

## API Examples

### Get Checklist
```bash
GET /api/unlock-credits?businessId=64abc123...&email=user@example.com
```

**Response:**
```json
{
  "success": true,
  "checklist": {
    "business_id": "64abc123...",
    "user_email": "user@example.com",
    "items": [
      {
        "id": "social_media",
        "title": "Connect Social Media",
        "description": "Connect at least 2 social media profiles",
        "reward": 50,
        "icon": "📱",
        "completed": true,
        "unlocked": false,
        "canUnlock": true,
        "completed_at": null
      }
    ],
    "total_credits_earned": 0,
    "progress": {
      "completed": 0,
      "total": 3,
      "percentage": 0
    }
  }
}
```

### Unlock Credits
```bash
POST /api/unlock-credits/unlock
Content-Type: application/json

{
  "businessId": "64abc123...",
  "email": "user@example.com",
  "itemId": "social_media"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully unlocked R50 credits!",
  "item": {
    "id": "social_media",
    "title": "Connect Social Media",
    "reward": 50
  },
  "transaction_id": "unlock_social_media_1234567890_abc123",
  "new_balance": 149,
  "formatted_balance": "R149.00"
}
```

## Support & Maintenance

For issues or questions:
1. Check MongoDB `business_unlock_checklist` collection
2. Review wallet transaction history
3. Check browser console for errors
4. Verify business has required settings configured

---

**Version:** 1.0  
**Created:** December 2025  
**Author:** Zuke Development Team
