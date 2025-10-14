// pages/afaa.js
let auth0Client = null;

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

export async function initAfaaPage() {
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
    const userEmail = user.email || user.name || 'unknown';
    const userName = user.name || 'User';

    // AFAA Tool 1
    const afaaTool1Btn = document.getElementById("afaaTool1Btn");
    if (afaaTool1Btn) {
      afaaTool1Btn.onclick = function(e) {
        e.stopPropagation();
        console.log('AFAA Tool 1 clicked');
        // Add your tool 1 functionality here
      }
    }

    // AFAA Tool 2
    const afaaTool2Btn = document.getElementById("afaaTool2Btn");
    if (afaaTool2Btn) {
      afaaTool2Btn.onclick = function(e) {
        e.stopPropagation();
        console.log('AFAA Tool 2 clicked');
        // Add your tool 2 functionality here
      }
    }

    // AFAA Tool 3
    const afaaTool3Btn = document.getElementById("afaaTool3Btn");
    if (afaaTool3Btn) {
      afaaTool3Btn.onclick = function(e) {
        e.stopPropagation();
        console.log('AFAA Tool 3 clicked');
        // Add your tool 3 functionality here
      }
    }

    // AFAA Tool 4
    const afaaTool4Btn = document.getElementById("afaaTool4Btn");
    if (afaaTool4Btn) {
      afaaTool4Btn.onclick = function(e) {
        e.stopPropagation();
        console.log('AFAA Tool 4 clicked');
        // Add your tool 4 functionality here
      }
    }

  } catch (error) {
    console.error("Error in initAfaaPage:", error);
  }
}