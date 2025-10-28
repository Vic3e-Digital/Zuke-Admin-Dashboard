// tools/send-email.js

// ========== GLOBAL VARIABLES ==========
let auth0Client = null;
let currentBusiness = null;
let openAIConfig = null;
let emailType = 'individual';
let lastFocusedInput = null;

// ✅ Try to get from URL params first, then fall back to dataManager
const urlParams = new URLSearchParams(window.location.search);
let userEmail = urlParams.get('email');
let businessId = urlParams.get('businessId');
let businessName = urlParams.get('businessName');

const sendBtn = document.getElementById('sendBtn');
const costDisplay = document.getElementById('costDisplay');
const status = document.getElementById('status');
const progress = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// Costs
const COSTS = {
  individual: 5,
  bulkPerEmail: 3
};

// ========== DEBUG URL PARAMS ==========
console.log('🔍 Initial URL Parameters:');
console.log('userEmail:', userEmail);
console.log('businessId:', businessId);
console.log('businessName:', businessName);

if (!userEmail || !businessId) {
  console.log('⚠️ URL parameters missing - will load from dataManager...');
}

// ========== AUTH0 CLIENT ==========
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

// ========== FETCH OPENAI CONFIG ==========
async function getOpenAIConfig() {
  if (openAIConfig) return openAIConfig;
  
  try {
    const response = await fetch('/api/get-openai-config');
    if (!response.ok) throw new Error('Failed to get OpenAI config');
    openAIConfig = await response.json();
    return openAIConfig;
  } catch (error) {
    console.error('Error fetching OpenAI config:', error);
    return null;
  }
}

// ========== CALL AZURE OPENAI ==========
async function callAzureOpenAI(prompt) {
  const config = await getOpenAIConfig();
  if (!config) throw new Error('OpenAI config not available');

  const url = `${config.endpoint}openai/deployments/${config.deployment}/chat/completions?api-version=2025-01-01-preview`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "You are a professional business email writer. Write clear, concise, and professional emails that are personable but businesslike."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ========== LOAD BUSINESS INFO ==========
async function loadBusinessInfo() {
    const auth0 = await getAuth0Client();
    if (!auth0) return;
  
    try {
      const isAuthenticated = await auth0.isAuthenticated();
      if (!isAuthenticated) {
        console.warn('User not authenticated');
        return;
      }
  
      // ✅ Get business from dataManager
      currentBusiness = window.dataManager?.getSelectedBusinessOrFirst();
      
      if (!currentBusiness) {
        console.warn('No business found in cache');
        showStatus('⚠️ No business found. Please go back to dashboard.', 'error');
        return;
      }
  
      console.log('✅ Business loaded:', currentBusiness);
  
      // ✅ If URL params are missing, get them from currentBusiness and auth0
      if (!businessId && currentBusiness._id) {
        businessId = currentBusiness._id;
        console.log('✅ businessId loaded from dataManager:', businessId);
      }
  
      if (!businessName && currentBusiness.store_info?.name) {
        businessName = currentBusiness.store_info.name;
        console.log('✅ businessName loaded from dataManager:', businessName);
      }
  
      if (!userEmail) {
        const user = await auth0.getUser();
        userEmail = user?.email;
        console.log('✅ userEmail loaded from Auth0:', userEmail);
      }
  
      // ✅ Final validation
      if (!userEmail || !businessId) {
        console.error('❌ CRITICAL: Could not determine user email or business ID');
        showStatus('❌ Error: Could not load user or business information. Please refresh the page.', 'error');
        return;
      }
  
      console.log('✅ All required data loaded:');
      console.log('  - userEmail:', userEmail);
      console.log('  - businessId:', businessId);
      console.log('  - businessName:', businessName);
  
      // Enable the form now that we have the data
      updateSendButton();
  
    } catch (error) {
      console.error('Error loading business:', error);
      showStatus('❌ Error loading business information. Please refresh the page.', 'error');
    }
  }

// ========== EMAIL TYPE TOGGLE ==========
function setupEmailTypeToggle() {
  const typeRadios = document.querySelectorAll('input[name="emailType"]');
  const individualFields = document.getElementById('individualFields');
  const bulkFields = document.getElementById('bulkFields');

  typeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      emailType = radio.value;
      
      if (emailType === 'individual') {
        individualFields.classList.add('show');
        bulkFields.classList.remove('show');
        updateCost();
      } else {
        individualFields.classList.remove('show');
        bulkFields.classList.add('show');
        updateCostBulk();
      }
      
      updateSendButton();
      updateLivePreview();
    });
  });
}

