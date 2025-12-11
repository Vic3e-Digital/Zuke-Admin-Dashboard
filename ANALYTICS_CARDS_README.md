# Analytics Cards Implementation Guide

This document provides step-by-step instructions for implementing analytics cards across different tabs in the Zuke Admin Dashboard. Each card will display real-time metrics using data from MongoDB collections.

**Styling Note:** Use modified Mainsimstyles for consistent card design.

---

## 🎨 Creative Hub Tab

### Card 1: Total Models Registered
**Data Source:** `creative_models` collection  
**Query:** `db.collection('creative_models').countDocuments()`  
**Display:** Number with "Models Registered" label  
**Instructions for AI:**
1. Create a card component with Mainsimstyles
2. Add API endpoint `/api/analytics/creative-hub/total-models` 
3. Query MongoDB `creative_models` collection count
4. Return `{ success: true, count: number }`
5. Display count with appropriate icon and styling

### Card 2: Active Contact Requests
**Data Source:** `creative_models` collection  
**Query:** `db.collection('creative_models').aggregate([{$unwind: "$contact_requests"}, {$match: {"contact_requests.status": "pending"}}, {$count: "total"}])`  
**Display:** Number with "Pending Requests" label  
**Instructions for AI:**
1. Create card component with pending requests icon
2. Add API endpoint `/api/analytics/creative-hub/pending-requests`
3. Aggregate contact_requests array where status is "pending"
4. Return count of pending requests
5. Add orange/yellow styling to indicate pending status

### Card 3: Revenue Generated
**Data Source:** `user_wallets` collection  
**Query:** Filter transactions where type="contact_request", sum amounts  
**Display:** Currency format (R1,234.56)  
**Instructions for AI:**
1. Create card with money/revenue icon
2. Add API endpoint `/api/analytics/creative-hub/revenue`
3. Query all transactions where `type: "contact_request"`
4. Sum the `amount` field from matching transactions
5. Format as South African Rand currency

### Card 4: Most Popular Model Categories  
**Data Source:** `creative_models` collection  
**Query:** Group by category field and count  
**Display:** Top category name with count  
**Instructions for AI:**
1. Create card showing top category
2. Add API endpoint `/api/analytics/creative-hub/popular-categories`
3. Aggregate models by category/type field
4. Return top 3 categories with counts
5. Display the #1 category prominently

---

## 🎬 Video Generation Tab

### Card 5: Total Videos Generated
**Data Source:** `veo_generations` collection  
**Query:** `db.collection('veo_generations').countDocuments()`  
**Display:** Number with "Videos Created" label  
**Instructions for AI:**
1. Create video-themed card with play icon
2. Add API endpoint `/api/analytics/video/total-generated`
3. Count all documents in `veo_generations` collection
4. Return total count
5. Use video-related styling (purple/blue theme)

### Card 6: Processing vs Completed Status
**Data Source:** `veo_generations` collection  
**Query:** `db.collection('veo_generations').aggregate([{$group: {_id: "$status", count: {$sum: 1}}}])`  
**Display:** Progress bar or pie chart showing status breakdown  
**Instructions for AI:**
1. Create status card with progress visualization
2. Add API endpoint `/api/analytics/video/status-breakdown`
3. Group by status field (processing, completed, failed)
4. Return object with counts for each status
5. Display as progress bar: green=completed, yellow=processing, red=failed

### Card 7: Revenue from Video Generation
**Data Source:** `veo_generations` collection  
**Query:** `db.collection('veo_generations').aggregate([{$match: {charged: true}}, {$group: {_id: null, total: {$sum: "$cost"}}}])`  
**Display:** Currency format showing total R20 charges  
**Instructions for AI:**
1. Create revenue card with video + money icon
2. Add API endpoint `/api/analytics/video/revenue`
3. Sum all `cost` fields where `charged: true`
4. Return total revenue amount
5. Format as currency with video generation context

