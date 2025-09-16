// AI Employees management functionality

// Initialize page
document.addEventListener("DOMContentLoaded", async function() {
    // Auth0 SPA SDK authentication check
    let auth0Client = null;
    const fetchAuthConfig = () => fetch("/auth_config.json");
    const configureClient = async () => {
        const response = await fetchAuthConfig();
        const config = await response.json();
        auth0Client = await auth0.createAuth0Client({
            domain: config.domain,
            clientId: config.clientId
        });
    };

    await configureClient();

    // Handle Auth0 redirect callback if present
    const query = window.location.search;
    if (query.includes("code=") && query.includes("state=")) {
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, "/ai-employees.html");
    }

    const isAuthenticated = await auth0Client.isAuthenticated();
    if (!isAuthenticated) {
        await auth0Client.loginWithRedirect({
            authorizationParams: {
                redirect_uri: window.location.origin + "/ai-employees.html"
            }
        });
        return;
    }

    // You can add logic here to fetch and display AI employees
    // For now, it's a placeholder page
});


// Auth0 SPA SDK logout function
async function logout() {
    // Ensure auth0Client is initialized
    if (!window.auth0Client) {
        const fetchAuthConfig = () => fetch("/auth_config.json");
        const response = await fetchAuthConfig();
        const config = await response.json();
        window.auth0Client = await auth0.createAuth0Client({
            domain: config.domain,
            clientId: config.clientId
        });
    }
    window.auth0Client.logout({
        logoutParams: {
            returnTo: window.location.origin
        }
    });
}