// ========== TRACK LAST FOCUSED INPUT ==========
function setupFocusTracking() {
  ['email§ject', 'emailMessage'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('focus', () => {
        lastFocusedInput = element;
      });
    }
  });
}

// ========== INSERT VARIABLE ==========
function insertVariable(variable) {
  if (!lastFocusedInput) {
    lastFocusedInput = document.getElementById('emailMessage');
  }
  
  const startPos = lastFocusedInput.selectionStart;
  const endPos = lastFocusedInput.selectionEnd;
  const text = lastFocusedInput.value;
  
  lastFocusedInput.value = text.substring(0, startPos) + variable + text.substring(endPos);
  
  const newPos = startPos + variable.length;
  lastFocusedInput.setSelectionRange(newPos, newPos);
  lastFocusedInput.focus();
  
  updateLivePreview();
}

window.insertVariable = insertVariable;

// ========== EMAIL TEMPLATES ==========
const TEMPLATES = {
  introduction: {
    subject: "Quick introduction from {company}",
    message: `Hi {name},

I hope this email finds you well. My name is [Your Name] and I work with {company}.

I came across your profile and was impressed by [specific detail about their work/company].

I believe there could be potential synergies between our organizations, particularly in [area of interest].

Would you be open to a brief call next week to explore this further?

Best regards,
[Your Name]
{company}`
  },
  partnership: {
    subject: "Partnership opportunity with {company}",
    message: `Hi {name},

I'm reaching out from {company} with an exciting partnership opportunity.

We specialize in [your service/product] and have been following [their company]'s impressive work in [their field].

I believe we could create significant value together through [specific opportunity].

Are you available for a 15-minute call this week to discuss?

Looking forward to connecting,
[Your Name]
{company}`
  },
  followup: {
    subject: "Following up on our conversation",
    message: `Hi {name},

I wanted to follow up on our recent conversation about [topic discussed].

As promised, I'm sharing [resource/information] that might be valuable for [their goal/challenge].

I'd love to continue our discussion and explore how {company} can support your objectives.

Would [specific date/time] work for a quick call?

Best,
[Your Name]
{company}`
  },
  afaa: {
    subject: "Partnership Opportunity: Supporting {company} at AFAA 2025",
    message: `Dear {name},

I hope this message finds you well.

I'm reaching out from {company} with an exciting partnership opportunity. We've been selected to participate in AFAA 2025 (African Fashion and Arts Awards), taking place December 3-8, 2025 in Abuja, Nigeria.

AFAA is Africa's premier platform celebrating fashion and arts innovation. Since 2021, it has grown from 571 to over 20,000 attendees, with 25,000+ expected in 2025—including investors, buyers, media, and industry leaders from across the continent.

ABOUT US
{company} [brief description of your business and why AFAA matters for your mission].

THE OPPORTUNITY
We're seeking travel sponsorship to represent [South Africa/our industry] at AFAA 2025. Sponsorship can range from R[LOW AMOUNT] for partial support to R[HIGH AMOUNT] for comprehensive travel coverage, depending on the partnership level that works for your organization.

Costs include: flights, accommodation, visas, local transport, and event participation.

WHAT YOU GAIN
• Brand visibility to 25,000+ attendees
• Association with Africa's fastest-growing creative platform  
• Social media recognition and exclusive event content
• Support for African innovation and youth entrepreneurship
• Partnership with an AFAA-recognized business

NEXT STEPS
Would you be open to a brief 15-20 minute meeting to discuss this opportunity? I'd be happy to share additional information about AFAA, our participation, and how we can create value for your organization.

Thank you for considering this partnership. Together, we can showcase African excellence on the continental stage.

Warm regards,

[Your Name]
[Your Title]
{company}

📧 [Your Email]
📱 [Your Phone]
🌐 [Your Website]

P.S. We're finalizing our partnership roster soon. I'd love to explore how your organization can be part of this journey.`
  }
};

