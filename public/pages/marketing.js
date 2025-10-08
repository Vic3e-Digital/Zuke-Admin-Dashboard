// pages/marketing.js
let auth0Client = null;

async function getAuth0Client() {
  if (window.auth0Client) {
    return window.auth0Client;
  }

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

// Function to load social media cards
async function loadSocialMediaCards(userEmail, userName) {
  return `
    <div class="sim-cards-grid">
      <!-- Post Video Card -->
      <div class="sim-card" id="postVideoCard">
        <div class="sim-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="#323544" stroke-width="2"/>
            <path d="M10 8.5V15.5L16 12L10 8.5Z" fill="#323544" opacity="0.4"/>
          </svg>
        </div>
        <div class="sim-content">
          <div class="sim-body">
            <div class="sim-info">
              <h3 class="sim-name">Post Video</h3>
              <p class="sim-description">Create and share engaging video content across all your social media platforms.</p>
            </div>
            <button class="sim-action-btn" data-action="postVideo" aria-label="Post Video">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.4357 13.9174C20.8659 13.0392 20.8659 10.9608 19.4357 10.0826L9.55234 4.01389C8.05317 3.09335 6.125 4.17205 6.125 5.93128L6.125 18.0688C6.125 19.828 8.05317 20.9067 9.55234 19.9861L19.4357 13.9174Z" fill="white"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- AI Agents Card -->
      <div class="sim-card" id="aiAgentsCard">
        <div class="sim-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke="#323544" stroke-width="2"/>
            <path d="M12 2V6M12 18V22M22 12H18M6 12H2" stroke="#323544" stroke-width="2" opacity="0.4"/>
            <path d="M20.5 7.5L17.5 10.5M6.5 16.5L3.5 19.5M20.5 16.5L17.5 13.5M6.5 7.5L3.5 4.5" stroke="#323544" stroke-width="2" opacity="0.4"/>
          </svg>
        </div>
        <div class="sim-content">
          <div class="sim-body">
            <div class="sim-info">
              <h3 class="sim-name">AI Agents</h3>
              <p class="sim-description">Deploy AI-powered agents to automate your social media engagement and responses.</p>
            </div>
            <button class="sim-action-btn" data-action="aiAgents" aria-label="Open AI Agents">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.4357 13.9174C20.8659 13.0392 20.8659 10.9608 19.4357 10.0826L9.55234 4.01389C8.05317 3.09335 6.125 4.17205 6.125 5.93128L6.125 18.0688C6.125 19.828 8.05317 20.9067 9.55234 19.9861L19.4357 13.9174Z" fill="white"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Post Image Card -->
      <div class="sim-card" id="postImageCard">
        <div class="sim-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#323544" stroke-width="2"/>
            <circle cx="8.5" cy="8.5" r="1.5" fill="#323544"/>
            <path d="M21 15L16 10L5 21" stroke="#323544" stroke-width="2" opacity="0.4"/>
          </svg>
        </div>
        <div class="sim-content">
          <div class="sim-body">
            <div class="sim-info">
              <h3 class="sim-name">Post Image</h3>
              <p class="sim-description">Share stunning images and graphics to boost your social media presence.</p>
            </div>
            <button class="sim-action-btn" data-action="postImage" aria-label="Post Image">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.4357 13.9174C20.8659 13.0392 20.8659 10.9608 19.4357 10.0826L9.55234 4.01389C8.05317 3.09335 6.125 4.17205 6.125 5.93128L6.125 18.0688C6.125 19.828 8.05317 20.9067 9.55234 19.9861L19.4357 13.9174Z" fill="white"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Text + AI Image Card -->
      <div class="sim-card" id="textAIImageCard">
        <div class="sim-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5 2 4 3 4 4V20C4 21 5 22 6 22H18C19 22 20 21 20 20V8L14 2Z" stroke="#323544" stroke-width="2"/>
            <polyline points="14,2 14,8 20,8" stroke="#323544" stroke-width="2"/>
            <line x1="8" y1="13" x2="16" y2="13" stroke="#323544" stroke-width="2" opacity="0.4"/>
            <line x1="8" y1="17" x2="13" y2="17" stroke="#323544" stroke-width="2" opacity="0.4"/>
            <rect x="14" y="16" width="4" height="4" rx="1" fill="#323544" opacity="0.4"/>
          </svg>
        </div>
        <div class="sim-content">
          <div class="sim-body">
            <div class="sim-info">
              <h3 class="sim-name">Text + AI Image</h3>
              <p class="sim-description">Combine compelling text with AI-generated images for unique social media posts.</p>
            </div>
            <button class="sim-action-btn" data-action="textAIImage" aria-label="Text + AI Image">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.4357 13.9174C20.8659 13.0392 20.8659 10.9608 19.4357 10.0826L9.55234 4.01389C8.05317 3.09335 6.125 4.17205 6.125 5.93128L6.125 18.0688C6.125 19.828 8.05317 20.9067 9.55234 19.9861L19.4357 13.9174Z" fill="white"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Create Article Card -->
      <div class="sim-card" id="createArticleCard">
        <div class="sim-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4H20C20.5 4 21 4.5 21 5V19C21 19.5 20.5 20 20 20H4C3.5 20 3 19.5 3 19V5C3 4.5 3.5 4 4 4Z" stroke="#323544" stroke-width="2"/>
            <line x1="7" y1="9" x2="17" y2="9" stroke="#323544" stroke-width="2"/>
            <line x1="7" y1="13" x2="17" y2="13" stroke="#323544" stroke-width="2" opacity="0.4"/>
            <line x1="7" y1="17" x2="13" y2="17" stroke="#323544" stroke-width="2" opacity="0.4"/>
          </svg>
        </div>
        <div class="sim-content">
          <div class="sim-body">
            <div class="sim-info">
              <h3 class="sim-name">Create Article</h3>
              <p class="sim-description">Write and publish long-form content articles for LinkedIn and blog platforms.</p>
            </div>
            <button class="sim-action-btn" data-action="createArticle" aria-label="Create Article">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.4357 13.9174C20.8659 13.0392 20.8659 10.9608 19.4357 10.0826L9.55234 4.01389C8.05317 3.09335 6.125 4.17205 6.125 5.93128L6.125 18.0688C6.125 19.828 8.05317 20.9067 9.55234 19.9861L19.4357 13.9174Z" fill="white"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Function to render video upload form
function renderVideoUploadForm(container) {
  const WEBHOOK_URL = "https://aigent-staging.zuke.co.za/webhook/fbb44378-5d09-45f4-8393-19dbf91a317c";

  container.innerHTML = '';

  
  // Add HTML     
  const wrapper = document.createElement('div');
  wrapper.className = 'video-upload-wrapper';
  wrapper.innerHTML = `
    <div class="video-form-container">
      <div class="video-success-message" id="videoSuccessMessage">
        Form submitted successfully! 🎉
      </div>
   
      <form id="videoContactForm">
        <div class="video-form-group">
          <input
            type="text"
            id="videoName"
            name="name"
            placeholder="Business Name"
            required
          >
        </div>
   
        <div class="video-option-card selected">
          <div class="video-option-title">Video Upload</div>
          <div class="video-option-subtitle">MP4 files only</div>
   
          <label for="videoFileInput" class="video-file-label">Choose Video</label>
          <input
            type="file"
            id="videoFileInput"
            name="file"
            class="video-file-input"
           accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm"
            required
          >
         
          <div class="video-file-info" id="videoFileInfo"></div>
        </div>
   
        <div class="video-form-group">
          <textarea
            id="videoNotes"
            name="notes"
            placeholder="Notes (optional)"
          ></textarea>
        </div>
   
        <button type="submit" class="video-submit-btn">
          <span>Submit</span>
        </button>
      </form>
    </div>
  `;
  
  container.appendChild(wrapper);
  
  // Add JavaScript functionality
  const form = document.getElementById("videoContactForm");
  const fileInput = document.getElementById("videoFileInput");
  const fileInfo = document.getElementById("videoFileInfo");
  const successMessage = document.getElementById("videoSuccessMessage");

  
  // File input display
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert("Please select a video file only.");
        fileInput.value = "";
        fileInfo.textContent = "";
        return;
      }
      fileInfo.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
    } else {
      fileInfo.textContent = "";
    }
  });
  
  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
  
    if (!fileInput.files[0]) {
      alert("Please select a video file to upload.");
      return;
    }
  
    try {
      console.log("Uploading to Cloudinary...");
      const fileUrl = await uploadToCloudinary(fileInput.files[0]);
      console.log("Cloudinary URL:", fileUrl);
  
      console.log("Submitting to webhook...");
      const formData = new FormData();
      formData.append("name", document.getElementById("videoName").value);
      formData.append("notes", document.getElementById("videoNotes").value);
      formData.append("fileUrl", fileUrl);
  
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        body: formData
      });
  
      console.log("Webhook response status:", response.status);
     
      if (response.ok) {
        const responseData = await response.json();
        console.log("Webhook submission successful:", responseData);
        showSuccess();
      } else {
        const errorText = await response.text();
        console.error("Webhook error:", errorText);
        throw new Error(`Webhook returned status ${response.status}`);
      }
  
    } catch (err) {
      console.error("Error:", err);
      alert("There was an error processing your submission. Please try again.");
    }
  });
  
  // Helper functions
  async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_preset");
  
    const response = await fetch("https://api.cloudinary.com/v1_1/dl0u8tzae/upload", {
      method: "POST",
      body: formData
    });
  
    const data = await response.json();
  
    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error("Cloudinary upload failed");
    }
  }
  
  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
  
  function showSuccess() {
    successMessage.style.display = "block";
    setTimeout(() => {
      successMessage.style.display = "none";
      form.reset();
      fileInfo.textContent = "";
    }, 3000);
  }
}

export async function initMarketingPage() {
  const auth0Client = await getAuth0Client();
  
  if (!auth0Client) {
    console.error("Failed to get Auth0 client");
    return;
  }

  const modal = document.getElementById("marketingModal");
  const modalTitle = document.getElementById("modalTitle");
  const iframe = document.getElementById("modalIframe");
  const closeBtn = document.getElementsByClassName("close")[0];

  try {
    const isAuthenticated = await auth0Client.isAuthenticated();
    
    if (!isAuthenticated) {
      console.error("User not authenticated");
      window.location.href = '/';
      return;
    }

    const user = await auth0Client.getUser();
    const userEmail = user.email || user.name || 'unknown';
    const userName = user.name || 'User';

    // Handle Social Media card click
    const socialMediaBtn = document.getElementById("openSocialMediaBtn");
    if (socialMediaBtn) {
      socialMediaBtn.onclick = async function(e) {
        e.stopPropagation();
        
        document.getElementById("marketingMainContent").style.display = "none";
        document.getElementById("socialMediaSubContent").style.display = "block";
        
        const socialMediaCardsDiv = document.getElementById("socialMediaCards");
        socialMediaCardsDiv.innerHTML = await loadSocialMediaCards(userEmail, userName);
        
        setupSocialMediaHandlers(userEmail, userName, modal, modalTitle, iframe);
      }
    }

    // Handle Email Marketing button
    const emailMarketingBtn = document.getElementById("openEmailMarketingBtn");
    if (emailMarketingBtn) {
      emailMarketingBtn.onclick = function(e) {
        e.stopPropagation();
        modalTitle.textContent = "Email Marketing";
        iframe.style.display = "block";
        iframe.src = `https://aigents.southafricanorth.azurecontainer.io/email-marketing?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`;
        modal.style.display = "block";
        document.body.style.overflow = 'hidden';
      }
    }

    // Handle Analytics button
    const analyticsBtn = document.getElementById("openAnalyticsBtn");
    if (analyticsBtn) {
      analyticsBtn.onclick = function(e) {
        e.stopPropagation();
        modalTitle.textContent = "Marketing Analytics";
        iframe.style.display = "block";
        iframe.src = `https://aigents.southafricanorth.azurecontainer.io/marketing-analytics?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`;
        modal.style.display = "block";
        document.body.style.overflow = 'hidden';
      }
    }

    // Back to Marketing function
    window.backToMarketing = function() {
      document.getElementById("marketingMainContent").style.display = "block";
      document.getElementById("socialMediaSubContent").style.display = "none";
    }

    // Close modal handlers
    if (closeBtn) {
      closeBtn.onclick = function() {
        modal.style.display = "none";
        iframe.src = "";
        iframe.style.display = "block";
        const contentDiv = document.getElementById('modalContentDiv');
        if (contentDiv) contentDiv.remove();
        document.body.style.overflow = 'auto';
      }
    }

    window.addEventListener('click', function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
        iframe.src = "";
        iframe.style.display = "block";
        const contentDiv = document.getElementById('modalContentDiv');
        if (contentDiv) contentDiv.remove();
        document.body.style.overflow = 'auto';
      }
    });

  } catch (error) {
    console.error("Error in initMarketingPage:", error);
  }
}

