// MoveDot Home Page JavaScript

class HomePage {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startBackgroundAnimation();
        this.preloadDashboard();
    }

    setupEventListeners() {
        // Enter button click
        const enterButton = document.querySelector('.enter-button');
        if (enterButton) {
            enterButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToDashboard();
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                this.navigateToDashboard();
            }
        });

    }

    startBackgroundAnimation() {
        // Subtle floating animation for background elements
        const body = document.body;
        let mouseX = 0;
        let mouseY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth) * 100;
            mouseY = (e.clientY / window.innerHeight) * 100;
            
            // Update background pattern position
            body.style.setProperty('--mouse-x', `${mouseX}%`);
            body.style.setProperty('--mouse-y', `${mouseY}%`);
        });
    }


    navigateToDashboard() {
        const enterButton = document.querySelector('.enter-button');
        if (enterButton) {
            // Add loading state
            enterButton.style.opacity = '0.7';
            enterButton.style.transform = 'translateY(-2px) scale(0.98)';
            
            const originalText = enterButton.innerHTML;
            enterButton.innerHTML = '<span>Loading...</span><div class="arrow">...</div>';
            
            // Simulate loading time for smooth transition
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        }
    }

    preloadDashboard() {
        // Preload the dashboard page for faster navigation
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = 'index.html';
        document.head.appendChild(link);

        // Also preload critical CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'prefetch';
        cssLink.href = 'static/styles.css';
        document.head.appendChild(cssLink);
    }

}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HomePage();
});

// Add some additional CSS animations via JavaScript
const additionalStyles = `
    .logo-m, .logo-y {
        transition: transform 0.2s ease;
    }
    
    .yc-logo {
        transition: transform 0.3s ease;
    }
    
    .enter-button {
        position: relative;
    }
    
    .enter-button:active {
        transform: translateY(-1px) scale(0.98);
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
