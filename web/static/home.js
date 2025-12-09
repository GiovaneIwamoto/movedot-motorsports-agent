// MoveDot Home Page JavaScript - Zero Scroll Interference

class HomePage {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupHeroGridPattern();
        // Delay animations significantly to ensure no scroll interference
        setTimeout(() => {
            this.setupScrollAnimations();
        }, 500);
    }

    setupEventListeners() {
        // Simple anchor navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const href = anchor.getAttribute('href');
                const target = document.querySelector(href);
                if (target) {
                    const targetPosition = target.offsetTop - 80;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'auto'
                    });
                }
            });
        });
    }

    setupHeroGridPattern() {
        const heroSection = document.querySelector('.hero');
        const squaresContainer = document.querySelector('.hero-grid-squares');
        
        if (!heroSection || !squaresContainer) return;

        const gridSize = 40;
        const numSquares = 50;
        let squares = [];

        // Get random position within hero section
        function getRandomPos() {
            const rect = heroSection.getBoundingClientRect();
            const maxX = Math.max(1, Math.floor(rect.width / gridSize));
            const maxY = Math.max(1, Math.floor(rect.height / gridSize));
            return [
                Math.floor(Math.random() * maxX),
                Math.floor(Math.random() * maxY)
            ];
        }

        // Generate initial squares
        function generateSquares() {
            squares = Array.from({ length: numSquares }, (_, i) => ({
                id: i,
                pos: getRandomPos()
            }));
        }

        // Update square position
        function updateSquarePosition(id) {
            const newPos = getRandomPos();
            squares = squares.map(sq =>
                sq.id === id ? { ...sq, pos: newPos } : sq
            );
            return newPos;
        }

        // Create and animate squares
        function createSquares() {
            squaresContainer.innerHTML = '';
            
            squares.forEach(({ pos: [x, y], id }, index) => {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('class', 'hero-grid-square');
                rect.setAttribute('width', gridSize - 1);
                rect.setAttribute('height', gridSize - 1);
                rect.setAttribute('x', x * gridSize + 1);
                rect.setAttribute('y', y * gridSize + 1);
                rect.style.animationDelay = `${index * 0.1}s`;
                
                // Update position when animation completes (after reverse)
                let animationCount = 0;
                rect.addEventListener('animationiteration', () => {
                    animationCount++;
                    // Update position after each complete cycle (0 -> 1 -> 0)
                    if (animationCount % 2 === 0) {
                        const newPos = updateSquarePosition(id);
                        rect.setAttribute('x', newPos[0] * gridSize + 1);
                        rect.setAttribute('y', newPos[1] * gridSize + 1);
                    }
                });
                
                squaresContainer.appendChild(rect);
            });
        }

        // Initialize after a small delay to ensure hero section is rendered
        setTimeout(() => {
            generateSquares();
            createSquares();
        }, 100);

        // Update on resize
        let resizeTimeout;
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                generateSquares();
                createSquares();
            }, 200);
        });

        resizeObserver.observe(heroSection);
    }

    setupScrollAnimations() {
        // Observer with better thresholds for smooth animations
        const observerOptions = {
            threshold: [0, 0.1, 0.25, 0.5],
            rootMargin: '50px' // Trigger slightly before element enters viewport
        };

        // Smooth animation observer with RAF
        let isProcessing = false;
        const observer = new IntersectionObserver((entries) => {
            if (isProcessing) return;
            isProcessing = true;
            
            requestAnimationFrame(() => {
                entries.forEach(entry => {
                    // Smooth transition based on intersection ratio
                    const ratio = entry.intersectionRatio;
                    
                    if (entry.isIntersecting && ratio > 0.1) {
                        entry.target.classList.add('is-visible');
                        entry.target.classList.remove('is-hidden');
                    } else if (!entry.isIntersecting) {
                        // Only hide if completely out of viewport
                        const rect = entry.boundingClientRect;
                        if (rect.bottom < -200 || rect.top > window.innerHeight + 200) {
                            entry.target.classList.remove('is-visible');
                            entry.target.classList.add('is-hidden');
                        }
                    }
                });
                isProcessing = false;
            });
        }, observerOptions);

        // Observe elements only once
        const elements = [
            ...document.querySelectorAll('.hero-title, .hero-subtitle, .hero-cta'),
            ...document.querySelectorAll('.display-cards'),
            ...document.querySelectorAll('.section-header, .section-label, .section-title, .section-subtitle'),
            ...document.querySelectorAll('.feature-card'),
            ...document.querySelectorAll('.cta-title, .cta-text, .cta .btn-primary')
        ];

        elements.forEach((el, index) => {
            el.classList.add('scroll-animate');
            if (el.classList.contains('feature-card') || el.classList.contains('hero-title')) {
                el.style.setProperty('--animation-delay', `${index * 0.08}s`);
            }
            observer.observe(el);
        });
    }
}

// Initialize with passive event
document.addEventListener('DOMContentLoaded', () => {
    new HomePage();
}, { passive: true });
