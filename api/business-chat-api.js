const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// In-memory cache for business case data (reduces MongoDB reads)
const businessCaseCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ========== AI CHAT WITH BUSINESS CASE CONTEXT ==========
router.post('/chat', async (req, res) => {
  try {
    const { businessId, message, conversationHistory = [] } = req.body;

    if (!businessId || !message) {
      return res.status(400).json({ 
        error: 'Missing required parameters: businessId, message' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // Check cache first
    let cachedData = businessCaseCache.get(businessId);
    let businessCase = {};
    let businessInfo = {};

    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      // Use cached data
      businessCase = cachedData.businessCase;
      businessInfo = cachedData.businessInfo;
      console.log(`✅ Using cached business case for ${businessId}`);
    } else {
      // Fetch from MongoDB
      console.log(`📥 Fetching business case from MongoDB for ${businessId}`);
      
      const submission = await db.collection('store_submissions').findOne({
        _id: new ObjectId(businessId)
      });

      if (!submission) {
        return res.status(404).json({ 
          error: 'Business not found' 
        });
      }

      // Get business case from business_cases collection or fallback
      const existingCase = await db.collection('business_cases').findOne({
        business_id: businessId
      });

      if (existingCase) {
        businessCase = existingCase.business_case || {};
      } else if (submission.initial_business_case) {
        businessCase = submission.initial_business_case;
      }

      businessInfo = {
        name: submission.store_info?.name || 'Unknown Business',
        description: submission.store_info?.description || '',
        category: submission.store_info?.category || [],
        location: submission.store_info?.location || {}
      };

      // Cache the data
      businessCaseCache.set(businessId, {
        businessCase,
        businessInfo,
        timestamp: Date.now()
      });
    }

    // ✅ Build context for RAG
    const contextText = buildBusinessCaseContext(businessCase, businessInfo);

    // ✅ Call Azure OpenAI with context
    const azureResponse = await callAzureOpenAI(message, contextText, conversationHistory);

    res.json({
      success: true,
      response: azureResponse.message,
      businessName: businessInfo.name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Business chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

// ========== BUILD CONTEXT FROM BUSINESS CASE ==========
function buildBusinessCaseContext(businessCase, businessInfo) {
  let context = `# Business Information\n`;
  context += `Business Name: ${businessInfo.name}\n`;
  context += `Description: ${businessInfo.description}\n`;
  context += `Category: ${Array.isArray(businessInfo.category) ? businessInfo.category.join(', ') : businessInfo.category}\n`;
  
  if (businessInfo.location?.city) {
    context += `Location: ${businessInfo.location.city}, ${businessInfo.location.country || ''}\n`;
  }
  
  context += `\n# Business Case Details\n\n`;

  // Add all business case sections
  if (businessCase.executive_summary) {
    context += `## Executive Summary\n${businessCase.executive_summary}\n\n`;
  }

  if (businessCase.business_overview) {
    context += `## Business Overview\n${businessCase.business_overview}\n\n`;
  }

  if (businessCase.problem_statement) {
    context += `## Problem Statement\n${businessCase.problem_statement}\n\n`;
  }

  if (businessCase.solution) {
    context += `## Solution\n${businessCase.solution}\n\n`;
  }

  if (businessCase.target_market) {
    context += `## Target Market\n${businessCase.target_market}\n\n`;
  }

  if (businessCase.competitive_analysis) {
    context += `## Competitive Analysis\n${businessCase.competitive_analysis}\n\n`;
  }

  if (businessCase.revenue_model) {
    context += `## Revenue Model\n${businessCase.revenue_model}\n\n`;
  }

  if (businessCase.marketing_strategy) {
    context += `## Marketing Strategy\n${businessCase.marketing_strategy}\n\n`;
  }

  if (businessCase.financial_projections) {
    context += `## Financial Projections\n${businessCase.financial_projections}\n\n`;
  }

  if (businessCase.risks_and_mitigation) {
    context += `## Risks and Mitigation\n${businessCase.risks_and_mitigation}\n\n`;
  }

  if (businessCase.implementation_plan) {
    context += `## Implementation Plan\n${businessCase.implementation_plan}\n\n`;
  }

  if (businessCase.success_metrics) {
    context += `## Success Metrics\n${businessCase.success_metrics}\n\n`;
  }

  return context;
}

// ========== CLEAR CACHE ENDPOINT (OPTIONAL) ==========
router.post('/clear-cache', async (req, res) => {
  try {
    const { businessId } = req.body;
    
    if (businessId) {
      businessCaseCache.delete(businessId);
      res.json({ success: true, message: 'Cache cleared for business' });
    } else {
      businessCaseCache.clear();
      res.json({ success: true, message: 'All cache cleared' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// ========== CALL AZURE OPENAI ==========
async function callAzureOpenAI(userMessage, context, conversationHistory = []) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "https://zuke-n8n-videos.cognitiveservices.azure.com/";
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error('Azure OpenAI API key not configured');
  }

  // Build messages array with system prompt and context
  const messages = [
    {
      role: "system",
      content: `You are an expert Business Manager Assistant helping to manage and grow this business. You have complete knowledge of the business case, strategy, operations, and market position.

Business Context:
${context}

Your Role & Responsibilities:
- Act as a strategic business advisor and operations manager
- Provide actionable insights on business growth, operations, marketing, and strategy
- Help with decision-making by analyzing business data and market trends
- Suggest improvements, identify opportunities, and highlight potential risks
- Assist with planning, goal-setting, and performance tracking
- Offer practical solutions to business challenges

Response Guidelines:
- Keep responses professional, clear, and actionable (2-4 sentences typically)
- Provide detailed analysis when asked (e.g., "analyze", "explain in detail", "give me a breakdown")
- Use bullet points for action items, strategies, or multi-step recommendations
- Always reference specific business data when making recommendations
- Be proactive: suggest next steps and opportunities
- Think like a business manager: focus on ROI, efficiency, and growth
- If information isn't available, suggest what data would be helpful to gather
- Avoid markdown headers (##, ###) - use bold for key points and emphasis`
    }
  ];

  // Add conversation history (last 5 messages for context window management)
  const recentHistory = conversationHistory.slice(-5);
  messages.push(...recentHistory);

  // Add current user message
  messages.push({
    role: "user",
    content: userMessage
  });

  // Call Azure OpenAI API
  const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=2024-08-01-preview`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      messages: messages,
      max_tokens: 300,  // Reduced for concise responses
      temperature: 0.7,
      top_p: 0.95,
      frequency_penalty: 0.3,  // Reduce repetition
      presence_penalty: 0.1
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Azure OpenAI API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  return {
    message: data.choices[0].message.content,
    usage: data.usage
  };
}

module.exports = router;
