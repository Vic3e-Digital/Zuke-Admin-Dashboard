// Authentication module
class AuthManager {
    constructor() {
        this.user = null;
        this.authenticated = false;
        this.loading = false;
    }

    async checkAuth() {
        try {
            this.loading = true;
            const response = await fetch('/api/auth/verify');
            const data = await response.json();

            if (data.success && data.authenticated) {
                this.user = data.user;
                this.authenticated = true;
                return { success: true, user: data.user };
            } else {
                this.user = null;
                this.authenticated = false;
                return { success: false };
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.user = null;
            this.authenticated = false;
            return { success: false, error: 'Network error' };
        } finally {
            this.loading = false;
        }
    }

    async login(email, password) {
        try {
            this.loading = true;
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.success) {
                await this.checkAuth(); // Refresh auth state
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, error: 'Login failed' };
        } finally {
            this.loading = false;
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.user = null;
            this.authenticated = false;
            window.location.href = '/';
        } catch (error) {
            console.error('Logout failed:', error);
            // Force logout on client side even if server request fails
            this.user = null;
            this.authenticated = false;
            window.location.href = '/';
        }
    }

    // Check if user is authenticated and redirect if not
    async requireAuth() {
        const result = await this.checkAuth();
        if (!result.success) {
            window.location.href = '/';
            return false;
        }
        return true;
    }

    // Redirect to dashboard if already authenticated
    async redirectIfAuthenticated() {
        const result = await this.checkAuth();
        if (result.success) {
            window.location.href = '/dashboard.html';
            return true;
        }
        return false;
    }
}

// Create global auth instance
window.authManager = new AuthManager();
