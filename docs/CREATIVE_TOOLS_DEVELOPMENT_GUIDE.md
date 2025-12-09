# Creative Tools Development Guide

A comprehensive guide for creating new creative tools and forms following the established patterns in the Zuke Admin Dashboard.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Code Templates](#code-templates)
5. [Integration Patterns](#integration-patterns)
6. [Best Practices](#best-practices)
7. [Testing Guidelines](#testing-guidelines)

## 📖 Overview

This guide shows how to create new creative tools following the established patterns used in successful implementations like:
- **Audio Transcriber** (`transcribe-audio.html`)
- **Product Image Improvement** (`improve-image.html`)
- **Logo Design** tools

All tools follow consistent patterns for styling, authentication, file handling, AI integration, and wallet management.

## 🏗️ Project Structure

### Required Files and Locations

```
public/pages/creative/
├── your-tool-name.html          # Main tool interface
├── creative.html                # Hub navigation (update this)
└── creative.js                  # Navigation logic (update this)

public/css/
├── formStyle.css               # Consistent styling (use existing)
└── mainSimStyle.css            # Card styling (use existing)

api/
├── wallet.js                   # Wallet integration (existing)
├── AI-generators/             # AI capabilities (existing)
└── your-api-endpoint.js        # Optional custom API
```

## 🚀 Step-by-Step Implementation

### Step 1: Plan Your Tool

**Define Requirements:**
- What type of input does it accept? (image, text, audio, video)
- What AI processing is needed?
- What outputs are generated?
- How much should it cost?
- How many variations/results?

**Example Planning:**
```javascript
// Tool: Background Remover
const toolConfig = {
  name: "AI Background Remover",
  input: "Single image file (JPG, PNG, WebP)",
  processing: "Image-to-image AI enhancement",
  output: "3 variations (transparent, white bg, artistic bg)",
  cost: 8.00, // in ZAR
  maxFileSize: "10MB",
  supportedFormats: ["image/jpeg", "image/png", "image/webp"]
};
```

### Step 2: Create the HTML Structure

**Base Template:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Tool Name | Zuke</title>
  
  <!-- Required Stylesheets -->
  <link rel="stylesheet" href="../../css/formStyle.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Required Scripts -->
  <script src="https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js"></script>
  
  <style>
    /* Tool-specific styles here */
    /* Follow patterns from improve-image.html or transcribe-audio.html */
  </style>
</head>

<body>
  <div class="container">
    <!-- Header Section -->
    <div class="header">
      <h1>Your Tool Name</h1>
      <p>Brief description of what your tool does</p>
    </div>

    <!-- Info Alert -->
    <div class="info-box" style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px 15px; border-radius: 6px; margin-bottom: 20px;">
      <strong>🚀 Powered by AI:</strong> Brief explanation of AI capabilities
    </div>

    <!-- Main Content Container -->
    <div class="main-container">
      <!-- Input Section -->
      <div class="input-section">
        <!-- Upload/input components here -->
      </div>

      <!-- Settings/Options Section -->
      <div class="settings-section">
        <!-- Configuration options here -->
      </div>
    </div>

    <!-- Progress Section -->
    <div class="progress-section" id="progressSection" style="display: none;">
      <!-- Progress indicators -->
    </div>

    <!-- Results Section -->
    <div class="results-container" id="resultsContainer" style="display: none;">
      <!-- Output display -->
    </div>

    <!-- Status Messages -->
    <div id="statusMessages" class="status"></div>

    <!-- Hidden Inputs -->
    <input type="file" id="fileInput" class="file-input" accept="your-file-types">
  </div>

  <script>
    // Your tool JavaScript here
  </script>
</body>
</html>
```

### Step 3: JavaScript Implementation Pattern

**Required JavaScript Structure:**
```javascript
// ========== CONFIGURATION & STATE ==========
const urlParams = new URLSearchParams(window.location.search);
let userEmail = urlParams.get('email');
let businessId = urlParams.get('businessId');
let businessName = urlParams.get('businessName') || 'My Business';

let auth0Client = null;
let currentBusiness = null;
let businessCase = {};

// Tool-specific state variables
let uploadedFiles = [];
let generatedResults = [];
let isProcessing = false;

// ========== ELEMENT REFERENCES ==========
const inputElement = document.getElementById('inputElement');
const processBtn = document.getElementById('processBtn');
const clearBtn = document.getElementById('clearBtn');
const progressSection = document.getElementById('progressSection');
const resultsContainer = document.getElementById('resultsContainer');
const statusMessages = document.getElementById('statusMessages');

// ========== AUTH0 & BUSINESS INFO ==========
async function getAuth0Client() {
  if (window.auth0Client) {
    return window.auth0Client;
  }
  
  if (window.parent && window.parent.auth0Client) {
    return window.parent.auth0Client;
  }
  
  console.warn('⚠️ Global Auth0 client not available');
  return null;
}

async function loadBusinessInfo() {
  try {
    // Load from parent dataManager if available
    if (!businessId && window.parent && window.parent.dataManager) {
      try {
        currentBusiness = window.parent.dataManager.getSelectedBusinessOrFirst();
        if (currentBusiness) {
          businessId = currentBusiness._id;
          businessCase = currentBusiness.initial_business_case || {};
        }
      } catch (e) {
        console.warn('Could not access parent dataManager');
      }
    }

    // Get user email from Auth0 if not provided
    if (!userEmail) {
      const auth0 = await getAuth0Client();
      if (auth0) {
        try {
          const isAuthenticated = await auth0.isAuthenticated();
          if (isAuthenticated) {
            const user = await auth0.getUser();
            if (user && user.email) {
              userEmail = user.email;
            }
          }
        } catch (error) {
          console.error('Error getting user:', error);
        }
      }
    }

    if (!userEmail || !businessId) {
      showStatus('Missing user or business information. Please ensure you are logged in.', 'error');
      return;
    }
  } catch (error) {
    console.error('Error loading business info:', error);
    showStatus(`Error: ${error.message}`, 'error');
  }
}

// ========== FILE/INPUT HANDLING ==========
function handleInput(inputData) {
  // Validate input
  // Store in state
  // Update UI
  // Enable process button
}

// ========== WALLET INTEGRATION ==========
async function checkWalletBalance(requiredAmount) {
  try {
    const walletCheck = await fetch(`/api/wallet?email=${encodeURIComponent(userEmail)}`, {
      method: 'GET'
    });

    const walletData = await walletCheck.json();
    if (!walletCheck.ok) {
      throw new Error(walletData.error || 'Unable to access wallet');
    }

    if (!walletData.wallet || walletData.wallet.balance < requiredAmount) {
      const currentBalance = walletData.wallet ? walletData.wallet.balance : 0;
      throw new Error(`Insufficient credits. Required: R${requiredAmount.toFixed(2)}, Balance: R${currentBalance.toFixed(2)}`);
    }

    return walletData.wallet;
  } catch (error) {
    throw new Error(`Wallet check failed: ${error.message}`);
  }
}

async function deductFromWallet(amount, description) {
  try {
    const walletResponse = await fetch('/api/wallet/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        amount: amount,
        description: description,
        metadata: { 
          category: 'ai-tool-usage',
          businessId: businessId,
          toolName: 'Your Tool Name'
        }
      })
    });

    if (!walletResponse.ok) {
      const error = await walletResponse.json();
      throw new Error(`Payment failed: ${error.error || 'Unknown error'}`);
    }

    return await walletResponse.json();
  } catch (error) {
    throw new Error(`Payment processing failed: ${error.message}`);
  }
}

// ========== AI PROCESSING ==========
async function processWithAI(inputData, settings) {
  try {
    // Check wallet first
    await checkWalletBalance(TOOL_COST);

    // Show progress
    showProgress(true);
    updateProgress(10, 'Preparing for AI processing...');

    // Process with AI (example for image generation)
    const response = await fetch('/api/ai-generators/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability: 'image-generation', // or text-generation, etc.
        useCase: 'image-to-image', // or text-to-image, etc.
        prompt: buildPrompt(settings),
        image: inputData, // if applicable
        parameters: {
          size: settings.size || '1024x1024',
          quality: settings.quality || 'standard'
        },
        preferences: {
          provider: 'azure',
          model: 'gpt-image-1' // or appropriate model
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`AI processing failed: ${error.error || 'Unknown error'}`);
    }

    updateProgress(80, 'Processing payment...');
    
    // Deduct cost
    const walletResult = await deductFromWallet(TOOL_COST, `Tool usage - ${inputFileName}`);

    updateProgress(100, 'Complete!');
    
    const result = await response.json();
    return { result, walletResult };

  } catch (error) {
    showProgress(false);
    throw error;
  }
}

// ========== UI UTILITY FUNCTIONS ==========
function showProgress(show, progress = 0, text = '') {
  if (show) {
    progressSection.style.display = 'block';
    updateProgress(progress, text);
  } else {
    progressSection.style.display = 'none';
  }
}

function updateProgress(percentage, text) {
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  
  if (progressFill) progressFill.style.width = `${percentage}%`;
  if (progressText) progressText.textContent = text;
}

function showStatus(message, type) {
  statusMessages.textContent = message;
  statusMessages.className = `status ${type}`;
  statusMessages.style.display = 'block';
}

function hideStatus() {
  statusMessages.style.display = 'none';
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🛠️ Tool initialized');
  await loadBusinessInfo();
  
  // Setup event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // File input, buttons, etc.
}
```

### Step 4: Add to Creative Hub Navigation

**Update `creative.html`:**

1. **Add your tool card** to the appropriate section:
```html
<!-- Add to existing section or create new section -->
<div class="sim-card" id="yourToolCard">
  <div class="sim-icon">
    <!-- Your tool icon SVG -->
  </div>
  <div class="sim-content">
    <div class="sim-body">
      <div class="sim-info">
        <h3 class="sim-name">Your Tool Name</h3>
        <p class="sim-description">Brief description of what it does</p>
      </div>
      <button class="sim-action-btn" id="yourToolBtn" aria-label="Open Your Tool">
        <!-- Arrow icon -->
      </button>
    </div>
  </div>
</div>
```

**Update `creative.js`:**

2. **Add button configuration**:
```javascript
// Add to appropriate button array (buttons, betaButtons, etc.)
{
  btn: document.getElementById("yourToolBtn"),
  title: "Your Tool Name",
  url: `/pages/creative/your-tool-name.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
}
```

### Step 5: Styling Guidelines

**Follow Consistent Design Patterns:**

```css
/* Main container layout */
.main-container {
  display: flex;
  gap: 20px;
}

.input-section, .settings-section {
  flex: 1;
  min-width: 300px;
}

/* Upload/input areas */
.upload-box {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  background: var(--light-bg);
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-box:hover {
  border-color: var(--primary-orange);
  background: #FFF8F0;
}

/* Settings panels */
.settings-panel {
  background: var(--light-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  margin-top: 15px;
}

/* Form controls */
.setting-group {
  margin-bottom: 20px;
}

.setting-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-size: 14px;
}

.setting-select, .setting-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

/* Buttons */
.generate-btn {
  background: var(--primary-orange);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.generate-btn:hover:not(:disabled) {
  background: #ff9500;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 149, 0, 0.3);
}

/* Progress indicators */
.progress-section {
  background: var(--light-bg);
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
}

.progress-bar-container {
  background: #e0e0e0;
  border-radius: 4px;
  height: 8px;
  overflow: hidden;
}

.progress-fill {
  background: var(--primary-orange);
  height: 100%;
  width: 0%;
  transition: width 0.3s ease;
}

/* Results display */
.results-container {
  background: var(--light-bg);
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  border: 1px solid var(--border-color);
}

/* Status messages */
.status {
  padding: 12px 15px;
  border-radius: 6px;
  margin-top: 15px;
  font-size: 14px;
}

.status.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.status.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

/* Responsive design */
@media (max-width: 768px) {
  .main-container {
    flex-direction: column;
  }
  
  .input-section, .settings-section {
    flex: none;
    width: 100%;
  }
}
```

## 🔧 Integration Patterns

### AI Generators Integration

**For Image Processing:**
```javascript
const imageResponse = await fetch('/api/ai-generators/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capability: 'image-generation',
    useCase: 'text-to-image', // or 'image-to-image'
    prompt: 'Your enhancement prompt',
    image: base64ImageData, // for image-to-image
    parameters: {
      size: '1024x1024',
      quality: 'hd'
    },
    preferences: {
      provider: 'azure',
      model: 'gpt-image-1'
    }
  })
});
```

**For Text Processing:**
```javascript
const textResponse = await fetch('/api/ai-generators/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capability: 'text-generation',
    useCase: 'content-creation',
    prompt: 'Your text prompt',
    parameters: {
      temperature: 0.7,
      max_tokens: 1000
    },
    preferences: {
      provider: 'azure',
      model: 'gpt-4.1'
    }
  })
});
```

### Wallet Integration Pattern

**Always follow this sequence:**
```javascript
async function processWithPayment() {
  try {
    // 1. Check balance first
    const wallet = await checkWalletBalance(COST);
    
    // 2. Process with AI
    const result = await processWithAI(inputData);
    
    // 3. Deduct payment
    const payment = await deductFromWallet(COST, description);
    
    // 4. Show results
    displayResults(result);
    
    // 5. Update UI with new balance
    showStatus(`Success! New balance: ${payment.formatted_balance}`, 'success');
    
  } catch (error) {
    showStatus(error.message, 'error');
  }
}
```

### File Upload Pattern

**Standard file handling:**
```javascript
function handleFileUpload(file) {
  // 1. Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    showStatus(`Invalid file type: ${file.type}`, 'error');
    return;
  }

  // 2. Check file size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showStatus(`File too large: ${(file.size/1024/1024).toFixed(1)}MB. Max: 10MB`, 'error');
    return;
  }

  // 3. Convert to base64 for AI processing
  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedFile = {
      file: file,
      data: e.target.result,
      name: file.name,
      size: file.size
    };
    updateFileDisplay();
    enableProcessButton();
  };
  reader.readAsDataURL(file);
}
```

## ✅ Best Practices

### 1. **Error Handling**
- Always wrap API calls in try-catch blocks
- Provide meaningful error messages to users
- Log errors to console for debugging
- Handle network failures gracefully

### 2. **User Experience**
- Show progress indicators for long operations
- Provide clear cost information upfront
- Enable/disable buttons appropriately
- Use consistent loading states

### 3. **Performance**
- Validate files client-side before upload
- Use appropriate file size limits
- Implement proper image compression if needed
- Cache expensive operations

### 4. **Security**
- Validate all inputs
- Use proper file type checking
- Sanitize user-provided content
- Implement rate limiting where needed

### 5. **Accessibility**
- Use proper ARIA labels
- Ensure keyboard navigation works
- Provide alt text for images
- Use semantic HTML structure

## 🧪 Testing Guidelines

### Manual Testing Checklist

**Before Release:**
- [ ] Upload validation works (file type, size)
- [ ] Auth0 integration loads user info correctly
- [ ] Wallet balance checking works
- [ ] AI processing completes successfully
- [ ] Payment deduction works correctly
- [ ] Results display properly
- [ ] Error states show appropriate messages
- [ ] Mobile responsiveness works
- [ ] Navigation from Creative Hub works

### Testing Different Scenarios

**Test Cases:**
```javascript
// 1. Insufficient funds
// 2. Invalid file types
// 3. Network failures
// 4. Large files
// 5. Multiple rapid requests
// 6. Empty inputs
// 7. Special characters in filenames
// 8. Missing authentication
```

### Debug Logging

**Add comprehensive logging:**
```javascript
console.log('🛠️ Tool initialized');
console.log('✅ User loaded:', userEmail);
console.log('💰 Wallet check:', walletBalance);
console.log('🤖 AI processing started');
console.log('✅ Results received:', results.length);
```

## 📚 Example Implementations

### Quick Reference Tools

1. **Image Enhancement** - `improve-image.html`
2. **Audio Transcription** - `transcribe-audio.html`
3. **Logo Design** - `create-logos.html`

### Common Tool Types

**File Processor Tools:**
- Image editors, enhancers, converters
- Audio/video processors
- Document analyzers

**Content Generators:**
- Text generators (blogs, emails, etc.)
- Image creators
- Social media content

**Analysis Tools:**
- Content analyzers
- SEO tools
- Data processors

## 🚀 Quick Start Template

To create a new tool quickly, copy the `improve-image.html` file and modify:

1. **Change the title and descriptions**
2. **Update the input validation** for your file types
3. **Modify the AI processing** for your use case
4. **Adjust the settings panel** for your options
5. **Update the results display** for your output
6. **Add to Creative Hub navigation**

## 📞 Support

For questions or issues with tool development:
1. Check existing implementations for patterns
2. Review the AI Generators documentation
3. Test with the wallet API endpoints
4. Validate with the Creative Hub integration

---

**Happy Building! 🛠️**

*This guide ensures all new creative tools follow established patterns and provide a consistent user experience across the Zuke platform.*