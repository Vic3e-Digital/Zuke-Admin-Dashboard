// pages/business.js
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

// Function to get business data from global selection
async function getBusinessData() {
  // Wait for dataManager to be available
  if (!window.dataManager) {
    console.error('DataManager not initialized');
    return null;
  }

  // Get from global selection
  const selectedBusiness = window.dataManager.getSelectedBusinessOrFirst();
  
  if (selectedBusiness) {
    return selectedBusiness;
  }
  
  // If no business is selected and no cached data, we shouldn't fetch here
  // The dashboard should have already loaded the businesses
  console.warn('No business selected in global context');
  return null;
}

export async function initTestPage() {
  // Wait a bit for dataManager to initialize
  if (!window.dataManager) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const auth0Client = await getAuth0Client(); 
  
  if (!auth0Client) {
    console.error("Failed to get Auth0 client");
    return;
  }

  const modal = document.getElementById("myModal");
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
    const userEmail = user.email || user.name || 'unknown';
    const userName = user.name || 'User';
    
    // Get business data
    currentBusiness = await getBusinessData();
    
    if (!currentBusiness) {
      console.warn('No business data available');
      // Show a message to the user
      const pageContainer = document.querySelector('.page-container');
      if (pageContainer) {
        pageContainer.innerHTML = `
          <div class="empty-state" style="text-align: center; padding: 60px 20px;">
            <h2>No Business Selected</h2>
            <p>Please select a business from the header dropdown to continue.</p>
            <button class="btn-primary" onclick="window.loadPage('dashboard')">Go to Dashboard</button>
          </div>
        `;
      }
      return;
    }

    // Extract business information with fallbacks
    const businessName = currentBusiness?.store_info?.name || 'Your Business';
    const businessDescription = currentBusiness?.marketplace_info?.marketplace_description || 
                               currentBusiness?.marketplace_platform_banner?.description || 
                               'No description available';
    const businessAddress = currentBusiness?.store_info?.address || '';
    const businessCategories = currentBusiness?.store_info?.category?.join(', ') || '';
    // const businessCase = currentBusiness?.initial_business_case?.more_details_needed;
    const businessCase = currentBusiness?.initial_business_case?.more_details_needed;
    const businessCaseString = Array.isArray(businessCase) ? businessCase.join('\n') : businessCase || '';
    const mongoID = currentBusiness?._id;
    
    // Log for debugging
    console.log('Business loaded:', {
      name: businessName,
      description: businessDescription,
      address: businessAddress,
      categories: businessCategories,
      bcase: businessCaseString,
      mongo_ID: mongoID
    });
    
    // Setup buttons with dynamic URLs using actual business data
    const buttons = [
      {
        btn: document.getElementById("openModalBtn"),
        title: "Business Case Assistant",
        url: `https://aigents.southafricanorth.azurecontainer.io/form/4a4b49d8-45a5-4710-9b84-52587ce88cb6?Business%20Name=${encodeURIComponent(businessName)}&Business%20Description=${encodeURIComponent(businessDescription)}&Email=${encodeURIComponent(userEmail)}&Address=${encodeURIComponent(businessAddress)}&Categories=${encodeURIComponent(businessCategories)}&Questions%20to%20Answer=${encodeURIComponent(businessCase)}&ID=${encodeURIComponent(mongoID)}`
      },
      {
        btn: document.getElementById("openModalBtn2"),
        title: "Sales Analytics",
        url: `https://aigents.southafricanorth.azurecontainer.io/sales-analytics?Business=${encodeURIComponent(businessName)}&Email=${encodeURIComponent(userEmail)}`
      },
      {
        btn: document.getElementById("openModalBtn3"),
        title: "Business Intelligence",
        url: `https://aigents.southafricanorth.azurecontainer.io/business-intelligence?Business=${encodeURIComponent(businessName)}&Email=${encodeURIComponent(userEmail)}`
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

    // Update page content with business info if needed
    updatePageWithBusinessInfo(currentBusiness);

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

// Function to update page content with business information
function updatePageWithBusinessInfo(business) {
  if (!business) return;

  // Update any elements on the page that should show business info
  const businessNameElements = document.querySelectorAll('.business-name-display');
  businessNameElements.forEach(el => {
    el.textContent = business.store_info?.name || 'Business';
  });

  // You can add more dynamic content updates here
}

// Export function to set selected business
export function setSelectedBusiness(businessId) {
  const businesses = window.dataManager.getBusinesses();
  if (businesses) {
    const selected = businesses.find(b => b._id === businessId);
    if (selected) {
      window.dataManager.setSelectedBusiness(selected);
      currentBusiness = selected;
      updatePageWithBusinessInfo(selected);
    }
  }
}