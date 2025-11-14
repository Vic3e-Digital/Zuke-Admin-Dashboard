/**
 * AI Image & Video Generation Module
 * Handles image variants, video generation, and AI suggestions
 */

// In ai-generator.js
function shortenPrompt(promptText) {
  if (!promptText) return 'Product photo';
  
  // Remove line breaks
  let clean = promptText.replace(/\s+/g, ' ').trim();
  
  // Truncate to first ~1000 characters
  if (clean.length > 1000) {
    clean = clean.slice(0, 1000);
    console.warn('⚠️ Long prompt truncated for Azure Image API');
  }
  return clean;
}

class AIGenerator {
    constructor(openAIConfig) {
      this.config = openAIConfig;
    }
  
    /**
     * Generate AI-powered suggestions for products/services
     */
    async generateSuggestions(businessInfo, itemType = 'product') {
      const prompt = `Based on this business information:
  
  ${JSON.stringify(businessInfo, null, 2)}
  
  Generate exactly 3 creative ${itemType} ideas optimized for AI image generation.
  
  Each should include:
  - A catchy title
  - Detailed visual description for AI image generation
  - Ready-to-use social media caption with emojis and hashtags
  
  Return ONLY valid JSON in this exact format:
  {
    "suggestions": [
      {
        "title": "${itemType === 'product' ? 'Product' : 'Service'} Name",
        "description": "Detailed description for the ${itemType}",
        "imagePrompt": "Detailed AI image generation prompt with style, composition, lighting, colors (2-3 sentences)",
        "caption": "Engaging social media caption with emojis and hashtags"
      }
    ]
  }`;
  
      const url = `${this.config.endpoint}openai/deployments/${this.config.deployment}/chat/completions?api-version=2025-01-01-preview`;
  
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are a creative business strategist. Generate specific, detailed suggestions for business offerings. Return valid JSON only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.8,
          response_format: { type: "json_object" }
        })
      });
  
      if (!response.ok) {
        throw new Error(`AI suggestions failed: ${response.status}`);
      }
  
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Invalid JSON response from AI');
      }
    }
  
    /**
     * Generate image variants (Front, Side, Lifestyle)
     */
    async generateImageVariants(baseImage, productName, variantTypes = ['front', 'side', 'lifestyle']) {
      const variants = [];
      
      const variantPrompts = {
        front: `Professional product photography of ${productName}, front-facing view, clean white background, studio lighting, high detail, commercial style, centered composition`,
        side: `Professional product photography of ${productName}, 45-degree angle side view, clean white background, studio lighting, showing depth and dimension, commercial style`,
        lifestyle: `Lifestyle product photography of ${productName} in use, natural environment, authentic setting, person interacting with product, warm natural lighting, relatable scene, professional composition`
      };
  
      for (const variantType of variantTypes) {
        try {
          const prompt = variantPrompts[variantType];
          const imageData = await this.generateImageWithEdit(baseImage, prompt);
          
          variants.push({
            type: variantType,
            imageData: imageData,
            prompt: prompt
          });
        } catch (error) {
          console.error(`Failed to generate ${variantType} variant:`, error);
          // Continue with other variants even if one fails
        }
      }
  
      return variants;
    }
  
    /**
     * Generate single image with AI (FLUX or DALL-E)
     */
    async generateImage(prompt, model = 'flux') {
      const safePrompt = shortenPrompt(prompt);
    
      const deployment = model === 'flux' ? 'FLUX.1-Kontext-pro' : 'gpt-image-1';
      const url = `${this.config.endpoint}openai/deployments/${deployment}/images/generations?api-version=2025-04-01-preview`;
    
      console.log(`🖼️ Generating image with ${deployment}`);
      console.log('Prompt length:', safePrompt.length);
      console.log('Prompt preview:', safePrompt.slice(0, 300));
    
      const body = {
        prompt: safePrompt,
        n: 1,
        size: "1024x1024",
        output_format: "png"
      };
    
      // ✅ Only add quality if using a model that supports it
      // For now, omit it entirely to avoid 400 errors
      // if (model === 'dalle') {
      //   body.quality = "hd";
      // }
    
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('❌ Image generation failed:', response.status, errText);
        throw new Error(`Image generation failed: ${response.status}`);
      }
    
      const data = await response.json();
    
      if (data.data && data.data[0] && data.data[0].b64_json) {
        return data.data[0].b64_json;
      } else if (data.data && data.data[0] && data.data[0].url) {
        return data.data[0].url;
      }
    
      throw new Error('No image data in response');
    }
  
    /**
     * Improve existing image with AI
     */
    async generateImageWithEdit(baseImageFile, improvementPrompt) {
      // ✅ shorten here, too
      const safePrompt = shortenPrompt(improvementPrompt);
    
      const deployment = 'FLUX.1-Kontext-pro';
      const url = `${this.config.endpoint}openai/deployments/${deployment}/images/edits?api-version=2025-04-01-preview`;
    
      console.log(`🛠️ Editing image with ${deployment}`);
      console.log('Prompt length:', safePrompt.length);
    
      const formData = new FormData();
      formData.append("prompt", safePrompt);
      formData.append("n", "1");
      formData.append("size", "1024x1024");
      formData.append("image", baseImageFile);
    
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': this.config.apiKey
        },
        body: formData
      });
    
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('❌ Image edit failed:', response.status, errText);
        throw new Error(`Image edit failed: ${response.status}`);
      }
    
      const data = await response.json();
    
      if (data.data && data.data[0] && data.data[0].b64_json) {
        return data.data[0].b64_json;
      } else if (data.data && data.data[0] && data.data[0].url) {
        return data.data[0].url;
      }
    
      throw new Error('No image data in response');
    }
  
    /**
     * Convert base64 to File object
     */
    base64ToFile(base64Data, filename = 'image.png') {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      return new File([blob], filename, { type: 'image/png' });
    }

    
  }
  
  window.AIGenerator = AIGenerator;