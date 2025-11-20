// pages/creative.js
let auth0Client = null;

async function getAuth0Client() {
  // Check if already exists in window
  if (window.auth0Client) {
    return window.auth0Client;
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
    
    // Store it globally
    window.auth0Client = auth0Client;
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
    modalTitle.textContent = title;
    iframe.src = url;
    modal.style.display = "block";
    document.body.style.overflow = 'hidden';
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
  
  // Get main cards and sim cards containers
  const mainStoreCard = document.getElementById("mainStoreCard");
  const mainAudioCard = document.getElementById("mainAudioCard");
  const simCardsContainer = document.getElementById("simCardsContainer");
  const audioCardsContainer = document.getElementById("audioCardsContainer");

  try {
    // Check authentication
    const isAuthenticated = await auth0Client.isAuthenticated();
    
    if (!isAuthenticated) {
      console.error("User not authenticated");
      window.location.href = '/';
      return;
    }

    // Get user info
    const user = await auth0Client.getUser();
    const userEmail = user.email || user.name || 'unknown';
    const userName = user.name;
    console.log("User email:", userEmail);
    console.log("User name:", userName);

    // Get business info
    const currentBusiness = window.dataManager.getSelectedBusinessOrFirst();
    const businessName = currentBusiness?.store_info?.name || 'No Business';
    const businessId = currentBusiness?._id || '';

    // Toggle sim cards when main Branding card is clicked
    if (mainStoreCard && simCardsContainer) {
      mainStoreCard.addEventListener('click', function(e) {
        // Don't toggle if clicking on info icon or its tooltip
        if (e.target.closest('.main-sim-info-icon') || e.target.closest('.main-sim-info-tooltip')) {
          return;
        }
        
        // Hide audio cards
        if (audioCardsContainer) {
          audioCardsContainer.style.display = 'none';
        }
        
        // Toggle display
        if (simCardsContainer.style.display === 'none' || simCardsContainer.style.display === '') {
          simCardsContainer.style.display = 'grid';
          // Smooth scroll to sim cards
          setTimeout(() => {
            simCardsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 100);
        } else {
          simCardsContainer.style.display = 'none';
        }
      });
      
      // Add cursor pointer to indicate it's clickable
      mainStoreCard.style.cursor = 'pointer';
    }

    // Toggle audio cards when main Audio card is clicked
    if (mainAudioCard && audioCardsContainer) {
      mainAudioCard.addEventListener('click', function(e) {
        // Don't toggle if clicking on info icon or its tooltip
        if (e.target.closest('.main-sim-info-icon') || e.target.closest('.main-sim-info-tooltip')) {
          return;
        }
        
        // Hide branding cards
        if (simCardsContainer) {
          simCardsContainer.style.display = 'none';
        }
        
        // Toggle display
        if (audioCardsContainer.style.display === 'none' || audioCardsContainer.style.display === '') {
          audioCardsContainer.style.display = 'grid';
          // Smooth scroll to audio cards
          setTimeout(() => {
            audioCardsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 100);
        } else {
          audioCardsContainer.style.display = 'none';
        }
      });
      
      // Add cursor pointer to indicate it's clickable
      mainAudioCard.style.cursor = 'pointer';
    }

    // Setup buttons with dynamic URLs
    const buttons = [
      {
        btn: document.getElementById("openModalBtn"),
        title: "Neo - Find Customers",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/fbfabdbb-a36e-4761-93b2-a55e4bfe62a9?Email=${encodeURIComponent(userEmail)}&Business%20Descripion=${encodeURIComponent(userName)}`
      }
    ];

    // Setup coming soon buttons
    const comingSoonButtons = [
      {
        btn: document.getElementById("openLogoBtn"),
        name: "Design Logo Concepts"
      },
      {
        btn: document.getElementById("openFlyerBtn"),
        name: "Design Flyers"
      }
    ];

    // Setup beta buttons - NOW WITH BETA WARNING
    const betaButtons = [
      {
        btn: document.getElementById("card8"),
        title: "Create Videos with VEO AI (Advanced)",
        url: `/tools/veo-video.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      },
      {
        btn: document.getElementById("card7"),
        title: "Create Images with AI",
        url: `/tools/image-editor.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      },
      {
        btn: document.getElementById("improveImage"),
        title: "Improve an Image",
        url: `/tools/improve-image.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      },
      {
        btn: document.getElementById("transcribeAudioBtn"),
        title: "Transcribe Audio",
        url: `/pages/creative/transcribe-audio.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      }
    ];

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
        // Check if btn is the card itself or has an action button
        const actionBtn = btn.classList.contains('sim-action-btn') ? btn : btn.querySelector('.sim-action-btn');
        if (actionBtn) {
          actionBtn.onclick = function(e) {
            e.stopPropagation();
            showBetaWarning(title, url, modal, modalTitle, iframe);
          }
        }
      }
    });

    // Close handlers
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