function useTemplate(templateName) {
  const template = TEMPLATES[templateName];
  if (!template) return;
  
  const subjectField = document.getElementById('emailSubject');
  const messageField = document.getElementById('emailMessage');
  
  const companyName = currentBusiness?.store_info?.name || '{company}';
  
  subjectField.value = template.subject.replace('{company}', companyName);
  messageField.value = template.message.replace(/{company}/g, companyName);
  
  // Show AFAA helper if it's an AFAA template
  const afaaHelper = document.querySelector('.afaa-helper');
  if (afaaHelper) {
    afaaHelper.style.display = templateName === 'afaa' ? 'block' : 'none';
  }
  
  updateSendButton();
  updateLivePreview();
  showStatus('✅ Template applied! Customize it before sending.', 'info');
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

window.useTemplate = useTemplate;

// ========== SHOW CUSTOM PROMPT MODAL ==========
function showCustomPromptModal() {
  const modal = document.getElementById('customPromptModal');
  const overlay = document.getElementById('modalOverlay');
  
  modal.style.display = 'block';
  overlay.style.display = 'block';
  
  document.getElementById('customPromptInput').focus();
}

function hideCustomPromptModal() {
  const modal = document.getElementById('customPromptModal');
  const overlay = document.getElementById('modalOverlay');
  
  modal.style.display = 'none';
  overlay.style.display = 'none';
}

window.showCustomPromptModal = showCustomPromptModal;
window.hideCustomPromptModal = hideCustomPromptModal;

// ========== GENERATE AI EMAIL WITH CUSTOM PROMPT ==========
async function generateCustomAIEmail() {
  const customPrompt = document.getElementById('customPromptInput').value.trim();
  
  if (!customPrompt) {
    showStatus('⚠️ Please enter a prompt', 'info');
    return;
  }
  
  hideCustomPromptModal();
  await generateAIEmail('custom', customPrompt);
}

window.generateCustomAIEmail = generateCustomAIEmail;

// ========== GENERATE AI EMAIL ==========
async function generateAIEmail(templateType = null, customPrompt = null) {
  const generateBtn = document.getElementById('generateAIBtn');
  const subjectField = document.getElementById('emailSubject');
  const messageField = document.getElementById('emailMessage');
  
  if (!currentBusiness) {
    showStatus('⚠️ Please wait while business information loads...', 'info');
    await loadBusinessInfo();
    if (!currentBusiness) {
      showStatus('❌ Could not load business information', 'error');
      return;
    }
  }
  
  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '⏳ Generating...';
  }
  
  try {
    const businessCase = currentBusiness?.initial_business_case || {};
    const businessName = currentBusiness?.store_info?.name || 'our company';
    const businessInfo = JSON.stringify(businessCase, null, 2);
    
    let recipientContext = '';
    if (emailType === 'individual') {
      const recipientName = document.getElementById('recipientName').value.trim();
      const recipientEmail = document.getElementById('recipientEmail').value.trim();
      if (recipientName) {
        recipientContext = `\n\nRecipient: ${recipientName}${recipientEmail ? ` (${recipientEmail})` : ''}`;
      }
    }
    
    let prompt;
    
    if (customPrompt) {
      prompt = `Based on this business information:

${businessInfo}${recipientContext}

Generate a professional email for ${businessName} based on this specific request:

${customPrompt}

The email should:
- Be professional and compelling
- Use {name} placeholder for bulk emails
- Be well-structured and complete

Provide:
1. A compelling subject line
2. The email body

Format your response as:
SUBJECT: [subject line]

BODY:
[email body]`;
    } else if (templateType === 'afaa') {
      prompt = `Based on this business information:

${businessInfo}${recipientContext}

Generate a professional sponsorship request email for ${businessName} who has been selected to participate in AFAA 2025 (African Fashion and Arts Awards) from December 3-8, 2025 in Abuja, Nigeria.

ABOUT AFAA (USE THIS CONTEXT):
- Africa's premier awards celebrating fashion and art creatives
- Mission: Reward creatives, build capacity, improve Africa's GDP and employment through creative industries
- Growth: 571 attendees (2021) → 20,000+ attendees (2024) → Expected 25,000+ (2025)
- Platform for dialogue, collaboration, and innovation across Africa's creative industries
- Impact: Promotes African culture globally, creates jobs, attracts foreign investment, boosts tourism
- Location: Abuja, Nigeria (Plot 111 Ebitu Ukiwe Street, Jabi, Abuja)

CONTEXT FOR ${businessName}:
- Selected as [finalist/nominee/participant] for AFAA 2025
- Seeking travel sponsorship to attend this prestigious continental event
- This is about representing African innovation on a major platform

CREATE A CONCISE SPONSORSHIP REQUEST EMAIL that includes:

1. SUBJECT LINE
   - Professional and partnership-focused
   - Mention AFAA 2025 and sponsorship opportunity
   - Keep it compelling but brief

2. OPENING (2-3 sentences)
   - Warm greeting using {name} placeholder
   - Brief intro about being selected for AFAA 2025
   - Position it as a partnership opportunity

3. AFAA CONTEXT (3-4 sentences)
   - Briefly explain what AFAA is
   - Mention growth (571 → 20,000+ attendees)
   - Highlight impact: Africa's creative economy, GDP growth, employment
   - Expected 25,000+ attendees including investors, buyers, media

4. ABOUT ${businessName} (2-3 sentences)
   - Brief compelling overview based on business info
   - Why they're participating in AFAA
   - Their contribution to African creative/business landscape

5. THE ASK (Clear but not demanding)
   - "We're seeking travel sponsorship to represent [South Africa/our country] at AFAA 2025"
   - Mention sponsorship could range from R[LOW AMOUNT] to R[HIGH AMOUNT] depending on partnership level
   - Be flexible: "Any support would enable us to showcase African innovation on this continental stage"
   - Brief mention of costs: flights, accommodation, visas, local transport

6. VALUE FOR SPONSOR (4-5 bullet points, concise)
   - Brand visibility to 25,000+ attendees
   - Association with Africa's fastest-growing creative platform
   - Support for African youth entrepreneurship and innovation
   - Social media recognition and event content
   - Partnership with award-recognized African business

7. SIMPLE CALL TO ACTION
   - "Would you be open to a brief meeting to discuss this opportunity?"
   - "I'd be happy to share additional information about AFAA and our participation"
   - Suggest a timeframe: "Perhaps a 15-20 minute call this week or next?"
   - Keep it low-pressure and conversational

8. PROFESSIONAL CLOSING
   - Thank them for considering
   - Warm sign-off
   - Use {company} for business name
   - Include [PLACEHOLDERS] for contact info: [Your Name], [Your Title], [Email], [Phone]

9. OPTIONAL P.S. (Keep it light)
   - Brief mention of AFAA's growth or deadline
   - Keep urgency subtle: "Finalizing our partnership roster soon"

TONE:
- Professional but warm and conversational
- Confident but not pushy
- Focused on partnership value (not charity)
- Enthusiastic about African innovation
- Respectful of their time

KEY POINTS:
- This is a SPONSORSHIP REQUEST, not a full proposal
- Keep it concise: 250-350 words MAX
- Focus on mutual value and opportunity
- Make the CTA easy and low-pressure
- Flexible on amounts (range from low to high)
- Emphasize it's about African excellence, not just personal gain

LENGTH: 250-350 words (email, not proposal document)

Use {name} for recipient name, {company} for ${businessName}
Include [PLACEHOLDERS] for specific amounts and personal contact info

Format your response as:
SUBJECT: [subject line]

BODY:
[concise email]`;
    } else {
      prompt = `Based on this business information:

${businessInfo}${recipientContext}

Generate a professional outreach email for ${businessName}.

The email should:
- Be warm but professional
- Clearly state the value proposition
- Include a clear call-to-action
- Be concise (under 150 words)
- Use {name} placeholder for bulk emails

Provide:
1. A compelling subject line
2. The email body

Format your response as:
SUBJECT: [subject line]

BODY:
[email body]`;
    }

    console.log('🤖 Generating AI email...');
    const response = await callAzureOpenAI(prompt);
    
    const subjectMatch = response.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = response.match(/BODY:\s*([\s\S]+)/i);
    
    if (subjectMatch && bodyMatch) {
      subjectField.value = subjectMatch[1].trim();
      messageField.value = bodyMatch[1].trim();
      
      // Show AFAA helper if it's an AFAA email
      const afaaHelper = document.querySelector('.afaa-helper');
      if (templateType === 'afaa' && afaaHelper) {
        afaaHelper.style.display = 'block';
      } else if (afaaHelper) {
        afaaHelper.style.display = 'none';
      }
      
      let successMsg = '✅ AI email generated! ';
      if (templateType === 'afaa') {
        successMsg += 'Review and customize the amounts and contact details before sending.';
      } else {
        successMsg += 'Review and customize before sending.';
      }
      
      showStatus(successMsg, 'success');
      setTimeout(() => {
        status.style.display = 'none';
      }, 5000);
      
      updateSendButton();
      updateLivePreview();
    } else {
      throw new Error('Could not parse AI response');
    }
    
  } catch (error) {
    console.error('Error generating AI email:', error);
    showStatus('❌ Failed to generate email: ' + error.message, 'error');
  } finally {
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '✨ Generate with AI';
    }
  }
}

