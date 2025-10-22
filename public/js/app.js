let auth0Client = null;

const fetchAuthConfig = () => fetch("/auth_config.json");

const configureClient = async () => {
  try {
    console.log("Starting Auth0 configuration...");
    
    const response = await fetchAuthConfig();
    const config = await response.json();
    
    console.log("Auth0 config loaded:", config);

    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      cacheLocation: 'localstorage',
      useRefreshTokens: true
    });
    
    console.log("Auth0 client created successfully");
    return true;
  } catch (error) {
    console.error("Error configuring Auth0 client:", error);
    return false;
  }
};

const updateUI = async () => {
  try {
    console.log("Updating UI...");
    
    if (!auth0Client) {
      console.error("Auth0 client not initialized");
      return;
    }

    const isAuthenticated = await auth0Client.isAuthenticated();
    console.log("Is authenticated:", isAuthenticated);

    // Make sure we're updating the correct buttons
    const loginBtn = document.getElementById("btn-login");
    const logoutBtn = document.getElementById("btn-logout");
    
    if (loginBtn) {
      loginBtn.disabled = isAuthenticated;
      if (!isAuthenticated) {
        loginBtn.textContent = "Click here to get started";
      }
    }
    
    if (logoutBtn) {
      logoutBtn.disabled = !isAuthenticated;
      if (isAuthenticated) {
        logoutBtn.style.backgroundColor = "#dc3545";
        logoutBtn.style.color = "white";
      }
    }
    
    if (isAuthenticated) {
      const gatedContent = document.getElementById("gated-content");
      if (gatedContent) {
        gatedContent.classList.remove("hidden");
      }

      try {
        const user = await auth0Client.getUser();
        
        // Check if user changed
        const lastUserSub = sessionStorage.getItem('lastUserSub');
        const currentUserSub = user.sub;
        
        if (lastUserSub && lastUserSub !== currentUserSub) {
          console.log('Different user detected, clearing flags');
          sessionStorage.removeItem('hasRedirected');
          
          // Also clear the business cache
          if (window.dataManager) {
            window.dataManager.clearBusinesses();
          }
          localStorage.removeItem('lastUserId');
        }
        
        sessionStorage.setItem('lastUserSub', currentUserSub);

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
      const gatedContent = document.getElementById("gated-content");
      if (gatedContent) {
        gatedContent.classList.add("hidden");
      }
      // Clear user tracking when not authenticated
      sessionStorage.removeItem('lastUserSub');
      sessionStorage.removeItem('hasRedirected');
    }
    
    // Only auto-redirect if we're on the index page and NOT coming from a callback
    const isIndexPage = window.location.pathname === '/' || window.location.pathname === '/index.html';
    const isCallback = window.location.search.includes("code=") || window.location.search.includes("state=");
    const hasRedirected = sessionStorage.getItem('hasRedirected');
    
    if (isAuthenticated && isIndexPage && !isCallback && !hasRedirected) {
      console.log("User authenticated, redirecting to dashboard...");
      sessionStorage.setItem('hasRedirected', 'true');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000); // Reduced delay
    }
  } catch (error) {
    console.error("Error updating UI:", error);
  }
};

const login = async () => {
  try {
    console.log("Starting login...");
    
    // Track login attempt
    if (window.analytics) {
      window.analytics.trackEvent('login_attempt', {
        category: 'Authentication',
        label: 'Login Button Click'
      });
    }
    
    // Clear any existing flags before login
    sessionStorage.removeItem('hasRedirected');
    sessionStorage.removeItem('lastUserSub');
    
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    
    // Track login error
    if (window.analytics) {
      window.analytics.trackError('Login failed', 'Login Page', {
        error_message: error.message
      });
    }
  }
};

const logout = () => {
  try {
    console.log("Starting logout...");
    
    // Track logout event
    if (window.analytics) {
      window.analytics.trackEvent('logout', {
        category: 'Authentication',
        label: 'Logout Button Click'
      });
    }
    
    // Clear all session data on logout
    sessionStorage.clear();
    localStorage.removeItem('lastUserId');
    
    auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  } catch (error) {
    console.error("Logout error:", error);
    
    // Track logout error
    if (window.analytics) {
      window.analytics.trackError('Logout failed', 'Dashboard', {
        error_message: error.message
      });
    }
  }
};

window.onload = async () => {
  console.log("=== Page loaded, initializing Auth0 ===");
  
  // Configure client first
  const configured = await configureClient();
  if (!configured) {
    console.error("Failed to configure Auth0");
    return;
  }
  
  // Check if we're handling a redirect callback
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {
    console.log("Handling Auth0 callback...");
    try {
      // Process the login state
      await auth0Client.handleRedirectCallback();
      console.log("Callback handled successfully");
      
      // Track successful login
      if (window.analytics) {
        window.analytics.trackEvent('login_success', {
          category: 'Authentication',
          label: 'Login Successful'
        });
      }
      
      // Clear the query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Clear the redirect flag after callback to ensure redirect happens
      sessionStorage.removeItem('hasRedirected');
      
    } catch (error) {
      console.error("Error handling callback:", error);
      
      // Track login callback error
      if (window.analytics) {
        window.analytics.trackError('Login callback failed', 'Login Page', {
          error_message: error.message
        });
      }
    }
  }

  // Update UI after everything is processed
  await updateUI();
  
  console.log("=== Auth0 initialization complete ===");
};