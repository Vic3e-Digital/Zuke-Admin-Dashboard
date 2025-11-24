// pages/afaa.js
let auth0Client = null;
let currentBusiness = null;

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

export async function initAfaaPage() {
  const auth0Client = await getAuth0Client();
  if (!auth0Client) {
    console.error("Failed to get Auth0 client");
    return;
  }

  const modal = document.getElementById("afaaModal");
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
    const userEmail = user.email || 'unknown';
    const userName = user.name || 'User';

    currentBusiness = window.dataManager.getSelectedBusinessOrFirst();
    const businessName = currentBusiness?.store_info?.name || 'No Business';
    const businessId = currentBusiness?._id || '';
    const businessCase = JSON.stringify(currentBusiness?.initial_business_case || {});

    console.log("AFAA page loaded for:", businessName);

    // Setup buttons
    const buttons = [
      {
        btn: document.getElementById("afaaTool1Btn"),
        title: "Find Partners from LinkedIn",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/zuke-x-dineo-simple?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&business=${encodeURIComponent(businessName)}&businessId=${businessId}&businessCase=${businessCase}`
      },
      {
        btn: document.getElementById("afaaToolFishoekBtn"),
        title: "Project Fishoek",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/zuke-x-dineo-rediscoverme-coaching?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&business=${encodeURIComponent(businessName)}&businessId=${businessId}&businessCase=${businessCase}`
      },
      {
        btn: document.getElementById("shiftOutreach"),
        title: "Shift Outreach",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/find-shift-leads-2?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&business=${encodeURIComponent(businessName)}&businessId=${businessId}&businessCase=${businessCase}`
      },
      {
        btn: document.getElementById("afaaTool2Btn"),
        title: "Find Partner Emails",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/dineo-enrichment?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&business=${encodeURIComponent(businessName)}&businessId=${businessId}&businessCase=${businessCase}`
      },
      {
        btn: document.getElementById("afaaTool3Btn"),
        title: "Email Partners",
        url: `/tools/send-email.html`
      },
      {
        btn: document.getElementById("afaaTool4Btn"),
        title: "Post Video to Socials",
        url: `/tools/post-video.html?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&business=${encodeURIComponent(businessName)}&businessId=${businessId}&businessCase=${businessCase}`,
        isBeta: true
      },
      {
        btn: document.getElementById("afaaTool5Btn"),
        title: "Post Image to Socials",
        url: `/tools/post-image.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      },
      {
        btn: document.getElementById("afaaTool6Btn"), 
        title: "Generate Videos with AI",
        url: `/tools/create-ai-video.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`,
        isBeta: true
      },
      {
        btn: document.getElementById("afaaTool7Btn"),
        title: "Generate Images with AI",
        url: `/tools/image-editor.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`,
        isBeta: true
      },
      {
        btn: document.getElementById("afaaTool8Btn"),
        title: "Create Videos with VEO AI",
        url: `/tools/veo-video.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`,
        isBeta: true
      },
      {
        btn: document.getElementById("afaaToolFindLeadsBtn"),
        title: "Find Leads",
        url: `/tools/find-leads.html`
      },
      {
        btn: document.getElementById("afaaTool9Btn"),
        title: "Draft Partner Email",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/Draft-Outreach-Mail?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&business=${encodeURIComponent(businessName)}&businessId=${businessId}&businessCase=${businessCase}`
      }
    ];

    // Add click handlers
    buttons.forEach(({btn, title, url, isBeta}) => {
      if (btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          
          // Check if this is a beta feature
          if (isBeta) {
            showBetaWarning(title, url, modal, modalTitle, iframe);
            return;
          }
          
          // Normal behavior for other buttons
          modalTitle.textContent = title;
          iframe.src = url;
          modal.style.display = "block";
          document.body.style.overflow = 'hidden';
        }
      }
    });

    // Setup close button
    if (closeBtn) {
      closeBtn.onclick = function() {
        modal.style.display = "none";
        iframe.src = "";
        document.body.style.overflow = 'auto';
      }
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
        iframe.src = "";
        document.body.style.overflow = 'auto';
      }
    });

  } catch (error) {
    console.error("Error in initAfaaPage:", error);
  }
}
