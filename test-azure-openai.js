/**
 * Azure OpenAI Text Generation Test
 * Tests conversation and content creation capabilities
 */

const fetch = require('node-fetch');

async function testAzureOpenAI() {
  console.log('🤖 Testing Azure OpenAI Text Generation...\n');

  const baseUrl = 'http://localhost:3000/api/ai-generators';

  // Test cases for different use cases
  const tests = [
    {
      name: "Conversation Test",
      description: "Test basic conversation with GPT-4.1",
      request: {
        capability: "text-generation",
        useCase: "conversation",
        prompt: "Explain the benefits of AI automation for small businesses in a friendly, conversational tone.",
        parameters: {
          maxTokens: 300,
          temperature: 0.7,
          model: "gpt-4.1"
        },
        preferences: {
          provider: "azure",
          quality: "high"
        }
      }
    },
    {
      name: "Marketing Content Test",
      description: "Test marketing content creation",
      request: {
        capability: "text-generation",
        useCase: "content-creation",
        prompt: "Create compelling copy for our new AI-powered business automation platform that helps entrepreneurs save time and increase productivity.",
        parameters: {
          contentType: "marketing",
          tone: "persuasive",
          length: "medium",
          audience: "small business owners",
          requirements: "Include benefits, features, and a clear call-to-action",
          maxTokens: 400,
          model: "gpt-4.1"
        },
        preferences: {
          provider: "azure"
        }
      }
    },
    {
      name: "Blog Content Test", 
      description: "Test blog post creation",
      request: {
        capability: "text-generation",
        useCase: "content-creation",
        prompt: "Write an introduction for a blog post about the future of AI in customer service.",
        parameters: {
          contentType: "blog",
          tone: "professional",
          length: "short",
          audience: "business professionals",
          maxTokens: 200,
          model: "gpt-4.1"
        },
        preferences: {
          provider: "azure"
        }
      }
    },
    {
      name: "Social Media Test",
      description: "Test social media content",
      request: {
        capability: "text-generation", 
        useCase: "content-creation",
        prompt: "Create an engaging LinkedIn post about the launch of our AI automation platform.",
        parameters: {
          contentType: "social",
          tone: "enthusiastic",
          length: "short",
          audience: "entrepreneurs and business owners",
          maxTokens: 150,
          model: "gpt-4o-mini"  // Use faster model for social media
        },
        preferences: {
          provider: "azure"
        }
      }
    }
  ];

  // Run tests
  for (const test of tests) {
    console.log(`🧪 ${test.name}`);
    console.log(`   ${test.description}\n`);

    try {
      // 1. Validate request first
      console.log('1️⃣ Validating request...');
      const validateResponse = await fetch(`${baseUrl}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.request)
      });

      const validation = await validateResponse.json();
      
      if (!validation.success) {
        console.log('❌ Validation failed:', validation.error);
        console.log('');
        continue;
      }
      
      console.log('✅ Validation passed');

      // 2. Generate text
      console.log('2️⃣ Generating text...');
      const generateResponse = await fetch(`${baseUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.request)
      });

      const result = await generateResponse.json();

      if (generateResponse.ok && result.success) {
        console.log('✅ Generation successful!');
        console.log(`📝 Generated text:\n"${result.data.text}"\n`);
        
        // Show usage info if available
        if (result.data.usage) {
          console.log('📊 Usage Statistics:');
          console.log(`   Prompt tokens: ${result.data.usage.promptTokens}`);
          console.log(`   Completion tokens: ${result.data.usage.completionTokens}`);
          console.log(`   Total tokens: ${result.data.usage.totalTokens}`);
        }
        
        // Show content analysis if available
        if (result.data.contentMetadata) {
          console.log('📈 Content Analysis:');
          console.log(`   Content type: ${result.data.contentMetadata.contentType}`);
          console.log(`   Tone: ${result.data.contentMetadata.tone}`);
          console.log(`   Word count: ${result.data.contentMetadata.wordCount}`);
        }

      } else {
        console.log('❌ Generation failed:', result.message || result.error);
        
        if (result.code === 'RATE_LIMIT_EXCEEDED') {
          console.log('💡 Azure OpenAI rate limit exceeded - try again later');
        }
      }

    } catch (error) {
      console.log('❌ Test error:', error.message);
    }

    console.log(''.padEnd(80, '-'));
    console.log('');
  }

  // Show usage examples
  console.log(`
💡 USAGE EXAMPLES:

1. Simple Conversation:
curl -X POST ${baseUrl}/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "capability": "text-generation",
    "useCase": "conversation", 
    "prompt": "What are the benefits of AI?",
    "parameters": {"model": "gpt-4.1"},
    "preferences": {"provider": "azure"}
  }'

2. Marketing Content:
curl -X POST ${baseUrl}/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "capability": "text-generation",
    "useCase": "content-creation",
    "prompt": "Create product description for AI tool",
    "contentType": "marketing",
    "tone": "persuasive", 
    "length": "medium",
    "parameters": {"model": "gpt-4.1"},
    "preferences": {"provider": "azure"}
  }'

🎯 Available Models:
  • gpt-4.1        (Premium, latest model)
  • gpt-4o-mini    (Fast, cost-effective)

📋 Content Types:
  • blog, marketing, social, email, product_description

🎨 Tones:
  • professional, casual, friendly, persuasive, authoritative
`);
}

// Run the tests
testAzureOpenAI();