window.generateAIEmail = generateAIEmail;

// ========== TOGGLE AFAA BUILDER ==========
function toggleAfaaBuilder() {
  const builder = document.getElementById('afaaBuilder');
  if (builder.style.display === 'none' || !builder.style.display) {
    builder.style.display = 'block';
    builder.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    builder.style.display = 'none';
  }
}

window.toggleAfaaBuilder = toggleAfaaBuilder;

// ========== GENERATE AFAA SPONSORSHIP REQUEST WITH BUILDER DATA ==========
async function generateAfaaProposal() {
  const fundingAmount = document.getElementById('afaaFundingAmount').value.trim();
  const lowAmount = document.getElementById('afaaLowAmount')?.value.trim();
  const breakdown = document.getElementById('afaaBreakdown').value.trim();
  const impact = document.getElementById('afaaImpact').value.trim();

  if (!fundingAmount || !breakdown) {
    showStatus('⚠️ Please fill in at least the funding amount and breakdown', 'info');
    return;
  }

  if (!currentBusiness) {
    showStatus('⚠️ Please wait while business information loads...', 'info');
    await loadBusinessInfo();
    if (!currentBusiness) {
      showStatus('❌ Could not load business information', 'error');
      return;
    }
  }

  const generateBtn = document.querySelector('[onclick="generateAfaaProposal()"]');
  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '⏳ Generating Request...';
  }

  try {
    const businessCase = currentBusiness?.initial_business_case || {};
    const businessName = currentBusiness?.store_info?.name || 'our company';
    const businessInfo = JSON.stringify(businessCase, null, 2);

    const prompt = `Based on this business information:

${businessInfo}

Generate a professional travel sponsorship request email for ${businessName} participating in AFAA 2025.

ABOUT AFAA:
- African Fashion and Arts Awards - Africa's premier creative platform
- Growth: 571 (2021) → 20,000+ (2024) → Expected 25,000+ (2025)
- Mission: Promote African creativity, improve GDP, create employment through creative industries
- Impact: Promotes culture globally, creates jobs, attracts investment, boosts tourism
- Location: Abuja, Nigeria (Plot 111 Ebitu Ukiwe Street, Jabi, Abuja)
- Dates: December 3-8, 2025

USER'S FUNDING INFORMATION:
Total Amount Needed: R${fundingAmount}
${lowAmount ? `Low Range: R${lowAmount}` : 'Low Range: R' + Math.floor(fundingAmount * 0.4)}
Breakdown:
${breakdown}

Expected Impact:
${impact || 'Represent African innovation, network with 25,000+ industry leaders, gain media exposure, access investors and buyers'}

CREATE A CONCISE SPONSORSHIP REQUEST EMAIL:

1. SUBJECT LINE
   - Professional, mentions AFAA 2025 and partnership
   - Example style: "Partnership Opportunity: Supporting ${businessName} at AFAA 2025"

2. OPENING (2-3 sentences)
   - Greeting with {name} placeholder
   - Excitement about AFAA 2025 selection
   - Frame as partnership opportunity

3. AFAA CONTEXT (2-3 sentences)
   - What AFAA is and its impact on African creative economy
   - Growth numbers (571 → 20,000+ → 25,000+ expected)
   - Attendees: investors, media, buyers, industry leaders

4. ABOUT ${businessName} (2-3 sentences)
   - Compelling overview from business info
   - Why AFAA matters for their mission
   - Their contribution to African economy/culture

5. THE REQUEST (Clear and flexible)
   - "We're seeking travel sponsorship for AFAA 2025"
   - "Sponsorship ranges from R${lowAmount || Math.floor(fundingAmount * 0.4)} to R${fundingAmount} depending on partnership level"
   - Briefly mention breakdown: ${breakdown}
   - "Any support helps us represent African innovation on the continental stage"

6. VALUE PROPOSITION (4-5 concise points)
   - Brand visibility to 25,000+ attendees
   - Association with Africa's premier creative platform
   - Social media recognition and exclusive content
   - Support for African youth entrepreneurship
   - Partnership with AFAA-recognized business

7. SIMPLE CTA
   - "Would you be open to a brief meeting to discuss this further?"
   - "I'd be happy to share more details about AFAA and our participation"
   - Suggest timeframe: "15-20 minute call this week or next?"
   - Low-pressure and friendly

8. CLOSING
   - Thank them warmly
   - Use {company} for business name
   - [PLACEHOLDERS]: [Your Name], [Your Title], [Email], [Phone]

9. OPTIONAL P.S.
   - Light urgency: "Finalizing partnerships soon" 
   - Keep it friendly, not desperate

TONE:
- Warm and professional
- Confident but humble
- Partnership-focused (mutual value)
- Enthusiastic about African innovation
- Conversational, not corporate

LENGTH: 250-350 words (concise email, not proposal)

Use {name} for recipient, {company} for ${businessName}

Format your response as:
SUBJECT: [subject line]

BODY:
[email content]`;

    console.log('🤖 Generating AFAA sponsorship request with custom data...');
    const response = await callAzureOpenAI(prompt);

    const subjectMatch = response.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = response.match(/BODY:\s*([\s\S]+)/i);

    if (subjectMatch && bodyMatch) {
      document.getElementById('emailSubject').value = subjectMatch[1].trim();
      document.getElementById('emailMessage').value = bodyMatch[1].trim();

      // Show helper
      const afaaHelper = document.querySelector('.afaa-helper');
      if (afaaHelper) {
        afaaHelper.style.display = 'block';
      }

      // Update preview
      updateLivePreview();

      // Scroll to email content
      document.getElementById('emailSubject').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });

      showStatus('✅ AFAA sponsorship request generated with your details! Review and customize before sending.', 'success');
      setTimeout(() => {
        status.style.display = 'none';
      }, 5000);

      updateSendButton();
    } else {
      throw new Error('Could not parse AI response');
    }

  } catch (error) {
    console.error('Error generating AFAA request:', error);
    showStatus('❌ Failed to generate request: ' + error.message, 'error');
  } finally {
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '🎯 Generate AFAA Request';
    }
  }
}

