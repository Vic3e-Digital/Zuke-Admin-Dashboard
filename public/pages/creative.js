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
  
  // Get main card and sim cards container
  const mainStoreCard = document.getElementById("mainStoreCard");
  const simCardsContainer = document.getElementById("simCardsContainer");

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

    // Toggle sim cards when main card is clicked
    if (mainStoreCard && simCardsContainer) {
      mainStoreCard.addEventListener('click', function(e) {
        // Don't toggle if clicking on info icon or its tooltip
        if (e.target.closest('.main-sim-info-icon') || e.target.closest('.main-sim-info-tooltip')) {
          return;
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

    // Function to show Coming Soon modal
    function showComingSoon(featureName) {
      const comingSoonHTML = `
        <div id="comingSoonModal" class="modal" style="display: block;">
          <div class="modal-content" style="max-width: 400px; text-align: center;">
            <span class="close" onclick="document.getElementById('comingSoonModal').remove(); document.body.style.overflow = 'auto';">&times;</span>
            <div style="padding: 30px 20px;">
              <div style="font-size: 64px; margin-bottom: 20px;">🎨</div>
              <h2 style="margin: 0 0 15px 0; color: #2c3e50;">Coming Soon!</h2>
              <p style="color: #666; margin-bottom: 25px; line-height: 1.6;">
                <strong>${featureName}</strong> is currently in development and will be available soon.
              </p>
              <p style="color: #999; font-size: 14px; margin-bottom: 25px;">
                Stay tuned for exciting updates!
              </p>
              <button class="btn-primary" onclick="document.getElementById('comingSoonModal').remove(); document.body.style.overflow = 'auto';" style="width: 100%;">
                Got it!
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', comingSoonHTML);
      document.body.style.overflow = 'hidden';
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
          showComingSoon(name);
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