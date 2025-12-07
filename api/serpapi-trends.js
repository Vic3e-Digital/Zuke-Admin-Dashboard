const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// In-memory cache for trend data (24 hour TTL)
const trendsCache = new Map();
const TRENDS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get trending search topics for a business based on its industry/description
 * Uses SerpAPI Google Trends to find relevant trending topics
 */
router.post('/get-trends', async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: 'Missing businessId parameter' });
    }

    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // Check cache first
    const cacheKey = `trends_${businessId}`;
    const cached = trendsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TRENDS_CACHE_TTL) {
      console.log(`📦 Returning cached trends for ${businessId}`);
      return res.json({ trends: cached.trends, cached: true });
    }

    console.log(`🔄 Fetching fresh trends for ${businessId}`);

    // Get business data from MongoDB
    const storeSubmission = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!storeSubmission) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get business case for more context
    const businessCase = await db.collection('business_cases').findOne({
      store_id: businessId
    });

    // Extract keywords for trend search
    const keywords = extractBusinessKeywords(storeSubmission, businessCase);
    console.log(`🔑 Store submission keys: ${Object.keys(storeSubmission).slice(0, 10).join(', ')}`);
    console.log(`🔑 Store info keys: ${storeSubmission.store_info ? Object.keys(storeSubmission.store_info).slice(0, 10).join(', ') : 'N/A'}`);
    console.log(`🔑 Business case exists: ${!!businessCase}`);
    console.log(`🔑 Extracted keywords:`, keywords);

    // Fetch trends from SerpAPI
    const trends = await fetchTrendsFromSerpAPI(keywords);

    // Cache the results
    trendsCache.set(cacheKey, {
      trends,
      timestamp: Date.now()
    });

    res.json({ trends, cached: false });

  } catch (error) {
    console.error('❌ Trends API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch trends',
      details: error.message 
    });
  }
});

/**
 * Clear trends cache for a specific business or all businesses
 */
