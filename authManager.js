// public/js/authManager.js

const authManager = {
  async login(email, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  },

  async redirectIfAuthenticated() {
    try {
      const res = await fetch('/api/auth/verify', {
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok && data.authenticated) {
        // Already logged in — redirect
        window.location.href = '/dashboard.html';
      }
    } catch (err) {
      // Fail silently
    }
  },

  async logout() {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Logout failed', err);
    }
  },

  async getProfile() {
    try {
      const res = await fetch('/api/user/profile', {
        credentials: 'include'
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }
};

window.authManager = authManager; // Expose globally
