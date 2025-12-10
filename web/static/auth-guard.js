// Auth Guard - Protects pages that require authentication
class AuthGuard {
    constructor() {
        this.apiBase = '/api';
        this.isAuthenticated = false;
        this.checkAuth();
    }

    async checkAuth() {
        try {
            const response = await fetch(`${this.apiBase}/auth/me`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                this.isAuthenticated = true;
                console.log('User is authenticated');
            } else {
                this.isAuthenticated = false;
                this.redirectToHome();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.isAuthenticated = false;
            this.redirectToHome();
        }
    }

    redirectToHome() {
        // Only redirect if we're not already on home or a public page
        const currentPath = window.location.pathname;
        const publicPages = ['/home.html', '/', '/index.html'];
        
        // If we're on a protected page (not in publicPages), redirect to home
        if (!publicPages.includes(currentPath)) {
            console.log('Not authenticated, redirecting to home...');
            window.location.href = '/home.html';
        }
    }
}

// Initialize auth guard on protected pages
// This will run automatically when the script is loaded
new AuthGuard();
