// ========== AI CHATBOT MODULE ==========

class BusinessChatbot {
  constructor() {
    this.isOpen = false;
    this.conversationHistory = [];
    this.businessId = null;
    this.businessName = 'Your Business';
    this.isTyping = false;
    this.trendQuestions = [];
    
    this.init();
  }

  init() {
    this.createChatbotUI();
    this.attachEventListeners();
    this.loadBusinessContext();
    this.registerBusinessChangeListener();
    this.loadTrends();
  }

  createChatbotUI() {
    const chatbotHTML = `
      <div class="ai-chatbot-widget">
        <!-- Toggle Button -->
        <button class="chatbot-toggle-btn" id="chatbotToggleBtn" aria-label="Open AI Assistant">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z"/>
            <path d="M7 9H17V11H7V9Z"/>
            <path d="M7 12H14V14H7V12Z"/>
          </svg>
        </button>

        <!-- Chat Window -->
        <div class="chatbot-window" id="chatbotWindow">
          <!-- Header -->
          <div class="chatbot-header">
            <div class="chatbot-header-left">
              <div class="chatbot-avatar">
                <img src="https://zuke.co.za/wp-content/uploads/2023/09/cropped-cropped-cropped-cropped-zuke-logo-.png" alt="Zuke AI">
              </div>
              <div class="chatbot-title">
                <h3>Business Manager</h3>
                <p id="chatbotSubtitle">Ask me anything</p>
              </div>
            </div>
            <div class="chatbot-header-right">
              <button class="chatbot-menu-btn" id="chatbotMenu" aria-label="Chat options">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M12 8C13.1 8 14 7.1 14 6C14 4.9 13.1 4 12 4C10.9 4 10 4.9 10 6C10 7.1 10.9 8 12 8ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10ZM12 16C10.9 16 10 16.9 10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18C14 16.9 13.1 16 12 16Z"/>
                </svg>
              </button>
              <div class="chatbot-menu-dropdown" id="chatbotMenuDropdown">
                <button class="chatbot-menu-item" id="chatbotClear">
                  🗑️ Clear chat
                </button>
                <button class="chatbot-menu-item" id="chatbotCloseMenu">
                  ✕ Close
                </button>
              </div>
            </div>
          </div>

          <!-- Messages Area -->
          <div class="chatbot-messages" id="chatbotMessages">
            <div class="welcome-message">
             <h4>👋 Hello!</h4>
              <p>I'm your Business Manager Assistant. I have complete knowledge of your business case and can help you with strategy, operations, marketing, growth planning, and decision-making. How can I assist you today?</p>
              <div class="quick-questions" id="quickQuestions">
                <button class="quick-question-btn" data-question="What growth opportunities should I focus on right now?">
                  📈 Growth opportunities
                </button>
                <button class="quick-question-btn" data-question="Analyze my competitive position and suggest strategies">
                  🎯 Competitive strategy
                </button>
                <!-- Trend buttons will be inserted here dynamically -->
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="chatbot-input-area">
            <textarea 
              class="chatbot-input" 
              id="chatbotInput" 
              placeholder="Ask about your business case..."
              rows="1"
            ></textarea>
            <button class="chatbot-send-btn" id="chatbotSend" aria-label="Send message">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
  }

  attachEventListeners() {
    const toggleBtn = document.getElementById('chatbotToggleBtn');
    const menuBtn = document.getElementById('chatbotMenu');
    const clearBtn = document.getElementById('chatbotClear');
    const closeMenuBtn = document.getElementById('chatbotCloseMenu');
    const sendBtn = document.getElementById('chatbotSend');
    const input = document.getElementById('chatbotInput');
    const menuDropdown = document.getElementById('chatbotMenuDropdown');

    toggleBtn?.addEventListener('click', () => this.toggleChat());
    menuBtn?.addEventListener('click', () => this.toggleMenu());
    closeMenuBtn?.addEventListener('click', () => this.closeChat());
    clearBtn?.addEventListener('click', () => this.clearChat());
    sendBtn?.addEventListener('click', () => this.sendMessage());
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.chatbot-menu-btn') && !e.target.closest('.chatbot-menu-dropdown')) {
        menuDropdown?.classList.remove('active');
      }
    });
    
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    input?.addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    });

    // Quick question buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('quick-question-btn')) {
        const question = e.target.dataset.question;
        this.sendMessage(question);
      }
    });
  }

  async loadBusinessContext() {
    try {
      // First, try to get from localStorage/sessionStorage
      const cachedBusiness = this.getBusinessFromStorage();
      
      if (cachedBusiness) {
        this.businessId = cachedBusiness._id;
        this.businessName = cachedBusiness.store_info?.name || 'Your Business';
        this.updateSubtitle();
        return;
      }

      // Fallback: Get from dataManager
      if (typeof window.dataManager !== 'undefined') {
        const business = window.dataManager.getSelectedBusiness();
        
        if (business) {
          this.businessId = business._id;
          this.businessName = business.store_info?.name || 'Your Business';
          this.updateSubtitle();
          
          // Cache it locally for faster access
          this.cacheBusinessLocally(business);
          return;
        }

        // Last resort: Try to get first business from cached list
        const businesses = window.dataManager.getBusinesses();
        if (businesses && businesses.length > 0) {
          const firstBusiness = businesses[0];
          this.businessId = firstBusiness._id;
          this.businessName = firstBusiness.store_info?.name || 'Your Business';
          this.updateSubtitle();
          this.cacheBusinessLocally(firstBusiness);
        }
      }
    } catch (error) {
      console.error('Failed to load business context:', error);
    }
  }

  getBusinessFromStorage() {
    try {
      // Check localStorage first (persistent)
      const localBusiness = localStorage.getItem('chatbot_selected_business');
      if (localBusiness) {
        const parsed = JSON.parse(localBusiness);
        // Check if it's less than 1 hour old
        if (Date.now() - parsed.timestamp < 3600000) {
          return parsed.business;
        }
      }

      // Check sessionStorage (dataManager stores here)
      const sessionBusiness = sessionStorage.getItem('selectedBusiness');
      if (sessionBusiness) {
        return JSON.parse(sessionBusiness);
      }

      return null;
    } catch (error) {
      console.error('Error reading business from storage:', error);
      return null;
    }
  }

  cacheBusinessLocally(business) {
    try {
      localStorage.setItem('chatbot_selected_business', JSON.stringify({
        business: business,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error caching business locally:', error);
    }
  }

  updateSubtitle() {
    const subtitle = document.getElementById('chatbotSubtitle');
    if (subtitle) {
      subtitle.textContent = `Ask about ${this.businessName}`;
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    const window = document.getElementById('chatbotWindow');
    
    if (this.isOpen) {
      window?.classList.add('active');
      document.getElementById('chatbotInput')?.focus();
    } else {
      window?.classList.remove('active');
    }
  }

  closeChat() {
    this.isOpen = false;
    document.getElementById('chatbotWindow')?.classList.remove('active');
    document.getElementById('chatbotMenuDropdown')?.classList.remove('active');
  }

  toggleMenu() {
    const dropdown = document.getElementById('chatbotMenuDropdown');
    dropdown?.classList.toggle('active');
  }

  clearChat() {
    // Clear conversation history
    this.conversationHistory = [];
    
    // Clear localStorage cache
    if (this.businessId) {
      const cacheKey = `chatbot_conversation_${this.businessId}`;
      localStorage.removeItem(cacheKey);
    }
    
    // Clear messages and show welcome again
    const messagesContainer = document.getElementById('chatbotMessages');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="welcome-message">
          <div class="welcome-avatar">
            <img src="https://zuke.co.za/wp-content/uploads/2023/09/cropped-cropped-cropped-cropped-zuke-logo-.png" alt="Zuke AI">
          </div>
          <h4>👋 Hello!</h4>
          <p>I'm your Business Manager Assistant. I have complete knowledge of your business case and can help you with strategy, operations, marketing, growth planning, and decision-making. How can I assist you today?</p>
          <div class="quick-questions" id="quickQuestions">
            <button class="quick-question-btn" data-question="What is my business's competitive advantage?">
              💡 What is my competitive advantage?
            </button>
            <button class="quick-question-btn" data-question="Summarize my target market">
              🎯 Summarize my target market
            </button>
            <!-- Trend buttons will be inserted here dynamically -->
          </div>
        </div>
      `;
      
      // Re-render trend buttons
      this.renderQuickQuestions(this.trendQuestions);
    }
    
