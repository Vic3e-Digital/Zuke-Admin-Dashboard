# Building Tools with Reusable Libraries - Developer Guide

## Overview

This guide explains how to create new tools for the Zuke Admin Dashboard by leveraging existing, proven code patterns and reusable libraries. The audio transcriber tool is a perfect example of this approach.

---

## 🏗️ Architecture Pattern

### The Reusable Stack

Your dashboard has built-in patterns for common tasks:

```
┌─────────────────────────────────────────────────────────┐
│             Tool Requirements                           │
├─────────────────────────────────────────────────────────┤
│ 1. User Authentication      → Use Auth0 (built-in)    │
│ 2. File Upload              → Use multer pattern       │
│ 3. Cost Management          → Use Wallet webhook       │
│ 4. Email Delivery           → Use Email webhook        │
│ 5. Database Storage         → Use MongoDB              │
│ 6. UI Components            → Use formStyle.css        │
│ 7. Status Messages          → Use .status classes      │
│ 8. Progress Tracking        → Use progress-bar pattern │
│ 9. File Download            → Use clipboard API        │
│ 10. Business Context        → Use dataManager          │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Step-by-Step: Creating a New Tool

### Step 1: Analyze Your Requirements

Before coding, answer these questions:

```
Tool: [Name]
├─ Does it need file upload?           [ ] Yes  [ ] No
├─ Does it process files?              [ ] Yes  [ ] No
├─ Does it cost money?                 [ ] Yes  [ ] No
├─ Does it send emails?                [ ] Yes  [ ] No
├─ Does it need user authentication?   [ ] Yes  [ ] No
├─ Does it need business context?      [ ] Yes  [ ] No
├─ Does it store data?                 [ ] Yes  [ ] No
├─ Does it have async operations?      [ ] Yes  [ ] No
└─ Does it need real-time progress?    [ ] Yes  [ ] No
```

### Step 2: Identify Reusable Patterns

For each requirement, find the corresponding pattern:

| Requirement | Pattern Location | File | Pattern |
|-------------|------------------|------|---------|
| File Upload | add-service.html | HTML | Drag-drop box |
| Upload Backend | audio-transcribe-api.js | API | multer config |
| Cost Deduction | add-service.html | JS | deductCost() |
| Wallet Check | send-email-api.js | API | wallet webhook |
| Email Send | send-email-api.js | API | Email webhook |
| Auth0 | add-service.html | JS | getAuth0Client() |
| Business Load | add-service.html | JS | loadBusinessInfo() |
| Status Display | add-service.html | CSS | .status classes |
| Progress Bar | add-service.html | HTML/CSS | progress container |
| Database Store | send-email-api.js | API | MongoDB insert |

### Step 3: Create Frontend HTML

**Location:** `/public/pages/[category]/[tool-name].html`

**Template Structure:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>[Tool Name] | Zuke</title>
  
  <!-- Existing CSS - REUSE -->
  <link rel="stylesheet" href="../../css/formStyle.css">
  <script src="https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js"></script>
  
  <style>
    /* Only add CUSTOM styles for your specific tool */
    /* Use existing classes from formStyle.css for common elements */
  </style>
</head>

<body>
  <div class="container">
    <!-- REUSE: Header pattern -->
    <div class="header">
      <h1>[Tool Name]</h1>
      <p>[Description]</p>
    </div>

    <!-- REUSE: Form sections -->
    <div class="section">
      <div class="section-title">Input</div>
      <!-- Your input fields here -->
    </div>

    <!-- REUSE: Output section -->
    <div class="section">
      <div class="section-title">Results</div>
      <!-- Your results here -->
    </div>

    <!-- REUSE: Status messages -->
    <div id="status" class="status"></div>
  </div>

  <script>
    // REUSE: Auth0 initialization
    async function getAuth0Client() { ... }
    
    // REUSE: Business info loading
    async function loadBusinessInfo() { ... }
    
    // REUSE: Status display
    function showStatus(message, type) { ... }
    
    // YOUR CUSTOM LOGIC HERE
  </script>
</body>
</html>
```

### Step 4: Create Backend API

**Location:** `/api/[tool-name]-api.js`

**Template Structure:**

