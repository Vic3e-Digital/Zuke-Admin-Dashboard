const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDatabase } = require('../lib/mongodb');

/**
 * Generate AI-powered lead generation calendar
 * Creates a strategic calendar of lead generation campaigns
 */
router.post('/generate-lead-calendar', async (req, res) => {
  try {
    console.log('📅 Generating lead generation calendar...');
    console.log('Request body:', req.body);

    const {
      businessId,
      userEmail,
      duration = 1, // months
      startDate,
      campaignsPerWeek = 1,
      leadGenGoals = {},
      additionalGoals = '',
      defaultTargetRole = '',
      defaultLocation = '',
      additionalContext = ''
    } = req.body;

    // Validate required fields
    if (!businessId || !userEmail) {
      return res.status(400).json({
        error: 'Missing required fields: businessId and userEmail'
      });
    }

    // Calculate cost (R50 per calendar)
    const totalWeeks = duration * 4; // Approximate weeks per month
    const totalCampaigns = totalWeeks * campaignsPerWeek;
    const totalCost = 50; // R50 flat rate per accepted calendar

    // Get business information
    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return res.status(404).json({
        error: 'Business not found'
      });
    }

    // Check and deduct from wallet
    const walletResult = await deductFromWallet(userEmail, totalCost, 'AI Lead Generation Calendar (R50 flat rate)');
    if (!walletResult.success) {
      return res.status(402).json({
        error: walletResult.message,
        required: totalCost,
        balance: walletResult.balance
      });
    }

    // Generate calendar using AI
    const calendar = await generateLeadCalendarWithAI(
      business,
      duration,
      startDate,
      campaignsPerWeek,
      leadGenGoals,
      additionalGoals,
      defaultTargetRole,
      defaultLocation,
      additionalContext
    );

    // Store calendar in database
    const calendarDoc = {
      businessId: new ObjectId(businessId),
      userEmail,
      calendar,
      createdAt: new Date(),
      type: 'lead_generation',
      settings: {
        duration,
        startDate,
        campaignsPerWeek,
        leadGenGoals,
        additionalGoals,
        defaultTargetRole,
        defaultLocation,
        additionalContext
      },
      cost: totalCost
    };

    await db.collection('generated_calendars').insertOne(calendarDoc);

    console.log('✅ Lead generation calendar created successfully');

    res.json({
      success: true,
      calendar,
      cost: totalCost,
      formatted_cost: `R${totalCost.toFixed(2)}`,
      formatted_balance: `R${walletResult.newBalance.toFixed(2)}`,
      totalCampaigns
    });

  } catch (error) {
    console.error('❌ Error generating lead calendar:', error);
    res.status(500).json({
      error: 'Failed to generate lead generation calendar',
      details: error.message
    });
  }
});

/**
 * Generate lead generation calendar using AI
 */
