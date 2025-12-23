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
            } else {
                this.isAuthenticated = false;
                this.redirectToHome();
            }
        } catch (error) {
            this.isAuthenticated = false;
            this.redirectToHome();
        }
    }

    redirectToHome() {
        const currentPath = window.location.pathname;
        const publicPages = ['/home.html', '/', '/index.html'];
        
        if (!publicPages.includes(currentPath)) {
            window.location.href = '/home.html';
        }
    }
}

new AuthGuard();