```javascript
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');
const axios = require('axios');

// REUSE: Environment variables
const N8N_WALLET_WEBHOOK = process.env.N8N_WALLET_WEBHOOK_URL;
const EMAIL_WEBHOOK = 'https://aigents.southafricanorth.azurecontainer.io/webhook/send-smart-email';

// ========== REUSE: Cost deduction from wallet ==========
async function deductCost(userEmail, businessId, cost, description) {
  const walletPayload = {
    userEmail,
    businessId,
    cost: cost,
    requestId: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    description: description
  };

  try {
    const walletResponse = await axios.post(N8N_WALLET_WEBHOOK, walletPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 300 || status === 402
    });

    const walletResult = walletResponse.data;

    if (walletResponse.status === 402 || !walletResult.success) {
      throw {
        status: 402,
        formatted_balance: walletResult.formatted_balance,
        required: cost
      };
    }

    return walletResult;
  } catch (error) {
    if (error.status === 402) throw error;
    throw error;
  }
}

// ========== REUSE: Email delivery ==========
async function sendToolEmail(emailRecipient, subject, message, businessName, userEmail) {
  try {
    const emailPayload = {
      businessId: 'zuke-system',
      businessName: businessName || 'Zuke',
      userEmail: userEmail || emailRecipient,
      emailType: 'individual',
      recipient: {
        name: emailRecipient.split('@')[0],
        email: emailRecipient
      },
      subject: subject,
      message: message,
      timestamp: new Date().toISOString()
    };

    await axios.post(EMAIL_WEBHOOK, emailPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    return true;
  } catch (error) {
    console.warn('Email delivery failed:', error.message);
    return false;
  }
}

// ========== YOUR CUSTOM ROUTE ==========
router.post('/process', async (req, res) => {
  console.log('\n🔧 ========== [TOOL NAME] REQUEST ==========');
  
  try {
    const { businessId, userEmail, ...toolData } = req.body;

    // 1. Validate input
    if (!businessId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // 2. Get business info
    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }

    const businessName = business?.store_info?.name || 'Your Business';

    // 3. REUSE: Check wallet
    const cost = 10.00; // Your cost
    const walletResult = await deductCost(
      userEmail,
      businessId,
      cost,
      '[Tool Name] processing'
    );

    // 4. Do your custom processing
    const result = await processData(toolData);

    // 5. REUSE: Store in database
    await db.collection('[tool_name]_results').insertOne({
      businessId: new ObjectId(businessId),
      userEmail,
      businessName,
      data: result,
      cost: cost,
      charged: true,
      status: 'completed',
      created_at: new Date()
    });

    // 6. REUSE: Send email if requested
    if (req.body.sendEmail) {
      await sendToolEmail(
        req.body.emailRecipient,
        req.body.emailSubject,
        formatResultAsEmail(result),
        businessName,
        userEmail
      );
    }

    // 7. Return success
    res.json({
      success: true,
      message: '[Tool Name] completed successfully',
      result: result,
      cost: cost,
      formatted_cost: `R${cost.toFixed(2)}`,
      newBalance: walletResult.new_balance,
      formattedBalance: walletResult.formatted_balance
    });

  } catch (error) {
    console.error('Error:', error.message);

    if (error.status === 402) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient funds',
        required: error.required,
        formatted_balance: error.formatted_balance
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

### Step 5: Register Route in server.js

Add these two lines:

```javascript
// At top with other imports
const myToolRoutes = require('./api/[tool-name]-api');

// In routes section
app.use('/api/[tool-name]', myToolRoutes);
```

### Step 6: Connect Frontend to Backend

In your HTML `<script>`:

```javascript
async function processWithBackend() {
  try {
    const response = await fetch('/api/[tool-name]/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: businessId,
        userEmail: userEmail,
        // Your custom data
        sendEmail: true,
        emailRecipient: 'user@example.com'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 402) {
        throw new Error(`Insufficient funds!\nBalance: ${error.formatted_balance}`);
      }
      
      throw new Error(error.error);
    }

    const result = await response.json();
    showStatus(`✅ ${result.message}\nCost: ${result.formatted_cost}`, 'success');
    
  } catch (error) {
    showStatus(error.message, 'error');
  }
}
```

---

## 🔧 Common Patterns - Copy & Paste Ready

### Pattern 1: Auth0 Setup
```javascript
async function getAuth0Client() {
  if (window.auth0Client) return window.auth0Client;
  
  try {
    const response = await fetch("/auth_config.json");
    const config = await response.json();
    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      cacheLocation: 'localstorage',
      useRefreshTokens: true
    });
    window.auth0Client = auth0Client;
    return auth0Client;
  } catch (error) {
    console.error("Error configuring Auth0:", error);
    return null;
  }
}
```

### Pattern 2: Business Loading
```javascript
async function loadBusinessInfo() {
  const auth0 = await getAuth0Client();
  if (!auth0) return;

  try {
    const isAuthenticated = await auth0.isAuthenticated();
    if (!isAuthenticated) {
      showStatus('Please log in to continue', 'error');
      return;
    }

    const user = await auth0.getUser();
    userEmail = user.email;

    if (!currentBusiness) {
      currentBusiness = window.dataManager?.getSelectedBusinessOrFirst();
      if (currentBusiness) {
        businessId = currentBusiness._id;
      }
    }
  } catch (error) {
    console.error('Error loading business:', error);
  }
}
```

### Pattern 3: File Upload with Drag-Drop
```javascript
function handleFileUpload(file) {
  if (!file || !file.type.startsWith('audio/')) {
    showStatus('Please select a valid file', 'error');
    return;
  }

  const maxSize = 25 * 1024 * 1024;
  if (file.size > maxSize) {
    showStatus('File is too large. Maximum size is 25MB.', 'error');
    return;
  }

  uploadedFile = file;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    filePreview.src = e.target.result;
    filePreview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

uploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadBox.style.borderColor = 'var(--primary-orange)';
});

uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.style.borderColor = 'var(--border-color)';
  handleFileUpload(e.dataTransfer.files[0]);
});
```

### Pattern 4: Status Messages
```javascript
function showStatus(message, type) {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
  statusElement.style.display = 'block';
}

/* CSS - Already in formStyle.css */
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
```

### Pattern 5: Progress Bar
```javascript
progressSection.style.display = 'block';
progressFill.style.width = '0%';
progressText.textContent = 'Starting...';

// Update progress
progressFill.style.width = '30%';
progressText.textContent = 'Processing... (30%)';

// Complete
progressFill.style.width = '100%';
progressText.textContent = 'Complete!';

setTimeout(() => {
  progressSection.style.display = 'none';
}, 1500);

/* CSS - Already in formStyle.css */
.progress-bar-container {
  background: #e0e0e0;
  border-radius: 4px;
  height: 8px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  background: var(--primary-orange);
  height: 100%;
  width: 0%;
  transition: width 0.3s ease;
}
```

### Pattern 6: Copy to Clipboard
```javascript
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(textToCopy);
    showStatus('✅ Copied to clipboard!', 'success');
  } catch (error) {
    showStatus('Failed to copy', 'error');
  }
});
```

### Pattern 7: Download File
```javascript
downloadBtn.addEventListener('click', () => {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', `result_${Date.now()}.txt`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  showStatus('📥 Downloaded!', 'success');
});
```

### Pattern 8: Form Validation
```javascript
function validateForm() {
  const hasInput = inputField.value.trim().length > 0;
  const isValid = hasInput && otherConditions;
  
  processButton.disabled = !isValid;
  return isValid;
}

inputField.addEventListener('input', validateForm);
inputField.addEventListener('change', validateForm);
```

### Pattern 9: Checkbox Styling
```javascript
document.querySelectorAll('.checkbox-option').forEach(option => {
  const checkbox = option.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      option.classList.add('checked');
    } else {
      option.classList.remove('checked');
    }
  });
});

/* CSS - Already in formStyle.css */
.checkbox-option.checked {
  background: #fff3e0;
  border-color: var(--primary-orange);
}
```

### Pattern 10: API Error Handling
```javascript
try {
  const response = await fetch('/api/tool/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 402) {
      throw new Error(`Insufficient funds!\nBalance: ${error.formatted_balance}`);
    }
    
    throw new Error(error.error || 'Request failed');
  }

  const result = await response.json();
  // Handle success
  
} catch (error) {
  showStatus(error.message, 'error');
}
```

---

## 🗂️ Directory Structure for New Tools

```
/public/pages/[category]/
├── [tool-name].html          ← Your frontend (copy from template)
├── [tool-name].js            ← Optional: separate JS if large
└── css/
    └── [tool-name]-custom.css ← Only custom styles

/api/
├── [tool-name]-api.js        ← Your backend API

/server.js
└── (add route registration here)

/[TOOL_NAME]_GUIDE.md         ← Documentation (optional)
```

---

## 📊 Example Tool Checklist

Use this when creating a new tool:

- [ ] Created `/public/pages/[category]/[tool-name].html`
- [ ] Added Auth0 initialization
- [ ] Added business info loading
- [ ] Created `/api/[tool-name]-api.js`
- [ ] Added wallet integration (if it costs money)
- [ ] Added email delivery (if needed)
- [ ] Registered route in `/server.js`
- [ ] Tested file upload (if applicable)
- [ ] Tested cost deduction (if applicable)
- [ ] Tested email delivery (if applicable)
- [ ] Verified database storage
- [ ] Added error handling
- [ ] Added progress tracking (if async)
- [ ] Styled with existing CSS classes
- [ ] Tested in browser
- [ ] Created documentation

---

## 💡 Pro Tips

### 1. Reuse CSS Classes
Don't create new CSS. Use existing classes from `formStyle.css`:
```html
<div class="section">
  <div class="section-title">My Section</div>
  <div class="form-group">
    <label>My Input</label>
    <input type="text">
  </div>
  <button class="btn btn-primary">Process</button>
  <div id="status" class="status"></div>