function setupSocialMediaHandlers(userEmail, userName, modal, modalTitle, iframe) {
  const socialMediaActions = {
    postVideo: {
      title: "Post Video - Social Media Manager",
      renderContent: true
    },
    aiAgents: {
      title: "AI Agents - Social Media Automation",
      url: `https://aigents.southafricanorth.azurecontainer.io/social-agents?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`
    },
    postImage: {
      title: "Post Image - Visual Content Creator",
      url: `https://aigents.southafricanorth.azurecontainer.io/image-post?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`
    },
    textAIImage: {
      title: "Text + AI Image Generator",
      url: `https://aigents.southafricanorth.azurecontainer.io/ai-image-generator?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`
    },
    createArticle: {
      title: "Article Creator - Long-form Content",
      url: `https://aigents.southafricanorth.azurecontainer.io/article-creator?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`
    }
  };

  // Add click handlers to all social media buttons
  const socialMediaButtons = document.querySelectorAll('#socialMediaCards .sim-action-btn');
  socialMediaButtons.forEach(btn => {
    btn.onclick = function(e) {
      e.stopPropagation();
      const action = btn.getAttribute('data-action');
      const config = socialMediaActions[action];
      
      if (config) {
        modalTitle.textContent = config.title;
        
        if (config.renderContent) {
          // Hide iframe, show custom content
          iframe.style.display = 'none';
          let contentDiv = document.getElementById('modalContentDiv');
          if (!contentDiv) {
            contentDiv = document.createElement('div');
            contentDiv.id = 'modalContentDiv';
            contentDiv.style.cssText = 'width: 100%; height: 500px; overflow: auto;';
            iframe.parentNode.insertBefore(contentDiv, iframe);
          }
          contentDiv.style.display = 'block';
          
          // Render video upload form
          renderVideoUploadForm(contentDiv);
        } else {
          // Use iframe for external URLs
          iframe.style.display = 'block';
          const contentDiv = document.getElementById('modalContentDiv');
          if (contentDiv) contentDiv.style.display = 'none';
          iframe.src = config.url;
        }
        
        modal.style.display = "block";
        document.body.style.overflow = 'hidden';
      }
    }
  });
}