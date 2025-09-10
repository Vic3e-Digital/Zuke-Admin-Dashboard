// AI Employees management functionality

// Initialize page
document.addEventListener("DOMContentLoaded", async function() {
    // Check authentication
    const authResult = await checkAuth();
    if (!authResult.success) {
        window.location.href = "/";
        return;
    }

    // You can add logic here to fetch and display AI employees
    // For now, it's a placeholder page
});

// Logout function (re-used from auth.js, but good to have here for clarity)
async function logout() {
    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.location.href = "/";
        } else {
            alert("Logout failed");
        }
    } catch (error) {
        console.error("Logout error:", error);
        alert("Logout failed");
    }
}
