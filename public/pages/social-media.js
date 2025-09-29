// pages/social-media.js
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

export async function initSocialMediaPage() {
  // Get or create Auth0 client
  const auth0Client = await getAuth0Client();
  
  if (!auth0Client) {
    console.error("Failed to get Auth0 client");
    return;
  }


  // Get modal elements
  const modal = document.getElementById("socialModal");
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
    const userName = user.name || 'User';
    console.log("User email:", userEmail);
    console.log("User name:", userName);

    // Setup buttons with dynamic URLs
    const buttons = [
      {
        btn: document.getElementById("openPostVideoBtn"),
        title: "Post Video - Social Media Manager",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/ddc7013b-c4f3-43ac-ad0c-811f9e4eb108?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`
      },
      {
        btn: document.getElementById("openAIAgentsBtn"),
        title: "AI Agents - Social Media Automation",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/f7c46fc1-4347-4305-bbb3-799075bc1856?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`
      },
      {
        btn: document.getElementById("openPostImageBtn"),
        title: "Post Image - Visual Content Creator",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/e8fcd89a-c44b-40bc-9890-d9b20220be70?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`
      },
      {
        btn: document.getElementById("openTextAIImageBtn"),
        title: "Text + AI Image Generator",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/e8fcd89a-c44b-40bc-9890-d9b20220be70?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`
      },
      {
        btn: document.getElementById("openCreateArticleBtn"),
        title: "Article Creator - Long-form Content",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/276843b8-74d3-4d06-b49c-75cb04a0b673?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`
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
    console.error("Error in initSocialMediaPage:", error);
  }
}