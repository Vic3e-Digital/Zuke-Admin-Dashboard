/**
 * Content Creation Interface  
 * Specific interface for marketing and creative content generation
 */

const TextGenerationInterface = require('../text-generation.interface');

class ContentCreationInterface extends TextGenerationInterface {
  constructor() {
    super();
    this.useCase = "content-creation";
  }

  /**
   * Validate content creation specific request
   */
  validateRequest(request, modelConfig) {
    const baseValidation = super.validateRequest(request, modelConfig);
    
    const errors = [...baseValidation.errors];
    const warnings = [...baseValidation.warnings];

    // Validate content type (can be in request root or parameters)
    const contentType = request.contentType || request.parameters?.contentType;
    if (!contentType) {
      errors.push('contentType is required for content creation (in parameters object)');
    }

    const validContentTypes = [
      'blog', 'marketing', 'social', 'email', 'product_description', 
      'landing_page', 'advertisement', 'press_release', 'newsletter'
    ];
    
    if (contentType && !validContentTypes.includes(contentType)) {
      errors.push(`contentType must be one of: ${validContentTypes.join(', ')}`);
    }

    // Validate tone if provided
    const tone = request.tone || request.parameters?.tone;
    if (tone) {
      const validTones = [
        'professional', 'casual', 'friendly', 'persuasive', 
        'authoritative', 'enthusiastic', 'conversational', 'formal'
      ];
      
      if (!validTones.includes(tone)) {
        errors.push(`tone must be one of: ${validTones.join(', ')}`);
      }
    }

    // Validate length if provided
    const length = request.length || request.parameters?.length;
    if (length) {
      const validLengths = ['short', 'medium', 'long'];
      if (!validLengths.includes(length)) {
        errors.push(`length must be one of: ${validLengths.join(', ')}`);
      }
    }

    // Validate audience if provided
    const audience = request.audience || request.parameters?.audience;
    if (audience && typeof audience !== 'string') {
      errors.push('audience must be a string description');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Transform request to content creation format
   */
  transformRequest(request, modelConfig) {
    const baseRequest = super.transformRequest(request, modelConfig);
    
    // Build enhanced prompt for content creation
    let enhancedPrompt = this.buildContentPrompt(request);
    
    // Convert to messages format with system prompt
    const messages = [
      {
        role: "system",
        content: this.buildSystemPrompt(request)
      },
      {
        role: "user",
        content: enhancedPrompt
      }
    ];

    return {
      ...baseRequest,
      messages,
      temperature: this.getOptimalTemperature(request.contentType),
      max_tokens: this.getOptimalMaxTokens(request.length)
    };
  }

  /**
   * Build system prompt for content creation
   */
  buildSystemPrompt(request) {
    let systemPrompt = "You are an expert content creator and marketing professional. ";
    
    const contentType = request.contentType || request.parameters?.contentType;
    const tone = request.tone || request.parameters?.tone;
    const audience = request.audience || request.parameters?.audience;
    
    switch (contentType) {
      case 'blog':
        systemPrompt += "You specialize in creating engaging, informative blog posts that captivate readers and provide value.";
        break;
      case 'marketing':
        systemPrompt += "You specialize in creating compelling marketing copy that drives conversions and engagement.";
        break;
      case 'social':
        systemPrompt += "You specialize in creating viral social media content that engages audiences and encourages sharing.";
        break;
      case 'email':
        systemPrompt += "You specialize in creating effective email campaigns that drive opens, clicks, and conversions.";
        break;
      case 'product_description':
        systemPrompt += "You specialize in creating compelling product descriptions that highlight benefits and drive sales.";
        break;
      default:
        systemPrompt += "You create high-quality, engaging content tailored to specific audiences and purposes.";
    }
    
    if (tone) {
      systemPrompt += ` Your writing tone should be ${tone}.`;
    }
    
    if (audience) {
      systemPrompt += ` Your target audience is: ${audience}.`;
    }

    return systemPrompt;
  }

  /**
   * Build enhanced prompt with content creation context
   */
  buildContentPrompt(request) {
    let prompt = request.prompt;
    
    // Get parameters from either location
    const contentType = request.contentType || request.parameters?.contentType;
    const length = request.length || request.parameters?.length;
    const requirements = request.requirements || request.parameters?.requirements;
    
    // Add content type context
    if (contentType) {
      prompt = `Create ${contentType} content: ${prompt}`;
    }
    
    // Add length specification
    if (length) {
      const lengthGuide = {
        'short': '50-150 words',
        'medium': '150-400 words', 
        'long': '400+ words'
      };
      prompt += `\n\nLength: ${lengthGuide[length]}`;
    }
    
    // Add specific requirements
    if (requirements) {
      prompt += `\n\nRequirements: ${requirements}`;
    }
    
    return prompt;
  }

  /**
   * Get optimal temperature for content type
   */
  getOptimalTemperature(contentType) {
    const temperatures = {
      'blog': 0.7,
      'marketing': 0.8,
      'social': 0.9,
      'email': 0.6,
      'product_description': 0.5,
      'landing_page': 0.7,
      'advertisement': 0.8,
      'press_release': 0.4
    };
    
    return temperatures[contentType] || 0.7;
  }

  /**
   * Get optimal max tokens for content length
   */
  getOptimalMaxTokens(length) {
    const tokenLimits = {
      'short': 200,
      'medium': 600,
      'long': 1200
    };
    
    return tokenLimits[length] || 600;
  }
}

module.exports = ContentCreationInterface;