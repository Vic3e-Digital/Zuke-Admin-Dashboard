// pages/business/business.js
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

export async function initBusinessPage() {
  const auth0Client = await getAuth0Client();
  
  if (!auth0Client) {
    console.error("Failed to get Auth0 client");
    return;
  }

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
    
    // Get business data
    currentBusiness = window.dataManager?.getSelectedBusinessOrFirst();
    
    if (!currentBusiness) {
      console.warn('No business data available');
      return;
    }

    const businessName = currentBusiness?.store_info?.name || 'Business';
    const businessId = currentBusiness?._id;
    const businessDescription = currentBusiness?.marketplace_info?.marketplace_description || '';
    const businessAddress = currentBusiness?.store_info?.address || '';
    const businessCategories = currentBusiness?.store_info?.category?.join(', ') || '';
    const businessCase = currentBusiness?.initial_business_case?.more_details_needed;
    const businessCaseString = Array.isArray(businessCase) ? businessCase.join('\n') : businessCase || '';
    const businessCaseJSON = JSON.stringify(currentBusiness?.initial_business_case || {});
    const mongoID = currentBusiness?._id;

    // Setup category card click handlers
    const categoryCards = document.querySelectorAll('.main-sim-card');
    categoryCards.forEach(card => {
      card.addEventListener('click', function() {
        const categoryId = this.getAttribute('data-category');
        toggleSubcategory(categoryId);
      });
    });

    // Setup modal
    const modal = document.getElementById("businessModal");
    const modalTitle = document.getElementById("modalTitle");
    const iframe = document.getElementById("modalIframe");
    const closeBtn = document.getElementsByClassName("close")[0];

    // Verify modal elements exist
    if (!modal || !modalTitle || !iframe) {
      console.error("Modal elements not found in DOM");
      return;
    }

    // Setup button handlers
    const businessCaseBtn = document.getElementById("businessCaseBtn");
    if (businessCaseBtn) {
      businessCaseBtn.onclick = function(e) {
        e.stopPropagation();
        if (!modal || !modalTitle || !iframe) return;
        modalTitle.textContent = "Business Case Assistant";
        iframe.src = `/pages/business-tools/business-case.html`;
        modal.style.display = "block";
        document.body.style.overflow = 'hidden';
      }
    }

    // Generate Presentation with AI
    const presentonBtn = document.getElementById("presentonBtn");
    if (presentonBtn) {
      presentonBtn.onclick = function(e) {
        e.stopPropagation();
        if (!modal || !modalTitle || !iframe) return;
        modalTitle.textContent = "Generate Presentation with AI";
        iframe.src = `/pages/business/generate-presentation.html?businessName=${encodeURIComponent(businessName)}&businessDescription=${encodeURIComponent(businessDescription)}`;
        modal.style.display = "block";
        document.body.style.overflow = 'hidden';
      }
    }

    // Add Products button
    const addProductsBtn = document.getElementById("addProductsBtn");
    if (addProductsBtn) {
      addProductsBtn.onclick = function(e) {
        e.stopPropagation();
        if (!modal || !modalTitle || !iframe) return;
        modalTitle.textContent = "Add Products";
        iframe.src = `/pages/business/add-product.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}`;
        modal.style.display = "block";
        document.body.style.overflow = 'hidden';
      }
    }

    // Add Services button
    const addServicesBtn = document.getElementById("addServicesBtn");
    if (addServicesBtn) {
      addServicesBtn.onclick = function(e) {
        e.stopPropagation();
        if (!modal || !modalTitle || !iframe) return;
        modalTitle.textContent = "Add Services";
        iframe.src = `/pages/business/add-service.html?email=${encodeURIComponent(userEmail)}&businessId=${businessId}`;
        modal.style.display = "block";
        document.body.style.overflow = 'hidden';
      }
    }

    // Find Business Partners button
    const afaaTool1Btn = document.getElementById("afaaTool1Btn");
    if (afaaTool1Btn) {
      afaaTool1Btn.onclick = function(e) {
        e.stopPropagation();
        if (!modal || !modalTitle || !iframe) return;
        modalTitle.textContent = "Find Partners from LinkedIn";
        iframe.src = `https://aigents.southafricanorth.azurecontainer.io/form/zuke-x-dineo-simple?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&business=${encodeURIComponent(businessName)}&businessId=${businessId}&businessCase=${businessCaseJSON}`;
        modal.style.display = "block";
        document.body.style.overflow = 'hidden';
      }
    }

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
    console.error("Error in initBusinessPage:", error);
  }
}

function toggleSubcategory(categoryId) {
  // Close all subcategories first
  const allSubcategories = document.querySelectorAll('.subcategory-container');
  const clickedSubcategory = document.getElementById(categoryId);
  const wasActive = clickedSubcategory?.classList.contains('active');
  
  allSubcategories.forEach(sub => {
    sub.classList.remove('active');
  });

  // Toggle the clicked category (open if it wasn't active)
  if (clickedSubcategory && !wasActive) {
    clickedSubcategory.classList.add('active');
    
    // Smooth scroll to subcategory
    setTimeout(() => {
      clickedSubcategory.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }, 100);
  }
}