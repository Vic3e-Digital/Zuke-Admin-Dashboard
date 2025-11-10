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
      console.log("User logged in:", user);
      
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
      

      const marketplaceNav = document.querySelector('[data-page="marketplace"]');
const creativeNav = document.querySelector('[data-page="creative"]');
const marketingNav = document.querySelector('[data-page="test"]');

if (!isAdmin) {
  // Hide admin-only menu items
  if (marketplaceNav) marketplaceNav.closest('.nav-item').style.display = 'none';
  if (creativeNav) creativeNav.closest('.nav-item').style.display = 'none';
  if (marketingNav) marketingNav.closest('.nav-item').style.display = 'none';
} else {
  // Show all menu items for admin
  if (marketplaceNav) marketplaceNav.closest('.nav-item').style.display = '';
  if (creativeNav) creativeNav.closest('.nav-item').style.display = '';
  if (marketingNav) marketingNav.closest('.nav-item').style.display = '';
}
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
  
    } catch (error) {
      console.error("Auth check error:", error);
      window.location.href = '/';
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
  
      console.log('Loading wallet for email:', user.email);
      
      const response = await fetch(`/api/wallet?email=${encodeURIComponent(user.email)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('Wallet API response:', data);
      
      if (data.success && data.wallet) {
        const balance = data.wallet.balance || 0;
        const balanceInRands = balance;
        
        if (walletBalanceElement) {
          walletBalanceElement.textContent = `R${balanceInRands.toLocaleString()}`;
          tokensButton.classList.remove('wallet-loading');
        }
        
        console.log('Wallet balance loaded:', balanceInRands);
        console.log('Active plan:', data.hasActivePlan ? data.wallet.current_plan : 'none');
        
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
      background: ${balance <= 0 ? '#ff6b35' : '#f39c12'};
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
    const switchBusinessSelector = document.getElementById('switchBusinessSelector');
    const switchDropdownBtn = document.getElementById('switchDropdownBtn');
    const switchDropdownMenu = document.getElementById('switchDropdownMenu');
    
    if (!businesses || businesses.length === 0) {
      // Hide the switch button if no businesses
      if (switchDropdownBtn) {
        switchDropdownBtn.style.display = 'none';
      }
      return;
    }
    
    // Get current selection or use first
    const currentBusiness = window.dataManager.getSelectedBusinessOrFirst();
    
    // Populate dropdown options
    if (switchBusinessSelector) {
      switchBusinessSelector.innerHTML = '<option value="">Select a business...</option>' + 
        businesses.map(b => `
          <option value="${b._id}" ${currentBusiness?._id === b._id ? 'selected' : ''}>
            ${b.store_info?.name || 'Unnamed Business'}
          </option>
        `).join('');
    }
    
    // // Toggle dropdown
    // if (switchDropdownBtn) {
    //   switchDropdownBtn.addEventListener('click', function(e) {
    //     e.stopPropagation();
    //     switchDropdownMenu.classList.toggle('active');
    //   });
    // }
    // Update the toggle dropdown section in your setupEventListeners function
if (switchDropdownBtn) {
  switchDropdownBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    
    const isActive = switchDropdownMenu.classList.contains('active');
    
    if (!isActive) {
      // Position the dropdown relative to the button
      const buttonRect = switchDropdownBtn.getBoundingClientRect();
      
      // Position above the button
      switchDropdownMenu.style.bottom = `${window.innerHeight - buttonRect.top + 8}px`;
      switchDropdownMenu.style.left = `${buttonRect.left}px`;
      
      // Alternative: Position to the right of button (if you prefer)
      // switchDropdownMenu.style.top = `${buttonRect.top}px`;
      // switchDropdownMenu.style.left = `${buttonRect.right + 8}px`;
    }
    
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
    
    // Handle business selection
    if (switchBusinessSelector) {
      switchBusinessSelector.addEventListener('change', async function() {
        const selectedId = this.value;
        const selectedBusiness = businesses.find(b => b._id === selectedId);
        
        if (selectedBusiness) {
          // Update global selection
          window.dataManager.setSelectedBusiness(selectedBusiness);
          
          // Reload current page with new business context
          if (currentPage) {
            await loadPage(currentPage);
          }
          
          // Close dropdown
          switchDropdownMenu.classList.remove('active');
          
          console.log('Switched to business:', selectedBusiness.store_info?.name);
        }
      });
    }
  }

  // Register for business changes on page loads
  window.dataManager.onBusinessChange((business) => {
    console.log('Business changed globally:', business?.store_info?.name);
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

    // Track page view
    if (window.analytics) {
      window.analytics.trackPageView(page, window.location.pathname);
    }

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

  async function loadTopupPage() {
    if (!loadTopupPage.cache) {
      loadTopupPage.cache = await fetch('pages/topup.html').then(r => r.text());
    }
    return loadTopupPage.cache;
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
    
    const user = await auth0Client.getUser();
    const userEmail = user?.email || '';
    const userFirstName = user?.given_name || '';
    const userLastName = user?.family_name || '';
    
    const businesses = await fetchBusinessesByEmail();
    const planStatus = await checkUserHasPlan();
    
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
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; margin: 20px 0; color: white;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="font-size: 32px;">✨</div>
              <div style="flex: 1;">
                <h3 style="margin: 0 0 5px 0;">Active Subscription: ${planStatus.planDetails.planDisplayName || planStatus.planDetails.plan}</h3>
                <p style="margin: 0; opacity: 0.9; font-size: 14px;">
                  ${planStatus.planDetails.monthlyPrice || ''} ${planStatus.planDetails.billingPeriod || ''} • 
                  ${planStatus.planDetails.daysRemaining} days remaining
                  ${planStatus.planDetails.endDate ? ` • Renews ${new Date(planStatus.planDetails.endDate).toLocaleDateString()}` : ''}
                </p>
              </div>
              <button onclick="document.querySelector('[data-page=\\'pricing\\']').click();" style="background: white; color: #667eea; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; white-space: nowrap;">
                Manage Plan
              </button>
            </div>
          </div>
        ` : `
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; margin: 20px 0; color: white;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="font-size: 32px;">🚀</div>
              <div style="flex: 1;">
                <h3 style="margin: 0 0 5px 0;">Unlock Your Business Potential</h3>
                <p style="margin: 0; opacity: 0.9; font-size: 14px;">Subscribe to a plan to add businesses and access premium features</p>
              </div>
              <button onclick="document.querySelector('[data-page=\\'pricing\\']').click();" style="background: white; color: #667eea; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; white-space: nowrap;">
                View Plans
              </button>
            </div>
          </div>
        `}
  
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
            <div style="text-align: center;">
              <div style="font-size: 2rem; font-weight: bold; color: #667eea;">${planStatus.hasPlan ? planStatus.planDetails.planDisplayName || planStatus.planDetails.plan : 'Free'}</div>
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
    if (!loadMarketplacePage.cache) {
      loadMarketplacePage.cache = await fetch('pages/marketplace.html').then(r => r.text());
    }
    return loadMarketplacePage.cache;
  }

  async function loadTestPage() {
    if (!loadTestPage.cache) {
      loadTestPage.cache = await fetch('pages/business.html').then(r => r.text());
    }
    return loadTestPage.cache;
  }
  async function loadAfaaPage() {
  if (!loadAfaaPage.cache) {
    loadAfaaPage.cache = await fetch('pages/afaa.html').then(r => r.text());
  }
  return loadAfaaPage.cache;
}

  async function loadCreativePage() {
    if (!loadCreativePage.cache) {
      loadCreativePage.cache = await fetch('pages/creative.html').then(r => r.text());
    }
    return loadCreativePage.cache;
  }

  async function loadMarketingPage() {
    if (!loadMarketingPage.cache) {
      loadMarketingPage.cache = await fetch('pages/marketing.html').then(r => r.text());
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

  async function initializePageFunctionality(page) {
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
    }
  }

  function showBalanceAlert(type, message, actionLink) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 15px 20px;
      background: ${type === 'error' ? '#ff6b35' : '#f39c12'};
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
    const businesses = await fetchBusinessesByEmail();
    const business = businesses.find(b => b._id === businessId);
    if (!business) return;
  
    const modal = document.getElementById('businessModal');
    const modalContent = document.getElementById('businessModalContent');
  
    // Extract the specific links, with fallbacks
    const manageMarketplaceProfileLink = business.marketplace_business?.user_info?.user_link || 'https://marketplace.zuke.co.za/my-account/';
    const viewMarketplacePageLink = business.marketplace_business?.marketplace_info?.store_link || '#';
  
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