window.generateAfaaProposal = generateAfaaProposal;

// ========== LIVE PREVIEW WITH REPLACED PLACEHOLDERS ==========
function updateLivePreview() {
  const subject = document.getElementById('emailSubject').value;
  const message = document.getElementById('emailMessage').value;
  
  if (!subject && !message) {
    const previewSection = document.getElementById('emailPreview');
    if (previewSection) {
      previewSection.style.display = 'none';
    }
    return;
  }
  
  let previewSubject = subject;
  let previewMessage = message;
  
  const companyName = currentBusiness?.store_info?.name || 'Your Company';
  
  // Replace placeholders for preview
  if (emailType === 'individual') {
    const recipientName = document.getElementById('recipientName').value.trim() || 'John Doe';
    const recipientEmail = document.getElementById('recipientEmail').value.trim() || 'john@example.com';
    
    previewSubject = previewSubject.replace(/{name}/g, recipientName);
    previewMessage = previewMessage.replace(/{name}/g, recipientName);
    previewMessage = previewMessage.replace(/{email}/g, recipientEmail);
  } else {
    // For bulk emails, highlight placeholders
    previewSubject = previewSubject.replace(/{name}/g, '<span style="background: #FBC02D; color: #000; padding: 2px 6px; border-radius: 3px; font-weight: 600;">{name}</span>');
    previewMessage = previewMessage.replace(/{name}/g, '<span style="background: #FBC02D; color: #000; padding: 2px 6px; border-radius: 3px; font-weight: 600;">{name}</span>');
    previewMessage = previewMessage.replace(/{email}/g, '<span style="background: #F57C00; color: #fff; padding: 2px 6px; border-radius: 3px; font-weight: 600;">{email}</span>');
  }
  
  // Always replace {company}
  previewSubject = previewSubject.replace(/{company}/g, `<span style="background: #2E7D32; color: #fff; padding: 2px 6px; border-radius: 3px; font-weight: 600;">${companyName}</span>`);
  previewMessage = previewMessage.replace(/{company}/g, `<span style="background: #2E7D32; color: #fff; padding: 2px 6px; border-radius: 3px; font-weight: 600;">${companyName}</span>`);
  
  // Update preview section
  const previewSection = document.getElementById('emailPreview');
  if (previewSection) {
    previewSection.style.display = 'block';
    document.getElementById('previewSubject').innerHTML = previewSubject;
    document.getElementById('previewMessage').innerHTML = previewMessage.replace(/\n/g, '<br>');
  }
}

