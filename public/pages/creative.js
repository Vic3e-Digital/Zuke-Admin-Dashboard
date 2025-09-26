// pages/business.js
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

    // Setup buttons with dynamic URLs
    const buttons = [
      {
        btn: document.getElementById("openModalBtn"),
        title: "Neo - Find Customers",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/fbfabdbb-a36e-4761-93b2-a55e4bfe62a9?Email=${encodeURIComponent(userEmail)}&Business%20Descripion=${encodeURIComponent(userName)}`
      },
      {
        btn: document.getElementById("openModalBtn2"),
        title: "Dineo - Sales Analytics",
        url: `#`
      },
    //   {
    //     btn: document.getElementById("openModalBtn3"),
    //     title: "Alex - Business Intelligence",
    //     url: `#`
    //   }
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
    console.error("Error in initTestPage:", error);
  }
}