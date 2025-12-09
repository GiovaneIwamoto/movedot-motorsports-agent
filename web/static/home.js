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
            ...document.querySelectorAll('.hero-header, .hero-title, .hero-subtitle'),
            ...document.querySelectorAll('.hero-cta'),
            ...document.querySelectorAll('.features-header, .features-title, .features-subtitle'),
            ...document.querySelectorAll('.feature-item'),
            ...document.querySelectorAll('.cta-title, .cta-text, .cta .btn-primary, .database-api-visual')
        ];

        elements.forEach((el, index) => {
            el.classList.add('scroll-animate');
            if (el.classList.contains('feature-item')) {
                el.style.setProperty('--animation-delay', `${index * 0.08}s`);
            }
            observer.observe(el);
        });
    }
}

// CTA Canvas Particle Animation
class CTAParticles {
    constructor() {
        this.canvas = document.getElementById('ctaCanvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationFrame = null;
        
        this.init();
        this.setupResize();
    }
    
    setSize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
    
    getParticleCount() {
        return Math.floor((this.canvas.width * this.canvas.height) / 7000);
    }
    
    createParticle() {
        const fadeDelay = Math.random() * 600 + 100;
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            speed: Math.random() / 5 + 0.1,
            opacity: 0.7,
            fadeDelay: fadeDelay,
            fadeStart: Date.now() + fadeDelay,
            fadingOut: false
        };
    }
    
    resetParticle(particle) {
        particle.x = Math.random() * this.canvas.width;
        particle.y = Math.random() * this.canvas.height;
        particle.speed = Math.random() / 5 + 0.1;
        particle.opacity = 0.7;
        particle.fadeDelay = Math.random() * 600 + 100;
        particle.fadeStart = Date.now() + particle.fadeDelay;
        particle.fadingOut = false;
    }
    
    init() {
        this.setSize();
        this.particles = [];
        const count = this.getParticleCount();
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
        this.animate();
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            // Move particle up
            particle.y -= particle.speed;
            
            // Reset if out of bounds
            if (particle.y < 0) {
                this.resetParticle(particle);
            }
            
            // Start fading out after delay
            if (!particle.fadingOut && Date.now() > particle.fadeStart) {
                particle.fadingOut = true;
            }
            
            // Fade out gradually
            if (particle.fadingOut) {
                particle.opacity -= 0.008;
                if (particle.opacity <= 0) {
                    this.resetParticle(particle);
                }
            }
            
            // Draw particle
            this.ctx.fillStyle = `rgba(250, 250, 250, ${particle.opacity})`;
            this.ctx.fillRect(
                particle.x,
                particle.y,
                0.6,
                Math.random() * 2 + 1
            );
        });
        
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    setupResize() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.init();
            }, 250);
        }, { passive: true });
    }
    
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}

// Initialize with passive event
document.addEventListener('DOMContentLoaded', () => {
    new HomePage();
    new CTAParticles();
}, { passive: true });
