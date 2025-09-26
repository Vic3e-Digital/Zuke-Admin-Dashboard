// Dashboard functionality

// Add this helper function at the top of dashboard.js
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

// Auth0 client
let auth0Client = null;

const fetchAuthConfig = () => fetch("/auth_config.json");

const configureAuth0Client = async () => {
  try {
    const response = await fetchAuthConfig();
    const config = await response.json();

    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      cacheLocation: 'localstorage',
      useRefreshTokens: true
    });
    
    return true;
  } catch (error) {
    console.error("Error configuring Auth0 client:", error);
    return false;
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  const hamburgerMenu = document.getElementById("hamburgerMenu");
  const sidebar = document.getElementById("sidebar");
  const dashboardContainer = document.querySelector(".dashboard-container");
  const logoutButton = document.getElementById("logoutButton");
  const tokensButton = document.getElementById("tokensButton");
  const userWelcome = document.getElementById("userWelcome");
  const pageContent = document.getElementById("pageContent");
  const userAvatar = document.getElementById("userAvatar");

  // Page navigation functionality
  const navLinks = document.querySelectorAll(".nav-link");
  let currentPage = "dashboard";

  // Initialize
  init();

  async function init() {
    // Configure Auth0 first
    const configured = await configureAuth0Client();
    if (!configured) {
      console.error("Failed to configure Auth0");
      window.location.href = '/';
      return;
    }

    // Check authentication
    try {
      const isAuthenticated = await auth0Client.isAuthenticated();
      
      if (!isAuthenticated) {
        console.log("User not authenticated, redirecting to login...");
        window.location.href = '/';
        return;
      }

      // Get user info
      const user = await auth0Client.getUser();
      console.log("User logged in:", user);

      // Update welcome message with actual user info
      userWelcome.textContent = `Welcome ${user.name || user.email || 'User'}`;
      
      // Profile picture
      if (user.picture && userAvatar) {
        userAvatar.innerHTML = `<img src="${user.picture}" alt="Profile" class="profile-img">`;
      }

      setupPageNavigation();
      loadPage("dashboard");
      setupEventListeners();
    } catch (error) {
      console.error("Auth check error:", error);
      window.location.href = '/';
    }
  }

  function setupPageNavigation() {
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const page = link.getAttribute("data-page");
        loadPage(page);

        // Update active nav item
        navLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");

        // Close mobile sidebar if open
        if (window.innerWidth <= 768) {
          closeMobileSidebar();
        }
      });
    });
  }

  async function loadPage(page) {
    currentPage = page;

    try {
      let content = "";

      switch (page) {
        case "dashboard":
          content = await loadBusinessesPage();
          break;
        case "marketplace":
          content = await loadMarketplacePage();
          break;
        case "business":
          content = await loadTestPage();
          break;
        case "creative":
          content = await loadCreativePage();
          break;
        default:
          content = '<div style="padding: 30px;"><h1>Page not found</h1></div>';
      }

      pageContent.innerHTML = content;

      // Initialize page-specific functionality
      initializePageFunctionality(page);
    } catch (error) {
      console.error("Error loading page:", error);
      pageContent.innerHTML = '<div style="padding: 30px;"><h1>Error loading page</h1></div>';
    }
  }

  // Function to fetch businesses from MongoDB
  async function fetchBusinessesByEmail() {
    try {
      const user = await auth0Client.getUser();
      
      if (!user || !user.email) {
        console.error('No user email found');
        return [];
      }

      const response = await fetch(`/api/businesses?email=${encodeURIComponent(user.email)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.businesses || [];
    } catch (error) {
      console.error('Error fetching businesses:', error);
      return [];
    }
  }

  
  async function loadBusinessesPage() {
    // Show loading state first
    pageContent.innerHTML = `
      <div class="businesses-page">
        <div class="page-header">
          <h1 class="page-title">My Businesses</h1>
        </div>
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading your businesses...</p>
        </div>
      </div>
    `;
    
    // Fetch real businesses from MongoDB
    const businesses = await fetchBusinessesByEmail();
    
    // Build the page HTML with SIM card style
    return `
      <link rel="stylesheet" href="css/simStyle.css">
      <div class="businesses-page">
        <div class="page-header">
          <h1 class="page-title">My Businesses</h1>
          <button class="btn-primary" onclick="window.open('https://zuke.co.za/join/', '_blank')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Business
          </button>
        </div>
  
        ${businesses.length > 0 ? `
          <div class="sim-cards-grid">
            ${businesses.map((business, index) => `
              <div class="sim-card" id="business-${business._id}">
                <div class="sim-icon">
                  ${business.media_files?.store_logo ? `
                    <img src="${business.media_files.store_logo}" alt="${business.store_info?.name}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">
                  ` : `
                    <div style="width: 40px; height: 40px; background: #ff6b35; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
                      ${(business.store_info?.name || 'B').substring(0, 1).toUpperCase()}
                    </div>
                  `}
                </div>
                <div class="sim-content">
                  <div class="sim-body">
                    <div class="sim-info">
                      <h3 class="sim-name">${business.store_info?.name || 'Unnamed Business'}</h3>
                      <p class="sim-description">${business.marketplace_info?.marketplace_description || business.marketplace_platform_banner?.description || 'No description available'}</p>
                    </div>
                    <button class="sim-action-btn" onclick="viewBusinessDetails('${business._id}')" aria-label="View ${business.store_info?.name} details">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.4357 13.9174C20.8659 13.0392 20.8659 10.9608 19.4357 10.0826L9.55234 4.01389C8.05317 3.09335 6.125 4.17205 6.125 5.93128L6.125 18.0688C6.125 19.828 8.05317 20.9067 9.55234 19.9861L19.4357 13.9174Z" fill="white"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
  
          <!-- Status overview -->
          <div class="business-overview" style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <h3>Business Overview</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-top: 20px;">
              <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #ff6b35;">${businesses.length}</div>
                <div style="color: #666; font-size: 14px;">Total Businesses</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #2ecc71;">${businesses.filter(b => b.processing_status?.status === 'active').length}</div>
                <div style="color: #666; font-size: 14px;">Active</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #f39c12;">${businesses.filter(b => b.processing_status?.status === 'processing').length}</div>
                <div style="color: #666; font-size: 14px;">Processing</div>
              </div>
            </div>
          </div>
        ` : `
          <div class="empty-state" style="text-align: center; padding: 60px 20px;">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1">
              <path d="M3 21h18"/>
              <path d="M5 21V7l8-4v18"/>
              <path d="M19 21V11l-6-4"/>
            </svg>
            <h2 style="margin: 20px 0 10px 0; color: #2c3e50;">No businesses yet</h2>
            <p style="color: #7f8c8d; margin-bottom: 20px;">Start by adding your first business to manage it here.</p>
            <button class="btn-primary" onclick="window.open('https://zuke.co.za/join/, '_blank')">
              Add Your First Business
            </button>
          </div>
        `}
      </div>
  
      <!-- Modal for business details -->
      <div id="businessModal" class="modal">
        <div class="modal-content">
          <span class="close" onclick="closeBusinessModal()">&times;</span>
          <div id="businessModalContent">
            <!-- Business details will be loaded here -->
          </div>
        </div>
      </div>
    `;
  }

  async function loadTestPage() {
    if (!loadTestPage.cache) {
      loadTestPage.cache = await fetch('pages/business.html').then(r => r.text());
    }
    return loadTestPage.cache;
  }

  async function loadCreativePage() {
    if (!loadCreativePage.cache) {
      loadCreativePage.cache = await fetch('pages/creative.html').then(r => r.text());
    }
    return loadCreativePage.cache;
  }

  async function initializePageFunctionality(page) {
    switch (page) {
      case "dashboard":
        // Dashboard functionality is handled by onclick events
        break;
      case "marketplace":
        // Marketplace functionality
        break;
      case "business":
        if (!window.__testLoaded) {
          try {
            const mod = await import("../pages/business.js");
            mod.initTestPage();
            window.__testLoaded = true;
          } catch (error) {
            console.error("Error loading business page:", error);
          }
        } else {
          import("../pages/business.js").then(mod => mod.initTestPage());
        }
        break;
        case "creative":
          if (!window.__testLoaded) {
            try {
              const mod = await import("../pages/creative.js");
              mod.initCreativePage();
              window.__testLoaded = true;
            } catch (error) {
              console.error("Error loading test page:", error);
            }
          } else {
            import("../pages/creative.js").then(mod => mod.initCreativePage());
          }
          break;
    }
  }

  // View business details
  // window.viewBusinessDetails = async function(businessId) {
  //   const businesses = await fetchBusinessesByEmail();
  //   const business = businesses.find(b => b._id === businessId);
  //   if (!business) return;

  //   const detailsHTML = `
  //     <div class="business-details-page">
  //       <div class="page-header">
  //         <button class="btn-back" onclick="loadPage('dashboard')">
  //           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  //             <polyline points="15,18 9,12 15,6"/>
  //           </svg>
  //           Back to Businesses
  //         </button>
  //         <h1 class="page-title">${business.store_info?.name || 'Business Details'}</h1>
  //       </div>

  //       <div class="details-content">
  //         ${business.media_files?.store_banner ? `
  //           <div class="banner-container">
  //                           <img src="${business.media_files.store_banner}" alt="Store banner" class="store-banner">
  //           </div>
  //         ` : ''}

  //         <div class="details-grid">
  //           <div class="detail-card">
  //             <h3>Business Information</h3>
  //             <div class="detail-row">
  //               <span class="detail-label">Store Name:</span>
  //               <span class="detail-value">${business.store_info?.name || 'N/A'}</span>
  //             </div>
  //             <div class="detail-row">
  //               <span class="detail-label">Categories:</span>
  //               <span class="detail-value">${business.store_info?.category?.join(', ') || 'N/A'}</span>
  //             </div>
  //             <div class="detail-row">
  //               <span class="detail-label">Address:</span>
  //               <span class="detail-value">${business.store_info?.address || 'N/A'}</span>
  //             </div>
  //             <div class="detail-row">
  //               <span class="detail-label">Description:</span>
  //               <span class="detail-value">${business.store_info?.description || 'N/A'}</span>
  //             </div>
  //           </div>

  //           <div class="detail-card">
  //             <h3>Contact Information</h3>
  //             <div class="detail-row">
  //               <span class="detail-label">Owner:</span>
  //               <span class="detail-value">${business.personal_info?.first_name} ${business.personal_info?.last_name}</span>
  //             </div>
  //             <div class="detail-row">
  //               <span class="detail-label">Email:</span>
  //               <span class="detail-value">${business.personal_info?.email || 'N/A'}</span>
  //             </div>
  //             <div class="detail-row">
  //               <span class="detail-label">Phone:</span>
  //               <span class="detail-value">${business.personal_info?.phone || 'N/A'}</span>
  //             </div>
  //           </div>

  //           <div class="detail-card">
  //             <h3>Social Media</h3>
  //             ${business.social_media ? `
  //               ${Object.entries(business.social_media).map(([platform, handle]) => `
  //                 <div class="detail-row">
  //                   <span class="detail-label">${platform.charAt(0).toUpperCase() + platform.slice(1)}:</span>
  //                   <span class="detail-value">${handle}</span>
  //                 </div>
  //               `).join('')}
  //             ` : '<p class="no-data">No social media linked</p>'}
  //           </div>

  //           <div class="detail-card">
  //             <h3>Platform Status</h3>
  //             <div class="detail-row">
  //               <span class="detail-label">Status:</span>
  //               <span class="status-badge ${business.processing_status?.status}">${business.processing_status?.status || 'N/A'}</span>
  //             </div>
  //             <div class="detail-row">
  //               <span class="detail-label">Plan:</span>
  //               <span class="detail-value">${business.processing_status?.plan || 'Free'}</span>
  //             </div>
  //             <div class="detail-row">
  //               <span class="detail-label">Created:</span>
  //               <span class="detail-value">${new Date(business.processing_status?.created_at).toLocaleDateString() || 'N/A'}</span>
  //             </div>
  //           </div>
  //         </div>

  //         <div class="business-actions">
  //           <button class="btn-primary" onclick="window.open('https://your-edit-business-url.com?id=${businessId}', '_blank')">
  //             Edit Business
  //           </button>
  //           <button class="btn-secondary" onclick="window.open('${business.store_info?.slug ? `https://your-domain.com/${business.store_info.slug}` : '#'}', '_blank')">
  //             View Public Page
  //           </button>
  //         </div>
  //       </div>
  //     </div>
  //   `;

  //   pageContent.innerHTML = detailsHTML;
  // };
  window.viewBusinessDetails = async function(businessId) {
    const businesses = await fetchBusinessesByEmail();
    const business = businesses.find(b => b._id === businessId);
    if (!business) return;
  
    const modal = document.getElementById('businessModal');
    const modalContent = document.getElementById('businessModalContent');
    
    modalContent.innerHTML = `
      <div class="business-detail-view">
        ${business.media_files?.store_banner ? `
          <div style="width: 100%; height: 200px; background-image: url('${business.media_files.store_banner}'); background-size: cover; background-position: center; border-radius: 8px; margin-bottom: 20px;"></div>
        ` : ''}
        
        <div style="display: flex; align-items: start; gap: 20px; margin-bottom: 30px;">
          ${business.media_files?.store_logo ? `
            <img src="${business.media_files.store_logo}" alt="${business.store_info?.name}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">
          ` : ''}
          <div>
            <h2 style="margin: 0 0 10px 0;">${business.store_info?.name || 'Business Details'}</h2>
            <p style="color: #666; margin: 0;">${business.store_info?.description || 'No description available'}</p>
          </div>
        </div>
  
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
          <div class="detail-section" style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0;">Business Information</h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div><strong>Categories:</strong> ${business.store_info?.category?.join(', ') || 'N/A'}</div>
              <div><strong>Address:</strong> ${business.store_info?.address || 'N/A'}</div>
              <div><strong>Status:</strong> <span style="padding: 4px 12px; background: ${business.processing_status?.status === 'active' ? '#2ecc71' : '#f39c12'}; color: white; border-radius: 20px; font-size: 12px;">${business.processing_status?.status || 'N/A'}</span></div>
              <div><strong>Plan:</strong> ${business.processing_status?.plan || 'Free'}</div>
            </div>
          </div>
  
          <div class="detail-section" style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0;">Contact Information</h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div><strong>Owner:</strong> ${business.personal_info?.first_name} ${business.personal_info?.last_name}</div>
              <div><strong>Email:</strong> ${business.personal_info?.email || 'N/A'}</div>
              <div><strong>Phone:</strong> ${business.personal_info?.phone || 'N/A'}</div>
              ${business.social_media ? `
                <div><strong>Social Media:</strong></div>
                ${business.social_media.instagram ? `<div style="margin-left: 20px;">Instagram: ${business.social_media.instagram}</div>` : ''}
                ${business.social_media.twitter ? `<div style="margin-left: 20px;">Twitter: ${business.social_media.twitter}</div>` : ''}
              ` : ''}
            </div>
          </div>
        </div>
  
        <div style="margin-top: 30px; display: flex; gap: 15px;">
          <button class="btn-primary" onclick="window.open('https://your-edit-business-url.com?id=${businessId}', '_blank')">
            Edit Business
          </button>
          <button class="btn-secondary" onclick="window.open('${business.store_info?.slug ? `https://your-domain.com/${business.store_info.slug}` : '#'}', '_blank')">
            View Public Page
          </button>
          <button class="btn-secondary" onclick="closeBusinessModal()">
            Close
          </button>
        </div>
      </div>
    `;
    
    modal.style.display = 'block';
  };
  
  window.closeBusinessModal = function() {
    const modal = document.getElementById('businessModal');
    if (modal) {
      modal.style.display = 'none';
    }
  };
  
  // Close modal when clicking outside
  window.onclick = function(event) {
    const modal = document.getElementById('businessModal');
    if (event.target === modal) {
      closeBusinessModal();
    }
  };
  

  function setupEventListeners() {
    hamburgerMenu.addEventListener("click", () => {
      toggleSidebar();
    });

    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !hamburgerMenu.contains(e.target)) {
          closeMobileSidebar();
        }
      }
    });

    // Logout
    logoutButton.addEventListener("click", () => {
      if (auth0Client) {
        console.log("Logging out...");
        sessionStorage.removeItem('hasRedirected');
        auth0Client.logout({
          logoutParams: {
            returnTo: window.location.origin
          }
        });
      }
    });

    // Tokens button
    tokensButton.addEventListener("click", () => {
      alert("Token management coming soon!");
    });

    // Handle window resize
    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) {
        sidebar.classList.remove("mobile-open");
      }
    });
  }

  function toggleSidebar() {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle("mobile-open");
    } else {
      dashboardContainer.classList.toggle("sidebar-collapsed");
    }
  }

  function closeMobileSidebar() {
    sidebar.classList.remove("mobile-open");
  }

  // Make loadPage available globally for navigation
  window.loadPage = loadPage;
});

// Add these console logs to your dashboard.js
async function fetchBusinessesByEmail() {
  try {
    const user = await auth0Client.getUser();
    console.log('Fetching businesses for email:', user.email); // Check user email
    
    if (!user || !user.email) {
      console.error('No user email found');
      return [];
    }

    const response = await fetch(`/api/businesses?email=${encodeURIComponent(user.email)}`);
    console.log('API Response status:', response.status); // Check response status
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Businesses fetched:', data); // See the actual data
    console.log('Number of businesses:', data.businesses?.length || 0);
    return data.businesses || [];
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return [];
  }
}