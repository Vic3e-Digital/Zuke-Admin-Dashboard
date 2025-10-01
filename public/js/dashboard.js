// Dashboard functionality

// Add this helper function at the top of dashboard.js
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

// Auth0 client
let auth0Client = null;
// Make currentPage globally accessible
let currentPage = "dashboard";

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

// Function to fetch businesses from MongoDB
// async function fetchBusinessesByEmail() {
//   try {
//     // Check cache first
//     const cachedBusinesses = window.dataManager.getBusinesses();
//     if (cachedBusinesses) {
//       console.log('Using cached businesses data');
//       return cachedBusinesses;
//     }

//     console.log('Fetching fresh businesses data from server');
//     const user = await auth0Client.getUser();
    
//     if (!user || !user.email) {
//       console.error('No user email found');
//       return [];
//     }

//     // Check if admin
//     const userRoles = user['https://zuke.co.za/roles'] || [];
//     const isAdmin = userRoles.includes('Admin');

//     let response;

//     if (isAdmin) {
//       // Admin: fetch ALL businesses
//       console.log('Admin user detected - fetching all businesses');
//       response = await fetch('/api/businesses/all');
//     } else {
      
//       // Regular user: fetch only their businesses
//       response = await fetch(`/api/businesses?email=${encodeURIComponent(user.email)}`);
//       console.log('Regula user detected');
//     }
    
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
    
//     const data = await response.json();
//     const businesses = data.businesses || [];

//     // const response = await fetch(`/api/businesses?email=${encodeURIComponent(user.email)}`);
    
//     // if (!response.ok) {
//     //   throw new Error(`HTTP error! status: ${response.status}`);
//     // }
    
//     // const data = await response.json();
//     // const businesses = data.businesses || [];
    
//     // Cache the data
//     window.dataManager.setBusinesses(businesses);
    
//     return businesses;
//   } catch (error) {
//     console.error('Error fetching businesses:', error);
//     return [];
//   }
// }

