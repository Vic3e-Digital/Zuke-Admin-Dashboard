# SerpAPI Trends Integration for Chatbot

## Overview
The chatbot now displays **dynamic trending topics** alongside hardcoded quick questions using SerpAPI Google Trends data.

## Features
- **2 Hardcoded Questions**: Always visible (competitive advantage, target market)
- **2 Dynamic Trend Questions**: Fetched from SerpAPI based on business industry/keywords
- **1 "See More Trends" Button**: Prompts chatbot to provide detailed trend analysis
- **24-hour Cache**: Trends cached to reduce API calls
- **Automatic Refresh**: Trends reload when business changes

## Setup

### 1. Get SerpAPI Key
1. Sign up at [SerpAPI](https://serpapi.com/)
2. Get your API key from [Manage API Key](https://serpapi.com/manage-api-key)
3. Free tier: 100 searches/month

### 2. Configure Environment
Add to `.env`:
```bash
SERPAPI_KEY=your_serpapi_key_here
```

### 3. Test API
```bash
# The system works with or without the API key
# Without key: Shows intelligent mock trends based on business industry
# With key: Shows real Google Trends data
```

## How It Works

### Backend (`api/serpapi-trends.js`)
1. **Extract Keywords**: Gets industry, category, products from MongoDB business data
2. **Query SerpAPI**: Fetches Google Trends "related queries" (rising/top)
3. **Format Results**: Converts trends into chatbot quick questions
4. **Cache**: Stores results for 24 hours per business
5. **Fallback**: Returns intelligent mock trends if API unavailable

### Frontend (`public/js/chatbot.js`)
1. **Load on Init**: Fetches trends when chatbot initializes
2. **Render Buttons**: Displays 2 hardcoded + 2 trend + 1 "see more" buttons
3. **Business Switch**: Reloads trends when user changes business
4. **Click Handler**: Existing event listener handles trend button clicks

### Styling (`public/css/chatbot.css`)
- **Trend Buttons**: Gradient orange background with shimmer effect
- **See More Button**: Dashed border, lighter styling
- **Hover Effects**: Enhanced animations for trend buttons

## API Endpoints

### `POST /api/serpapi-trends/get-trends`
Fetch trending topics for a business.

**Request:**
```json
{
  "businessId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "trends": [
    {
      "question": "What's the impact of \"AI automation\" on my business?",
      "emoji": "🔥",
      "type": "trend",
      "trendData": { "query": "AI automation", "value": 100, "type": "rising" }
    }
  ],
  "cached": false
}
```

### `POST /api/serpapi-trends/clear-trends-cache`
Clear cached trends.

**Request:**
```json
{
  "businessId": "507f1f77bcf86cd799439011"  // Optional, clears all if omitted
}
```

## Example Trends

### E-commerce Business
```
🔥 What's the impact of "mobile shopping trends" on my business?
📊 How can "social commerce" affect my sales strategy?
```

### Restaurant Business
```
🔥 What's the impact of "ghost kitchens" on my restaurant?
📊 How can "food delivery apps" increase my revenue?
```

## Customization

### Change Number of Trends
In `chatbot.js`:
```javascript
const trendButtons = trends.slice(0, 2)  // Change 2 to desired number
```

### Modify Trend Question Format
In `serpapi-trends.js`:
```javascript
function formatTrendsForChatbot(trends, keywords) {
  return topTrends.map(trend => ({
    question: `Your custom format: ${trend.query}`,
    emoji: '🔥',
    type: 'trend'
  }));
}
```

### Adjust Cache Duration
In `serpapi-trends.js`:
```javascript
const TRENDS_CACHE_TTL = 24 * 60 * 60 * 1000; // Change 24 hours
```

## Testing Without API Key

The system gracefully falls back to intelligent mock trends:
- Uses business industry/category from MongoDB
- Generates relevant trending topics
- Format: "What are current {industry} trends in South Africa?"

## Files Modified
- ✅ `api/serpapi-trends.js` - New API endpoint
- ✅ `server.js` - Route registration
- ✅ `public/js/chatbot.js` - Trend loading & rendering
- ✅ `public/css/chatbot.css` - Trend button styling
- ✅ `.env` - SERPAPI_KEY configuration
- ✅ `package.json` - serpapi dependency

## Troubleshooting

### Trends Not Showing
1. Check browser console for errors
2. Verify `businessId` is set (select business first)
3. Check backend logs for API errors
4. Test endpoint: `POST /api/serpapi-trends/get-trends`

### API Rate Limit
- Free tier: 100 searches/month
- Trends cached for 24 hours
- System automatically uses mock trends if limit exceeded

### Clear Cache
```javascript
// In browser console
fetch('/api/serpapi-trends/clear-trends-cache', { method: 'POST' })
```

## Next Steps
- Monitor SerpAPI usage in dashboard
- Adjust cache duration based on trend volatility
- Consider upgrading SerpAPI plan for higher limits
- Add more sophisticated trend filtering/ranking
