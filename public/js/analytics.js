/**
 * Centralized Analytics Tracking Utility
 * Handles Google Analytics and Microsoft Clarity tracking
 */

class AnalyticsTracker {
    constructor() {
        this.isInitialized = false;
        this.isLoading = false;
        this.currentPage = null;
        this.userId = null;
        this.businessId = null;
        this.pendingEvents = []; // Queue events while loading
        
        // Configuration - Replace with your actual IDs
        this.config = {
            gaMeasurementId: 'G-89N6VZMFRV', // Replace with your Google Analytics Measurement ID
            clarityProjectId: 'ogde4l6gfd' // Replace with your Microsoft Clarity Project ID
        };
        
        // Initialize lazy loading
        this.initLazyLoading();
    }

    /**
     * Initialize lazy loading of analytics scripts
     */
    initLazyLoading() {
        // Load analytics after page is fully loaded and user has interacted
        this.loadAnalyticsAfterInteraction();
        
        // Also load after a delay as fallback
        setTimeout(() => {
            if (!this.isInitialized && !this.isLoading) {
                this.loadAnalyticsScripts();
            }
        }, 3000); // Load after 3 seconds as fallback
    }

    /**
     * Load analytics after user interaction
     */
    loadAnalyticsAfterInteraction() {
        const loadOnInteraction = () => {
            if (!this.isInitialized && !this.isLoading) {
                this.loadAnalyticsScripts();
            }
        };

        // Load on first user interaction
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            document.addEventListener(event, loadOnInteraction, { once: true, passive: true });
        });
    }

    /**
     * Load analytics scripts dynamically
     */
    async loadAnalyticsScripts() {
        if (this.isLoading || this.isInitialized) return;
        
        this.isLoading = true;
        // console.log('Loading analytics scripts...');

        try {
            // Load Google Analytics
            await this.loadGoogleAnalytics();
            
            // Load Microsoft Clarity
            await this.loadMicrosoftClarity();
            
            // Initialize tracking
            this.init();
            
            // Process pending events
            this.processPendingEvents();
            
            console.log('Analytics scripts loaded successfully');
        } catch (error) {
            console.error('Error loading analytics scripts:', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load Google Analytics script
     */
    async loadGoogleAnalytics() {
        return new Promise((resolve, reject) => {
            // Load gtag script
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.gaMeasurementId}`;
            script.onload = () => {
                // Initialize gtag
                window.dataLayer = window.dataLayer || [];
                window.gtag = function(){dataLayer.push(arguments);};
                window.gtag('js', new Date());
                window.gtag('config', this.config.gaMeasurementId, {
                    page_title: document.title,
                    page_location: window.location.href
                });
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Load Microsoft Clarity script
     */
    async loadMicrosoftClarity() {
        // Skip Clarity on payment/sensitive pages for security
        const sensitivePages = ['/pages/pricing.html', '/pages/topup.html', '/payment', '/checkout'];
        const currentPath = window.location.pathname.toLowerCase();
        
        if (sensitivePages.some(page => currentPath.includes(page))) {
            console.log('Skipping Clarity on payment page for security');
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.innerHTML = `
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${this.config.clarityProjectId}");
            `;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Process events that were queued while loading
     */
    processPendingEvents() {
        console.log(`Processing ${this.pendingEvents.length} pending events`);
        this.pendingEvents.forEach(event => {
            this.processEvent(event);
        });
        this.pendingEvents = [];
    }

    /**
     * Process a single event
     */
    processEvent(event) {
        switch (event.type) {
            case 'pageView':
                this.trackPageView(event.pageName, event.pagePath);
                break;
            case 'event':
                this.trackEvent(event.eventName, event.parameters);
                break;
            case 'buttonClick':
                this.trackButtonClick(event.buttonName, event.buttonLocation, event.additionalData);
                break;
            case 'navigation':
                this.trackNavigation(event.fromPage, event.toPage, event.navigationMethod);
                break;
            case 'popup':
                this.trackPopup(event.popupName, event.action, event.additionalData);
                break;
            case 'formSubmission':
                this.trackFormSubmission(event.formName, event.success, event.additionalData);
                break;
            case 'error':
                this.trackError(event.errorMessage, event.errorLocation, event.additionalData);
                break;
            case 'businessEvent':
                this.trackBusinessEvent(event.eventName, event.businessId, event.additionalData);
                break;
            case 'walletEvent':
                this.trackWalletEvent(event.action, event.amount, event.additionalData);
                break;
            case 'creativeEvent':
                this.trackCreativeEvent(event.action, event.contentType, event.additionalData);
                break;
        }
    }

    /**
     * Queue an event for later processing
     */
    queueEvent(event) {
        this.pendingEvents.push(event);
        // console.log(`Event queued: ${event.type}`);
    }

    /**
     * Initialize analytics tracking
     */
    init() {
        try {
            // Check if gtag is available (Google Analytics)
            if (typeof gtag !== 'undefined') {
                console.log('Google Analytics initialized');
            }
            
            // Check if clarity is available (Microsoft Clarity)
            if (typeof clarity !== 'undefined') {
                console.log('Microsoft Clarity initialized');
            }
            
            this.isInitialized = true;
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing analytics:', error);
        }
    }

    /**
     * Set user information for tracking
     */
    setUserInfo(userId, businessId = null) {
        this.userId = userId;
        this.businessId = businessId;
        
        // Set user ID in Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('config', this.config.gaMeasurementId, {
                user_id: userId,
                custom_map: {
                    business_id: businessId
                }
            });
        }
        
        // Set user ID in Microsoft Clarity
        if (typeof clarity !== 'undefined') {
            clarity('identify', userId);
        }
    }

    /**
     * Track page views
     */
    trackPageView(pageName, pagePath = null) {
        // If analytics isn't loaded yet, queue the event
        if (!this.isInitialized) {
            this.queueEvent({
                type: 'pageView',
                pageName: pageName,
                pagePath: pagePath
            });
            return;
        }
        
        const path = pagePath || window.location.pathname;
        this.currentPage = pageName;
        
        console.log(`Tracking page view: ${pageName} at ${path}`);
        
        // Google Analytics page view
        if (typeof gtag !== 'undefined') {
            gtag('config', this.config.gaMeasurementId, {
                page_title: pageName,
                page_location: window.location.href,
                page_path: path
            });
        }
        
        // Microsoft Clarity page view
        if (typeof clarity !== 'undefined') {
            clarity('set', 'page', pageName);
        }
    }

    /**
     * Track custom events
     */
    trackEvent(eventName, parameters = {}) {
        // If analytics isn't loaded yet, queue the event
        if (!this.isInitialized) {
            this.queueEvent({
                type: 'event',
                eventName: eventName,
                parameters: parameters
            });
            return;
        }
        
        console.log(`Tracking event: ${eventName}`, parameters);
        
        // Google Analytics event
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: parameters.category || 'User Interaction',
                event_label: parameters.label || '',
                value: parameters.value || 0,
                custom_parameters: parameters
            });
        }
        
        // Microsoft Clarity event
        if (typeof clarity !== 'undefined') {
            clarity('event', eventName, parameters);
        }
    }

    /**
     * Track button clicks
     */
    trackButtonClick(buttonName, buttonLocation = null, additionalData = {}) {
        // If analytics isn't loaded yet, queue the event
        if (!this.isInitialized) {
            this.queueEvent({
                type: 'buttonClick',
                buttonName: buttonName,
                buttonLocation: buttonLocation,
                additionalData: additionalData
            });
            return;
        }
        
        this.trackEvent('button_click', {
            category: 'User Interaction',
            label: buttonName,
            location: buttonLocation || this.currentPage,
            button_name: buttonName,
            ...additionalData
        });
    }

    /**
     * Track navigation events
     */
    trackNavigation(fromPage, toPage, navigationMethod = 'click') {
        this.trackEvent('navigation', {
            category: 'Navigation',
            label: `${fromPage} to ${toPage}`,
            from_page: fromPage,
            to_page: toPage,
            navigation_method: navigationMethod
        });
    }

    /**
     * Track popup/modal interactions
     */
    trackPopup(popupName, action, additionalData = {}) {
        this.trackEvent('popup_interaction', {
            category: 'User Interface',
            label: `${popupName} - ${action}`,
            popup_name: popupName,
            action: action, // 'open', 'close', 'interact'
            ...additionalData
        });
    }

    /**
     * Track form submissions
     */
    trackFormSubmission(formName, success = true, additionalData = {}) {
        this.trackEvent('form_submission', {
            category: 'Form',
            label: formName,
            form_name: formName,
            success: success,
            ...additionalData
        });
    }

    /**
     * Track errors
     */
    trackError(errorMessage, errorLocation = null, additionalData = {}) {
        this.trackEvent('error', {
            category: 'Error',
            label: errorMessage,
            error_message: errorMessage,
            error_location: errorLocation || this.currentPage,
            ...additionalData
        });
    }

    /**
     * Track business-specific events
     */
    trackBusinessEvent(eventName, businessId = null, additionalData = {}) {
        const targetBusinessId = businessId || this.businessId;
        
        this.trackEvent(eventName, {
            category: 'Business',
            business_id: targetBusinessId,
            ...additionalData
        });
    }

    /**
     * Track wallet/token events
     */
    trackWalletEvent(action, amount = null, additionalData = {}) {
        this.trackEvent('wallet_action', {
            category: 'Wallet',
            label: action,
            action: action, // 'topup', 'spend', 'view_balance'
            amount: amount,
            ...additionalData
        });
    }

    /**
     * Track creative/marketing events
     */
    trackCreativeEvent(action, contentType = null, additionalData = {}) {
        this.trackEvent('creative_action', {
            category: 'Creative',
            label: action,
            action: action, // 'create', 'edit', 'publish', 'delete'
            content_type: contentType,
            ...additionalData
        });
    }

    /**
     * Setup automatic event listeners
     */
    setupEventListeners() {
        // Track all button clicks automatically with a small delay to avoid interference
        document.addEventListener('click', (event) => {
            // Use setTimeout to avoid interfering with the main event handling
            setTimeout(() => {
                const button = event.target.closest('button');
                if (button && !button.disabled) {
                    const buttonText = button.textContent?.trim() || button.getAttribute('title') || 'Unknown Button';
                    const buttonId = button.id || 'no-id';
                    
                    this.trackButtonClick(buttonText, this.currentPage, {
                        button_id: buttonId,
                        button_class: button.className
                    });
                }
            }, 10);
        }, { passive: true });

        // Track form submissions
        document.addEventListener('submit', (event) => {
            const form = event.target;
            const formName = form.name || form.id || 'Unknown Form';
            
            this.trackFormSubmission(formName, true, {
                form_action: form.action,
                form_method: form.method
            });
        });

        // Track navigation changes (for SPA)
        window.addEventListener('popstate', () => {
            this.trackPageView('Navigation', window.location.pathname);
        });
    }

    /**
     * Get current tracking status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            currentPage: this.currentPage,
            userId: this.userId,
            businessId: this.businessId,
            hasGoogleAnalytics: typeof gtag !== 'undefined',
            hasMicrosoftClarity: typeof clarity !== 'undefined',
            pendingEvents: this.pendingEvents.length
        };
    }
}

// Create global instance
window.analytics = new AnalyticsTracker();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsTracker;
}
