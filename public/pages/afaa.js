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
        btn: document.getElementById("afaaTool2Btn"),
        title: "Find Partner Emails",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/dineo-enrichment?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&business=${encodeURIComponent(businessName)}&businessId=${businessId}&businessCase=${businessCase}`
      },
      {
        btn: document.getElementById("afaaTool3Btn"),
        title: "Email Partners",
        url: `https://your-email-outreach-tool.com?email=${encodeURIComponent(userEmail)}&business=${encodeURIComponent(businessName)}`
      },
      {
        btn: document.getElementById("afaaTool4Btn"),
        title: "Post Video to Socials",
        url: `/tools/post-video.html?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&business=${encodeURIComponent(businessName)}&businessId=${businessId}&businessCase=${businessCase}`
      },
      {
        btn: document.getElementById("afaaTool5Btn"),
        title: "Post Image to Socials",
        url: `/tools/post-image.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      },
      
      {
        btn: document.getElementById("afaaTool6Btn"),
        title: "Generate AI Content",
        url: `/tools/generate-content.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`
      }
    ];

    // Add click handlers
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