    // Close menu
    document.getElementById('chatbotMenuDropdown')?.classList.remove('active');
  }

  async sendMessage(messageText = null) {
    const input = document.getElementById('chatbotInput');
    const message = messageText || input?.value.trim();

    if (!message || this.isTyping) return;

    // Try to reload business context if not set
    if (!this.businessId) {
      await this.loadBusinessContext();
      
      if (!this.businessId) {
        this.showError('Please select a business first. Go to the Business tab to get started.');
        return;
      }
    }

    // Clear input
    if (input && !messageText) {
      input.value = '';
      input.style.height = 'auto';
    }

    // Remove welcome message if present
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) {
      welcomeMsg.remove();
    }

    // Add user message to UI
    this.addMessage(message, 'user');

    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    // Cache conversation in localStorage
    this.cacheConversation();

    // Show typing indicator
    this.showTyping();

    try {
      // Call backend API
      const response = await fetch('/api/business-chat/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessId: this.businessId,
          message: message,
          conversationHistory: this.conversationHistory
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Remove typing indicator
      this.hideTyping();

      // Add assistant response
      this.addMessage(data.response, 'assistant');

      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: data.response
      });

      // Limit history to last 10 messages
      if (this.conversationHistory.length > 10) {
        this.conversationHistory = this.conversationHistory.slice(-10);
      }

      // Cache conversation in localStorage
      this.cacheConversation();

    } catch (error) {
      console.error('Chat error:', error);
      this.hideTyping();
      this.showError('Sorry, I encountered an error. Please try again.');
    }
  }

  cacheConversation() {
    try {
      if (this.businessId) {
        const cacheKey = `chatbot_conversation_${this.businessId}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          history: this.conversationHistory,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error caching conversation:', error);
    }
  }

  loadCachedConversation() {
    try {
      if (!this.businessId) return;
      
      const cacheKey = `chatbot_conversation_${this.businessId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only load if less than 24 hours old
        if (Date.now() - parsed.timestamp < 86400000) {
          this.conversationHistory = parsed.history || [];
        }
      }
    } catch (error) {
      console.error('Error loading cached conversation:', error);
    }
  }

  getUserProfilePicture() {
    try {
      // Try to get from localStorage (common key patterns)
      const storageKeys = ['user_profile_picture', 'profilePicture', 'userProfilePicture', 'profile_picture'];
      
      for (const key of storageKeys) {
        const picture = localStorage.getItem(key);
        if (picture) return picture;
      }

      // Try to get from sessionStorage
      for (const key of storageKeys) {
        const picture = sessionStorage.getItem(key);
        if (picture) return picture;
      }

      // Check if there's business logo available
      const business = this.getBusinessFromStorage();
      if (business?.logo_url) {
        return business.logo_url;
      }

      return null;
    } catch (error) {
      console.error('Error getting user profile picture:', error);
      return null;
    }
  }

  addMessage(text, role) {
    const messagesContainer = document.getElementById('chatbotMessages');
    const time = new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });

    let avatarContent;
    
    if (role === 'user') {
      // Try to get user profile picture first
      const userPicture = this.getUserProfilePicture();
      avatarContent = userPicture 
        ? `<img src="${userPicture}" alt="You" class="user-profile-pic">`
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/></svg>';
    } else {
      avatarContent = '<img src="https://zuke.co.za/wp-content/uploads/2023/09/cropped-cropped-cropped-cropped-zuke-logo-.png" alt="Zuke AI">';
    }

    const messageHTML = `
      <div class="chat-message ${role}">
        <div class="message-avatar ${role}-avatar">
          ${avatarContent}
        </div>
        <div class="message-content">
          <div class="message-bubble">${this.formatMessage(text)}</div>
          <div class="message-time">${time}</div>
        </div>
      </div>
    `;

    messagesContainer?.insertAdjacentHTML('beforeend', messageHTML);
    this.scrollToBottom();
  }

  formatMessage(text) {
    // Convert markdown-style formatting - properly handle headers and lists
    return text
      .replace(/### (.*?)(\n|$)/g, '<strong>$1</strong><br>')  // H3
      .replace(/## (.*?)(\n|$)/g, '<strong>$1</strong><br>')   // H2
      .replace(/# (.*?)(\n|$)/g, '<strong>$1</strong><br>')    // H1
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')         // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>')                     // Italic
      .replace(/^\d+\.\s/gm, '• ')                              // Numbered lists to bullets
      .replace(/^-\s/gm, '• ')                                  // Dash lists to bullets
      .replace(/\n\n/g, '<br><br>')                             // Double newlines
      .replace(/\n/g, '<br>');                                  // Single newlines
  }

  showTyping() {
    this.isTyping = true;
    const messagesContainer = document.getElementById('chatbotMessages');
    
    const typingHTML = `
      <div class="chat-message assistant" id="typingIndicator">
        <div class="message-avatar">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
          </svg>
        </div>
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;

    messagesContainer?.insertAdjacentHTML('beforeend', typingHTML);
    this.scrollToBottom();

    // Disable send button
    const sendBtn = document.getElementById('chatbotSend');
    if (sendBtn) sendBtn.disabled = true;
  }

  hideTyping() {
    this.isTyping = false;
    document.getElementById('typingIndicator')?.remove();
    
    // Enable send button
    const sendBtn = document.getElementById('chatbotSend');
    if (sendBtn) sendBtn.disabled = false;
  }

  showError(message) {
    const messagesContainer = document.getElementById('chatbotMessages');
    const errorHTML = `
      <div class="error-message">
        ⚠️ ${message}
      </div>
    `;
    messagesContainer?.insertAdjacentHTML('beforeend', errorHTML);
    this.scrollToBottom();
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById('chatbotMessages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Public method to update business context when user switches businesses
  updateBusinessContext(businessId, businessName, businessData = null) {
    this.businessId = businessId;
    this.businessName = businessName;
    
    // Try to load cached conversation for this business
    this.conversationHistory = [];
    this.loadCachedConversation();
    
    // Cache the business data locally
    if (businessData) {
      this.cacheBusinessLocally(businessData);
    } else {
      // Try to get from dataManager and cache it
      const business = window.dataManager?.getSelectedBusiness();
      if (business) {
        this.cacheBusinessLocally(business);
      }
    }
    
    this.updateSubtitle();

    // Clear messages and show welcome again
    const messagesContainer = document.getElementById('chatbotMessages');
    if (messagesContainer && this.isOpen) {
      messagesContainer.innerHTML = `
        <div class="welcome-message">
          <div class="welcome-avatar">
            <img src="https://zuke.co.za/wp-content/uploads/2023/09/cropped-cropped-cropped-cropped-zuke-logo-.png" alt="Zuke AI">
          </div>
          <h4>👋 Hello!</h4>
          <p>I've switched to <strong>${businessName}</strong>. Ask me anything about this business case.</p>
        </div>
      `;
    }
  }

  // Register a callback to listen for business changes from dataManager
  registerBusinessChangeListener() {
    if (typeof window.dataManager !== 'undefined' && window.dataManager.cache.businessChangeCallbacks) {
      window.dataManager.cache.businessChangeCallbacks.push((business) => {
        if (business && business._id) {
          this.updateBusinessContext(
            business._id,
            business.store_info?.name || 'Your Business',
            business
          );
          // Reload trends for new business
          this.loadTrends();
        }
      });
    }
  }

  // Load trending topics for the business from SerpAPI
  async loadTrends() {
    try {
      if (!this.businessId) {
        // Use default trends if no business selected yet
        this.renderQuickQuestions([]);
        return;
      }

      const response = await fetch('/api/serpapi-trends/get-trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ businessId: this.businessId })
      });

      if (!response.ok) {
        console.warn('Failed to fetch trends, using defaults');
        this.renderQuickQuestions([]);
        return;
      }

      const data = await response.json();
      this.trendQuestions = data.trends || [];
      this.renderQuickQuestions(this.trendQuestions);

    } catch (error) {
      console.error('Error loading trends:', error);
      this.renderQuickQuestions([]);
    }
  }

  // Render quick question buttons with trends
  renderQuickQuestions(trends) {
    const container = document.getElementById('quickQuestions');
    if (!container) return;

    // Always show 2 hardcoded business manager questions
    const hardcodedHTML = `
      <button class="quick-question-btn" data-question="What growth opportunities should I focus on right now?">
        📈 Growth opportunities
      </button>
      <button class="quick-question-btn" data-question="Analyze my competitive position and suggest strategies">
        🎯 Competitive strategy
      </button>
    `;

    // Add 2 trend questions if available
    let trendsHTML = '';
    if (trends && trends.length > 0) {
      const trendButtons = trends.slice(0, 2).map(trend => `
        <button class="quick-question-btn trend-btn" data-question="${trend.question}">
          ${trend.emoji} ${trend.question}
        </button>
      `).join('');
      trendsHTML = trendButtons;
    }

    // Add "See more trends" button
    const moreTrendsHTML = `
      <button class="quick-question-btn see-more-btn" data-question="What are the latest trends affecting my industry?">
        🔍 See more trends
      </button>
    `;

    container.innerHTML = hardcodedHTML + trendsHTML + moreTrendsHTML;
  }

  /**
   * Toggle chatbot visibility on/off
   */
  toggleChatbot(enabled) {
    const widget = document.querySelector('.ai-chatbot-widget');
    if (!widget) {
      console.warn('Chatbot widget not found');
      return;
    }
    
    if (enabled) {
      widget.style.display = 'block';
      localStorage.setItem('chatbotEnabled', 'true');
    } else {
      // Close the chat if it's open
      if (this.isOpen) {
        this.toggleChat();
      }
      widget.style.display = 'none';
      localStorage.setItem('chatbotEnabled', 'false');
    }
  }

  /**
   * Check if chatbot is enabled from localStorage
   */
  isChatbotEnabled() {
    const stored = localStorage.getItem('chatbotEnabled');
    return stored === null ? true : stored === 'true';
  }
}

// Setup chatbot enable/disable toggle switch in sidebar
function setupChatbotToggle() {
  // Wait a bit for the chatbot widget to be created
  setTimeout(() => {
    const chatbotEnableToggle = document.getElementById('chatbotToggle');
    if (chatbotEnableToggle && window.businessChatbot) {
      // Set initial state from localStorage
      const isEnabled = window.businessChatbot.isChatbotEnabled();
      chatbotEnableToggle.checked = isEnabled;
      window.businessChatbot.toggleChatbot(isEnabled);
      
      // Add change event listener
      chatbotEnableToggle.addEventListener('change', (e) => {
        window.businessChatbot.toggleChatbot(e.target.checked);
      });
    }
  }, 100);
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.businessChatbot = new BusinessChatbot();
    setupChatbotToggle();
  });
} else {
  window.businessChatbot = new BusinessChatbot();
  setupChatbotToggle();
}

export default BusinessChatbot;
