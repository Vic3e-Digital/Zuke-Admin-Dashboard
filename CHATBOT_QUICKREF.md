# 🤖 AI Chatbot - Quick Reference

## What It Does
An intelligent RAG (Retrieval Augmented Generation) chatbot that:
- Reads your business case from MongoDB
- Uses Azure OpenAI to provide smart, contextual answers
- Remembers conversation history
- Updates automatically when you switch businesses

## How It Works

```
User asks question
    ↓
Fetch business case from MongoDB
    ↓
Build context with business data
    ↓
Send to Azure OpenAI with context
    ↓
Return intelligent answer
```

## Quick Start

1. **Start your server:**
   ```bash
   npm start
   ```

2. **Open dashboard** in your browser

3. **Look for purple chat button** (bottom right corner)

4. **Click and ask questions** like:
   - "What is my competitive advantage?"
   - "Summarize my target market"
   - "What are my key risks?"
   - "Give me marketing recommendations"

## Files Created

```
api/business-chat-api.js      - Backend RAG API
public/css/chatbot.css         - Chatbot styling
public/js/chatbot.js           - Frontend chat logic
docs/AI_CHATBOT_RAG.md         - Full documentation
verify-chatbot-setup.sh        - Setup verification script
```

## API Endpoint

**POST** `/api/business-chat/chat`

```json
{
  "businessId": "689f...",
  "message": "What makes my business unique?"
}
```

## Environment Variables Required

```env
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_API_KEY=sk-...
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
MONGODB_URI=mongodb+srv://...
```

## Features

✅ RAG with MongoDB business case data  
✅ Conversation memory  
✅ Quick question buttons  
✅ Typing indicators  
✅ Auto-switch business context  
✅ Mobile responsive  
✅ Modern, clean UI  

## Troubleshooting

**Chatbot not showing?**
- Check browser console for errors
- Verify chatbot.css and chatbot.js are loaded

**No AI responses?**
- Check Azure OpenAI credentials in .env
- Verify business is selected in dashboard
- Check server logs for errors

**Wrong business context?**
- The chatbot auto-updates when you switch businesses
- Try closing and reopening the chat window

## Testing

Run verification:
```bash
./verify-chatbot-setup.sh
```

## Example Conversation

**User:** What is my competitive advantage?

**AI:** Based on your business case, your competitive advantage includes:
1. **Unique Value Proposition**: [specific details from business case]
2. **Market Positioning**: [extracted from competitive analysis]
3. **Key Differentiators**: [from business overview]

**User:** How should I market this?

**AI:** Given your target market and competitive advantages, I recommend:
- [Marketing strategies from business case]
- [Target channels based on customer analysis]
- [Positioning based on competitive analysis]

## What Gets Sent to AI

The chatbot sends this context to Azure OpenAI:
- Business name, description, category
- Executive summary
- Business overview
- Problem & solution
- Target market
- Competitive analysis
- Revenue model
- Marketing strategy
- Financial projections
- Risks & mitigation
- Implementation plan
- Success metrics

## Customization

### Change AI Model
Edit `api/business-chat-api.js`:
```javascript
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o"; // Change here
```

### Adjust Response Length
Edit `api/business-chat-api.js`:
```javascript
max_tokens: 1200, // Change from 800
```

### Add More Quick Questions
Edit `public/js/chatbot.js` in the `createChatbotUI()` method.

## Support

📚 **Full Documentation**: `docs/AI_CHATBOT_RAG.md`  
🐛 **Issues**: Check server logs and browser console  
✅ **Verification**: Run `./verify-chatbot-setup.sh`

---

**Built with**: Azure OpenAI (gpt-4o-mini) + MongoDB + Express + Vanilla JS
