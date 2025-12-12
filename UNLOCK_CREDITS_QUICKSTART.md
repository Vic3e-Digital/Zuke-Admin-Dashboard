# Quick Setup Guide - Unlock Credits System

## ✅ Installation Complete!

The Unlock Credits system has been successfully installed in your Zuke Admin Dashboard. Here's what was added:

## 📁 Files Created

### Backend
- ✅ `api/unlock-credits.js` - API endpoints for checklist management

### Frontend
- ✅ `public/pages/unlock-credits.html` - Unlock credits page UI
- ✅ `public/js/unlock-credits.js` - Frontend JavaScript logic

### Documentation
- ✅ `UNLOCK_CREDITS_SYSTEM.md` - Complete system documentation
- ✅ `UNLOCK_CREDITS_QUICKSTART.md` - This file

## 🔧 Files Modified

- ✅ `server.js` - Registered `/api/unlock-credits` route
- ✅ `public/dashboard.html` - Added "Unlock Credits" menu item
- ✅ `public/js/dashboard.js` - Added page loader and initialization

## 🎯 How to Use

### For Users:
1. Login to your dashboard
2. Click **"Unlock Credits"** in the sidebar (below Settings)
3. Complete tasks to unlock R50 per task:
   - 📱 Connect 2+ social media profiles
   - 🤖 Setup automation & webhook
   - 🎨 Choose at least 1 creative model
4. Click **"Unlock Now"** when tasks are complete
5. Credits are instantly added to your wallet!

### For Developers:
```javascript
// API is ready at:
GET  /api/unlock-credits?businessId=xxx&email=xxx
POST /api/unlock-credits/unlock
GET  /api/unlock-credits/progress
```

## 🗄️ Database

A new MongoDB collection will be automatically created:
- **Collection:** `business_unlock_checklist`
- **Database:** `zukeDatabase`

No manual setup required! The collection is created on first use.

## 🚀 Testing

1. **Start the server** (already running):
   ```bash
   npm start
   ```

2. **Open dashboard**:
   ```
   http://localhost:3000/dashboard.html
   ```

3. **Navigate to "Unlock Credits"** in the sidebar

4. **Test the flow:**
   - View checklist cards
   - Complete a task (e.g., connect social media)
   - Click "Unlock Now"
   - Verify R50 added to wallet

## 🎨 Features

✨ **Beautiful UI**
- Modern card-based design
- Animated progress tracking
- Real-time status updates
- Success/error notifications

🔒 **One-Time Unlock**
- Each item can only be claimed once
- Prevents duplicate credit awards
- Tracks completion timestamps

💰 **Wallet Integration**
- Uses existing `wallet.js` system
- No modifications to wallet logic
- Transaction history included

## 📊 Checklist Items

| Task | Reward | Validation |
|------|--------|------------|
| Connect 2+ Social Media | R50 | Checks `automation_settings.social_media` |
| Setup Automation | R50 | Checks `n8n_config.enabled` + webhook |
| Choose Creative Model | R50 | Checks `creative_settings.selected_models` |

**Total Potential:** R150 per business

## 🔍 Troubleshooting

### Issue: Page doesn't load
**Solution:** Clear browser cache and refresh

### Issue: "Unlock Now" button disabled
**Solution:** Complete the task requirements first

### Issue: Credits not added
**Solution:** Check:
1. Server console for errors
2. MongoDB connection
3. Wallet collection exists

### Issue: Can't unlock twice
**Solution:** This is intentional! Each item can only be unlocked once per business.

## 📖 Full Documentation

For detailed information, see: `UNLOCK_CREDITS_SYSTEM.md`

Topics covered:
- System architecture
- API specifications
- Database schema
- Validation logic
- Future enhancements

## 🎉 You're All Set!

The Unlock Credits system is ready to use. Users can now earn credits by completing onboarding tasks, Apollo.io style! 🚀

---

**Need Help?** Check the full documentation or server logs for more details.
