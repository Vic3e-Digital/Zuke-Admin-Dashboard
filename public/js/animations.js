/**
 * ZukeX Login Page Animations - Updated for Orange Theme
 * Handles particles, parallax, and dynamic effects
 */

// ============================================
// PARTICLE SYSTEM
// ============================================

function createParticles(count = 50) {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    // Clear existing particles
    particlesContainer.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random positioning
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        
        // Random size
        const size = Math.random() * 2 + 1;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        // Orange particles
        particle.style.background = `rgba(255, 139, 0, ${Math.random() * 0.5 + 0.3})`;
        
        particlesContainer.appendChild(particle);
    }
}

// ============================================
// MOUSE PARALLAX EFFECT
// ============================================

function initParallax() {
    const orbs = document.querySelectorAll('.orb');
    const card = document.querySelector('.login-card');
    
    if (!orbs.length) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX / window.innerWidth;
        mouseY = e.clientY / window.innerHeight;
    });
    
    function animate() {
        // Smooth animation with easing
        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;
        
        orbs.forEach((orb, index) => {
            const speed = (index + 1) * 15;
            const x = (targetX - 0.5) * speed;
            const y = (targetY - 0.5) * speed;
            
            orb.style.transform = `translate(${x}px, ${y}px)`;
        });
        
        // Subtle card tilt (only on desktop)
        if (card && window.innerWidth > 968) {
            const tiltX = (targetY - 0.5) * 3;
            const tiltY = (targetX - 0.5) * -3;
            card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// ============================================
// BUTTON ENHANCEMENTS
// ============================================

function enhanceButtons() {
    const buttons = document.querySelectorAll('.submit-button');
    
    buttons.forEach(button => {
        // Add click ripple effect
        button.addEventListener('click', function(e) {
            if (this.disabled) return;
            
            const ripple = document.createElement('span');
            ripple.classList.add('ripple-effect');
            
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            ripple.style.cssText = `
                position: absolute;
                width: 0;
                height: 0;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                transform: translate(-50%, -50%);
                left: ${x}px;
                top: ${y}px;
                animation: rippleEffect 0.6s ease-out;
                pointer-events: none;
                z-index: 1;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Add ripple animation
const style = document.createElement('style');
style.textContent = `
    @keyframes rippleEffect {
        to {
            width: 300px;
            height: 300px;
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ============================================
// IMAGE LAZY LOADING WITH FADE IN
// ============================================

function initImageLoading() {
    const image = document.querySelector('.card-image');
    if (!image) return;
    
    // Set initial state
    image.style.opacity = '0';
    image.style.transition = 'opacity 0.8s ease-in';
    
    // Fade in when loaded
    image.addEventListener('load', () => {
        image.style.opacity = '1';
    });
    
    // If already loaded (cached)
    if (image.complete) {
        image.style.opacity = '1';
    }
}

// ============================================
// SOCIAL ICONS ANIMATION
// ============================================

function animateSocialIcons() {
    const socialIcons = document.querySelectorAll('.social-icon');
    
    socialIcons.forEach((icon, index) => {
        icon.style.opacity = '0';
        icon.style.transform = 'translateY(20px)';
        icon.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            icon.style.opacity = '1';
            icon.style.transform = 'translateY(0)';
        }, 300 + (index * 100));
    });
}

// ============================================
// PERFORMANCE OPTIMIZATION
// ============================================

function initOptimizedAnimations() {
    const isLowPowerMode = navigator.deviceMemory && navigator.deviceMemory < 4;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth <= 768;
    
    if (isLowPowerMode || prefersReducedMotion) {
        createParticles(15);
        document.querySelectorAll('.orb').forEach(orb => {
            orb.style.animation = 'none';
            orb.style.opacity = '0.2';
        });
        console.log('Low power mode: Reduced animations');
    } else if (isMobile) {
        createParticles(25);
        console.log('Mobile mode: Moderate animations');
    } else {
        createParticles(40);
        console.log('Desktop mode: Full animations');
    }
}


// ============================================
// CARD ENTRANCE ANIMATION
// ============================================

function animateCardEntrance() {
    const card = document.querySelector('.login-card');
    if (!card) return;
    
    // Set initial state WITHOUT moving it
    card.style.opacity = '0';
    card.style.transform = 'scale(0.98)'; // Subtle scale instead of translateY
    
    // Trigger animation after a frame
    requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
    });
}

// ============================================
// VIDEO BACKGROUND HANDLER (OPTIONAL)
// ============================================

function initVideoBackground() {
    const videoElement = document.querySelector('.video-background video');
    if (!videoElement) return;
    
    videoElement.play().catch(err => {
        console.log('Video autoplay failed:', err);
    });
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            videoElement.pause();
        } else {
            videoElement.play();
        }
    });
}

// ============================================
// INITIALIZE ALL ANIMATIONS
// ============================================

function init() {
    console.log('🎨 Initializing ZukeX login animations...');
    
    // Run optimized animations
    initOptimizedAnimations();
    
    // Initialize parallax (desktop only)
    if (window.innerWidth > 968) {
        initParallax();
    }
    
    // Enhance buttons
    enhanceButtons();
    
    // Animate card entrance
    animateCardEntrance();
    
    // Initialize image loading
    initImageLoading();
    
    // Animate social icons
    setTimeout(() => {
        animateSocialIcons();
    }, 500);
    
    // Initialize video background if present
    initVideoBackground();
    
    console.log('✨ Animations initialized successfully!');
}

// ============================================
// EVENT LISTENERS
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        initOptimizedAnimations();
        
        if (window.innerWidth > 968) {
            initParallax();
        }
    }, 250);
});

// ============================================
// EXPORT FOR USE IN OTHER SCRIPTS
// ============================================

window.loginAnimations = {
    createParticles,
    initParallax,
    enhanceButtons,
    animateCardEntrance,
    animateSocialIcons
};