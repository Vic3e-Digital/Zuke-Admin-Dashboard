// pages/creative.js
let auth0Client = null;

async function getAuth0Client() {
  // Check if already exists in window
  if (window.auth0Client) {
    return window.auth0Client;
  }

  // Check DataManager cache
  if (window.dataManager && window.dataManager.getAuth0Client) {
    const cachedClient = window.dataManager.getAuth0Client();
    if (cachedClient) {
      window.auth0Client = cachedClient;
      return cachedClient;
    }
  }

  // Otherwise configure it
  try {
    const response = await fetch("/auth_config.json");
    const config = await response.json();

    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      cacheLocation: 'localstorage',
      useRefreshTokens: true
    });
    
    // Store it globally and in DataManager
    window.auth0Client = auth0Client;
    if (window.dataManager && window.dataManager.setAuth0Client) {
      window.dataManager.setAuth0Client(auth0Client);
    }
    return auth0Client;
  } catch (error) {
    console.error("Error configuring Auth0:", error);
    return null;
  }
}

// Function to show beta warning popup
function showBetaWarning(title, url, modal, modalTitle, iframe) {
  const popupHTML = `
    <div id="betaWarningPopup" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    ">
      <div style="
        background: white;
        border-radius: 16px;
        padding: 40px;
        max-width: 500px;
        margin: 20px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        text-align: center;
        animation: slideUp 0.3s ease;
      ">
        <div style="font-size: 64px; margin-bottom: 20px;">🧪</div>
        <div style="
          background: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
        ">
          <span style="color: #856404; font-weight: bold; font-size: 14px;">⚠️ BETA FEATURE</span>
        </div>
        <h2 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 24px;">Testing in Progress</h2>
        <p style="color: #666; margin-bottom: 30px; line-height: 1.6; font-size: 16px;">
          This feature is currently in beta testing. You may experience some bugs or unexpected behavior. We're working hard to make it perfect for you!
        </p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="proceedBetaBtn" style="
            background: linear-gradient(135deg, #ff8b00 0%, #ff6b35 100%);
            color: white;
            border: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s ease;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            Try it anyway
          </button>
          <button onclick="document.getElementById('betaWarningPopup').remove()" style="
            background: #e0e0e0;
            color: #333;
            border: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s ease;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            Maybe later
          </button>
        </div>
      </div>
    </div>
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    </style>
  `;
  
  document.body.insertAdjacentHTML('beforeend', popupHTML);
  
  // Handle proceed button
  document.getElementById('proceedBetaBtn').addEventListener('click', function() {
    document.getElementById('betaWarningPopup').remove();
    // Open the actual modal
    if (modal && modalTitle && iframe) {
      modalTitle.textContent = title;
      iframe.src = url;
      modal.style.display = "block";
      document.body.style.overflow = 'hidden';
    }
  });
  
  // Close on background click
  document.getElementById('betaWarningPopup').addEventListener('click', function(e) {
    if (e.target === this) {
      this.remove();
    }
  });
}