// ========== UPDATE COST ==========
function updateCost() {
  const cost = COSTS.individual;
  costDisplay.innerHTML = `Individual Email: R${cost.toFixed(2)}`;
}

function updateCostBulk() {
  const sheetsUrl = document.getElementById('sheetsUrl').value.trim();
  
  if (!sheetsUrl) {
    costDisplay.innerHTML = `Bulk emails: R${COSTS.bulkPerEmail.toFixed(2)} per email<br><small style="color: #666;">Enter sheet URL to continue</small>`;
    return;
  }
  
  costDisplay.innerHTML = `Bulk emails: R${COSTS.bulkPerEmail.toFixed(2)} per email<br><small style="color: #666;">Final cost calculated after validation</small>`;
}

// ========== UPDATE SEND BUTTON ==========
function updateSendButton() {
  const subject = document.getElementById('emailSubject').value.trim();
  const message = document.getElementById('emailMessage').value.trim();
  
  let isValid = false;
  
  if (emailType === 'individual') {
    const recipientName = document.getElementById('recipientName').value.trim();
    const recipientEmail = document.getElementById('recipientEmail').value.trim();
    isValid = recipientName && recipientEmail && subject && message;
  } else {
    const sheetsUrl = document.getElementById('sheetsUrl').value.trim();
    isValid = sheetsUrl && subject && message;
  }
  
  sendBtn.disabled = !isValid;
  
  // Update button text
  const btnText = document.getElementById('sendBtnText');
  if (emailType === 'individual') {
    btnText.textContent = 'Send Email';
  } else {
    btnText.textContent = 'Send Bulk Emails';
  }
}

