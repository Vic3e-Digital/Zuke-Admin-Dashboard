const { ObjectId } = require('mongodb');
const { getDatabase } = require('../lib/mongodb');

/**
 * Generate AI-powered content calendar
 * POST /api/marketing/generate-content-calendar
 * 
 * Request body:
 * - businessId: string
 * - userEmail: string
 * - duration: number (months)
 * - startDate: string (ISO date)
 * - postsPerWeek: number
 * - contentTypes: { image: boolean, video: boolean }
 * - additionalContext: string (optional)
 */
async function generateContentCalendar(req, res) {
  try {
    const {
      businessId,
      userEmail,
      duration,
      startDate,
      postsPerWeek,
      contentTypes,
      additionalContext
    } = req.body;

    // Validate required fields
    if (!businessId || !userEmail || !duration || !startDate || !postsPerWeek) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['businessId', 'userEmail', 'duration', 'startDate', 'postsPerWeek']
      });
    }

    if (!contentTypes.image && !contentTypes.video) {
      return res.status(400).json({ error: 'At least one content type must be selected' });
    }

    const db = await getDatabase();

    // Get business information - try both collections
    let business = await db.collection('businesses').findOne({
      _id: new ObjectId(businessId)
    });

    // If not found in businesses, try store_submissions
    if (!business) {
      business = await db.collection('store_submissions').findOne({
        _id: new ObjectId(businessId)
      });
    }

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Calculate cost (R2 per month of calendar)
    const costAmount = duration * 2; // R2.00 per month (not cents, actual rands)

    // Check wallet balance using user_wallets collection
    const wallet = await db.collection('user_wallets').findOne({
      email: userEmail
    });

    if (!wallet || wallet.balance < costAmount) {
      return res.status(402).json({
        error: 'Insufficient funds',
        required: costAmount,
        balance: wallet?.balance || 0,
        formatted_required: `R${costAmount.toFixed(2)}`,
        formatted_balance: `R${(wallet?.balance || 0).toFixed(2)}`
      });
    }

    // Extract business context - handle both business and store_submissions structures
    const businessCase = business.initial_business_case || business.business_case || {};
    const storeInfo = business.store_info || {};
    const businessName = business.business_name || storeInfo.name || 'the business';
    const industry = businessCase.industry || storeInfo.industry || 'general';
    const targetAudience = businessCase.target_audience || businessCase.target_market || 'general audience';
    const country = businessCase.country || business.country || storeInfo.country || 'South Africa';
    const businessDescription = businessCase.business_description || businessCase.what_does_business_do || storeInfo.description || '';
    const uniqueValue = businessCase.unique_value_proposition || businessCase.what_makes_different || '';

    // Calculate total number of posts
    const totalWeeks = duration * 4; // Approximate weeks per month
    const totalPosts = totalWeeks * postsPerWeek;

    // Calculate content type distribution
    let imageCount = 0;
    let videoCount = 0;
    
    if (contentTypes.image && contentTypes.video) {
      // 60% images, 40% videos (videos are more work)
      imageCount = Math.ceil(totalPosts * 0.6);
      videoCount = totalPosts - imageCount;
    } else if (contentTypes.image) {
      imageCount = totalPosts;
    } else {
      videoCount = totalPosts;
    }

    // Get current month and season
    const start = new Date(startDate);
    const startMonth = start.toLocaleString('en-US', { month: 'long' });
    const startSeason = getSeason(start, country);

    // Build AI prompt
    const prompt = `You are a strategic content marketing expert. Generate a comprehensive ${duration}-month content calendar for a business.

BUSINESS CONTEXT:
- Business Name: ${businessName}
- Industry: ${industry}
- Target Audience: ${targetAudience}
- Country/Market: ${country}
- Description: ${businessDescription}
- Unique Value: ${uniqueValue}
${additionalContext ? `- Additional Context: ${additionalContext}` : ''}

CALENDAR REQUIREMENTS:
- Duration: ${duration} months starting ${startMonth} ${start.getFullYear()}
- Season: ${startSeason}
- Posting Frequency: ${postsPerWeek} posts per week
- Total Posts: ${totalPosts} (${imageCount} images, ${videoCount} videos)
- Start Date: ${startDate}

TASK:
Create a strategic content calendar with ${totalPosts} content items. Each item must be a JSON object with:
1. contentName: Catchy, specific title (e.g., "Summer Sale Announcement", "Customer Success Story: John's Journey")
2. type: "image" or "video"
3. date: ISO date string, distributed evenly across ${duration} months
4. description: 2-3 sentences explaining the content (50-80 words)
5. why: Strategic reasoning - why this content at this time? Consider seasonality, customer journey, trends (30-50 words)
6. aiPrompt: Detailed prompt for AI image/video generation. Must be specific, include style, mood, colors, elements to include. For images: describe visual composition. For videos: describe scenes, duration, transitions (100-150 words)

STRATEGIC CONSIDERATIONS:
- Align with ${country} market trends and cultural events
- Balance promotional, educational, and engaging content (40% promotional, 40% educational, 20% entertaining)
- Consider seasonal relevance for ${startSeason}
- Include variety: product showcases, customer testimonials, behind-the-scenes, tips, industry insights, trending topics
- Space out similar content types
- Build narrative arc across the ${duration} months
- Front-load stronger content for first 2 weeks to build momentum
- Include content for major holidays and events in ${country}

CRITICAL INSTRUCTIONS:
1. You MUST generate exactly ${totalPosts} content items (NOT 1, NOT less than ${totalPosts})
2. Your response MUST be a JSON array with ${totalPosts} objects
3. Start your response with [ and end with ]
4. Do NOT wrap the array in an object
5. Do NOT add any text before or after the JSON
6. Count: Generate ${totalPosts} complete items with all 6 required fields each

Example structure for ${totalPosts} items:
[
  {
    "contentName": "First Content Item Title",
    "type": "image",
    "date": "2025-12-01T00:00:00.000Z",
    "description": "Description here...",
    "why": "Strategic reasoning...",
    "aiPrompt": "Detailed prompt..."
  },
  {
    "contentName": "Second Content Item Title",
    "type": "video",
    "date": "2025-12-08T00:00:00.000Z",
    "description": "Description here...",
    "why": "Strategic reasoning...",
    "aiPrompt": "Detailed prompt..."
  }
  ... continue until you have ${totalPosts} total items
]

REPEAT: Generate ALL ${totalPosts} items, not just one sample.`;

    console.log('🤖 Generating content calendar with AI...');

    // Get OpenAI configuration
    const openAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT || "https://zuke-n8n-videos.cognitiveservices.azure.com/";
    const openAIKey = process.env.AZURE_OPENAI_API_KEY;
    const openAIDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";

    if (!openAIKey) {
      throw new Error('Azure OpenAI API key not configured');
    }

    // Call Azure OpenAI directly
    const url = `${openAIEndpoint}openai/deployments/${openAIDeployment}/chat/completions?api-version=2025-01-01-preview`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': openAIKey
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are a strategic content marketing expert. You MUST generate exactly ${totalPosts} content items in a JSON array. Return ONLY the JSON array with ${totalPosts} complete objects. No explanatory text.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 6000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI error:', errorText);
      throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('📄 Raw AI Response:', aiResponse.substring(0, 500) + '...');

    let calendar;
    try {
      // Parse AI response
      const parsed = JSON.parse(aiResponse);
      console.log('✅ Parsed JSON type:', Array.isArray(parsed) ? 'array' : 'object');
      console.log('✅ Parsed keys:', Object.keys(parsed).join(', '));
      
      // Handle direct array response
      if (Array.isArray(parsed)) {
        calendar = parsed;
      } else {
        // Check if this is a single item object (has contentName, type, date fields)
        if (parsed.contentName && parsed.type && parsed.date) {
          console.log('📌 Single item detected, wrapping in array');
          calendar = [parsed];
        } else {
          // Try common wrapper keys
          calendar = parsed.calendar || parsed.content || parsed.items || parsed.contentItems || parsed.posts;
          
          // If still not found, try to extract first array property
          if (!calendar || !Array.isArray(calendar)) {
            const firstArrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
            if (firstArrayKey) {
              calendar = parsed[firstArrayKey];
              console.log(`📦 Found array in key: ${firstArrayKey}`);
            } else {
              // If parsed looks like a single item, wrap it
              if (typeof parsed === 'object' && parsed.contentName) {
                calendar = [parsed];
              } else {
                // Last resort: convert object values to array (but this might be wrong)
                console.warn('⚠️ Attempting to convert object values to array - may fail');
                calendar = Object.values(parsed);
              }
            }
          }
        }
      }
      
      console.log('📊 Calendar items before filtering:', calendar.length);

      // Validate and clean calendar items
      const validItems = calendar.filter(item => 
        item.contentName && 
        item.type && 
        item.date && 
        item.description && 
        item.why && 
        item.aiPrompt
      );
      
      console.log('✅ Valid calendar items:', validItems.length);
      
      if (validItems.length === 0) {
        console.error('❌ No valid items found. Sample item:', JSON.stringify(calendar[0], null, 2));
        throw new Error('AI generated items missing required fields');
      }
      
      calendar = validItems.slice(0, totalPosts);

      // Sort by date
      calendar.sort((a, b) => new Date(a.date) - new Date(b.date));

    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      console.error('❌ AI Response:', aiResponse);
      throw new Error(`AI parsing error: ${parseError.message}`);
    }

    if (!calendar || calendar.length === 0) {
      throw new Error('AI failed to generate calendar items');
    }

    // Deduct from wallet using user_wallets collection
    const newBalance = wallet.balance - costAmount;
    const transaction = {
      transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'debit',
      amount: costAmount,
      balance_after: newBalance,
      description: `AI Content Calendar - ${duration} month(s), ${calendar.length} posts`,
      timestamp: new Date().toISOString(),
      metadata: {
        businessId,
        duration,
        postsCount: calendar.length
      }
    };

    await db.collection('user_wallets').updateOne(
      { email: userEmail },
      { 
        $set: { 
          balance: newBalance,
          updated_at: new Date().toISOString()
        },
        $push: { transactions: transaction }
      }
    );

    // Save calendar to database for reference
    await db.collection('content_calendars').insertOne({
      business_id: new ObjectId(businessId),
      user_email: userEmail,
      calendar,
      settings: {
        duration,
        startDate,
        postsPerWeek,
        contentTypes,
        additionalContext
      },
      cost: costAmount,
      created_at: new Date()
    });

    console.log(`✅ Generated ${calendar.length} content items for ${businessName}`);

    res.json({
      success: true,
      calendar,
      count: calendar.length,
      cost: costAmount,
      formatted_cost: `R${costAmount.toFixed(2)}`,
      formatted_balance: `R${newBalance.toFixed(2)}`,
      wallet: {
        new_balance: newBalance
      }
    });

  } catch (error) {
    console.error('Error generating content calendar:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate content calendar',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Get season based on date and country
 */
function getSeason(date, country) {
  const month = date.getMonth(); // 0-11
  
  // Southern hemisphere (South Africa, Australia, etc.)
  const southernHemisphere = ['south africa', 'australia', 'new zealand', 'argentina', 'chile'];
  const isSouthern = southernHemisphere.some(c => country.toLowerCase().includes(c));
  
  if (isSouthern) {
    if (month >= 11 || month <= 1) return 'Summer';
    if (month >= 2 && month <= 4) return 'Autumn';
    if (month >= 5 && month <= 7) return 'Winter';
    return 'Spring';
  } else {
    // Northern hemisphere
    if (month >= 11 || month <= 1) return 'Winter';
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    return 'Autumn';
  }
}

/**
 * Get existing content calendars for a business
 * GET /api/marketing/content-calendars?businessId=xxx
 */
async function getContentCalendars(req, res) {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const db = await getDatabase();
    
    const calendars = await db.collection('content_calendars')
      .find({ business_id: new ObjectId(businessId) })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    res.json({
      success: true,
      calendars
    });

  } catch (error) {
    console.error('Error fetching content calendars:', error);
    res.status(500).json({ error: 'Failed to fetch content calendars' });
  }
}

module.exports = {
  generateContentCalendar,
  getContentCalendars
};
