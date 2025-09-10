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
      <div class="businesses-container">
        <div class="page-header">
          <div class="header-left">
            <h1 class="page-title">Business Directory</h1>
            <p class="page-subtitle">Find business by name, email or ID</p>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="search-section">
          <div class="search-container">
            <div class="search-input-container">
              <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" class="search-input" id="businessSearch" 
                     placeholder="Find business by name, email or ID">
            </div>
          </div>
        </div>

        <!-- Business Cards Grid -->
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
                  <p class="business-description">${business.description}</p>
                </div>
              </div>
              <div class="business-stats">
                <div class="stat-item">
                  <span class="stat-label">Products</span>
                  <span class="stat-value">${business.products}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Reviews</span>
                  <span class="stat-value">${business.reviews}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Status</span>
                  <span class="stat-value status-active">${business.status}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Plan</span>
                  <span class="stat-value">${business.plan}</span>
                </div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `
  }

  async function loadMarketplacePage() {
    return `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Marketplace</h1>
          <p class="page-subtitle">Manage marketplace listings and products</p>
        </div>
        <div class="coming-soon">
          <h3>Marketplace Coming Soon</h3>
          <p>This feature will allow you to manage marketplace listings and product catalogs.</p>
        </div>
      </div>
    `
  }

  async function loadCreativePage() {
    return `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Creative</h1>
          <p class="page-subtitle">Creative tools and content management</p>
        </div>
        <div class="coming-soon">
          <h3>Creative Tools Coming Soon</h3>
          <p>This feature will provide creative tools for content creation and design.</p>
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
      </div>
    `
  }

  function initializePageFunctionality(page) {
    switch (page) {
      case "dashboard":
        initializeBusinessesPage()
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
})