export async function initCreativePage() {
  // Get or create Auth0 client
  const auth0Client = await getAuth0Client();
  
  if (!auth0Client) {
    console.error("Failed to get Auth0 client");
    return;
  }

  // Get modal elements
  const modal = document.getElementById("myModal");
  const modalTitle = document.getElementById("modalTitle");
  const iframe = document.getElementById("modalIframe");
  const closeBtn = document.getElementsByClassName("close")[0];

  try {
    // Check dataManager cache FIRST
    let userEmail = window.dataManager?.getUserEmail();
    let userName = window.dataManager?.getUserName();

    // If not in cache, get from Auth0
    if (!userEmail || !userName) {
      console.log("Getting user from Auth0...");
      let user = null;
      
      try {
        user = await auth0Client.getUser();
      } catch (error) {
        console.warn("Error getting user from Auth0Client");
      }
      
      if (!user) {
        console.error("User not found - not authenticated");
        return;
      }

      userEmail = user.email || user.name || 'unknown';
      userName = user.name;
      
      // Cache it for next time
      if (window.dataManager) {
        window.dataManager.setUserEmail(userEmail);
        window.dataManager.setUserName(userName);
      }
    }

    console.log("User email:", userEmail);
    console.log("User name:", userName);

    // Get business info
    const currentBusiness = window.dataManager.getSelectedBusinessOrFirst();
    const businessName = currentBusiness?.store_info?.name || 'No Business';
    const businessId = currentBusiness?._id || '';

    // Setup category card click handlers (like business.js)
    const categoryCards = document.querySelectorAll('.main-sim-card');
    console.log('Found category cards:', categoryCards.length);
    categoryCards.forEach(card => {
      const categoryId = card.getAttribute('data-category');
      console.log('Setting up click handler for card:', categoryId);
      card.addEventListener('click', function(e) {
        // Only toggle if clicking on the card itself, not on buttons inside
        if (e.target.closest('.sim-action-btn')) {
          return;
        }
        console.log('Main card clicked:', categoryId);
        toggleSubcategory(categoryId);
      });
    });

    // ========== BUTTON CONFIGURATIONS ==========
    // Setup buttons with dynamic URLs (active features)
    const buttons = [
      {
        btn: document.getElementById("openModalBtn"),
        title: "Neo - Find Customers",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/fbfabdbb-a36e-4761-93b2-a55e4bfe62a9?Email=${encodeURIComponent(userEmail)}&Business%20Descripion=${encodeURIComponent(userName)}`
      }
    ];

    // Setup coming soon buttons
    const comingSoonButtons = [
      // No coming soon buttons currently
    ];

    // Setup beta buttons - WITH BETA WARNING
    const betaButtons = [
      {
        btn: document.getElementById("afaaTool8Btn"),
        title: "Create Videos with VEO AI (Advanced)",
        url: `/tools/veo-video.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      },
      {
        btn: document.getElementById("openLogoBtn"),
        title: "Design Logo Concepts",
        url: `/pages/creative/create-logos.html`
      },
      {
        btn: document.getElementById("afaaTool7Btn"),
        title: "Create Images with AI",
        url: `/tools/image-editor.html`
      },
      {
        btn: document.getElementById("improveImage"),
        title: "Improve an Image",
        url: `/tools/improve-image.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      },
      {
        btn: document.querySelector('#textAIImageCard .sim-action-btn'),
        title: "Text + AI Image",
        url: `/tools/text-ai-image.html`
      }
    ];

    // Setup Photography Models buttons (using standard modal)
    const modelsButtons = [
      {
        btn: document.getElementById("registerModelBtn"),
        title: "Join as a Model",
        url: `/pages/creative/model-registration.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      },
      {
        btn: document.getElementById("browseModelsBtn"),
        title: "Browse Models",
        url: `/pages/creative/browse-models.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      },
      {
        btn: document.getElementById("transcribeAudioBtn"),
        title: "Transcribe Audio",
        url: `/pages/creative/transcribe-audio.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      }
    ];

    // Setup Photoshoots buttons
    const photoshootsButtons = [
      {
        btn: document.getElementById("photoshootModelRegBtn"),
        title: "Model Registration",
        url: `/pages/creative/model-registration.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      }
    ];

    // Setup Generate Image button (for Branding section)
    const generateImageButtons = [
      {
        btn: document.getElementById("generateImageBtn"),
        title: "Generate Images",
        url: `/pages/creative/photoshoot.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
        // url: `/pages/creative/Image-Generation.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      }
    ];

    // Setup Design Flyers button (NEW)
    const flyerDesignButtons = [
      {
        btn: document.getElementById("openFlyerBtn"),
        title: "Design Flyers & Ads",
        url: `/pages/creative/creative-tools/design-flyers.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      }
    ];

    // ========== CLICK HANDLERS ==========
    // Add click handlers for active features
    buttons.forEach(({btn, title, url}) => {
      if (btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          modalTitle.textContent = title;
          iframe.src = url;
          modal.style.display = "block";
          document.body.style.overflow = 'hidden';
        }
      }
    });

    // Add click handlers for coming soon features
    comingSoonButtons.forEach(({btn, name}) => {
      if (btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          e.preventDefault();
          // Disabled - no action for coming soon features
        }
      }
    });

    // Add click handlers for beta features
    betaButtons.forEach(({btn, title, url}) => {
      if (btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          showBetaWarning(title, url, modal, modalTitle, iframe);
        }
      }
    });

    // Add click handlers for Photography Models buttons (using standard modal)
    modelsButtons.forEach(({btn, title, url}) => {
      if (btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          modalTitle.textContent = title;
          iframe.src = url;
          modal.style.display = "block";
          document.body.style.overflow = 'hidden';
        }
      }
    });

    // Add click handlers for Photoshoots buttons (using standard modal)
    photoshootsButtons.forEach(({btn, title, url}) => {
      if (btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          modalTitle.textContent = title;
          iframe.src = url;
          modal.style.display = "block";
          document.body.style.overflow = 'hidden';
        }
      }
    });

    // Add click handlers for Generate Image button (using standard modal)
    generateImageButtons.forEach(({btn, title, url}) => {
      if (btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          modalTitle.textContent = title;
          iframe.src = url;
          modal.style.display = "block";
          document.body.style.overflow = 'hidden';
        }
      }
    });

    // Add click handlers for Design Flyers button (using standard modal)
    flyerDesignButtons.forEach(({btn, title, url}) => {
      if (btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          modalTitle.textContent = title;
          iframe.src = url;
          modal.style.display = "block";
          document.body.style.overflow = 'hidden';
        }
      }
    });

    // ========== MODAL CLOSE HANDLERS ==========
    if (closeBtn) {
      closeBtn.onclick = function() {
        modal.style.display = "none";
        iframe.src = "";
        document.body.style.overflow = 'auto';
      }
    }

    window.addEventListener('click', function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
        iframe.src = "";
        document.body.style.overflow = 'auto';
      }
    });

  } catch (error) {
    console.error("Error in initCreativePage:", error);
  }
}

function toggleSubcategory(categoryId) {
  console.log('toggleSubcategory called with:', categoryId);
  
  // Close all subcategories first
  const allSubcategories = document.querySelectorAll('.subcategory-container');
  const clickedSubcategory = document.getElementById(categoryId);
  
  console.log('Found subcategory element:', clickedSubcategory);
  console.log('Element classes BEFORE:', clickedSubcategory?.className);
  
  const wasActive = clickedSubcategory?.classList.contains('active');
  console.log('Was active?', wasActive);
  
  // Remove active from all
  allSubcategories.forEach(sub => {
    console.log('Removing active from:', sub.id);
    sub.classList.remove('active');
  });

  // Toggle the clicked category (open if it wasn't active)
  if (clickedSubcategory && !wasActive) {
    clickedSubcategory.classList.add('active');
    console.log('Adding active class to:', categoryId);
    console.log('Element classes AFTER:', clickedSubcategory.className);
    
    // Smooth scroll to subcategory
    setTimeout(() => {
      clickedSubcategory.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }, 100);
  } else {
    console.log('NOT adding active class because wasActive =', wasActive);
  }
}