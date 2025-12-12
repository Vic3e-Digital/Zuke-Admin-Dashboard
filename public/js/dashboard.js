// Dashboard functionality

// Add this helper function at the top of dashboard.js
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

// Function to hide the global loading overlay
function hideLoadingOverlay() {
  const overlay = document.getElementById('globalLoadingOverlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
  }
}

// Auth0 client
let auth0Client = null;
// Make currentPage globally accessible
let currentPage = "dashboard";

// Add request cancellation to prevent race conditions
let currentLoadAbortController = null;
let lastLoadId = 0;

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
async function fetchBusinessesByEmail() {
  try {
    // Check cache first
    const cachedBusinesses = window.dataManager.getBusinesses();
    if (cachedBusinesses) {
      // console.log('Using cached businesses data');
      return cachedBusinesses;
    }

    // console.log('Fetching fresh businesses data from server');
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
      // Admin: fetch ALL businesses with admin flag
      console.log('Admin user detected - fetching all businesses');
      // Skip cache for admin view to avoid stale empty results
      response = await fetch(`/api/businesses?admin=true&email=${encodeURIComponent(user.email)}`);
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
  
  // Three-dot menu functionality
  const headerMenuButton = document.getElementById("headerMenuButton");
  const headerMenuDropdown = document.getElementById("headerMenuDropdown");
  
  if (headerMenuButton && headerMenuDropdown) {
    headerMenuButton.addEventListener("click", (e) => {
      e.stopPropagation();
      headerMenuDropdown.classList.toggle("active");
    });
    
    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!headerMenuButton.contains(e.target) && !headerMenuDropdown.contains(e.target)) {
        headerMenuDropdown.classList.remove("active");
      }
    });
  }

  // Page navigation functionality
  const navLinks = document.querySelectorAll(".nav-link");

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
      // console.log("User logged in:", user);
      
      // Set user information for analytics tracking
      if (window.analytics) {
        window.analytics.setUserInfo(user.sub, null);
      }
      
      await loadWalletBalance();

      // Clear cache if user changed
      const lastUserId = localStorage.getItem('lastUserId');
      if (lastUserId && lastUserId !== user.sub) {
        console.log('User changed - clearing cache');
        window.dataManager.clearBusinesses();
      }
      localStorage.setItem('lastUserId', user.sub);
      
      // Check if user is admin
      const userRoles = user['https://zuke.co.za/roles'] || [];
      const isAdmin = userRoles.includes('Admin');
      
      // Store admin status globally
      window.isUserAdmin = isAdmin;
      
      // Cache user email and name in dataManager for use in other pages
      window.dataManager.setUserEmail(user.email);
      window.dataManager.setUserName(user.name);

      // Show all tabs for all users
      const marketplaceNav = document.querySelector('[data-page="marketplace"]');
      const creativeNav = document.querySelector('[data-page="creative"]');
      const marketingNav = document.querySelector('[data-page="test"]');

      // Make all tabs visible
      if (marketplaceNav) marketplaceNav.closest('.nav-item').style.display = '';
      if (creativeNav) creativeNav.closest('.nav-item').style.display = '';
      if (marketingNav) marketingNav.closest('.nav-item').style.display = '';
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
      await initializeSwitchDropdown();
      loadPage("dashboard");
      setupEventListeners();
      
      // Preload critical pages in background
      if (isAdmin) {
        preloadAdminPages();
      }
  
    } catch (error) {
      console.error("Auth check error:", error);
      window.location.href = '/';
    }
  }
  
  // Preload admin pages in background for faster loading
  async function preloadAdminPages() {
    try {
      // Preload creative page resources
      if (!loadCreativePage.cache) {
        loadCreativePage.cache = await fetch('pages/creative/creative.html').then(r => r.text());
      }
      // Preload the creative.js module
      await import("../pages/creative/creative.js");
    } catch (error) {
      console.warn("Error preloading creative page:", error);
    }
  }

  async function loadWalletBalance() {
    try {
      const walletBalanceElement = document.getElementById('walletBalance');
      const tokensButton = document.getElementById('tokensButton');
      
      if (walletBalanceElement) {
        walletBalanceElement.textContent = 'Loading...';
        tokensButton.classList.add('wallet-loading');
      }
  
      const user = await auth0Client.getUser();
      
      if (!user || !user.email) {
        console.error('No user email found');
        if (walletBalanceElement) {
          walletBalanceElement.textContent = 'R0.00';
          tokensButton.classList.remove('wallet-loading');
        }
        return;
      }
  
      // console.log('Loading wallet for email:', user.email);
      
      const response = await fetch(`/api/wallet?email=${encodeURIComponent(user.email)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // console.log('Wallet API response:', data);
      
      if (data.success && data.wallet) {
        const balance = data.wallet.balance || 0;
        const balanceInRands = balance;
        
        if (walletBalanceElement) {
          walletBalanceElement.textContent = `R${balanceInRands.toLocaleString()}`;
          tokensButton.classList.remove('wallet-loading');
        }
        
        // console.log('Wallet balance loaded:', balanceInRands);
        // console.log('Active plan:', data.hasActivePlan ? data.wallet.current_plan : 'none');
        
        // Show warning if balance is less than R30
        if (balance < 30) {
          showLowBalanceWarning(balance);
        }
        
        // Show subscription expiry warning if less than 7 days
        if (data.hasActivePlan && data.wallet.subscription_end_date) {
          const daysRemaining = Math.ceil((new Date(data.wallet.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysRemaining <= 7 && daysRemaining > 0) {
            showSubscriptionExpiryWarning(daysRemaining, data.wallet.current_plan);
          }
        }
        
      } else {
        throw new Error('Invalid wallet data');
      }
      
    } catch (error) {
      console.error('Error loading wallet balance:', error);
      const walletBalanceElement = document.getElementById('walletBalance');
      const tokensButton = document.getElementById('tokensButton');
      
      if (walletBalanceElement) {
        walletBalanceElement.textContent = 'R0.00';
        if (tokensButton) {
          tokensButton.classList.remove('wallet-loading');
        }
      }
    }
  }

  function showSubscriptionExpiryWarning(daysRemaining, planName) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 15px 20px;
      background: #ff8b00;
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 350px;
      animation: slideIn 0.3s ease;
    `;
    
    alertDiv.innerHTML = `
      <div style="display: flex; align-items: start; gap: 10px;">
        <span style="font-size: 20px;">⏰</span>
        <div style="flex: 1;">
          <div style="font-weight: bold; margin-bottom: 5px;">Subscription Expiring Soon</div>
          <div style="font-size: 14px; margin-bottom: 10px;">
            Your ${planName.toUpperCase()} plan expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Renew now to continue enjoying premium features.
          </div>
          <a href="#" onclick="document.querySelector('[data-page=\\'pricing\\']').click(); return false;" 
             style="color: white; text-decoration: underline; font-size: 13px;">
            Renew Now →
          </a>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; line-height: 1;">×</button>
      </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
      if (alertDiv.parentElement) {
        alertDiv.remove();
      }
    }, 15000);
  }
  
  function showLowBalanceWarning(balance) {
    const balanceInRands = balance;
    
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 15px 20px;
      background: ${balance <= 0 ? '#ff7b00' : '#f39c12'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 350px;
      animation: slideIn 0.3s ease;
    `;
    
    alertDiv.innerHTML = `
      <div style="display: flex; align-items: start; gap: 10px;">
        <span style="font-size: 20px;">${balance <= 10 ? '⚠️' : '💡'}</span>
        <div style="flex: 1;">
          <div style="font-weight: bold; margin-bottom: 5px;">${balance <= 0 ? 'No Credits!' : 'Low Balance'}</div>
          <div style="font-size: 14px; margin-bottom: 10px;">
            ${balance <= 0 
              ? 'Your account has no credits. Please top up to continue using services.' 
              : `You have R${balanceInRands} remaining. Consider topping up soon.`}
          </div>
          <a href="#" onclick="document.querySelector('[data-page=\\'pricing\\']').click(); return false;" 
             style="color: white; text-decoration: underline; font-size: 13px;">
            Top Up Now →
          </a>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; line-height: 1;">×</button>
      </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (alertDiv.parentElement) {
        alertDiv.remove();
      }
    }, 10000);
  }

  // Updated function to check plan from wallet
  async function checkUserHasPlan() {
    try {
      const user = await auth0Client.getUser();
      
      if (!user || !user.email) {
        return { hasPlan: false, planDetails: null };
      }

      const response = await fetch(`/api/wallet?email=${encodeURIComponent(user.email)}`);
      const data = await response.json();
      
      if (data.success && data.wallet) {
        const wallet = data.wallet;
        const hasActivePlan = data.hasActivePlan || false;
        
        // Check if plan is active and not expired
        const planIsActive = hasActivePlan && 
                            wallet.current_plan && 
                            wallet.current_plan !== 'free' && 
                            wallet.subscription_status === 'active';
        
        return {
          hasPlan: planIsActive,
          planDetails: planIsActive ? {
            plan: wallet.current_plan,
            planDisplayName: wallet.plan_display_name || wallet.current_plan,
            billingPeriod: wallet.billing_period,
            monthlyPrice: wallet.plan_monthly_price,
            totalPrice: wallet.plan_total_price,
            subscriptionStatus: wallet.subscription_status,
            startDate: wallet.subscription_start_date,
            endDate: wallet.subscription_end_date,
            daysRemaining: wallet.subscription_end_date ? 
              Math.ceil((new Date(wallet.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0
          } : null
        };
      }
      
      return { hasPlan: false, planDetails: null };
    } catch (error) {
      console.error('Error checking user plan:', error);
      return { hasPlan: false, planDetails: null };
    }
  }

  // Add this global function to handle the add business click
  window.handleAddBusiness = async function() {
    const user = await auth0Client.getUser();
    const planStatus = await checkUserHasPlan();
    
    if (!planStatus.hasPlan) {
      // Show modal/alert that they need a plan
      showPlanRequiredModal();
      return;
    }
    
    // User has a plan, proceed with adding business
    const userEmail = user?.email || '';
    const userFirstName = user?.given_name || '';
    const userLastName = user?.family_name || '';
    
    window.open(
      `https://aigents.southafricanorth.azurecontainer.io/form/mkp-onboarding?Email=${encodeURIComponent(userEmail)}&First%20Name=${encodeURIComponent(userFirstName)}&Last%20Name=${encodeURIComponent(userLastName)}`,
      '_blank'
    );
  };

  // Add function to show plan required modal
  function showPlanRequiredModal() {
    const modalHTML = `
      <div id="planRequiredModal" class="modal" style="display: block;">
        <div class="modal-content" style="max-width: 500px;">
          <span class="close" onclick="document.getElementById('planRequiredModal').remove()">&times;</span>
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
            <h2 style="margin: 0 0 15px 0; color: #2c3e50;">Plan Required</h2>
            <p style="color: #666; margin-bottom: 25px; line-height: 1.6;">
              You need an active subscription plan to add more businesses to your account.
            </p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
              <p style="margin: 0; font-size: 14px; color: #555;">
                💡 <strong>Tip:</strong> Our plans start from as low as R99/month for 3 months and include credits for marketplace listings, AI-powered content creation, and more!
              </p>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
              <button class="btn-primary" onclick="document.getElementById('planRequiredModal').remove(); document.querySelector('[data-page=\\'pricing\\']').click();">
                View Plans
              </button>
              <button class="btn-secondary" onclick="document.getElementById('planRequiredModal').remove()">
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // Initialize switch dropdown in sidebar
  async function initializeSwitchDropdown() {
    const businesses = await fetchBusinessesByEmail();
    const switchDropdownBtn = document.getElementById('switchDropdownBtn');
    const switchDropdownMenu = document.getElementById('switchDropdownMenu');
    const dropdownBusinessesList = document.getElementById('dropdownBusinessesList');
    const businessCount = document.getElementById('businessCount');
    const dropdownAddBusiness = document.getElementById('dropdownAddBusiness');
    const switchBtnText = document.getElementById('switchBtnText');
    const switchBtnLogo = document.getElementById('switchBtnLogo');
    
    if (!businesses || businesses.length === 0) {
      // Hide the switch button if no businesses
      if (switchDropdownBtn) {
        switchDropdownBtn.closest('.sidebar-business-switcher').style.display = 'none';
      }
      return;
    }
    
    // Get current selection or use first
    const currentBusiness = window.dataManager.getSelectedBusinessOrFirst();
    
    // Update business count
    if (businessCount) {
      businessCount.textContent = `(${businesses.length})`;
    }
    
    // Populate dropdown with business items
    if (dropdownBusinessesList) {
      dropdownBusinessesList.innerHTML = businesses.map((business, index) => {
        const isActive = currentBusiness?._id === business._id;
        const businessName = business.store_info?.name || 'Unnamed Business';
        const businessLogo = business.media_files?.store_logo;
        const initials = businessName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
        
        return `
          <div class="dropdown-business-item ${isActive ? 'active' : ''}" data-business-id="${business._id}">
            <div class="business-item-logo">
              ${businessLogo ? `<img src="${businessLogo}" alt="${businessName}" />` : initials}
            </div>
            <div class="business-item-content">
              <div class="business-item-name">${businessName}</div>
              <div class="business-item-status">${business.processing_status?.status || 'Inactive'}</div>
            </div>
          </div>
        `;
      }).join('');
      
      // Add click handlers to business items
      const businessItems = dropdownBusinessesList.querySelectorAll('.dropdown-business-item');
      businessItems.forEach(item => {
        item.addEventListener('click', async function() {
          const selectedId = this.getAttribute('data-business-id');
          const selectedBusiness = businesses.find(b => b._id === selectedId);
          
          if (selectedBusiness) {
            // Update global selection
            window.dataManager.setSelectedBusiness(selectedBusiness);
            
            // Update button display
            updateSwitchButtonDisplay(selectedBusiness, switchBtnText, switchBtnLogo);
            
            // Update active state in dropdown
            businessItems.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Reload current page with new business context
            if (currentPage) {
              await loadPage(currentPage);
            }
            
            // Close dropdown
            switchDropdownMenu.classList.remove('active');
            
            console.log('Switched to business:', selectedBusiness.store_info?.name);
          }
        });
      });
    }
    
    // Update button text and logo to show current business
    if (currentBusiness) {
      updateSwitchButtonDisplay(currentBusiness, switchBtnText, switchBtnLogo);
    }

    // Toggle dropdown
    if (switchDropdownBtn) {
      switchDropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        switchDropdownMenu.classList.toggle('active');
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (switchDropdownMenu && !switchDropdownMenu.contains(e.target) && 
          switchDropdownBtn && !switchDropdownBtn.contains(e.target)) {
        switchDropdownMenu.classList.remove('active');
      }
    });
    
    // Handle add business button
    if (dropdownAddBusiness) {
      dropdownAddBusiness.addEventListener('click', async function(e) {
        e.stopPropagation();
        switchDropdownMenu.classList.remove('active');
        await window.handleAddBusiness();
      });
    }
  }
  
  // Helper function to update switch button display
  function updateSwitchButtonDisplay(business, textElement, logoElement) {
    if (textElement) {
      textElement.textContent = truncateText(business.store_info?.name || 'Select Business', 20);
    }
    
    if (logoElement) {
      const businessLogo = business.media_files?.store_logo;
      const businessName = business.store_info?.name || 'Business';
      const initials = businessName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
      
      if (businessLogo) {
        logoElement.innerHTML = `<img src="${businessLogo}" alt="${businessName}" />`;
      } else {
        logoElement.innerHTML = initials;
      }
    }
  }

  // Register for business changes on page loads
  window.dataManager.onBusinessChange((business) => {
    console.log('Business changed globally:', business?.store_info?.name);
    
    // Update switch button display when business changes
    const switchBtnText = document.getElementById('switchBtnText');
    const switchBtnLogo = document.getElementById('switchBtnLogo');
    if (business) {
      updateSwitchButtonDisplay(business, switchBtnText, switchBtnLogo);
    }
  });

  function setupPageNavigation() {
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const page = link.getAttribute("data-page");
        const linkText = link.textContent?.trim() || link.getAttribute('title') || 'Unknown Link';
        
        // Track navigation event
        if (window.analytics) {
          window.analytics.trackNavigation(currentPage, page, 'click');
          window.analytics.trackButtonClick(linkText, currentPage, {
            button_type: 'navigation',
            target_page: page
          });
        }
        
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
    
    // Increment load ID to track this specific load request
    const loadId = ++lastLoadId;
    
    // Cancel any previous loading requests
    if (currentLoadAbortController) {
      currentLoadAbortController.abort();
    }
    currentLoadAbortController = new AbortController();
    
    // Show loading state immediately
    pageContent.innerHTML = `
      <div class="loading-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 20px;">
        <div class="loading-spinner" style="
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <p style="color: #666; font-size: 14px;">Loading ${page}...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    // Track page view
    if (window.analytics) {
      window.analytics.trackPageView(page, window.location.pathname);
    }

    try {
      let content = "";

      switch (page) {
        case "dashboard":
          content = await loadBusinessesPage(loadId);
          break;
        case "marketplace":
          content = await loadMarketplacePage();
          break;
        case "business":
          content = await loadBusinessPage();
          break;
           case "afaa":  
        content = await loadAfaaPage();
        break;
        case "creative":
          content = await loadCreativePage();
          break;
        case "test":
          content = await loadMarketingPage();
          break;
        case "settings":
          content = await loadSettingsPage();
          break;
        case "pricing":
          content = await loadPricingPage();
          break;
        case "topup":
          content = await loadTopupPage();
          break;
        case "unlock-credits":
          content = await loadUnlockCreditsPage();
          break;
        default:
          content = '<div style="padding: 30px;"><h1>Page not found</h1></div>';
      }

      // Check if this is still the current load request
      // If a new page was requested while this was loading, skip rendering
      if (loadId !== lastLoadId) {
        console.log(`Load request ${loadId} cancelled (current: ${lastLoadId})`);
        return;
      }

      pageContent.innerHTML = content;

      // Initialize page-specific functionality
      initializePageFunctionality(page);
      
      // Load analytics data if we're on dashboard page
      if (page === 'dashboard') {
        setTimeout(() => loadAnalyticsOverview(), 100);
      }
      
      // Hide overlay using requestAnimationFrame to ensure content is painted and styles are applied
      requestAnimationFrame(() => {
        // Give the browser a moment to apply CSS and render
        setTimeout(() => {
          if (loadId === lastLoadId) {
            hideLoadingOverlay();
          }
        }, 150);
      });
    } catch (error) {
      // Only show error if this is still the current load request
      if (loadId === lastLoadId) {
        console.error("Error loading page:", error);
        pageContent.innerHTML = '<div style="padding: 30px;"><h1>Error loading page</h1></div>';
        hideLoadingOverlay();
      }
    }
  }

  async function loadTopupPage() {
    if (!loadTopupPage.cache) {
      loadTopupPage.cache = await fetch('pages/topup.html').then(r => r.text());
    }
    return loadTopupPage.cache;
  }

  async function loadUnlockCreditsPage() {
    if (!loadUnlockCreditsPage.cache) {
      loadUnlockCreditsPage.cache = await fetch('pages/unlock-credits.html').then(r => r.text());
    }
    return loadUnlockCreditsPage.cache;
  }

  async function loadBusinessesPage(loadId) {
    const user = await auth0Client.getUser();
    
    // Check if this is still the current request
    if (loadId !== lastLoadId) {
      console.log(`loadBusinessesPage: Request ${loadId} was cancelled (current: ${lastLoadId})`);
      return '';
    }
    
    const userEmail = user?.email || '';
    const userFirstName = user?.given_name || '';
    const userLastName = user?.family_name || '';
    
    const businesses = await fetchBusinessesByEmail();
    
    // Check again after first async operation
    if (loadId !== lastLoadId) {
      console.log(`loadBusinessesPage: Request ${loadId} was cancelled after fetching businesses`);
      return '';
    }
    
    const planStatus = await checkUserHasPlan();
    
    // Check again after second async operation
    if (loadId !== lastLoadId) {
      console.log(`loadBusinessesPage: Request ${loadId} was cancelled after checking plan`);
      return '';
    }
    
    // Build the page HTML with SIM card style
    return `
      <link rel="stylesheet" href="css/simStyle.css">
      <div class="businesses-page">
        <div class="page-header" style="display: flex; align-items: center; gap: 15px; justify-content: space-between;">
          <h1 class="page-title">My Businesses</h1>
          
          <!-- Business Selector and Add Business Button - Side by Side -->
          <div style="display: flex; align-items: center; gap: 10px;">
            ${businesses.length > 1 ? `
              <select id="pageBusinessSelector" style="padding: 10px 15px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; cursor: pointer;">
                <option value="">All Businesses</option>
                ${businesses.map(b => `
                  <option value="${b._id}">
                    ${b.store_info?.name || 'Unnamed Business'}
                  </option>
                `).join('')}
              </select>
            ` : ''}
            
            <button class="btn-primary" onclick="handleAddBusiness()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Business
            </button>
          </div>
        </div>
  
        <!-- Active Plan Banner -->
        ${planStatus.hasPlan && planStatus.planDetails ? `
          <div style="
            background: #FFFFFF;
            border: 1px solid #E5E7EB;
            border-bottom: 4px solid #ff8b00;
            border-radius: 12px;
            padding: 24px;
            margin: 20px 0;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            min-height: 180px;
          ">
            <div style="position: relative; z-index: 2; max-width: 60%;">
              <div style="font-size: 32px; margin-bottom: 8px;">✨</div>
              <h3 style="margin: 0 0 8px 0; color: #2f2f2d; font-size: 20px; font-weight: 600;">
                Active Subscription: ${planStatus.planDetails.planDisplayName || planStatus.planDetails.plan}
              </h3>
              <p style="margin: 0 0 16px 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                ${planStatus.planDetails.monthlyPrice || ''} ${planStatus.planDetails.billingPeriod || ''} • 
                ${planStatus.planDetails.daysRemaining} days remaining
                ${planStatus.planDetails.endDate ? ` • Renews ${new Date(planStatus.planDetails.endDate).toLocaleDateString()}` : ''}
              </p>
              <button onclick="document.querySelector('[data-page=\\'pricing\\']').click();" style="
                background: #ff8b00;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
              " onmouseover="this.style.background='#ff8b00'" onmouseout="this.style.background='#ff8b00'">
                Manage Plan
              </button>
            </div>
            <div style="
              position: absolute;
              bottom: 0;
              right: 0;
              width: 200px;
              height: 200px;
              overflow: hidden;
              border-top-left-radius: 60%;
            ">
              <img src="https://res.cloudinary.com/dekgwsl3c/image/upload/v1765491920/zuke_dashboard_cvfyh9.webp" 
                   alt="Active Plan" 
                   loading="lazy"
                   style="width: 100%; height: 100%; object-fit: cover; object-position: center;">
            </div>
          </div>
        ` : `
          <div style="
            background: #FFFFFF;
            border: 1px solid #E5E7EB;
            border-bottom: 4px solid #ff7b00;
            border-radius: 12px;
            padding: 24px;
            margin: 20px 0;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            min-height: 180px;
          ">
            <div style="position: relative; z-index: 2; max-width: 60%;">
              <div style="font-size: 32px; margin-bottom: 8px;">🚀</div>
              <h3 style="margin: 0 0 8px 0; color: #2f2f2d; font-size: 20px; font-weight: 600;">
                Unlock Your Business Potential
              </h3>
              <p style="margin: 0 0 16px 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                Subscribe to a plan to add businesses and access premium features
              </p>
              <button onclick="document.querySelector('[data-page=\\'pricing\\']').click();" style="
                background: #ff7b00;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
              " onmouseover="this.style.background='#e66d00'" onmouseout="this.style.background='#ff7b00'">
                View Plans
              </button>
            </div>
            <div style="
              position: absolute;
              bottom: 0;
              right: 0;
              width: 200px;
              height: 200px;
              overflow: hidden;
              border-top-left-radius: 60%;
            ">
              <img src="https://res.cloudinary.com/dekgwsl3c/image/upload/v1765491920/zuke_dashboard_cvfyh9.webp" 
                   alt="Get Started" 
                   loading="lazy"
                   style="width: 100%; height: 100%; object-fit: cover; object-position: center;">
            </div>
          </div>
        `}
  
        <!-- Analytics Overview Cards -->
        <div class="analytics-overview-grid" style="margin: 30px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          <div class="analytics-overview-card" id="businessesCard">
            <div class="top-section">
              <div class="card-icon" style="color: #ff7b00;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
              </div>
              <div class="metric-value">${businesses.length}</div>
            </div>
            <div class="metric-label">Businesses Created</div>
          </div>
          
          <div class="analytics-overview-card" id="videosCard">
            <div class="top-section">
              <div class="card-icon" style="color: #ff7b00;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
              </div>
              <div class="metric-value" id="videosCount">-</div>
            </div>
            <div class="metric-label">Videos & Images Generated</div>
          </div>
          
          <div class="analytics-overview-card" id="emailsCard">
            <div class="top-section">
              <div class="card-icon" style="color: #ff7b00;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <div class="metric-value" id="emailsCount">-</div>
            </div>
            <div class="metric-label">Emails Sent</div>
          </div>
          
          <div class="analytics-overview-card" id="socialCard">
            <div class="top-section">
              <div class="card-icon" style="color: #ff7b00;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                </svg>
              </div>
              <div class="metric-value" id="socialCount">-</div>
            </div>
            <div class="metric-label">Social Posts Created</div>
          </div>
          
          <div class="analytics-overview-card" id="audioCard">
            <div class="top-section">
              <div class="card-icon" style="color: #ff7b00;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </div>
              <div class="metric-value" id="audioCount">-</div>
            </div>
            <div class="metric-label">Audio Files Transcribed</div>
          </div>
          
          <div class="analytics-overview-card" id="modelsCard">
            <div class="top-section">
              <div class="card-icon" style="color: #ff7b00;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div class="metric-value" id="modelsCount">-</div>
            </div>
            <div class="metric-label">Creative Models Registered</div>
          </div>
        </div>
  
        <!-- Business Status Overview -->
        <div class="business-overview" style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <h3>Business Overview</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-top: 20px;">
            <div style="text-align: center;">
              <div style="font-size: 2rem; font-weight: bold; color: #ff7b00;">${businesses.length}</div>
              <div style="color: #666; font-size: 14px;">Total Businesses</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 2rem; font-weight: bold; color: #ff8b00;">${businesses.filter(b => b.processing_status?.status === 'active').length}</div>
              <div style="color: #666; font-size: 14px;">Active</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 2rem; font-weight: bold; color: #f39c12;">${businesses.filter(b => b.processing_status?.status === 'processing').length}</div>
              <div style="color: #666; font-size: 14px;">Processing</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 2rem; font-weight: bold; color: #ff7b00;">${planStatus.hasPlan ? planStatus.planDetails.planDisplayName || planStatus.planDetails.plan : 'Free'}</div>
              <div style="color: #666; font-size: 14px;">Current Plan</div>
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
                    <div style="width: 40px; height: 40px; background: #ff7b00; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
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
            <p style="color: #7f8c8d; margin-bottom: 20px;">
              ${!planStatus.hasPlan 
                ? 'Subscribe to a plan to start adding businesses.' 
                : 'Start by adding your first business to manage it here.'}
            </p>
            <button class="btn-primary" onclick="handleAddBusiness()">
              Add Your First Business
            </button>
          </div>
        `}
      </div>
  
      <!-- Modal for business details -->
      <div id="businessModal" class="modal" data-no-enhance>
        <div class="modal-content">
          <span class="close" onclick="closeBusinessModal()">&times;</span>
          <div id="businessModalContent">
            <!-- Business details will be loaded here -->
          </div>
        </div>
      </div>
    `;
  }

  // Function to animate counter
  function animateCounter(element, finalValue, duration = 800) {
    if (!element) return;
    
    const startValue = 0;
    const startTime = Date.now();
    
    function update() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuad = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;
      
      const currentValue = Math.floor(startValue + (finalValue - startValue) * easeOutQuad);
      element.textContent = currentValue.toLocaleString();
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = finalValue.toLocaleString();
      }
    }
    
    update();
  }

  // Function to load analytics overview data with caching
  async function loadAnalyticsOverview() {
    try {
      // Check if we have cached analytics data
      const cachedAnalytics = dataManager.getAnalytics ? dataManager.getAnalytics() : null;
      
      if (cachedAnalytics) {
        // Use cached data
        const videosElement = document.getElementById('videosCount');
        const emailsElement = document.getElementById('emailsCount');
        const socialElement = document.getElementById('socialCount');
        const audioElement = document.getElementById('audioCount');
        const modelsElement = document.getElementById('modelsCount');

        if (videosElement) animateCounter(videosElement, cachedAnalytics.videos);
        if (emailsElement) animateCounter(emailsElement, cachedAnalytics.emails);
        if (socialElement) animateCounter(socialElement, cachedAnalytics.social);
        if (audioElement) animateCounter(audioElement, cachedAnalytics.audio);
        if (modelsElement) animateCounter(modelsElement, cachedAnalytics.models);
        
        return;
      }

      // Load all analytics data in parallel from server
      const [videosData, imagesData, emailsData, socialData, audioData, modelsData] = await Promise.all([
        fetch('/api/analytics/overview/videos').then(r => r.json()).catch(() => ({success: false, count: 0})),
        fetch('/api/analytics/overview/images').then(r => r.json()).catch(() => ({success: false, count: 0})),
        fetch('/api/analytics/overview/emails').then(r => r.json()).catch(() => ({success: false, count: 0})),
        fetch('/api/analytics/overview/social').then(r => r.json()).catch(() => ({success: false, count: 0})),
        fetch('/api/analytics/overview/audio').then(r => r.json()).catch(() => ({success: false, count: 0})),
        fetch('/api/analytics/overview/models').then(r => r.json()).catch(() => ({success: false, count: 0}))
      ]);

      // Combine videos and images count
      const videosCount = videosData.success ? videosData.count : 0;
      const imagesCount = imagesData.success ? imagesData.count : 0;
      const totalMediaCount = videosCount + imagesCount;
      const emailsCount = emailsData.success ? emailsData.count : 0;
      const socialCount = socialData.success ? socialData.count : 0;
      const audioCount = audioData.success ? audioData.count : 0;
      const modelsCount = modelsData.success ? modelsData.count : 0;

      // Cache the analytics data using dataManager if available
      if (dataManager && typeof dataManager.setAnalytics === 'function') {
        dataManager.setAnalytics({
          videos: totalMediaCount,
          emails: emailsCount,
          social: socialCount,
          audio: audioCount,
          models: modelsCount
        });
      }

      // Update the cards with animated counters
      const videosElement = document.getElementById('videosCount');
      const emailsElement = document.getElementById('emailsCount');
      const socialElement = document.getElementById('socialCount');
      const audioElement = document.getElementById('audioCount');
      const modelsElement = document.getElementById('modelsCount');

      if (videosElement) animateCounter(videosElement, totalMediaCount);
      if (emailsElement) animateCounter(emailsElement, emailsCount);
      if (socialElement) animateCounter(socialElement, socialCount);
      if (audioElement) animateCounter(audioElement, audioCount);
      if (modelsElement) animateCounter(modelsElement, modelsCount);

    } catch (error) {
      console.error('Error loading analytics overview:', error);
    }
  }  async function loadMarketplacePage() {
    if (!loadMarketplacePage.cache) {
      loadMarketplacePage.cache = await fetch('pages/marketplace.html').then(r => r.text());
    }
    return loadMarketplacePage.cache;
  }

  // async function loadTestPage() {
  //   if (!loadTestPage.cache) {
  //     loadTestPage.cache = await fetch('pages/business.html').then(r => r.text());
  //   }
  //   return loadTestPage.cache;
  // }
  async function loadAfaaPage() {
  if (!loadAfaaPage.cache) {
    loadAfaaPage.cache = await fetch('pages/afaa.html').then(r => r.text());
  }
  return loadAfaaPage.cache;
}

  async function loadCreativePage() {
    if (!loadCreativePage.cache) {
      loadCreativePage.cache = await fetch('pages/creative/creative.html').then(r => r.text());
    }
    return loadCreativePage.cache;
  }

  async function loadMarketingPage() {
    if (!loadMarketingPage.cache) {
      loadMarketingPage.cache = await fetch('pages/marketing/marketing.html').then(r => r.text());
    }
    return loadMarketingPage.cache;
  }

  async function loadSettingsPage() {
    if (!loadSettingsPage.cache) {
      loadSettingsPage.cache = await fetch('pages/settings/settings.html').then(r => r.text());
    }
    return loadSettingsPage.cache;
  }

  async function loadPricingPage() {
    if (!loadPricingPage.cache) {
      loadPricingPage.cache = await fetch('pages/pricing.html').then(r => r.text());
    }
    return loadPricingPage.cache;
  }

  async function loadBusinessPage() {
    if (!loadBusinessPage.cache) {
      loadBusinessPage.cache = await fetch('pages/business/business.html').then(r => r.text());
    }
    return loadBusinessPage.cache;
  }
  

  async function initializePageFunctionality(page) {
    // Page-specific functionality initialization
    switch (page) {
    case "dashboard":
  // Initialize business filter dropdown
  const pageBusinessSelector = document.getElementById('pageBusinessSelector');
  if (pageBusinessSelector) {
    pageBusinessSelector.addEventListener('change', function() {
      const selectedId = this.value;
      const simCards = document.querySelectorAll('.sim-card');
      
      simCards.forEach(card => {
        if (!selectedId || card.id === `business-${selectedId}`) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
  break;
      case "marketplace":
        if (!window.__marketplaceLoaded) {
          try {
            const mod = await import("../pages/marketplace.js");
            mod.initMarketingPage();
            window.__marketplaceLoaded = true;
          } catch (error) {
            console.error("Error loading marketplace page:", error);
          }
        } else {
          import("../pages/marketplace.js").then(mod => mod.initMarketingPage());
        }
        break;

        case "business":
          if (!window.__businessPageLoaded) {
            try {
              const mod = await import("../pages/business/business.js");
              mod.initBusinessPage();
              window.__businessPageLoaded = true;
            } catch (error) {
              console.error("Error loading business page:", error);
            }
          } else {
            import("../pages/business/business.js").then(mod => mod.initBusinessPage());
          }
          break;


      case "afaa":  // ADD THIS CASE
      if (!window.__afaaLoaded) {
        try {
          const mod = await import("../pages/afaa.js");
          mod.initAfaaPage();
          window.__afaaLoaded = true;
        } catch (error) {
          console.error("Error loading AFAA page:", error);
        }
      } else {
        import("../pages/afaa.js").then(mod => mod.initAfaaPage());
      }
      break;
      case "creative":
        if (!window.__creativeLoaded) {
          try {
            const mod = await import("../pages/creative/creative.js");
            mod.initCreativePage();
            window.__creativeLoaded = true;
          } catch (error) {
            console.error("Error loading creative page:", error);
          }
        } else {
          import("../pages/creative/creative.js").then(mod => mod.initCreativePage());
        }
        break;
      case "test":
        if (!window.__marketingLoaded) {
          try {
            const mod = await import("../pages/marketing/marketing.js");
            mod.initMarketingPage();
            window.__marketingLoaded = true;
          } catch (error) {
            console.error("Error loading marketing page:", error);
          }
        } else {
          import("../pages/marketing/marketing.js").then(mod => mod.initMarketingPage());
        }
        break;
      case "settings":
        if (!window.__settingsLoaded) {
          try {
            const mod = await import("../pages/settings/settings.js");
            mod.initSettingsPage();
            window.__settingsLoaded = true;
          } catch (error) {
            console.error("Error loading settings page:", error);
          }
        } else {
          import("../pages/settings/settings.js").then(mod => mod.initSettingsPage());
        }
        break;
      case "pricing":
        if (!window.__pricingLoaded) {
          try {
            const mod = await import("../pages/pricing.js");
            mod.initPricingPage();
            window.__pricingLoaded = true;
          } catch (error) {
            console.error("Error loading pricing page:", error);
          }
        } else {
          import("../pages/pricing.js").then(mod => mod.initPricingPage());
        }
        break;
      case "topup":
        if (!window.__topupLoaded) {
          try {
            const mod = await import("../pages/topup.js");
            mod.initTopupPage();
            window.__topupLoaded = true;
          } catch (error) {
            console.error("Error loading topup page:", error);
          }
        } else {
          import("../pages/topup.js").then(mod => mod.initTopupPage());
        }
        break;
      case "unlock-credits":
        if (!window.__unlockCreditsLoaded) {
          try {
            const mod = await import("./unlock-credits.js");
            if (mod.init) {
              mod.init();
            }
            window.__unlockCreditsLoaded = true;
          } catch (error) {
            console.error("Error loading unlock-credits page:", error);
          }
        } else {
          // Re-initialize if already loaded
          if (window.unlockCredits && window.unlockCredits.init) {
            window.unlockCredits.init();
          }
        }
        break;
    }
  }

  function showBalanceAlert(type, message, actionLink) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 15px 20px;
      background: ${type === 'error' ? '#ff7b00' : '#f39c12'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 350px;
      animation: slideIn 0.3s ease;
    `;
    
    alertDiv.innerHTML = `
      <div style="display: flex; align-items: start; gap: 10px;">
        <span style="font-size: 20px;">${type === 'error' ? '⚠️' : '💡'}</span>
        <div style="flex: 1;">
          <div style="font-weight: bold; margin-bottom: 5px;">${type === 'error' ? 'Out of Credits' : 'Low Balance'}</div>
          <div style="font-size: 14px; margin-bottom: 10px;">${message}</div>
          <a href="${actionLink}" style="color: white; text-decoration: underline; font-size: 13px;">
            View Plans →
          </a>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; line-height: 1;">×</button>
      </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      alertDiv.remove();
    }, 10000);
  }

  window.viewBusinessDetails = async function(businessId) {
    console.log('viewBusinessDetails called with ID:', businessId);
    
    // Check cache first, then fetch if needed
    let businesses = window.dataManager.getBusinesses();
    console.log('Cached businesses:', businesses);
    
    if (!businesses || businesses.length === 0) {
      console.log('No cached businesses, fetching fresh data...');
      businesses = await fetchBusinessesByEmail();
      console.log('Fetched businesses:', businesses);
    }
    
    const business = businesses.find(b => b._id === businessId);
    console.log('Found business:', business);
    
    if (!business) {
      console.error('Business not found:', businessId);
      return;
    }
  
    // Ensure modal exists, create if it doesn't
    let modal = document.getElementById('businessModal');
    
    if (!modal) {
      const modalHTML = `
        <div id="businessModal" class="modal" data-no-enhance>
          <div class="modal-content">
            <span class="close" onclick="closeBusinessModal()">&times;</span>
            <div id="businessModalContent">
              <!-- Business details will be loaded here -->
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      modal = document.getElementById('businessModal');
    }
    
    // Always re-query for modalContent to ensure we have the latest reference
    const modalContent = document.getElementById('businessModalContent');
  
    // Extract the specific links, with fallbacks
    const manageMarketplaceProfileLink = business.marketplace_business?.user_info?.user_link || 'https://marketplace.zuke.co.za/my-account/';
    const viewMarketplacePageLink = business.marketplace_business?.marketplace_info?.store_link || '#';
  
    if (modalContent) {
      console.log('Loading business modal for:', business.store_info?.name, business);
      modalContent.innerHTML = `<div class="business-detail-view">
  ${business.media_files?.store_banner ? `<div style="width: 100%; height: 200px; background-image: url('${business.media_files.store_banner}'); background-size: cover; background-position: center; border-radius: 8px; margin-bottom: 20px;"></div>` : ''}
  
  <div style="display: flex; align-items: start; gap: 20px; margin-bottom: 30px;">
    ${business.media_files?.store_logo ? `<img src="${business.media_files.store_logo}" alt="${business.store_info?.name}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">` : ''}
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
        ${business.social_media ? `<div><strong>Social Media:</strong></div>
${business.social_media.instagram ? `<div style="margin-left: 20px;">Instagram: ${business.social_media.instagram}</div>` : ''}
${business.social_media.twitter ? `<div style="margin-left: 20px;">Twitter: ${business.social_media.twitter}</div>` : ''}` : ''}
      </div>
    </div>
  </div>

  <div style="margin-top: 30px; display: flex; gap: 15px;">
    <button class="btn-primary" onclick="window.open('${manageMarketplaceProfileLink}', '_blank')">
      Manage Marketplace Profile
    </button>
    <button class="btn-secondary" onclick="window.open('${viewMarketplacePageLink}', '_blank')" ${viewMarketplacePageLink === '#' ? 'disabled' : ''}>
      View Marketplace Page
    </button>
    <button class="btn-secondary" onclick="closeBusinessModal()">
      Close
    </button>
  </div>
</div>`;
    }
    
    if (modal) {
      modal.style.display = 'block';
    }
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

  // function setupEventListeners() {
  //   hamburgerMenu.addEventListener("click", () => {
  //     toggleSidebar();
  //   });

