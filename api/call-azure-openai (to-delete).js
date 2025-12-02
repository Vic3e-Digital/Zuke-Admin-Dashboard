// api/call-azure-openai.js
const express = require('express');
const router = express.Router();
const OpenAI = require('openai').default;

// Initialize OpenAI client for Azure
async function getAzureOpenAIClient() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || 'https://zuke-n8n-videos.cognitiveservices.azure.com/';
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('AZURE_OPENAI_API_KEY is not configured');
  }

  return new OpenAI({
    apiKey: apiKey,
    baseURL: `${endpoint}/openai/deployments/${deployment}`,
    defaultQuery: { 'api-version': '2024-12-01-preview' },
    defaultHeaders: {
      'api-key': apiKey
    }
  });
}

router.post('/', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, temperature = 0.7, maxTokens = 1000 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('📝 Calling Azure OpenAI...');
    const client = await getAzureOpenAIClient();

    const response = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a creative AI assistant helping to generate video ideas and suggestions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-4o-mini',
      temperature: temperature,
      max_tokens: maxTokens
    });

    const content = response.choices[0].message.content;

    console.log('✅ Azure OpenAI response received');

    return res.status(200).json({
      content: content,
      usage: {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      }
    });

  } catch (error) {
    console.error('❌ Azure OpenAI Error:', error.message);
    
    let errorMessage = 'Failed to call Azure OpenAI';
    if (error.message.includes('API key')) {
      errorMessage = 'Azure OpenAI API key not configured';
    } else if (error.message.includes('404')) {
      errorMessage = 'Azure OpenAI endpoint not found or incorrect deployment name';
    } else if (error.message.includes('401')) {
      errorMessage = 'Invalid Azure OpenAI API key';
    } else if (error.message.includes('429')) {
      errorMessage = 'Rate limit exceeded. Please try again later';
    }

    return res.status(500).json({
      error: errorMessage,
      details: error.message
    });
  }
});

module.exports = router;
