# AI Business Chatbot - RAG Implementation

## 🤖 Overview

An intelligent AI chatbot that provides contextual answers about business cases using Retrieval Augmented Generation (RAG) with Azure OpenAI and MongoDB.

## ✨ Features

- **RAG-Powered**: Retrieves business case data from MongoDB and uses it as context for Azure OpenAI
- **Conversational Memory**: Maintains conversation history for contextual responses
- **Real-time Chat**: Instant responses with typing indicators
- **Quick Questions**: Pre-built prompts for common queries
- **Business-Aware**: Automatically loads context from the selected business
- **Modern UI**: Clean, professional chat interface with smooth animations

## 🏗️ Architecture

```
User Question
    ↓
Frontend (chatbot.js)
    ↓
Backend API (/api/business-chat/chat)
    ↓
MongoDB (Fetch Business Case)
    ↓
Context Builder (RAG Context)
    ↓
Azure OpenAI (gpt-4o-mini)
    ↓
Response to User
```

## 📁 Files Created

### Backend
- **`api/business-chat-api.js`** - Main API endpoint for RAG chat functionality
  - Fetches business case from MongoDB (`store_submissions` & `business_cases`)
  - Builds comprehensive context from business data
  - Calls Azure OpenAI with context as system prompt
  - Manages conversation history

### Frontend
- **`public/css/chatbot.css`** - Complete styling for the chatbot widget
  - Floating action button
  - Chat window with header, messages, and input area
  - Message bubbles for user and assistant
  - Typing indicators and animations
  - Mobile responsive design

- **`public/js/chatbot.js`** - Chat functionality and UI management
  - Initializes chatbot widget
  - Manages message sending/receiving
  - Handles conversation history
  - Updates context when business switches
  - Quick question buttons

### Integration
- **`public/dashboard.html`** - Updated to include chatbot styles and scripts

- **`server.js`** - Added route for business chat API

## 🔌 API Endpoint

### POST `/api/business-chat/chat`

**Request Body:**
```json
{
  "businessId": "689f2187374ee7475a5f64d2",
  "message": "What is my competitive advantage?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Tell me about my target market"
    },
    {
      "role": "assistant",
      "content": "Your target market consists of..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "response": "Based on your business case, your competitive advantage includes...",
  "businessName": "Acme Corp",
  "timestamp": "2025-12-04T10:30:00.000Z"
}
```

## 🎯 How RAG Works

1. **Retrieval Phase**:
   - Fetches business case from MongoDB using `businessId`
   - Extracts all relevant sections (executive summary, target market, strategy, etc.)
   - Builds comprehensive context text

2. **Augmentation Phase**:
   - Context is injected into system prompt
   - Conversation history is included for continuity
   - User question is added to message array

3. **Generation Phase**:
   - Azure OpenAI (gpt-4o-mini) processes the enriched prompt
   - Generates contextual, accurate responses based on business data
   - Returns formatted response to user

## 🎨 Features in Detail

### Smart Context Building
The `buildBusinessCaseContext()` function extracts:
- Business name, description, category, location
- Executive summary
- Business overview
- Problem statement & solution
- Target market analysis
- Competitive analysis
- Revenue model
- Marketing strategy
- Financial projections
- Risk assessment
- Implementation plan
- Success metrics

### Conversation Management
- Keeps last 10 messages in history
- Provides continuity across multiple questions
- Automatically clears on business switch

### Quick Questions
Pre-built prompts for common queries:
- "What is my competitive advantage?"
- "Summarize my target market"
- "What are the key risks?"
- "Give me marketing strategy recommendations"

## 🚀 Usage

### For Users
1. Click the floating chat button (bottom right)
2. Ask questions about your business case
3. Use quick question buttons for common queries
4. Get instant, contextual responses

### Switching Business Context
The chatbot automatically updates when you switch businesses in the dashboard. You can also programmatically update it:

```javascript
window.businessChatbot.updateBusinessContext(
  businessId, 
  businessName
);
```

## 🔧 Configuration

### Environment Variables Required
```env
AZURE_OPENAI_ENDPOINT=https://your-endpoint.cognitiveservices.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
MONGODB_URI=your-mongodb-connection-string
```

### Azure OpenAI Settings
- **Model**: gpt-4o-mini (configurable)
- **Max Tokens**: 800
- **Temperature**: 0.7
- **Top P**: 0.95

## 📱 Responsive Design

- **Desktop**: 400px × 600px chat window
- **Mobile**: Full-width, adaptive height
- **Animations**: Smooth transitions and typing indicators

## 🎨 UI Components

### Floating Action Button
- Gradient purple background
- Hover effects with scale animation
- Optional notification badge

### Chat Window
- Modern card design with rounded corners
- Gradient header
- Scrollable message area
- Auto-resizing input textarea

### Message Bubbles
- User messages: Right-aligned, purple gradient
- Assistant messages: Left-aligned, white background
- Timestamps for each message
- Avatar icons

## 🔐 Security

- Business ID validation on backend
- Database connection error handling
- API key secured in environment variables
- CORS and request validation

## 🚦 Error Handling

- Missing business ID alerts
- Network error messages
- Typing indicator cleanup
- Graceful fallbacks

## 📈 Future Enhancements

Potential improvements:
- [ ] Message persistence in database
- [ ] Export conversation history
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Document upload for additional context
- [ ] Analytics on common questions
- [ ] Admin dashboard for chat logs
- [ ] Custom system prompts per business

## 🐛 Troubleshooting

### Chatbot not appearing
- Check if `chatbot.css` and `chatbot.js` are loaded
- Verify scripts are loaded after DOM ready

### No responses from AI
- Verify Azure OpenAI credentials in `.env`
- Check business ID is selected
- Check network tab for API errors

### Context not loading
- Verify business exists in MongoDB
- Check database connection in server logs
- Ensure business case data is populated

## 📝 Example Queries

Try asking:
- "What makes my business unique?"
- "Who are my competitors?"
- "Explain my revenue model"
- "What are the main risks?"
- "How should I market my business?"
- "What are my financial projections?"
- "Describe my target customers"
- "What's my implementation timeline?"

## 🎯 Success Metrics

The chatbot is successful when:
✅ Provides accurate answers based on business case data  
✅ Maintains conversation context across multiple messages  
✅ Responds within 2-3 seconds  
✅ Handles errors gracefully  
✅ Updates context when switching businesses  

---

Built with ❤️ using Azure OpenAI, MongoDB, and modern web technologies.