### Card 8: Most Used Video Models
**Data Source:** `veo_generations` collection  
**Query:** Group by model field and count usage  
**Display:** Top model name with usage count  
**Instructions for AI:**
1. Create model popularity card
2. Add API endpoint `/api/analytics/video/popular-models`
3. Group by `model` field and count occurrences
4. Return top 3 models with usage counts
5. Display most popular model prominently

---

## 📧 Email Marketing Tab

### Card 9: Total Emails Sent
**Data Source:** `email_campaigns` and `email_history` collections  
**Query:** Sum recipient counts from both collections  
**Display:** Large number with "Emails Sent" label  
**Instructions for AI:**
1. Create email-themed card with envelope icon
2. Add API endpoint `/api/analytics/email/total-sent`
3. Count total recipients from `email_campaigns` collection
4. Add counts from `email_history` stats.total field
5. Display combined total with email styling

### Card 10: Campaign Success Rates
**Data Source:** `email_history` collection  
**Query:** Calculate (stats.sent / stats.total) * 100 average  
**Display:** Percentage with success indicator  
**Instructions for AI:**
1. Create success rate card with checkmark icon
2. Add API endpoint `/api/analytics/email/success-rate`
3. Calculate average success rate from email_history stats
4. Formula: (sent/total) * 100 for each campaign, then average
5. Display as percentage with green color for good rates

### Card 11: Email Open Rates
**Data Source:** `email_tracking` collection  
**Query:** Calculate engagement metrics if available  
**Display:** Percentage with eye icon  
**Instructions for AI:**
1. Create engagement card with eye/open icon
2. Add API endpoint `/api/analytics/email/open-rates`
3. If tracking data exists, calculate open rates
4. Otherwise show "Tracking Not Available" message
5. Display percentage with engagement context

---

## 🎙️ Audio Transcription Tab

### Card 12: Total Files Transcribed
**Data Source:** `audio_transcriptions` collection  
**Query:** `db.collection('audio_transcriptions').countDocuments()`  
**Display:** Number with "Files Processed" label  
**Instructions for AI:**
1. Create audio-themed card with microphone icon
2. Add API endpoint `/api/analytics/audio/total-files`
3. Count all documents in `audio_transcriptions` collection
4. Return total file count
5. Use audio-themed colors (sound wave blue/green)

### Card 13: Total Minutes Processed
**Data Source:** `audio_transcriptions` collection  
**Query:** `db.collection('audio_transcriptions').aggregate([{$group: {_id: null, total: {$sum: "$duration"}}}])`  
**Display:** Time format (XXX minutes or XX hours)  
**Instructions for AI:**
1. Create duration card with clock icon
2. Add API endpoint `/api/analytics/audio/total-duration`
3. Sum all `duration` fields from transcriptions
4. Convert to appropriate time format (minutes/hours)
5. Display with time-based styling

### Card 14: Language Distribution
**Data Source:** `audio_transcriptions` collection  
**Query:** Group by language field and count  
**Display:** Top language with count or flag icon  
**Instructions for AI:**
1. Create language card with globe icon
2. Add API endpoint `/api/analytics/audio/languages`
3. Group by `language` field and count occurrences
4. Return top 3 languages with counts
5. Display most common language prominently

### Card 15: Revenue from Transcriptions
**Data Source:** `audio_transcriptions` collection  
**Query:** `db.collection('audio_transcriptions').aggregate([{$group: {_id: null, total: {$sum: "$cost"}}}])`  
**Display:** Currency format showing transcription revenue  
**Instructions for AI:**
1. Create transcription revenue card
2. Add API endpoint `/api/analytics/audio/revenue`
3. Sum all `cost` fields from transcriptions
4. Return total revenue amount
5. Format as currency with audio context

---

## 🏢 Business Management Tab

### Card 16: Total Businesses Registered
**Data Source:** `store_submissions` collection  
**Query:** `db.collection('store_submissions').countDocuments()`  
**Display:** Number with "Registered Businesses" label  
**Instructions for AI:**
1. Create business card with building icon
2. Add API endpoint `/api/analytics/business/total-registered`
3. Count all documents in `store_submissions` collection
4. Return business count
5. Use professional business colors (dark blue/gray)