</div>
```

### 2. Reuse Color Variables
Use existing CSS variables instead of hardcoding colors:
```css
/* ✅ Good */
color: var(--primary-orange);
background: var(--light-bg);
border: 1px solid var(--border-color);

/* ❌ Bad */
color: #ff6600;
background: #f5f5f5;
border: 1px solid #ddd;
```

### 3. Standard Pricing Pattern
Keep cost deduction simple and consistent:
```javascript
const COSTS = {
  BASIC: 10.00,
  PREMIUM: 25.00
};
```

### 4. Logging for Debugging
Use consistent logging in your API:
```javascript
console.log('\n🔧 ========== TOOL NAME REQUEST ==========');
console.log('📦 Request:', { businessId, userEmail, ... });
console.log('✅ Processing complete');
```

### 5. Database Collection Naming
Use snake_case for consistency:
```javascript
db.collection('[tool_name]_results')
db.collection('audio_transcriptions')
db.collection('email_campaigns')
```

### 6. Error Messages
Make them user-friendly:
```javascript
// ✅ Good
"Insufficient funds!\nRequired: R25.00\nBalance: R10.00"

// ❌ Bad
"402 Payment Required"
```

### 7. API Response Structure
Keep responses consistent:
```javascript
{
  success: true/false,
  message: "Human readable message",
  data: { ... },
  cost: 10.00,
  formatted_cost: "R10.00",
  newBalance: 50.00,
  formattedBalance: "R50.00",
  error: "Error message (if failed)"
}
```

---

## 🚀 Quick Start: Creating a New Tool in 5 Minutes

1. **Copy Template Files** (2 min)
   - Copy this guide's HTML template to `/public/pages/[category]/[tool-name].html`
   - Copy this guide's API template to `/api/[tool-name]-api.js`

2. **Customize for Your Tool** (2 min)
   - Replace `[TOOL NAME]` with your tool name
   - Update file input types
   - Update API endpoint names

3. **Register Route** (30 sec)
   - Add 2 lines to `/server.js`

4. **Test** (30 sec)
   - `npm start`
   - Visit your tool URL
   - Upload a file
   - Check cost deduction

---

## 📚 Reference Tools

These tools are good examples to study:

| Tool | Location | Pattern Type | Complexity |
|------|----------|--------------|-------------|
| Audio Transcriber | `/public/pages/creative/audio-transcribe.html` | File upload + AI | Medium |
| Add Service | `/public/pages/business/add-service.html` | Complex form + multiple uploads | High |
| Send Email | `/api/send-email-api.js` | Email delivery + wallet | Medium |
| Social Post | `/public/pages/marketing/social-media.html` | Platform integration | High |

Study these to understand:
- How they structure their code
- How they handle errors
- How they integrate with wallet/email
- How they display results

---

## 🆘 Troubleshooting

### Issue: Module not found error
```
Error: Cannot find module 'xyz'
```
**Solution:** Add required packages to `package.json`:
```bash
npm install [package-name]
```

### Issue: CORS error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** CORS is already configured in server.js. Make sure your fetch uses correct headers:
```javascript
headers: { 'Content-Type': 'application/json' }
```

### Issue: Auth0 not loading
**Solution:** Make sure you're calling `loadBusinessInfo()` on page load:
```javascript
document.addEventListener('DOMContentLoaded', async () => {
  await loadBusinessInfo();
});
```

### Issue: Wallet webhook fails
**Solution:** Verify `N8N_WALLET_WEBHOOK_URL` is set in `.env`:
```bash
echo $N8N_WALLET_WEBHOOK_URL
```

### Issue: Database insert fails
**Solution:** Use proper ObjectId conversion:
```javascript
const db = await getDatabase();
await db.collection('my_data').insertOne({
  businessId: new ObjectId(businessId),  // ← Convert string to ObjectId
  userEmail: userEmail,
  data: data,
  created_at: new Date()
});
```

---

## 📖 Helpful Resources

- **Existing Patterns**: Study `/public/pages/business/add-service.html`
- **API Examples**: Look at `/api/send-email-api.js`
- **CSS Classes**: Check `/public/css/formStyle.css`
- **Environment Vars**: See `.env` file
- **Database**: Check MongoDB collections in Atlas

---

## ✨ Summary

Building new tools is simple:
1. **Use existing patterns** - Don't reinvent the wheel
2. **Reuse CSS** - Use formStyle.css classes
3. **Follow structure** - HTML in `/public/pages/`, API in `/api/`
4. **Integrate wallet** - Use the wallet webhook pattern
5. **Test thoroughly** - File upload, cost, email, database
6. **Document** - Create a guide for maintenance

With these guidelines, you can create professional tools in minutes, not hours!

