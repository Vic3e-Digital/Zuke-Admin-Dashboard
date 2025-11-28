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

    // View Products & Services button
    const viewProductsBtn = document.getElementById("viewProductsBtn");
    if (viewProductsBtn) {
      viewProductsBtn.onclick = function(e) {
        e.stopPropagation();
        openProductsModal();
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

    // Setup products modal close handlers
    setupProductsModal();
    
    // Setup image gallery modal
    setupImageGalleryModal();

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

// Image Gallery State
let currentGalleryImages = [];
let currentGalleryIndex = 0;
let currentGalleryProduct = null;

function viewProductDetails(item) {
  // Get all images from the product/service and normalize to strings
  const cloudinaryImages = (item.cloudinaryImages || []).map(img => 
    typeof img === 'string' ? img : img?.cloudinaryUrl || img?.url || img?.secure_url || null
  ).filter(Boolean);
  
  const regularImages = (item.images || []).map(img => 
    typeof img === 'string' ? img : img?.cloudinaryUrl || img?.url || img?.secure_url || null
  ).filter(Boolean);
  
  currentGalleryImages = [...cloudinaryImages, ...regularImages];
  
  if (currentGalleryImages.length === 0) {
    alert('No images available for this item');
    return;
  }
  
  currentGalleryIndex = 0;
  currentGalleryProduct = item;
  
  // Open image gallery modal
  const galleryModal = document.getElementById('imageGalleryModal');
  const mainImage = document.getElementById('galleryMainImage');
  const productName = document.getElementById('galleryProductName');
  const productDesc = document.getElementById('galleryProductDescription');
  
  // Set product info
  productName.textContent = item.name;
  productDesc.textContent = item.description || 'No description available';
  
  // Display first image
  displayGalleryImage(0);
  
  // Show modal
  galleryModal.style.display = 'block';
}

function displayGalleryImage(index) {
  if (index < 0 || index >= currentGalleryImages.length) return;
  
  currentGalleryIndex = index;
  const mainImage = document.getElementById('galleryMainImage');
  mainImage.src = currentGalleryImages[index];
  
  // Update thumbnails
  const thumbnailStrip = document.getElementById('thumbnailStrip');
  thumbnailStrip.innerHTML = currentGalleryImages.map((imgUrl, i) => `
    <div onclick="displayGalleryImage(${i})" style="cursor: pointer; border: 3px solid ${i === index ? '#667eea' : 'transparent'}; border-radius: 4px; overflow: hidden; width: 80px; height: 80px;">
      <img src="${imgUrl}" alt="Thumbnail ${i + 1}" style="width: 100%; height: 100%; object-fit: cover;">
    </div>
  `).join('');
  
  // Update navigation buttons visibility
  document.getElementById('prevImageBtn').style.opacity = index > 0 ? '1' : '0.3';
  document.getElementById('nextImageBtn').style.opacity = index < currentGalleryImages.length - 1 ? '1' : '0.3';
}

function navigateGallery(direction) {
  const newIndex = currentGalleryIndex + direction;
  if (newIndex >= 0 && newIndex < currentGalleryImages.length) {
    displayGalleryImage(newIndex);
  }
}

function closeImageGallery() {
  const galleryModal = document.getElementById('imageGalleryModal');
  galleryModal.style.display = 'none';
  currentGalleryImages = [];
  currentGalleryIndex = 0;
  currentGalleryProduct = null;
}

// Setup Image Gallery Modal
function setupImageGalleryModal() {
  const galleryModal = document.getElementById('imageGalleryModal');
  const closeBtn = document.getElementById('galleryModalClose');
  const prevBtn = document.getElementById('prevImageBtn');
  const nextBtn = document.getElementById('nextImageBtn');
  
  // Close button
  closeBtn.onclick = closeImageGallery;
  
  // Navigation buttons
  prevBtn.onclick = () => navigateGallery(-1);
  nextBtn.onclick = () => navigateGallery(1);
  
  // Click outside to close
  window.addEventListener('click', (event) => {
    if (event.target === galleryModal) {
      closeImageGallery();
    }
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (galleryModal.style.display === 'block') {
      if (e.key === 'ArrowLeft') navigateGallery(-1);
      if (e.key === 'ArrowRight') navigateGallery(1);
      if (e.key === 'Escape') closeImageGallery();
    }
  });
}

function escapeHtml(text) {
  if (!text || typeof text !== 'string') return text || '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Products Modal Management
let allProductsData = [];
let currentFilter = 'all';

function setupProductsModal() {
  const productsModal = document.getElementById('productsModal');
  const productsModalClose = document.getElementById('productsModalClose');
  
  // Close button handler
  if (productsModalClose) {
    productsModalClose.onclick = function() {
      productsModal.style.display = "none";
      document.body.style.overflow = 'auto';
    }
  }

  // Click outside to close
  window.addEventListener('click', function(event) {
    if (event.target == productsModal) {
      productsModal.style.display = "none";
      document.body.style.overflow = 'auto';
    }
  });

  // Tab button handlers
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Update active state
      tabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Filter products
      currentFilter = this.getAttribute('data-tab');
      renderProductsInModal(allProductsData, currentFilter);
    });
  });
}