// Function to fetch businesses from MongoDB
async function fetchBusinessesByEmail() {
  try {
    // Check cache first
    const cachedBusinesses = window.dataManager.getBusinesses();
    if (cachedBusinesses) {
      console.log('Using cached businesses data');
      return cachedBusinesses;
    }

    console.log('Fetching fresh businesses data from server');
    const user = await auth0Client.getUser();
    
    if (!user || !user.email) {
      console.error('No user email found');
      return [];
    }

    // Check if admin
    const userRoles = user['https://zuke.co.za/roles'] || [];
    const isAdmin = userRoles.includes('Admin');
    
    let response;
    
    if (isAdmin) {
      // Admin: fetch ALL businesseswith admin flag
      console.log('Admin user detected - fetching all businesses');
      response = await fetch(`/api/businesses?isAdmin=true&email=${encodeURIComponent(user.email)}`);
    } else {
      // Regular user: fetch only their businesses
      response = await fetch(`/api/businesses?email=${encodeURIComponent(user.email)}`);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const businesses = data.businesses || [];
    
    console.log(`Fetched ${businesses.length} businesses${data.isAdminView ? ' (Admin - All businesses)' : ' (User - Personal businesses)'}`);
    
    // Cache the data
    window.dataManager.setBusinesses(businesses);
    
    return businesses;
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return [];
  }
}



document.addEventListener("DOMContentLoaded", async () => {
  const hamburgerMenu = document.getElementById("hamburgerMenu");
  const sidebar = document.getElementById("sidebar");
  const dashboardContainer = document.querySelector(".dashboard-container");
  const logoutButton = document.getElementById("logoutButton");
  const tokensButton = document.getElementById("tokensButton");
  const userWelcome = document.getElementById("userWelcome");
  const pageContent = document.getElementById("pageContent");
  const userAvatar = document.getElementById("userAvatar");
  const settingsButton = document.getElementById("settingsButton");

  // Page navigation functionality
  const navLinks = document.querySelectorAll(".nav-link");

  // Initialize
  init();

  // async function init() {
  //   // Configure Auth0 first
  //   const configured = await configureAuth0Client();
  //   if (!configured) {
  //     console.error("Failed to configure Auth0");
  //     window.location.href = '/';
  //     return;
  //   }

  //   // Check authentication
  //   try {
  //     const isAuthenticated = await auth0Client.isAuthenticated();
      
  //     if (!isAuthenticated) {
  //       console.log("User not authenticated, redirecting to login...");
  //       window.location.href = '/';
  //       return;
  //     }

  //     // Get user info
  //     const user = await auth0Client.getUser();
  //     console.log("User logged in:", user);

  //     // Check if user is admin
  //     const userRoles = user['https://zuke.co.za/roles'] || [];
  //     const isAdmin = userRoles.includes('Admin');
      
  //     // Store admin status globally
  //     window.isUserAdmin = isAdmin;
      

  //     // Update welcome message with actual user info
  //     userWelcome.textContent = `Welcome ${user.name || user.email || 'User'}`;
  //     if (isAdmin) {
  //       userWelcome.textContent += ' (Admin)';
  //     }
      
  //     // Profile picture
  //     if (user.picture && userAvatar) {
  //       userAvatar.innerHTML = `<img src="${user.picture}" alt="Profile" class="profile-img">`;
  //     }

  //     setupPageNavigation();
  //     await initializeGlobalBusinessSelector();
  //     loadPage("dashboard");
  //     setupEventListeners();

  //   } catch (error) {
  //     console.error("Auth check error:", error);
  //     window.location.href = '/';
  //   }
  // }


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
      
      // Clear cache if user changed
      const lastUserId = localStorage.getItem('lastUserId');
      if (lastUserId && lastUserId !== user.sub) {
        console.log('User changed - clearing cache');
        window.dataManager.clearBusinesses(); // Clear the business cache
      }
      localStorage.setItem('lastUserId', user.sub);
      
      // Check if user is admin
      const userRoles = user['https://zuke.co.za/roles'] || [];
      const isAdmin = userRoles.includes('Admin');
      
      // Store admin status globally
      window.isUserAdmin = isAdmin;
      
      // Update welcome message with actual user info
      userWelcome.textContent = `Welcome ${user.name || user.email || 'User'}`;
      if (isAdmin) {
        userWelcome.textContent += ' (Admin)';
      }
      
      // Profile picture
      if (user.picture && userAvatar) {
        userAvatar.innerHTML = `<img src="${user.picture}" alt="Profile" class="profile-img">`;
      }
  
      setupPageNavigation();
      await initializeGlobalBusinessSelector();
      loadPage("dashboard");
      setupEventListeners();
  
    } catch (error) {
      console.error("Auth check error:", error);
      window.location.href = '/';
    }
  }
  // Initialize global business selector
  async function initializeGlobalBusinessSelector() {
    const businesses = await fetchBusinessesByEmail();
    const selectorContainer = document.getElementById('businessSelectorContainer');
    const selector = document.getElementById('globalBusinessSelector');
    
    if (!businesses || businesses.length === 0) {
      return;
    }
    
    if (businesses.length === 1) {
      // Single business - show as badge
      selectorContainer.innerHTML = `
        <div class="single-business-badge">
          <div class="business-icon">${businesses[0].store_info?.name?.charAt(0) || 'B'}</div>
          <span class="business-name">${businesses[0].store_info?.name || 'Business'}</span>
        </div>
      `;
      selectorContainer.style.display = 'flex';
      
      // Set as selected
      window.dataManager.setSelectedBusiness(businesses[0]);
    } else {
      // Multiple businesses - show selector
      selectorContainer.style.display = 'flex';
      
      // Get current selection or use first
      const currentBusiness = window.dataManager.getSelectedBusinessOrFirst();
      
      // Populate options
      selector.innerHTML = businesses.map(b => `
        <option value="${b._id}" ${currentBusiness?._id === b._id ? 'selected' : ''}>
          ${b.store_info?.name || 'Unnamed Business'}
        </option>
      `).join('');
      
      // Handle selection changes
      selector.onchange = async function(e) {
        const selectedId = e.target.value;
        const selectedBusiness = businesses.find(b => b._id === selectedId);
        
        if (selectedBusiness) {
          // Update global selection
          window.dataManager.setSelectedBusiness(selectedBusiness);
          
          // Reload current page with new business context
          if (currentPage) {
            await loadPage(currentPage);
          }
          
          console.log('Global business changed to:', selectedBusiness.store_info?.name);
        }
      };
    }
  }

  // Register for business changes on page loads
  window.dataManager.onBusinessChange((business) => {
    console.log('Business changed globally:', business?.store_info?.name);
    // You can add any global UI updates here
  });

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
        // case "social-media":
        //   content = await loadSocialMediaPage();
        //   break;
        case "test":
          content = await loadMarketingPage();
          break;
        case "settings":
          content = await loadSettingsPage();
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
  
        ` : `
          <div class="empty-state" style="text-align: center; padding: 60px 20px;">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1">
              <path d="M3 21h18"/>
              <path d="M5 21V7l8-4v18"/>
              <path d="M19 21V11l-6-4"/>
            </svg>
            <h2 style="margin: 20px 0 10px 0; color: #2c3e50;">No businesses yet</h2>
            <p style="color: #7f8c8d; margin-bottom: 20px;">Start by adding your first business to manage it here.</p>
            <button class="btn-primary" onclick="window.open('https://zuke.co.za/join/', '_blank')">
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

  async function loadMarketplacePage() {
    return '<div style="padding: 30px;"><h1>Marketplace</h1><p>Coming soon...</p></div>';
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

  // async function loadSocialMediaPage() {
  //   if (!loadSocialMediaPage.cache) {
  //     loadSocialMediaPage.cache = await fetch('pages/social-media.html').then(r => r.text());
  //   }
  //   return loadSocialMediaPage.cache;
  // }

  async function loadMarketingPage() {
    if (!loadMarketingPage.cache) {
      loadMarketingPage.cache = await fetch('pages/marketing.html').then(r => r.text());
    }
    return loadMarketingPage.cache;
  }

  async function loadSettingsPage() {
    if (!loadSettingsPage.cache) {
      loadSettingsPage.cache = await fetch('pages/settings.html').then(r => r.text());
    }
    return loadSettingsPage.cache;
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
        if (!window.__creativeLoaded) {
          try {
            const mod = await import("../pages/creative.js");
            mod.initCreativePage();
            window.__creativeLoaded = true;
          } catch (error) {
            console.error("Error loading creative page:", error);
          }
        } else {
          import("../pages/creative.js").then(mod => mod.initCreativePage());
        }
        break;
      // case "social-media":
      //   if (!window.__socialMediaLoaded) {
      //     try {
      //       const mod = await import("../pages/social-media.js");
      //       mod.initSocialMediaPage();
      //       window.__socialMediaLoaded = true;
      //     } catch (error) {
      //       console.error("Error loading social media page:", error);
      //     }
      //   } else {
      //     import("../pages/social-media.js").then(mod => mod.initSocialMediaPage());
      //   }
      //   break;
      case "test":
        if (!window.__marketingLoaded) {
          try {
            const mod = await import("../pages/marketing.js");
            mod.initMarketingPage();
            window.__marketingLoaded = true;
          } catch (error) {
            console.error("Error loading marketing page:", error);
          }
        } else {
          import("../pages/marketing.js").then(mod => mod.initMarketingPage());
        }
        break;
      case "settings":
        if (!window.__settingsLoaded) {
          try {
            const mod = await import("../pages/settings.js");
            mod.initSettingsPage();
            window.__settingsLoaded = true;
          } catch (error) {
            console.error("Error loading settings page:", error);
          }
        } else {
          import("../pages/settings.js").then(mod => mod.initSettingsPage());
        }
        break;
    }
  }

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
            <p style="color: #666; margin: 0;">${business.initial_business_case?.what_you_do || 'No description available'}</p>
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

    // Settings button click handler
    if (settingsButton) {
      settingsButton.addEventListener("click", () => {
        loadPage('settings');
        
        // Update active nav item
        navLinks.forEach((l) => l.classList.remove("active"));
        const settingsNavItem = document.querySelector('[data-page="settings"]');
        if (settingsNavItem) {
          settingsNavItem.classList.add("active");
        }
      });
    }

    // Logout
    // logoutButton.addEventListener("click", () => {
    //   if (auth0Client) {
    //     console.log("Logging out...");
    //     sessionStorage.removeItem('hasRedirected');
    //     auth0Client.logout({
    //       logoutParams: {
    //         returnTo: window.location.origin
    //       }
    //     });
    //   }
    // });

    // Logout
    logoutButton.addEventListener("click", () => {
      if (auth0Client) {
        console.log("Logging out...");
        // Clear all session and local storage
        sessionStorage.clear();
        localStorage.clear();
        
        // Clear business data
        if (window.dataManager) {
          window.dataManager.clearCache();
        }
        
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