// ========== SEND EMAIL ==========
sendBtn.addEventListener('click', async () => {
    const subject = document.getElementById('emailSubject').value.trim();
    const message = document.getElementById('emailMessage').value.trim();
    
    if (!subject || !message) {
      showStatus('⚠️ Please fill in both subject and message', 'info');
      return;
    }
  
    // ✅ Validate that we have required global data
    if (!userEmail || !businessId) {
      console.error('❌ Missing required data:', { userEmail, businessId });
      showStatus('❌ Error: Missing user or business information. Please refresh the page.', 'error');
      return;
    }
    
    sendBtn.disabled = true;
    progress.style.display = 'block';
    status.style.display = 'none';
    progressFill.style.width = '20%';
    
    try {
      let payload;
      let totalCost;
      
      if (emailType === 'individual') {
        const recipientName = document.getElementById('recipientName').value.trim();
        const recipientEmail = document.getElementById('recipientEmail').value.trim();
        
        // Validate individual fields
        if (!recipientName || !recipientEmail) {
          showStatus('⚠️ Please fill in recipient name and email', 'info');
          sendBtn.disabled = false;
          progress.style.display = 'none';
          return;
        }
        
        totalCost = COSTS.individual;
        
        payload = {
          businessId: businessId,
          userEmail: userEmail,
          emailType: 'individual',
          recipient: {
            name: recipientName,
            email: recipientEmail
          },
          subject: subject,
          message: message,
          totalCost: totalCost,
          description: `Email to ${recipientName}`
        };
        
        progressText.textContent = 'Sending email...';
        
        console.log('📤 Individual Email Payload:', payload);
        
      } else {
        const sheetsUrl = document.getElementById('sheetsUrl').value.trim();
        
        // Validate bulk fields
        if (!sheetsUrl) {
          showStatus('⚠️ Please enter Google Sheets URL', 'info');
          sendBtn.disabled = false;
          progress.style.display = 'none';
          return;
        }
        
        totalCost = COSTS.bulkPerEmail * 10; // Estimate for validation
        
        payload = {
          businessId: businessId,
          userEmail: userEmail,
          emailType: 'bulk',
          sheetsUrl: sheetsUrl,
          subject: subject,
          message: message,
          totalCost: totalCost,
          costPerEmail: COSTS.bulkPerEmail,
          description: 'Bulk email campaign'
        };
        
        progressText.textContent = 'Processing bulk email request...';
        
        console.log('📤 Bulk Email Payload:', payload);
      }
      
      progressFill.style.width = '60%';
      
      console.log('📤 Sending to API:', '/api/send-email/send');
      console.log('📦 Full Payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch('/api/send-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      console.log('✅ API Response:', result);
      console.log('📊 Response Status:', response.status);
      
      if (!response.ok) {
        if (response.status === 402) {
          throw new Error(
            `Insufficient funds!\n\n` +
            `Required: ${result.formatted_required}\n` +
            `Balance: ${result.formatted_balance}\n\n` +
            `Please add credits or upgrade.`
          );
        }
        
        throw new Error(result.error || result.message || 'Failed to send email');
      }
      
      progressFill.style.width = '100%';
      
      if (result.success) {
        let successMessage;
        if (emailType === 'individual') {
          successMessage = `✅ Email sent successfully!\n\n` +
                   `Recipient: ${result.recipient}\n` +
                   `Cost: ${result.formatted_cost}\n` +
                   `New Balance: ${result.formatted_balance}`;
        } else {
          successMessage = `✅ Bulk email campaign initiated!\n\n` +
                   `${result.note}\n\n` +
                   `Cost: ${result.formatted_cost}\n` +
                   `New Balance: ${result.formatted_balance}`;
        }
        
        showStatus(successMessage, 'success');
        setTimeout(() => resetForm(), 5000);
      } else {
        throw new Error(result.error || result.message || 'Send failed');
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      console.error('❌ Error Stack:', error.stack);
      
      if (error.message.includes('Insufficient funds')) {
        showStatus(
          '❌ Insufficient Funds\n\n' +
          'Please add credits or upgrade your plan to continue.',
          'error'
        );
      } else {
        showStatus('❌ ' + error.message, 'error');
      }
    } finally {
      progress.style.display = 'none';
      sendBtn.disabled = false;
    }
  });

// ========== SHOW STATUS ==========
function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
}

// ========== RESET FORM ==========
function resetForm() {
  document.getElementById('emailSubject').value = '';
  document.getElementById('emailMessage').value = '';
  
  if (emailType === 'individual') {
    document.getElementById('recipientName').value = '';
    document.getElementById('recipientEmail').value = '';
  } else {
    document.getElementById('sheetsUrl').value = '';
  }
  
  // Hide AFAA helper
  const afaaHelper = document.querySelector('.afaa-helper');
  if (afaaHelper) {
    afaaHelper.style.display = 'none';
  }
  
  // Hide preview
  const previewSection = document.getElementById('emailPreview');
  if (previewSection) {
    previewSection.style.display = 'none';
  }
  
  progressFill.style.width = '0%';
  status.style.display = 'none';
  updateSendButton();
}

// ========== SETUP INPUT LISTENERS ==========
function setupInputListeners() {
  // Individual fields
  const recipientNameField = document.getElementById('recipientName');
  const recipientEmailField = document.getElementById('recipientEmail');
  
  if (recipientNameField) {
    recipientNameField.addEventListener('input', () => {
      updateSendButton();
      updateLivePreview();
    });
  }
  
  if (recipientEmailField) {
    recipientEmailField.addEventListener('input', () => {
      updateSendButton();
      updateLivePreview();
    });
  }
  
  // Bulk fields
  const sheetsUrlField = document.getElementById('sheetsUrl');
  if (sheetsUrlField) {
    sheetsUrlField.addEventListener('input', () => {
      updateSendButton();
      if (emailType === 'bulk') {
        updateCostBulk();
      }
      updateLivePreview();
    });
  }
  
  // Email content
  const subjectField = document.getElementById('emailSubject');
  const messageField = document.getElementById('emailMessage');
  
  if (subjectField) {
    subjectField.addEventListener('input', () => {
      updateSendButton();
      updateLivePreview();
    });
  }
  
  if (messageField) {
    messageField.addEventListener('input', () => {
      updateSendButton();
      updateLivePreview();
    });
  }
}

// ========== INITIALIZE ON PAGE LOAD ==========
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📧 Smart Email Tool Initializing...');
  console.log('User:', userEmail);
  console.log('Business:', businessId, businessName);
  
  // Load business info
  await loadBusinessInfo();
  
  // Setup event listeners
  setupEmailTypeToggle();
  setupFocusTracking();
  setupInputListeners();
  
  // Initial cost display
  updateCost();
  
  // Initial button state
  updateSendButton();
  
  console.log('✅ Smart Email Tool Ready');
});