### Card 17: Active vs Inactive Businesses
**Data Source:** `store_submissions` collection  
**Query:** Group by processing_status.status field  
**Display:** Active count with status indicator  
**Instructions for AI:**
1. Create status card with activity indicator
2. Add API endpoint `/api/analytics/business/status-breakdown`
3. Group by `processing_status.status` field
4. Count active, inactive, and processing statuses
5. Display as status breakdown with color coding

### Card 18: Business Category Distribution
**Data Source:** `store_submissions` collection  
**Query:** Group by store_info.category field and count  
**Display:** Top category with business icon  
**Instructions for AI:**
1. Create category card with chart icon
2. Add API endpoint `/api/analytics/business/categories`
3. Group by `store_info.category` array field
4. Flatten arrays and count each category
5. Display top business category

---

## 💰 Financial/Wallet Tab

### Card 19: Total Revenue
**Data Source:** `user_wallets` collection  
**Query:** Sum all transaction amounts where type="debit"  
**Display:** Large currency amount with upward trend  
**Instructions for AI:**
1. Create revenue card with money icon
2. Add API endpoint `/api/analytics/financial/total-revenue`
3. Sum all debit transactions across all wallets
4. Calculate total platform revenue
5. Display prominently with currency formatting

### Card 20: Credit Transactions
**Data Source:** `user_wallets` collection  
**Query:** Count transactions where type="credit"  
**Display:** Number of credit transactions  
**Instructions for AI:**
1. Create transaction card with plus icon
2. Add API endpoint `/api/analytics/financial/credit-transactions`
3. Count all credit type transactions
4. Return total credit transaction count
5. Use green styling for credit/positive transactions

### Card 21: Promo Code Usage
**Data Source:** `promo_code_usage` collection  
**Query:** `db.collection('promo_code_usage').countDocuments()`  
**Display:** Number of redeemed codes  
**Instructions for AI:**
1. Create promo card with tag/coupon icon
2. Add API endpoint `/api/analytics/financial/promo-usage`
3. Count all documents in `promo_code_usage` collection
4. Return total redemption count
5. Use promotional colors (orange/yellow)

### Card 22: Average Wallet Balance
**Data Source:** `user_wallets` collection  
**Query:** `db.collection('user_wallets').aggregate([{$group: {_id: null, avgBalance: {$avg: "$balance"}}}])`  
**Display:** Currency showing average user balance  
**Instructions for AI:**
1. Create balance card with wallet icon
2. Add API endpoint `/api/analytics/financial/avg-balance`
3. Calculate average of all wallet balances
4. Return average balance amount
5. Format as currency with context

---

## 📅 Content Calendar Tab

### Card 23: Total Calendars Generated
**Data Source:** `content_calendars` collection  
**Query:** `db.collection('content_calendars').countDocuments()`  
**Display:** Number with calendar icon  
**Instructions for AI:**
1. Create calendar card with calendar icon
2. Add API endpoint `/api/analytics/calendar/total-generated`
3. Count all documents in `content_calendars` collection
4. Return total calendar count
5. Use calendar-themed styling (blue/purple)

### Card 24: Revenue from Calendar Generation
**Data Source:** Based on calendar generation costs in wallet transactions  
**Query:** Filter transactions with calendar-related descriptions  
**Display:** Currency amount from calendar services  
**Instructions for AI:**
1. Create calendar revenue card
2. Add API endpoint `/api/analytics/calendar/revenue`
3. Find transactions with calendar-related descriptions
4. Sum amounts from calendar generation charges
5. Display revenue with calendar context

---

## 📱 Social Media Tab

### Card 25: Total Social Posts Generated
**Data Source:** `social_posts` collection  
**Query:** `db.collection('social_posts').countDocuments()`  
**Display:** Number with social media icon  
**Instructions for AI:**
1. Create social card with share icon
2. Add API endpoint `/api/analytics/social/total-posts`
3. Count all documents in `social_posts` collection
4. Return total post count
5. Use social media colors (blue/purple gradient)