function setupEventListeners() {
  // Create overlay if it doesn't exist
  let sidebarOverlay = document.getElementById('sidebarOverlay');
  if (!sidebarOverlay) {
    sidebarOverlay = document.createElement('div');
    sidebarOverlay.id = 'sidebarOverlay';
    sidebarOverlay.className = 'sidebar-overlay';
    document.body.appendChild(sidebarOverlay);
  }
  
  // Hamburger menu toggle
  hamburgerMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleSidebar();
  });
  
    // Close sidebar when clicking overlay
    sidebarOverlay.addEventListener('click', () => {
      closeMobileSidebar();
    });
  
    // Close sidebar when clicking nav links on mobile
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          setTimeout(() => {
            closeMobileSidebar();
          }, 100); // Small delay to ensure navigation happens first
        }
      });
    });


    // document.addEventListener("click", (e) => {
    //   if (window.innerWidth <= 768) {
    //     if (!sidebar.contains(e.target) && !hamburgerMenu.contains(e.target)) {
    //       closeMobileSidebar();
    //     }
    //   }
    // });

   // Settings button
  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      loadPage('settings');
      navLinks.forEach((l) => l.classList.remove("active"));
      const settingsNavItem = document.querySelector('[data-page="settings"]');
      if (settingsNavItem) {
        settingsNavItem.classList.add("active");
      }
      
      if (window.innerWidth <= 768) {
        closeMobileSidebar();
      }
    });
  }

    // Top-up button
  const topupButton = document.getElementById('topupButton');
  if (topupButton) {
    topupButton.addEventListener('click', () => {
      loadPage('topup');
      navLinks.forEach((link) => link.classList.remove("active"));
      const topupNavItem = document.querySelector('[data-page="topup"]');
      if (topupNavItem) {
        topupNavItem.classList.add("active");
      }
    });
  }

  // Logout
  logoutButton.addEventListener("click", () => {
    if (auth0Client) {
      sessionStorage.clear();
      localStorage.clear();
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

  // Handle window resize
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 768) {
        closeMobileSidebar();
      }
    }, 250);
  });
}

function toggleSidebar() {
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
  if (window.innerWidth <= 768) {
    // Mobile behavior
    const isOpening = !sidebar.classList.contains("mobile-open");
    
    sidebar.classList.toggle("mobile-open");
    sidebarOverlay?.classList.toggle("active");
    
    // Prevent body scroll when sidebar is open
    if (isOpening) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
  } else {
    // Desktop behavior - collapse sidebar
    dashboardContainer.classList.toggle("sidebar-collapsed");
  }
}

function closeMobileSidebar() {
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
  sidebar.classList.remove("mobile-open");
  sidebarOverlay?.classList.remove("active");
  document.body.classList.remove('sidebar-open');
}

  // Make loadPage available globally for navigation
  window.loadPage = loadPage;
});