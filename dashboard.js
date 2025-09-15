// Dashboard functionality
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  const authManager = window.authManager // Declare the authManager variable
  const isAuthenticated = await authManager.requireAuth()
  if (!isAuthenticated) return

  const hamburgerMenu = document.getElementById("hamburgerMenu")
  const sidebar = document.getElementById("sidebar")
  const dashboardContainer = document.querySelector(".dashboard-container")
  const logoutButton = document.getElementById("logoutButton")
  const tokensButton = document.getElementById("tokensButton")
  const userWelcome = document.getElementById("userWelcome")
  const pageContent = document.getElementById("pageContent")

  // Page navigation functionality
  const navLinks = document.querySelectorAll(".nav-link")
  let currentPage = "dashboard"

  const mockBusinesses = [
    {
      id: "BALR3000",
      name: "BALR Fashion",
      products: 50,
      reviews: 20,
      status: "Active",
      plan: "Premium",
      description: "Premium streetwear and lifestyle brand",
      owner: "John Doe",
      email: "john@balr.com",
      phone: "+1 234 567 8900",
      industry: "Fashion",
      employees: 20,
      revenue: "$500,000",
    },
    {
      id: "TECH2024",
      name: "TechFlow Solutions",
      products: 35,
      reviews: 45,
      status: "Active",
      plan: "Business",
      description: "Innovative technology solutions for modern businesses",
      owner: "Sarah Johnson",
      email: "sarah@techflow.com",
      phone: "+1 234 567 8901",
      industry: "Technology",
      employees: 15,
      revenue: "$300,000",
    },
    {
      id: "FOOD1234",
      name: "Gourmet Delights",
      products: 120,
      reviews: 89,
      status: "Active",
      plan: "Standard",
      description: "Artisanal food products and gourmet experiences",
      owner: "Mike Chen",
      email: "mike@gourmetdelights.com",
      phone: "+1 234 567 8902",
      industry: "Food",
      employees: 30,
      revenue: "$700,000",
    },
    {
      id: "FIT5678",
      name: "FitLife Gear",
      products: 75,
      reviews: 156,
      status: "Active",
      plan: "Premium",
      description: "Premium fitness equipment and wellness products",
      owner: "Emma Wilson",
      email: "emma@fitlifegear.com",
      phone: "+1 234 567 8903",
      industry: "Fitness",
      employees: 25,
      revenue: "$600,000",
    },
  ]

  // State
  const businesses = []
  const stats = { total: 0, active: 0, pending: 0, inactive: 0 }
  const loading = false
  const searchTimeout = null

  // Initialize
  init()

  async function init() {
    userWelcome.textContent = "Welcome @admin"

    setupPageNavigation()
    loadPage("dashboard")

    // Setup event listeners
    setupEventListeners()
  }

  function setupPageNavigation() {
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault()
        const page = link.getAttribute("data-page")
        loadPage(page)

        // Update active nav item
        navLinks.forEach((l) => l.classList.remove("active"))
        link.classList.add("active")

        // Close mobile sidebar if open
        if (window.innerWidth <= 768) {
          closeMobileSidebar()
        }
      })
    })
  }

  async function loadPage(page) {
    currentPage = page

    try {
      let content = ""

      switch (page) {
        case "dashboard":
          content = await loadBusinessesPage()
          break
        case "marketplace":
          content = await loadMarketplacePage()
          break
        case "creative":
          content = await loadCreativePage()
          break
        case "ai-employees":
          content = await loadAIEmployeesPage()
          break
        case "chat-aigent":
          content = await loadChatAIgentPage()
          break
        default:
          content = '<div style="padding: 30px;"><h1>Page not found</h1></div>'
      }

      pageContent.innerHTML = content

      // Initialize page-specific functionality
      initializePageFunctionality(page)
    } catch (error) {
      console.error("Error loading page:", error)
      pageContent.innerHTML = '<div style="padding: 30px;"><h1>Error loading page</h1></div>'
    }
  }

  async function loadBusinessesPage() {
    return `
      <div class="businesses-page">
        <div class="page-header">
          <h1 class="page-title">Business Directory</h1>
          <!-- Added hamburger menu for businesses section -->
          <div class="hamburger-dropdown">
            <button class="hamburger-btn" onclick="toggleBusinessDropdown()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div class="dropdown-menu" id="businessDropdown">
              <div class="dropdown-item" onclick="openModal('addBusinessModal')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                </svg>
                Add Business
              </div>
              <div class="dropdown-item" onclick="refreshBusinesses()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M3 21v-5h5"/>
                </svg>
                Refresh Businesses
              </div>
            </div>
          </div>
        </div>

        <div class="business-cards-grid" id="businessCardsGrid">
          ${mockBusinesses
            .map(
              (business) => `
            <div class="business-card" onclick="selectBusiness('${business.id}')">
              <div class="business-card-header">
                <div class="business-logo">
                  <div class="logo-placeholder">${business.name.charAt(0)}</div>
                </div>
                <div class="business-info">
                  <h3 class="business-name">${business.name}</h3>
                  <p class="business-industry">${business.industry}</p>
                </div>
              </div>
              <div class="business-card-body">
                <p class="business-description">${business.description}</p>
                <div class="business-stats">
                  <div class="stat">
                    <span class="stat-label">Employees</span>
                    <span class="stat-value">${business.employees}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Revenue</span>
                    <span class="stat-value">${business.revenue}</span>
                  </div>
                </div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>

        <!-- Fixed explore section with proper onclick handlers -->
        <div class="explore-section">
          <h2 class="explore-title">Explore Other Sections</h2>
          <div class="explore-grid">
            <div class="explore-card" onclick="navigateToSection('marketplace')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"/>
                  <path d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4"/>
                  <path d="M3 7l9-4 9 4"/>
                </svg>
              </div>
              <h3>Marketplace</h3>
              <p>Browse and manage products</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('creative')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3>Creative</h3>
              <p>Creative tools and content</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('ai-employees')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 8V4H8"/>
                  <rect width="16" height="12" x="4" y="8" rx="2"/>
                  <path d="M2 14h2"/>
                  <path d="M20 14h2"/>
                  <path d="M15 13v2"/>
                  <path d="M9 13v2"/>
                </svg>
              </div>
              <h3>AI Employees</h3>
              <p>Manage your AI workforce</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('chat-aigent')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  <path d="M8 9h8"/>
                  <path d="M8 13h6"/>
                </svg>
              </div>
              <h3>Chat AIgent</h3>
              <p>AI-powered chat assistant</p>
            </div>
          </div>
        </div>
      </div>
    `
  }

  async function loadMarketplacePage() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div class="header-left">
            <h1 class="page-title">Marketplace</h1>
            <p class="page-subtitle">Manage marketplace listings and products</p>
          </div>
          <div class="marketplace-actions">
            <div class="hamburger-dropdown">
              <button class="hamburger-btn" id="marketplaceHamburger">
                <span></span>
                <span></span>
                <span></span>
              </button>
              <div class="dropdown-menu" id="marketplaceDropdown">
                <button class="dropdown-item" onclick="openModal('addProductModal')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  Add Product
                </button>
                <button class="dropdown-item" onclick="openModal('addProductImagesModal')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                  </svg>
                  Add Product Images
                </button>
                <button class="dropdown-item" onclick="refreshMarketplace()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23,4 23,10 17,10"/>
                    <polyline points="1,20 1,14 7,14"/>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                  </svg>
                  Refresh Products
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="products-section">
          <div class="products-grid" id="productsGrid">
            <div class="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"/>
                <path d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4"/>
                <path d="M3 7l9-4 9 4"/>
              </svg>
              <h3>No Products Yet</h3>
              <p>Start by adding your first product to the marketplace</p>
              <button class="btn-primary" onclick="openModal('addProductModal')">Add Product</button>
            </div>
          </div>
        </div>

        <!-- Fixed explore section with proper onclick handlers -->
        <div class="explore-section">
          <h2 class="explore-title">Explore Other Sections</h2>
          <div class="explore-grid">
            <div class="explore-card" onclick="navigateToSection('dashboard')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                </svg>
              </div>
              <h3>Businesses</h3>
              <p>Manage your business directory</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('creative')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3>Creative</h3>
              <p>Creative tools and content</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('ai-employees')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 8V4H8"/>
                  <rect width="16" height="12" x="4" y="8" rx="2"/>
                  <path d="M2 14h2"/>
                  <path d="M20 14h2"/>
                  <path d="M15 13v2"/>
                  <path d="M9 13v2"/>
                </svg>
              </div>
              <h3>AI Employees</h3>
              <p>Manage your AI workforce</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('chat-aigent')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  <path d="M8 9h8"/>
                  <path d="M8 13h6"/>
                </svg>
              </div>
              <h3>Chat AIgent</h3>
              <p>AI-powered chat assistant</p>
            </div>
          </div>
        </div>
      </div>
    `
  }

  async function loadCreativePage() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div class="header-left">
            <h1 class="page-title">Creative</h1>
            <p class="page-subtitle">Creative tools and content management</p>
          </div>
        </div>
        
        <!-- Added simple Find a Model card -->
        <div class="find-model-section">
          <div class="find-model-card">
            <div class="find-model-content">
              <h2>Find a Model</h2>
              <p>Discover AI models for your creative projects</p>
              <button class="btn-primary">Browse Models</button>
            </div>
          </div>
        </div>

        <!-- Fixed explore section with proper onclick handlers -->
        <div class="explore-section">
          <h2 class="explore-title">Explore Other Sections</h2>
          <div class="explore-grid">
            <div class="explore-card" onclick="navigateToSection('dashboard')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                </svg>
              </div>
              <h3>Businesses</h3>
              <p>Manage your business directory</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('marketplace')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"/>
                  <path d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4"/>
                  <path d="M3 7l9-4 9 4"/>
                </svg>
              </div>
              <h3>Marketplace</h3>
              <p>Browse and manage products</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('ai-employees')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 8V4H8"/>
                  <rect width="16" height="12" x="4" y="8" rx="2"/>
                  <path d="M2 14h2"/>
                  <path d="M20 14h2"/>
                  <path d="M15 13v2"/>
                  <path d="M9 13v2"/>
                </svg>
              </div>
              <h3>AI Employees</h3>
              <p>Manage your AI workforce</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('chat-aigent')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  <path d="M8 9h8"/>
                  <path d="M8 13h6"/>
                </svg>
              </div>
              <h3>Chat AIgent</h3>
              <p>AI-powered chat assistant</p>
            </div>
          </div>
        </div>
      </div>
    `
  }

  async function loadChatAIgentPage() {
    return `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Chat AIgent</h1>
          <p class="page-subtitle">AI-powered chat assistant</p>
        </div>
        <div class="chat-container">
          <div class="chat-messages" id="chatMessages">
            <div class="ai-message">
              <div class="message-content">
                <p>Hello! I'm your AI assistant. Ask me a question, e.g., "I need ideas for upcoming summer season"</p>
              </div>
            </div>
          </div>
          <div class="chat-input-container">
            <input type="text" class="chat-input" placeholder="Ask a question e.g. I need ideas for upcoming summer season" id="chatInput">
            <button class="send-button" onclick="window.sendMessage()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22,2 15,22 11,13 2,9 22,2"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Fixed explore section with proper onclick handlers -->
        <div class="explore-section">
          <h2 class="explore-title">Explore Other Sections</h2>
          <div class="explore-grid">
            <div class="explore-card" onclick="navigateToSection('dashboard')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                </svg>
              </div>
              <h3>Businesses</h3>
              <p>Manage your business directory</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('marketplace')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"/>
                  <path d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4"/>
                  <path d="M3 7l9-4 9 4"/>
                </svg>
              </div>
              <h3>Marketplace</h3>
              <p>Browse and manage products</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('creative')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3>Creative</h3>
              <p>Creative tools and content</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('ai-employees')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 8V4H8"/>
                  <rect width="16" height="12" x="4" y="8" rx="2"/>
                  <path d="M2 14h2"/>
                  <path d="M20 14h2"/>
                  <path d="M15 13v2"/>
                  <path d="M9 13v2"/>
                </svg>
              </div>
              <h3>AI Employees</h3>
              <p>Manage your AI workforce</p>
            </div>
          </div>
        </div>
      </div>
    `
  }

  async function loadAIEmployeesPage() {
    return `
      <div class="ai-employees-container">
        <div class="page-header">
          <h1 class="page-title">AI Employees</h1>
          <p class="page-subtitle">Manage your AI workforce and their specialized roles</p>
        </div>

        <div class="ai-employees-grid">
          <div class="ai-employee-card sim-card" onclick="window.manageEmployee('neo')">
            <div>
              <h3 class="employee-name">Neo</h3>
              <p class="employee-description">PR and Social Media Specialist</p>
            </div>
            <div class="employee-footer">
              <button class="employee-action" onclick="event.stopPropagation(); window.manageEmployee('neo')">
                <div class="action-triangle"></div>
              </button>
            </div>
          </div>

          <div class="ai-employee-card sim-card" onclick="window.manageEmployee('dineo')">
            <div>
              <h3 class="employee-name">Dineo</h3>
              <p class="employee-description">Marketing and Sales Expert</p>
            </div>
            <div class="employee-footer">
              <button class="employee-action" onclick="event.stopPropagation(); window.manageEmployee('dineo')">
                <div class="action-triangle"></div>
              </button>
            </div>
          </div>

          <div class="ai-employee-card sim-card" onclick="window.manageEmployee('jinja')">
            <div>
              <h3 class="employee-name">Jinja</h3>
              <p class="employee-description">Administrative Virtual Assistant</p>
            </div>
            <div class="employee-footer">
              <button class="employee-action" onclick="event.stopPropagation(); window.manageEmployee('jinja')">
                <div class="action-triangle"></div>
              </button>
            </div>
          </div>

          <div class="ai-employee-card sim-card" onclick="window.manageEmployee('thane')">
            <div>
              <h3 class="employee-name">Thane</h3>
              <p class="employee-description">Customer Service and Feedback Assistant</p>
            </div>
            <div class="employee-footer">
              <button class="employee-action" onclick="event.stopPropagation(); window.manageEmployee('thane')">
                <div class="action-triangle"></div>
              </button>
            </div>
          </div>

          <div class="ai-employee-card sim-card" onclick="window.manageEmployee('alex')">
            <div>
              <h3 class="employee-name">Alex</h3>
              <p class="employee-description">Data Analysis and Reporting Specialist</p>
            </div>
            <div class="employee-footer">
              <button class="employee-action" onclick="event.stopPropagation(); window.manageEmployee('alex')">
                <div class="action-triangle"></div>
              </button>
            </div>
          </div>

          <div class="ai-employee-card sim-card" onclick="window.manageEmployee('zara')">
            <div>
              <h3 class="employee-name">Zara</h3>
              <p class="employee-description">Content Creation and Strategy</p>
            </div>
            <div class="employee-footer">
              <button class="employee-action" onclick="event.stopPropagation(); window.manageEmployee('zara')">
                <div class="action-triangle"></div>
              </button>
            </div>
          </div>
        </div>

        <!-- Fixed explore section with proper onclick handlers -->
        <div class="explore-section">
          <h2 class="explore-title">Explore Other Sections</h2>
          <div class="explore-grid">
            <div class="explore-card" onclick="navigateToSection('dashboard')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                </svg>
              </div>
              <h3>Businesses</h3>
              <p>Manage your business directory</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('marketplace')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"/>
                  <path d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4"/>
                  <path d="M3 7l9-4 9 4"/>
                </svg>
              </div>
              <h3>Marketplace</h3>
              <p>Browse and manage products</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('creative')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3>Creative</h3>
              <p>Creative tools and content</p>
            </div>
            
            <div class="explore-card" onclick="navigateToSection('chat-aigent')">
              <div class="explore-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  <path d="M8 9h8"/>
                  <path d="M8 13h6"/>
                </svg>
              </div>
              <h3>Chat AIgent</h3>
              <p>AI-powered chat assistant</p>
            </div>
          </div>
        </div>
      </div>
    `
  }

  function initializePageFunctionality(page) {
    switch (page) {
      case "dashboard":
        initializeBusinessesPage()
        break
      case "marketplace":
        initializeMarketplacePage()
        break
      case "creative":
        initializeCreativePage()
        break
      case "chat-aigent":
        initializeChatPage()
        break
      case "ai-employees":
        initializeAIEmployeesPage()
        break
    }
  }

  function initializeBusinessesPage() {
    const searchInput = document.getElementById("businessSearch")
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase()
        const businessCards = document.querySelectorAll(".business-card")

        businessCards.forEach((card) => {
          const businessName = card.querySelector(".business-name").textContent.toLowerCase()
          const businessDesc = card.querySelector(".business-description").textContent.toLowerCase()

          if (businessName.includes(searchTerm) || businessDesc.includes(searchTerm)) {
            card.style.display = "block"
          } else {
            card.style.display = "none"
          }
        })
      })
    }
  }

  function initializeChatPage() {
    window.sendMessage = () => {
      const chatInput = document.getElementById("chatInput")
      const chatMessages = document.getElementById("chatMessages")

      if (chatInput && chatInput.value.trim()) {
        const userMessage = chatInput.value.trim()

        // Add user message
        const userMessageDiv = document.createElement("div")
        userMessageDiv.className = "user-message"
        userMessageDiv.innerHTML = `<div class="message-content"><p>${userMessage}</p></div>`
        chatMessages.appendChild(userMessageDiv)

        // Add AI response
        setTimeout(() => {
          const aiMessageDiv = document.createElement("div")
          aiMessageDiv.className = "ai-message"
          aiMessageDiv.innerHTML = `<div class="message-content"><p>Thank you for your question about "${userMessage}". I'm processing your request and will provide helpful suggestions shortly.</p></div>`
          chatMessages.appendChild(aiMessageDiv)
          chatMessages.scrollTop = chatMessages.scrollHeight
        }, 1000)

        chatInput.value = ""
        chatMessages.scrollTop = chatMessages.scrollHeight
      }
    }

    const chatInput = document.getElementById("chatInput")
    if (chatInput) {
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          window.sendMessage()
        }
      })
    }
  }

  function initializeAIEmployeesPage() {
    // AI employees functionality is handled by inline onclick events
  }

  function initializeMarketplacePage() {
    const marketplaceHamburger = document.getElementById("marketplaceHamburger")
    const marketplaceDropdown = document.getElementById("marketplaceDropdown")

    if (marketplaceHamburger && marketplaceDropdown) {
      marketplaceHamburger.addEventListener("click", (e) => {
        e.stopPropagation()
        marketplaceDropdown.classList.toggle("show")
      })

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (!marketplaceHamburger.contains(e.target)) {
          marketplaceDropdown.classList.remove("show")
        }
      })
    }

    // Initialize modal functionality
    initializeModals()
  }

  function initializeModals() {
    // Add Product Form Handler
    const addProductForm = document.getElementById("addProductForm")
    if (addProductForm) {
      addProductForm.addEventListener("submit", (e) => {
        e.preventDefault()
        const formData = new FormData(addProductForm)
        const productData = {
          name: formData.get("productName"),
          description: formData.get("productDescription"),
          price: Number.parseFloat(formData.get("productPrice")),
          category: formData.get("productCategory"),
          stock: Number.parseInt(formData.get("productStock")),
          sku: formData.get("productSku") || null,
        }

        console.log("Adding product:", productData)
        alert("Product added successfully!")
        window.closeModal("addProductModal")
        addProductForm.reset()
      })
    }

    // Add Product Images Form Handler
    const addProductImagesForm = document.getElementById("addProductImagesForm")
    if (addProductImagesForm) {
      addProductImagesForm.addEventListener("submit", (e) => {
        e.preventDefault()
        console.log("Uploading product images")
        alert("Product images uploaded successfully!")
        window.closeModal("addProductImagesModal")
        addProductImagesForm.reset()
        clearImagePreviews()
      })
    }

    // Image upload functionality
    initializeImageUpload()
  }

  function initializeImageUpload() {
    const fileDropZone = document.getElementById("fileDropZone")
    const imageFiles = document.getElementById("imageFiles")
    const uploadMethods = document.querySelectorAll(".upload-method")
    const fileUploadSection = document.getElementById("fileUploadSection")
    const urlUploadSection = document.getElementById("urlUploadSection")

    // Upload method switching
    uploadMethods.forEach((method) => {
      method.addEventListener("click", () => {
        uploadMethods.forEach((m) => m.classList.remove("active"))
        method.classList.add("active")

        const methodType = method.getAttribute("data-method")
        if (methodType === "file") {
          fileUploadSection.style.display = "block"
          urlUploadSection.style.display = "none"
        } else {
          fileUploadSection.style.display = "none"
          urlUploadSection.style.display = "block"
        }
      })
    })

    // File drop zone functionality
    if (fileDropZone && imageFiles) {
      fileDropZone.addEventListener("click", () => imageFiles.click())

      fileDropZone.addEventListener("dragover", (e) => {
        e.preventDefault()
        fileDropZone.classList.add("drag-over")
      })

      fileDropZone.addEventListener("dragleave", () => {
        fileDropZone.classList.remove("drag-over")
      })

      fileDropZone.addEventListener("drop", (e) => {
        e.preventDefault()
        fileDropZone.classList.remove("drag-over")
        const files = e.dataTransfer.files
        handleImageFiles(files)
      })

      imageFiles.addEventListener("change", (e) => {
        handleImageFiles(e.target.files)
      })
    }
  }

  function handleImageFiles(files) {
    const imagePreviewSection = document.getElementById("imagePreviewSection")
    const imagePreviewGrid = document.getElementById("imagePreviewGrid")

    if (files.length > 0) {
      imagePreviewSection.style.display = "block"

      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const previewItem = document.createElement("div")
            previewItem.className = "image-preview-item"
            previewItem.innerHTML = `
              <img src="${e.target.result}" alt="Preview">
              <button type="button" class="remove-image" onclick="window.removeImagePreview(this)">×</button>
              <span class="image-name">${file.name}</span>
            `
            imagePreviewGrid.appendChild(previewItem)
          }
          reader.readAsDataURL(file)
        }
      })
    }
  }

  window.addImageUrl = () => {
    const imageUrl = document.getElementById("imageUrl")
    const url = imageUrl.value.trim()

    if (url) {
      const imagePreviewSection = document.getElementById("imagePreviewSection")
      const imagePreviewGrid = document.getElementById("imagePreviewGrid")

      imagePreviewSection.style.display = "block"

      const previewItem = document.createElement("div")
      previewItem.className = "image-preview-item"
      previewItem.innerHTML = `
        <img src="${url}" alt="Preview" onerror="this.parentElement.style.display='none'">
        <button type="button" class="remove-image" onclick="window.removeImagePreview(this)">×</button>
        <span class="image-name">Image from URL</span>
      `
      imagePreviewGrid.appendChild(previewItem)
      imageUrl.value = ""
    }
  }

  window.removeImagePreview = (button) => {
    const previewItem = button.parentElement
    previewItem.remove()

    const imagePreviewGrid = document.getElementById("imagePreviewGrid")
    if (imagePreviewGrid && imagePreviewGrid.children.length === 0) {
      document.getElementById("imagePreviewSection").style.display = "none"
    }
  }

  function clearImagePreviews() {
    const imagePreviewGrid = document.getElementById("imagePreviewGrid")
    const imagePreviewSection = document.getElementById("imagePreviewSection")
    if (imagePreviewGrid) {
      imagePreviewGrid.innerHTML = ""
    }
    if (imagePreviewSection) {
      imagePreviewSection.style.display = "none"
    }
  }

  window.openModal = (modalId) => {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.style.display = "block"
      document.body.style.overflow = "hidden"
    }
  }

  window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.style.display = "none"
      document.body.style.overflow = "auto"
    }
  }

  window.refreshMarketplace = () => {
    console.log("Refreshing marketplace...")
    alert("Marketplace refreshed!")
  }

  window.selectBusiness = (businessId) => {
    const business = mockBusinesses.find((b) => b.id === businessId)
    if (business) {
      loadBusinessDashboard(business)
    }
  }

  function loadBusinessDashboard(business) {
    const content = `
      <div class="business-dashboard">
        <div class="dashboard-header">
          <button class="back-button" onclick="loadPage('dashboard')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15,18 9,12 15,6"/>
            </svg>
            Back to Businesses
          </button>
          <div class="business-title">
            <h1>${business.name}</h1>
            <p>Business ID: ${business.id}</p>
          </div>
        </div>

        <div class="business-details-grid">
          <div class="detail-card">
            <h3>Business Information</h3>
            <div class="detail-item">
              <span>Name:</span>
              <span>${business.name}</span>
            </div>
            <div class="detail-item">
              <span>Owner:</span>
              <span>${business.owner}</span>
            </div>
            <div class="detail-item">
              <span>Email:</span>
              <span>${business.email}</span>
            </div>
            <div class="detail-item">
              <span>Phone:</span>
              <span>${business.phone}</span>
            </div>
            <div class="detail-item">
              <span>Plan:</span>
              <span>${business.plan}</span>
            </div>
            <div class="detail-item">
              <span>Status:</span>
              <span class="status-active">${business.status}</span>
            </div>
          </div>

          <div class="detail-card">
            <h3>Statistics</h3>
            <div class="stats-row">
              <div class="stat-box">
                <div class="stat-number">${business.products}</div>
                <div class="stat-label">Products</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">${business.reviews}</div>
                <div class="stat-label">Reviews</div>
              </div>
            </div>
          </div>
        </div>

        <div class="business-actions">
          <button class="action-btn primary">Edit Business</button>
          <button class="action-btn secondary">View Products</button>
          <button class="action-btn secondary">Manage Settings</button>
        </div>
      </div>
    `

    pageContent.innerHTML = content
  }

  function setupEventListeners() {
    hamburgerMenu.addEventListener("click", () => {
      toggleSidebar()
    })

    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !hamburgerMenu.contains(e.target)) {
          closeMobileSidebar()
        }
      }
    })

    // Logout
    logoutButton.addEventListener("click", () => {
      authManager.logout()
    })

    // Tokens button (placeholder functionality)
    tokensButton.addEventListener("click", () => {
      alert(
        "AI Tokens feature coming soon!\n\nCurrent balance: 2,450 tokens\n\nThis would typically open a tokens management panel.",
      )
    })

    // Handle window resize
    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) {
        sidebar.classList.remove("mobile-open")
      }
    })
  }

  function toggleSidebar() {
    if (window.innerWidth <= 768) {
      // Mobile: slide sidebar in/out
      sidebar.classList.toggle("mobile-open")
    } else {
      // Desktop: collapse/expand sidebar
      dashboardContainer.classList.toggle("sidebar-collapsed")
    }
  }

  function closeMobileSidebar() {
    sidebar.classList.remove("mobile-open")
  }

  window.exportBusinesses = () => {
    console.log("Export businesses functionality")
    alert("Export functionality will be implemented here")
  }

  function initializeCreativePage() {
    // Simple button functionality - no complex modal needed
  }

  window.navigateToSection = (section) => {
    console.log("[v0] Navigating to section:", section)
    loadPage(section)

    // Update sidebar active state
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active")
      if (link.dataset.page === section) {
        link.classList.add("active")
      }
    })
  }

  window.toggleBusinessDropdown = () => {
    const dropdown = document.getElementById("businessDropdown")
    dropdown.classList.toggle("show")
  }

  window.refreshBusinesses = () => {
    console.log("[v0] Refreshing businesses...")
    loadPage("dashboard")
    document.getElementById("businessDropdown").classList.remove("show")
  }

  const addBusinessForm = document.getElementById("addBusinessForm")
  if (addBusinessForm) {
    addBusinessForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(addBusinessForm)
      const businessData = {
        name: formData.get("businessName"),
        description: formData.get("businessDescription"),
        industry: formData.get("businessIndustry"),
        size: formData.get("businessSize"),
        email: formData.get("businessEmail"),
        phone: formData.get("businessPhone"),
        website: formData.get("businessWebsite"),
      }

      console.log("[v0] Adding new business:", businessData)

      // Here you would typically send the data to your backend
      // For now, we'll just close the modal and show a success message
      window.closeModal("addBusinessModal")
      alert("Business added successfully!")

      // Reset form
      addBusinessForm.reset()
    })
  }
})