async function generateLeadCalendarWithAI(
  business,
  duration,
  startDate,
  campaignsPerWeek,
  leadGenGoals,
  additionalGoals,
  defaultTargetRole,
  defaultLocation,
  additionalContext
) {

  // Prepare business context
  const businessName = business.store_info?.name || business.name || 'Unknown Business';
  const businessCase = business.initial_business_case?.what_you_do || 
                      business.store_info?.description || 
                      'Business description not available';
  
  const targetAudience = business.initial_business_case?.target_audience || 'General audience';
  const uniqueValue = business.initial_business_case?.unique_value || 'Competitive advantage';
  const goals = business.initial_business_case?.goals || 'Business growth';

  // Calculate total campaigns needed
  const totalWeeks = duration * 4;
  const totalCampaigns = totalWeeks * campaignsPerWeek;

  // Prepare enabled lead gen goals
  const enabledGoals = Object.keys(leadGenGoals).filter(goal => leadGenGoals[goal]);
  const goalsStr = enabledGoals.length > 0 ? enabledGoals.join(', ') : 'customers, partners';
  
  // Combine main goals with additional goals
  let allGoals = goalsStr;
  if (additionalGoals && additionalGoals.trim()) {
    allGoals += ', ' + additionalGoals.trim();
  }

  const prompt = `You are an expert lead generation strategist. Create a strategic lead generation calendar for this business:

BUSINESS INFORMATION:
- Name: ${businessName}
- What they do: ${businessCase}
- Target Audience: ${targetAudience}
- Unique Value: ${uniqueValue}
- Goals: ${goals}

CALENDAR REQUIREMENTS:
- Duration: ${duration} month(s)
- Campaigns per week: ${campaignsPerWeek}
- Total campaigns needed: ${totalCampaigns}
- Start date: ${startDate}
- Lead generation goals: ${allGoals}
- Default target role: ${defaultTargetRole || 'Various roles'}
- Default location: ${defaultLocation || 'Various locations'}
- Additional context: ${additionalContext || 'None'}

INSTRUCTIONS:
1. Create exactly ${totalCampaigns} lead generation campaigns
2. Distribute campaigns evenly across the ${duration} month period
3. Focus on these lead generation goals: ${allGoals}
4. Each campaign should have fields compatible with the lead generation form
5. Vary target roles and locations to maximize reach
6. Consider seasonal trends and business cycles
7. Make each campaign specific and actionable

For each campaign, provide:
- campaignName: Catchy campaign name
- description: What this campaign will achieve
- date: Campaign launch date (YYYY-MM-DD format)
- type: One of [${enabledGoals.join(', ')}] (or additional goals from: ${additionalGoals || 'none'})
- targetRole: Specific job title (e.g., "CEO", "Marketing Director")
- targetLocation: City, State/Province, Country format
- variants: Number of search variants (1-3)
- context: Additional targeting context
- id: Unique campaign ID

IMPORTANT: 
- Start from ${startDate} and space campaigns evenly
- Use diverse target roles relevant to the business
- Vary locations strategically
- Make contexts specific to lead qualification
- Return ONLY valid JSON array

Example format:
[
  {
    "id": "camp_001",
    "campaignName": "Enterprise SaaS Decision Makers",
    "description": "Target enterprise software decision makers for B2B SaaS solutions",
    "date": "2024-01-15",
    "type": "customers",
    "targetRole": "Chief Technology Officer",
    "targetLocation": "Austin, TX, USA",
    "variants": 2,
    "context": "Companies with 500+ employees using legacy systems"
  }
]`;

  try {
    console.log('🤖 Calling Azure OpenAI for lead calendar generation...');
    
    // Get OpenAI configuration
    const openAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT || "https://zuke-n8n-videos.cognitiveservices.azure.com/";
    const openAIKey = process.env.AZURE_OPENAI_API_KEY;
    const openAIDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";

    if (!openAIKey) {
      throw new Error('Azure OpenAI API key not configured');
    }

    // Call Azure OpenAI directly
    const url = `${openAIEndpoint}openai/deployments/${openAIDeployment}/chat/completions?api-version=2025-01-01-preview`;

    const azureResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': openAIKey
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7
      })
    });

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text();
      console.error('Azure OpenAI error:', errorText);
      throw new Error(`Azure OpenAI API error: ${azureResponse.status} ${azureResponse.statusText}`);
    }

    const azureData = await azureResponse.json();
    const response = azureData.choices[0].message.content;
    
    let calendar;
    try {
      // Try to parse as JSON directly
      calendar = JSON.parse(response);
    } catch (parseError) {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        calendar = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    // Validate and ensure we have the right number of campaigns
    if (!Array.isArray(calendar)) {
      throw new Error('AI response is not an array');
    }

    // Ensure each campaign has required fields and add business context
    calendar = calendar.map((campaign, index) => ({
      id: campaign.id || `camp_${String(index + 1).padStart(3, '0')}`,
      campaignName: campaign.campaignName || `Campaign ${index + 1}`,
      description: campaign.description || 'Lead generation campaign',
      date: campaign.date || addDaysToDate(startDate, index * 7), // Weekly spacing as fallback
      type: campaign.type || 'cold-outreach',
      targetRole: campaign.targetRole || defaultTargetRole || 'CEO',
      targetLocation: campaign.targetLocation || defaultLocation || 'USA',
      variants: Math.min(Math.max(parseInt(campaign.variants) || 1, 1), 3), // Ensure 1-3 range
      context: campaign.context || `Lead generation for ${businessName}`,
      businessDescription: businessCase,
      businessId: business._id?.toString()
    }));

    console.log(`✅ Generated ${calendar.length} lead generation campaigns`);
    return calendar;

  } catch (error) {
    console.error('❌ Error calling AI for lead calendar:', error);
    
    // Fallback: Generate basic calendar structure
    console.log('📋 Generating fallback lead calendar...');
    return generateFallbackLeadCalendar(
      business,
      totalCampaigns,
      startDate,
      enabledGoals[0] || 'customers',
      defaultTargetRole,
      defaultLocation,
      businessCase
    );
  }
}

/**
 * Generate fallback lead calendar if AI fails
 */
function generateFallbackLeadCalendar(
  business,
  totalCampaigns,
  startDate,
  primaryType,
  defaultTargetRole,
  defaultLocation,
  businessCase
) {
  const calendar = [];
  const baseRoles = ['CEO', 'Marketing Director', 'Sales Manager', 'Operations Manager', 'Business Owner'];
  const baseLocations = [
    'Cape Town, South Africa',
    'Johannesburg, South Africa', 
    'Houston, TX, USA',
    'New York, NY, USA',
    'London, UK'
  ];

  for (let i = 0; i < totalCampaigns; i++) {
    const campaignDate = addDaysToDate(startDate, i * 7); // Weekly campaigns
    const targetRole = defaultTargetRole || baseRoles[i % baseRoles.length];
    const targetLocation = defaultLocation || baseLocations[i % baseLocations.length];

    calendar.push({
      id: `camp_${String(i + 1).padStart(3, '0')}`,
      campaignName: `${targetRole} Outreach Campaign ${i + 1}`,
      description: `Target ${targetRole} professionals for business development opportunities`,
      date: campaignDate,
      type: primaryType,
      targetRole,
      targetLocation,
      variants: 2,
      context: `Lead generation for business growth`,
      businessDescription: businessCase,
      businessId: business._id?.toString()
    });
  }

  return calendar;
}

/**
 * Add days to a date string
 */
function addDaysToDate(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

/**
 * Deduct credits from wallet
 */
async function deductFromWallet(userEmail, amount, description) {
  try {
    const walletResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:3000'}/api/wallet/deduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        amount: amount,
        description: description
      })
    });

    if (!walletResponse.ok) {
      const walletError = await walletResponse.json();
      if (walletResponse.status === 402) {
        return {
          success: false,
          message: `Insufficient funds. Required: R${amount}, Available: R${walletError.balance}`,
          balance: walletError.balance
        };
      }
      throw new Error(walletError.error || 'Wallet deduction failed');
    }

    const walletResult = await walletResponse.json();
    return {
      success: true,
      newBalance: walletResult.new_balance,
      transactionId: walletResult.transaction_id
    };

  } catch (error) {
    console.error('❌ Wallet deduction error:', error);
    return {
      success: false,
      message: 'Failed to process payment: ' + error.message
    };
  }
}

module.exports = router;