router.post('/clear-trends-cache', async (req, res) => {
  try {
    const { businessId } = req.body;

    if (businessId) {
      trendsCache.delete(`trends_${businessId}`);
      res.json({ message: 'Trends cache cleared for business', businessId });
    } else {
      trendsCache.clear();
      res.json({ message: 'All trends cache cleared' });
    }
  } catch (error) {
    console.error('Clear trends cache error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * Test endpoint to verify SerpAPI key and make direct request
 */
router.post('/test-serpapi', async (req, res) => {
  try {
    const SERPAPI_KEY = process.env.SERPAPI_KEY;
    const { keyword = 'AI trends' } = req.body;

    console.log('\n🧪 SERPAPI TEST ENDPOINT');
    console.log('======================');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('🔑 SERPAPI_KEY exists:', !!SERPAPI_KEY);
    console.log('🔑 Key length:', SERPAPI_KEY?.length || 0);
    console.log('🔑 Key first 10 chars:', SERPAPI_KEY?.substring(0, 10) + '...' || 'NONE');
    console.log('🔍 Testing keyword:', keyword);

    const https = require('https');
    const params = new URLSearchParams({
      engine: 'google_trends',
      q: keyword,
      data_type: 'RELATED_QUERIES',
      api_key: SERPAPI_KEY,
      geo: 'ZA'
    });

    const url = `https://serpapi.com/search?${params.toString()}`;
    console.log('📡 Full URL (hidden key):');
    console.log(`   https://serpapi.com/search?engine=google_trends&q=${keyword}&data_type=RELATED_QUERIES&geo=ZA&api_key=***`);
    console.log('📡 Sending request...');

    const result = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout after 10 seconds'));
      }, 10000);

      https.get(url, (response) => {
        console.log(`📨 Response received - Status: ${response.statusCode}`);
        let data = '';

        response.on('data', chunk => {
          console.log(`📥 Received ${chunk.length} bytes`);
          data += chunk;
        });

        response.on('end', () => {
          clearTimeout(timeoutId);
          try {
            const json = JSON.parse(data);
            console.log('✅ Response parsed successfully');
            console.log('📊 Response keys:', Object.keys(json).slice(0, 10).join(', '));
            resolve(json);
          } catch (err) {
            reject(new Error(`Parse error: ${err.message}`));
          }
        });
      }).on('error', (err) => {
        clearTimeout(timeoutId);
        console.error('❌ Network error:', err.message);
        reject(err);
      });
    });

    console.log('✅ TEST COMPLETE - SerpAPI is working!\n');

    res.json({
      success: true,
      message: 'SerpAPI test successful',
      keyExists: !!SERPAPI_KEY,
      keyLength: SERPAPI_KEY?.length || 0,
      responseStatus: 'Success',
      dataKeys: Object.keys(result).slice(0, 10),
      hasRelatedQueries: !!result.related_queries,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.log('📋 Full error:', error);
    console.log('');

    res.status(500).json({
      success: false,
      error: error.message,
      SERPAPI_KEY_EXISTS: !!process.env.SERPAPI_KEY,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Extract relevant keywords from business data for trend analysis
 */
function extractBusinessKeywords(storeSubmission, businessCase) {
  const keywords = [];

  // From store submission - try multiple field names
  if (storeSubmission) {
    // Try store_info fields
    if (storeSubmission.store_info) {
      const { industry, category, subcategory, name, description } = storeSubmission.store_info;
      if (industry) keywords.push(industry);
      if (category) keywords.push(category);
      if (subcategory) keywords.push(subcategory);
      if (name && !keywords.includes(name)) keywords.push(name);
    }

    // Try direct fields on store submission
    if (storeSubmission.name && !keywords.includes(storeSubmission.name)) keywords.push(storeSubmission.name);
    if (storeSubmission.description) {
      const words = storeSubmission.description.split(' ').slice(0, 5);
      keywords.push(...words);
    }

    // Try business_type
    if (storeSubmission.business_type) keywords.push(storeSubmission.business_type);
  }

  // From business case
  if (businessCase) {
    // Target market
    if (businessCase.target_market?.primary_segment) {
      keywords.push(businessCase.target_market.primary_segment);
    }

    // Key products/services (first 3)
    if (businessCase.products_services?.key_offerings) {
      const offerings = businessCase.products_services.key_offerings.slice(0, 3);
      keywords.push(...offerings.map(o => o.name || o));
    }

    // Business case overview
    if (businessCase.business_overview?.business_name && !keywords.includes(businessCase.business_overview.business_name)) {
      keywords.push(businessCase.business_overview.business_name);
    }
  }

  // Remove duplicates, empty strings, and clean
  return [...new Set(keywords)]
    .filter(k => k && typeof k === 'string' && k.length > 1)
    .slice(0, 5); // Max 5 keywords
}

/**
 * Fetch trending topics from SerpAPI Google Trends with timeout
 */
async function fetchTrendsFromSerpAPI(keywords) {
  const SERPAPI_KEY = process.env.SERPAPI_KEY;

  console.log('🔍 SerpAPI - Key exists:', !!SERPAPI_KEY);

  if (!SERPAPI_KEY) {
    console.log('⚠️  Using mock trends (no SERPAPI_KEY configured)');
    return getMockTrends(keywords);
  }

  try {
    const https = require('https');
    const allTrends = [];
    const trendQueries = keywords.slice(0, 2);

    for (const keyword of trendQueries) {
      try {
        const params = new URLSearchParams({
          engine: 'google_trends',
          q: keyword,
          data_type: 'RELATED_QUERIES',
          api_key: SERPAPI_KEY,
          geo: 'ZA'
        });

        const url = `https://serpapi.com/search?${params.toString()}`;
        console.log(`📡 Requesting SerpAPI for: "${keyword}"`);

        const trends = await requestSerpAPI(url, keyword);

        if (trends.error) {
          console.warn(`⚠️  SerpAPI error for "${keyword}":`, trends.error);
          continue;
        }

        console.log(`✅ SerpAPI response received for "${keyword}"`);

        // Extract related queries
        const relatedQueries = trends.related_queries || {};
        
        if (Array.isArray(relatedQueries.top)) {
          relatedQueries.top.slice(0, 2).forEach(item => {
            if (item?.query) {
              allTrends.push({
                query: item.query,
                value: item.value || 0,
                type: 'top'
              });
            }
          });
        }

        if (Array.isArray(relatedQueries.rising)) {
          relatedQueries.rising.slice(0, 1).forEach(item => {
            if (item?.query) {
              allTrends.push({
                query: item.query,
                value: item.value || 0,
                type: 'rising'
              });
            }
          });
        }

        if (allTrends.length > 0) {
          console.log(`✅ Extracted ${allTrends.length} trends so far`);
        }

      } catch (error) {
        console.warn(`⚠️  Error fetching for "${keyword}":`, error.message);
      }
    }

    if (allTrends.length > 0) {
      console.log(`🎯 Formatting ${allTrends.length} trends for chatbot`);
      return formatTrendsForChatbot(allTrends, keywords);
    }

    console.log('ℹ️  No real trends from SerpAPI, using fallback mocks');
    return getMockTrends(keywords);

  } catch (error) {
    console.error('❌ SerpAPI main error:', error.message);
    return getMockTrends(keywords);
  }
}

/**
 * Helper to make HTTPS request to SerpAPI with timeout
 */
function requestSerpAPI(url, keyword) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    let resolved = false;

    const timeoutId = setTimeout(() => {
      resolved = true;
      reject(new Error(`Timeout for "${keyword}" (8s)`));
    }, 8000);

    https.get(url, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (err) {
            reject(new Error(`Parse error: ${err.message}`));
          }
        }
      });

    }).on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  });
}

/**
 * Format trends into chatbot quick questions
 */
function formatTrendsForChatbot(trends, keywords) {
  const topTrends = trends
    .filter(t => t.query && t.query.length < 60)
    .slice(0, 2);

  return topTrends.map(trend => ({
    question: `What's the impact of "${trend.query}" on my business?`,
    emoji: trend.type === 'rising' ? '🔥' : '📊',
    type: 'trend',
    trendData: trend
  }));
}

/**
 * Mock trends for testing/fallback
 */
function getMockTrends(keywords) {
  const industry = keywords[0] || 'business';
  
  return [
    {
      question: `What are current ${industry} trends in South Africa?`,
      emoji: '📊',
      type: 'trend',
      trendData: { query: `${industry} trends`, type: 'mock' }
    },
    {
      question: `How can I leverage AI in my ${industry}?`,
      emoji: '🔥',
      type: 'trend',
      trendData: { query: `AI in ${industry}`, type: 'mock' }
    }
  ];
}

module.exports = router;
