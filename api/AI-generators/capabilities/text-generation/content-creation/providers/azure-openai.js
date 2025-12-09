/**
 * Azure OpenAI Content Creation Provider
 * Handles content generation using Azure OpenAI GPT models optimized for marketing and creative content
 */

const ContentCreationInterface = require('../content-creation.interface');
const ProviderCredentials = require('../../../../config/provider-credentials');
const axios = require('axios');

class AzureOpenAIContentCreation extends ContentCreationInterface {
  constructor() {
    super();
    this.provider = 'azure';
    this.config = ProviderCredentials.getProviderConfig(this.provider);
  }

  /**
   * Generate content using Azure OpenAI
   */
  async generateText(request, modelConfig, metadata) {
    try {
      console.log(`📝 Azure OpenAI: Generating ${request.contentType} content with model ${modelConfig.modelId}`);

      // Transform request to Azure OpenAI format
      const azureRequest = this.transformRequest(request, modelConfig);
      
      // Get endpoint and headers
      const endpoint = ProviderCredentials.getEndpointUrl(this.provider, modelConfig.modelId);
      const headers = await ProviderCredentials.getAuthHeaders(this.provider);
      
      // Make API call
      console.log(`🌐 Calling Azure OpenAI: ${endpoint}`);
      
      const response = await axios.post(endpoint, azureRequest, {
        headers,
        timeout: this.config.timeout
      });

      console.log(`✅ Azure OpenAI content generation completed`);
      
      const result = this.normalizeResponse(response.data, { 
        ...metadata, 
        modelId: modelConfig.modelId,
        contentType: request.contentType 
      });

      // Add content-specific metadata
      return {
        ...result,
        contentMetadata: {
          contentType: request.contentType,
          tone: request.tone || 'professional',
          length: request.length || 'medium',
          audience: request.audience || 'general',
          wordCount: this.estimateWordCount(result.text)
        }
      };

    } catch (error) {
      console.error('❌ Azure OpenAI content generation failed:', error.message);
      
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      
      throw this.normalizeError(error);
    }
  }

  /**
   * Transform request to Azure OpenAI format for content creation
   */
  transformRequest(request, modelConfig) {
    const baseRequest = super.transformRequest(request, modelConfig);
    
    // Content creation specific optimizations
    return {
      messages: baseRequest.messages,
      max_tokens: baseRequest.max_tokens,
      temperature: baseRequest.temperature,
      top_p: 0.9, // Higher for more creative content
      frequency_penalty: 0.3, // Reduce repetition
      presence_penalty: 0.1, // Encourage diverse topics
      stop: request.parameters?.stop || null
    };
  }

  /**
   * Normalize response with content-specific enhancements
   */
  normalizeResponse(response, metadata) {
    const baseResult = super.normalizeResponse(response, metadata);
    
    // Extract and analyze the generated content
    const content = baseResult.text;
    
    return {
      ...baseResult,
      content: {
        text: content,
        analysis: this.analyzeContent(content, metadata.contentType)
      }
    };
  }

  /**
   * Analyze generated content for quality metrics
   */
  analyzeContent(text, contentType) {
    const wordCount = this.estimateWordCount(text);
    const sentenceCount = this.estimateSentenceCount(text);
    const paragraphCount = this.estimateParagraphCount(text);
    
    return {
      wordCount,
      sentenceCount,
      paragraphCount,
      averageWordsPerSentence: Math.round(wordCount / sentenceCount) || 0,
      readabilityScore: this.calculateReadabilityScore(text),
      contentQuality: this.assessContentQuality(text, contentType)
    };
  }

  /**
   * Estimate word count
   */
  estimateWordCount(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Estimate sentence count
   */
  estimateSentenceCount(text) {
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
  }

  /**
   * Estimate paragraph count
   */
  estimateParagraphCount(text) {
    return text.split(/\n\s*\n/).filter(paragraph => paragraph.trim().length > 0).length;
  }

  /**
   * Calculate basic readability score
   */
  calculateReadabilityScore(text) {
    const wordCount = this.estimateWordCount(text);
    const sentenceCount = this.estimateSentenceCount(text);
    
    if (sentenceCount === 0) return 0;
    
    const avgWordsPerSentence = wordCount / sentenceCount;
    
    // Simple readability score (lower is easier to read)
    if (avgWordsPerSentence <= 15) return 'Easy';
    if (avgWordsPerSentence <= 20) return 'Medium';
    return 'Complex';
  }

  /**
   * Assess content quality based on content type
   */
  assessContentQuality(text, contentType) {
    const checks = {
      hasCallToAction: /\b(click|buy|subscribe|learn more|get started|contact|visit|download|sign up)\b/i.test(text),
      hasEmotionalWords: /\b(amazing|incredible|fantastic|exclusive|limited|free|new|best|perfect)\b/i.test(text),
      hasNumbers: /\d/.test(text),
      hasQuestions: /\?/.test(text),
      hasExclamation: /!/.test(text)
    };
    
    const qualityScore = Object.values(checks).filter(Boolean).length;
    
    return {
      score: qualityScore,
      maxScore: Object.keys(checks).length,
      checks,
      recommendation: this.getContentRecommendation(qualityScore, contentType)
    };
  }

  /**
   * Get content improvement recommendations
   */
  getContentRecommendation(score, contentType) {
    if (score >= 4) return 'Excellent content quality';
    if (score >= 3) return 'Good content, consider adding more engaging elements';
    if (score >= 2) return 'Fair content, needs more compelling elements';
    return 'Content needs significant improvement for better engagement';
  }

  /**
   * Get content creation model capabilities
   */
  getModelCapabilities(modelId) {
    const baseCapabilities = super.getModelCapabilities(modelId);
    
    return {
      ...baseCapabilities,
      contentTypes: ['blog', 'marketing', 'social', 'email', 'product_description'],
      tones: ['professional', 'casual', 'friendly', 'persuasive', 'authoritative'],
      languages: ['en', 'es', 'fr', 'de', 'pt', 'it'],
      maxContentLength: 2000,
      qualityAnalysis: true,
      brandVoiceAdaptation: true
    };
  }
}

module.exports = AzureOpenAIContentCreation;