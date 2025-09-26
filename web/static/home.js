// MoveDot Home Page JavaScript

class HomePage {
    constructor() {
        // Loader system
        this.loaderTimeout = null;
        this.isLoading = false;
        
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
                console.log('Enter Dashboard clicked');
                this.navigateToDashboard();
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                console.log('Keyboard navigation triggered');
                this.navigateToDashboard();
            }
        });

        // Add visual feedback
        if (enterButton) {
            enterButton.addEventListener('mousedown', () => {
                enterButton.style.transform = 'translateY(-2px) scale(0.98)';
            });
            
            enterButton.addEventListener('mouseup', () => {
                enterButton.style.transform = '';
            });
        }
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
        console.log('Navigating to dashboard...');
        
        // Show inline loader in button
        this.showButtonLoader();
        
        // Navigate after loader animation
        setTimeout(() => {
            console.log('Redirecting to dashboard...');
            window.location.href = 'index.html';
        }, 2000);
    }

    showButtonLoader() {
        if (this.isLoading) return;
        
        console.log('Showing button loader');
        this.isLoading = true;
        
        const enterButton = document.getElementById('enter-button');
        const buttonText = enterButton.querySelector('.button-text');
        const arrow = enterButton.querySelector('.arrow');
        const buttonLoader = document.getElementById('button-loader');
        
        if (enterButton && buttonText && arrow && buttonLoader) {
            // Add loading class to remove border
            enterButton.classList.add('loading');
            
            // Hide text and arrow
            buttonText.style.display = 'none';
            arrow.style.display = 'none';
            
            // Show loader
            buttonLoader.style.display = 'flex';
            
            // Disable button
            enterButton.style.pointerEvents = 'none';
            enterButton.style.opacity = '0.7';
            
            console.log('Button loader activated');
        } else {
            console.error('Button elements not found');
        }
    }

    hideButtonLoader() {
        if (!this.isLoading) return;
        
        console.log('Hiding button loader');
        this.isLoading = false;
        
        const enterButton = document.getElementById('enter-button');
        const buttonText = enterButton.querySelector('.button-text');
        const arrow = enterButton.querySelector('.arrow');
        const buttonLoader = document.getElementById('button-loader');
        
        if (enterButton && buttonText && arrow && buttonLoader) {
            // Show text and arrow
            buttonText.style.display = 'inline';
            arrow.style.display = 'inline';
            
            // Hide loader
            buttonLoader.style.display = 'none';
            
            // Enable button
            enterButton.style.pointerEvents = 'auto';
            enterButton.style.opacity = '1';
            
            console.log('Button loader deactivated');
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