async function openProductsModal() {
  const productsModal = document.getElementById('productsModal');
  const productsModalGrid = document.getElementById('productsModalGrid');
  
  productsModal.style.display = "block";
  document.body.style.overflow = 'hidden';
  
  // Show loading state
  productsModalGrid.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #999; grid-column: 1 / -1;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto 12px; opacity: 0.3; animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8V12L14.5 14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>Loading products & services...</p>
    </div>
  `;
  
  // Fetch products
  try {
    const business = window.dataManager?.getSelectedBusinessOrFirst() || currentBusiness;
    
    if (!business?._id) {
      productsModalGrid.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999; grid-column: 1 / -1;">
          <p>No business selected</p>
        </div>
      `;
      return;
    }

    const response = await fetch(`/api/products/get-products-services?businessId=${business._id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch products/services');
    }

    const data = await response.json();
    
    if (data.success && data.items && data.items.length > 0) {
      allProductsData = data.items;
      renderProductsInModal(allProductsData, currentFilter);
    } else {
      productsModalGrid.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999; grid-column: 1 / -1;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto 12px; opacity: 0.3;">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>No products or services yet</p>
          <button onclick="document.getElementById('productsModal').style.display='none'; document.getElementById('addProductsBtn').click()" style="margin-top: 12px; padding: 8px 16px; background: var(--primary-orange, #ff6b35); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            Add Your First Product
          </button>
        </div>
      `;
    }

  } catch (error) {
    console.error('Error loading products in modal:', error);
    productsModalGrid.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #d32f2f; grid-column: 1 / -1;">
        <p>Failed to load products</p>
      </div>
    `;
  }
}

function renderProductsInModal(items, filter = 'all') {
  const productsModalGrid = document.getElementById('productsModalGrid');
  
  // Filter items based on current tab
  let filteredItems = items;
  if (filter === 'products') {
    filteredItems = items.filter(item => item.type === 'product');
  } else if (filter === 'services') {
    filteredItems = items.filter(item => item.type === 'service');
  }
  
  if (filteredItems.length === 0) {
    productsModalGrid.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #999; grid-column: 1 / -1;">
        <p>No ${filter === 'all' ? 'items' : filter} found</p>
      </div>
    `;
    return;
  }
  
  productsModalGrid.innerHTML = filteredItems.map(item => {
    // Get first image from cloudinaryImages or images array
    let imageUrl = null;
    if (item.cloudinaryImages && item.cloudinaryImages.length > 0) {
      const firstImage = item.cloudinaryImages[0];
      imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.cloudinaryUrl || firstImage?.url || firstImage?.secure_url || null;
    } else if (item.images && item.images.length > 0) {
      const firstImage = item.images[0];
      imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.cloudinaryUrl || firstImage?.url || firstImage?.secure_url || null;
    }
    
    return `
      <div class="product-item" onclick='viewProductDetails(${JSON.stringify(item)})' style="cursor: pointer;">
        <span class="product-type-badge ${item.type}">${item.type}</span>
        ${imageUrl ? `
          <div style="width: 100%; height: 150px; overflow: hidden; border-radius: 8px; margin-bottom: 10px; background: #f5f5f5;">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name)}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        ` : `
          <div style="width: 100%; height: 150px; border-radius: 8px; margin-bottom: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
              <path d="M3 16L7 12L11 16M11 16L14 13L21 20" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        `}
        <h4 class="product-name">${escapeHtml(item.name)}</h4>
        ${item.description ? `<p class="product-description">${escapeHtml(item.description)}</p>` : ''}
      </div>
    `;
  }).join('');
}