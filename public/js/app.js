/**
 * ZukeX Authentication & UI Management
 * Handles Auth0 authentication and animated UI updates
 */

let auth0Client = null;

// ============================================
// AUTH0 CONFIGURATION
// ============================================

const fetchAuthConfig = () => fetch("/auth_config.json");

const configureClient = async () => {
  try {
    // console.log("Starting Auth0 configuration...");
    
    const response = await fetchAuthConfig();
    const config = await response.json();
    
    // console.log("Auth0 config loaded:", config);

    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    });
    
    // Expose auth0Client globally for other pages to use
    window.auth0Client = auth0Client;
    
    console.log("Auth0 client created successfully");
    return true;
  } catch (error) {
    console.error("Error configuring Auth0 client:", error);
    return false;
  }
};

// ============================================
// UI UPDATE WITH ANIMATIONS (MERGED)
// ============================================

const updateUI = async () => {
  try {
    console.log("Updating UI with animations...");
    
    if (!auth0Client) {
      console.error("Auth0 client not initialized");
      return;
    }

    const isAuthenticated = await auth0Client.isAuthenticated();
    console.log("Is authenticated:", isAuthenticated);

    const loginBtn = document.getElementById("btn-login");
    const logoutBtn = document.getElementById("btn-logout");
    
    // Update button states with smooth animations
    if (loginBtn && logoutBtn) {
      if (isAuthenticated) {
        // User is authenticated - show logout button
        loginBtn.style.transition = 'opacity 0.3s, transform 0.3s';
        loginBtn.style.opacity = '0';
        loginBtn.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
          loginBtn.style.display = 'none';
          loginBtn.disabled = true;
          
          logoutBtn.style.display = 'block';
          logoutBtn.style.opacity = '0';
          logoutBtn.style.transform = 'scale(0.95)';
          logoutBtn.disabled = false;
          
          setTimeout(() => {
            logoutBtn.style.transition = 'opacity 0.3s, transform 0.3s';
            logoutBtn.style.opacity = '1';
            logoutBtn.style.transform = 'scale(1)';
          }, 50);
        }, 300);
        
      } else {
        // User is NOT authenticated - show login button
        logoutBtn.style.display = 'none';
        logoutBtn.disabled = true;
        
        loginBtn.style.display = 'block';
        loginBtn.style.opacity = '1';
        loginBtn.style.transform = 'scale(1)';
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>Get Started</span>';
      }
    }
    
    // Handle authenticated user content
    if (isAuthenticated) {
      const gatedContent = document.getElementById("gated-content");
      if (gatedContent) {
        gatedContent.classList.remove("hidden");
      }

      try {
        const user = await auth0Client.getUser();
        
        // Check if user changed (different account)
        const lastUserSub = sessionStorage.getItem('lastUserSub');
        const currentUserSub = user.sub;
        
        if (lastUserSub && lastUserSub !== currentUserSub) {
          console.log('Different user detected, clearing session data');
          sessionStorage.removeItem('hasRedirected');
          
          // Clear business cache if dataManager exists
          if (window.dataManager) {
            window.dataManager.clearBusinesses();
          }
          localStorage.removeItem('lastUserId');
        }
        
        sessionStorage.setItem('lastUserSub', currentUserSub);

        // Update token and profile displays (if elements exist)
        const tokenElement = document.getElementById("ipt-access-token");
        const profileElement = document.getElementById("ipt-user-profile");
        
        if (tokenElement) {
          const token = await auth0Client.getTokenSilently();
          tokenElement.innerHTML = token;
        }
        if (profileElement) {
          profileElement.textContent = JSON.stringify(user, null, 2);
        }
      } catch (tokenError) {
        console.error("Error getting token/user:", tokenError);
      }

    } else {
      // Not authenticated - hide gated content
      const gatedContent = document.getElementById("gated-content");
      if (gatedContent) {
        gatedContent.classList.add("hidden");
      }
      
      // Clear user tracking
      sessionStorage.removeItem('lastUserSub');
      sessionStorage.removeItem('hasRedirected');
    }
    
    // Auto-redirect to dashboard if authenticated
    const isIndexPage = window.location.pathname === '/' || 
                        window.location.pathname === '/index.html';
    const isCallback = window.location.search.includes("code=") && 
                       window.location.search.includes("state=");
    const hasRedirected = sessionStorage.getItem('hasRedirected');
    
    if (isAuthenticated && isIndexPage && !isCallback && !hasRedirected) {
      console.log("User authenticated, redirecting to dashboard...");
      sessionStorage.setItem('hasRedirected', 'true');
      
      // Show redirect message with animation
      const card = document.querySelector('.login-card');
      if (card) {
        const redirectMsg = document.createElement('div');
        redirectMsg.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(99, 102, 241, 0.95);
          color: white;
          padding: 1.5rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          z-index: 100;
          opacity: 0;
          transition: opacity 0.3s;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        `;
        redirectMsg.textContent = '✓ Redirecting to dashboard...';
        card.appendChild(redirectMsg);
        
        setTimeout(() => {
          redirectMsg.style.opacity = '1';
        }, 100);
      }
      
      // Smooth fade out and redirect
      setTimeout(() => {
        document.body.style.opacity = '0';
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 300);
      }, 1200);
    }
  } catch (error) {
    console.error("Error updating UI:", error);
  }
};

// ============================================
// LOGIN FUNCTION
// ============================================

const login = async () => {
  try {
    console.log("Starting login...");
    
    if (!auth0Client) {
      console.error("Auth0 client not initialized");
      showError("Authentication system is not ready. Please refresh the page.");
      return;
    }
    
    // Prevent multiple clicks and show loading state
    const loginBtn = document.getElementById("btn-login");
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.classList.add('loading');
      loginBtn.innerHTML = '<span>Loading...</span>';
    }
    
    // Track login attempt (if analytics available)
    if (window.analytics) {
      window.analytics.trackEvent('login_attempt', {
        category: 'Authentication',
        label: 'Login Button Click'
      });
    }
    
    // Clear any existing session flags
    sessionStorage.removeItem('hasRedirected');
    sessionStorage.removeItem('lastUserSub');
    
    // Redirect to Auth0 login
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    
    // Reset button state on error
    const loginBtn = document.getElementById("btn-login");
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
      loginBtn.innerHTML = '<span>Get Started</span>';
    }
    
    // Show user-friendly error
    showError(`Login failed: ${error.message}. Please try again.`);
    
    // Track error
    if (window.analytics) {
      window.analytics.trackError('Login failed', 'Login Page', {
        error_message: error.message
      });
    }
  }
};

// ============================================
// LOGOUT FUNCTION
// ============================================

const logout = () => {
  try {
    console.log("Starting logout...");
    
    if (!auth0Client) {
      console.error("Auth0 client not initialized");
      showError("Authentication system is not ready. Please refresh the page.");
      return;
    }
    
    // Track logout event
    if (window.analytics) {
      window.analytics.trackEvent('logout', {
        category: 'Authentication',
        label: 'Logout Button Click'
      });
    }
    
    // Show logging out message
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.innerHTML = '<span>Logging out...</span>';
    }
    
    // Clear all session data
    sessionStorage.clear();
    localStorage.removeItem('lastUserId');
    
    // Perform logout
    auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  } catch (error) {
    console.error("Logout error:", error);
    
    // Reset button
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.disabled = false;
      logoutBtn.innerHTML = '<span>Log out</span>';
    }
    
    showError(`Logout failed: ${error.message}. Please try again.`);
    
    // Track error
    if (window.analytics) {
      window.analytics.trackError('Logout failed', 'Dashboard', {
        error_message: error.message
      });
    }
  }
};

// ============================================
// ERROR DISPLAY HELPER
// ============================================

function showError(message) {
  const card = document.querySelector('.login-card');
  if (!card) {
    alert(message);
    return;
  }
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    padding: 1rem;
    border-radius: 12px;
    margin-top: 1rem;
    text-align: center;
    animation: slideInBottom 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  errorDiv.textContent = message;
  
  const cardContent = document.querySelector('.card-content');
  if (cardContent) {
    cardContent.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
      errorDiv.style.opacity = '0';
      setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
  }
}

// ============================================
// INITIALIZATION
// ============================================

window.onload = async () => {
  console.log("=== Page loaded, initializing Auth0 ===");
  
  // DON'T set body opacity here - let it happen naturally
  // Remove these lines:
  // document.body.style.opacity = '0';
  // document.body.style.transition = 'opacity 0.5s ease-in';
  
  // Configure Auth0 client
  const configured = await configureClient();
  if (!configured) {
    console.error("Failed to configure Auth0");
    
    const loginBtn = document.getElementById("btn-login");
    if (loginBtn) {
      loginBtn.textContent = "Authentication Error - Click to Refresh";
      loginBtn.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
      loginBtn.disabled = false;
      loginBtn.onclick = () => {
        window.location.reload();
      };
    }
    
    // Add loaded class to show page
    document.body.classList.add('loaded');
    return;
  }
  
  // Check if we're handling a redirect callback from Auth0
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {
    console.log("Handling Auth0 callback...");
    
    try {
      await auth0Client.handleRedirectCallback();
      console.log("Callback handled successfully");
      
      if (window.analytics) {
        window.analytics.trackEvent('login_success', {
          category: 'Authentication',
          label: 'Login Successful'
        });
      }
      
      window.history.replaceState({}, document.title, window.location.pathname);
      sessionStorage.removeItem('hasRedirected');
      
    } catch (error) {
      console.error("Error handling callback:", error);
      
      if (window.analytics) {
        window.analytics.trackError('Login callback failed', 'Login Page', {
          error_message: error.message
        });
      }
      
      showError('Login callback failed. Please try logging in again.');
    }
  }

  // Update UI
  await updateUI();
  
  // Add loaded class to fade in body AFTER everything is ready
  setTimeout(() => {
    document.body.classList.add('loaded');
  }, 50);
  
  console.log("=== Auth0 initialization complete ===");
};

// ============================================
// PREVENT DUPLICATE EVENT LISTENERS
// ============================================

// Remove the separate DOMContentLoaded listener since we're using window.onload
// window.onload fires AFTER DOMContentLoaded, so we don't need both

console.log("✅ Auth0 app.js loaded");