### Card 26: Platform Distribution
**Data Source:** `social_posts` collection  
**Query:** Group by platform field (Instagram, Twitter, Facebook)  
**Display:** Top platform with its icon  
**Instructions for AI:**
1. Create platform card with social icons
2. Add API endpoint `/api/analytics/social/platforms`
3. Group by platform field and count posts per platform
4. Return breakdown of Instagram, Twitter, Facebook usage
5. Display most popular platform prominently

---

## 🛍️ Product/Service Tab

### Card 27: Total Products Logged
**Data Source:** `products_log` collection  
**Query:** `db.collection('products_log').countDocuments()`  
**Display:** Number with box/product icon  
**Instructions for AI:**
1. Create product card with box icon
2. Add API endpoint `/api/analytics/products/total-logged`
3. Count all documents in `products_log` collection
4. Return total product count
5. Use product-themed colors (orange/brown)

### Card 28: Most Active Business Verticals
**Data Source:** `store_submissions` collection  
**Query:** Group by business category and count product submissions  
**Display:** Top vertical with activity indicator  
**Instructions for AI:**
1. Create vertical card with industry icon
2. Add API endpoint `/api/analytics/products/active-verticals`
3. Join store_submissions with products_log by businessId
4. Group by business categories and count product activity
5. Display most active business vertical

---

## ⚙️ System Performance Tab

### Card 29: Database Performance
**Data Source:** MongoDB connection metrics  
**Query:** Database statistics and connection health  
**Display:** Health indicator (Good/Warning/Error)  
**Instructions for AI:**
1. Create system card with database icon
2. Add API endpoint `/api/analytics/system/db-performance`
3. Check database connection latency and health
4. Return status indicator and response times
5. Use traffic light colors (green/yellow/red)

### Card 30: Most Used Features
**Data Source:** Combined from multiple collections  
**Query:** Count usage across veo_generations, audio_transcriptions, etc.  
**Display:** Top feature with usage percentage  
**Instructions for AI:**
1. Create feature usage card with chart icon
2. Add API endpoint `/api/analytics/system/feature-usage`
3. Count documents across major feature collections
4. Calculate percentages for each feature type
5. Display most popular feature prominently

---

## 📋 Implementation Notes

### API Structure
All analytics endpoints should follow this pattern:
```javascript
router.get('/api/analytics/[category]/[metric]', async (req, res) => {
  try {
    const db = await getDatabase();
    // Your query here
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Card Component Structure (Mainsimstyles)
```javascript
// Card wrapper with consistent styling
<div className="analytics-card">
  <div className="card-header">
    <Icon />
    <h3>Card Title</h3>
  </div>
  <div className="card-content">
    <div className="metric-value">{value}</div>
    <div className="metric-label">{label}</div>
  </div>
  <div className="card-footer">
    <small>Last updated: {timestamp}</small>
  </div>
</div>
```

### Styling Classes (Mainsimstyles)
- `.analytics-card` - Base card styling
- `.metric-value` - Large number/value display
- `.metric-label` - Descriptive text
- `.card-success` - Green theme for positive metrics
- `.card-warning` - Yellow theme for attention items
- `.card-info` - Blue theme for informational cards
- `.card-revenue` - Special styling for financial cards

### Real-time Updates
Consider implementing:
1. Auto-refresh every 30 seconds for critical metrics
2. WebSocket connections for real-time updates
3. Loading states while fetching data
4. Error handling for failed API calls

### Performance Optimization
1. Cache frequently accessed data
2. Use MongoDB indexes on commonly queried fields
3. Implement pagination for large datasets
4. Consider aggregation pipelines for complex queries

---

**Build Priority:** Start with high-impact, easy-to-implement cards first:
1. Total counts (Cards 1, 5, 9, 12, 16, 19, 23, 25, 27)
2. Revenue cards (Cards 3, 7, 15, 19, 24)
3. Status breakdowns (Cards 2, 6, 17)
4. Advanced analytics (remaining cards)