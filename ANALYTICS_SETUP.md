# Analytics Setup Guide

This guide explains how to set up and use Google Analytics and Microsoft Clarity tracking in your Zuke Admin Dashboard.

## Setup Instructions

### 1. Replace Tracking IDs

In both `public/dashboard.html` and `public/index.html`, replace the placeholder IDs:

```html
<!-- Replace GA_MEASUREMENT_ID with your actual Google Analytics Measurement ID -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>

<!-- Replace CLARITY_PROJECT_ID with your actual Microsoft Clarity Project ID -->
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "CLARITY_PROJECT_ID");
</script>
```

### 2. Update Analytics Configuration

In `public/js/analytics.js`, update the configuration:

```javascript
this.config = {
    gaMeasurementId: 'YOUR_GA_MEASUREMENT_ID', // Replace with your actual ID
    clarityProjectId: 'YOUR_CLARITY_PROJECT_ID' // Replace with your actual ID
};
```

## Automatic Tracking

The analytics system automatically tracks:

- **Page Views**: Every time a user navigates to a different page
- **Button Clicks**: All button interactions are tracked
- **Form Submissions**: Form submissions are automatically tracked
- **Navigation**: Navigation between pages is tracked
- **User Authentication**: Login/logout events are tracked
- **Errors**: JavaScript errors are tracked

## Manual Tracking Examples

### Track Custom Events

```javascript
// Track a custom event
window.analytics.trackEvent('custom_action', {
    category: 'User Interaction',
    label: 'Custom Button Click',
    value: 1
});
```

### Track Button Clicks

```javascript
// Track specific button clicks
window.analytics.trackButtonClick('Save Settings', 'Settings Page', {
    button_type: 'save',
    settings_section: 'general'
});
```

### Track Popup Interactions

```javascript
// Track popup opens
window.analytics.trackPopup('Settings Modal', 'open', {
    trigger: 'settings_button'
});

// Track popup closes
window.analytics.trackPopup('Settings Modal', 'close', {
    method: 'save_and_close'
});
```

### Track Form Submissions

```javascript
// Track form submissions
window.analytics.trackFormSubmission('Business Settings', true, {
    form_type: 'business_update',
    fields_updated: ['name', 'description']
});
```

### Track Business Events

```javascript
// Track business-specific events
window.analytics.trackBusinessEvent('business_created', businessId, {
    business_type: 'retail',
    setup_completed: true
});
```

### Track Wallet Events

```javascript
// Track wallet/token events
window.analytics.trackWalletEvent('topup', 100.00, {
    payment_method: 'paystack',
    currency: 'ZAR'
});
```

### Track Creative Events

```javascript
// Track creative/marketing events
window.analytics.trackCreativeEvent('create', 'video', {
    content_type: 'social_media_post',
    duration: 30
});
```

### Track Errors

```javascript
// Track errors
window.analytics.trackError('API request failed', 'Dashboard', {
    api_endpoint: '/api/businesses',
    error_code: 500
});
```

## Integration Examples

### Add to Existing Functions

```javascript
// Example: Add to a save function
async function saveBusinessSettings() {
    try {
        // Your existing save logic
        const result = await updateBusinessSettings();
        
        // Track successful save
        window.analytics.trackFormSubmission('Business Settings', true, {
            business_id: currentBusinessId,
            settings_updated: Object.keys(updatedSettings)
        });
        
        return result;
    } catch (error) {
        // Track error
        window.analytics.trackError('Failed to save business settings', 'Settings Page', {
            error_message: error.message
        });
        throw error;
    }
}
```

### Add to Event Listeners

```javascript
// Example: Add to existing event listeners
document.addEventListener('click', (event) => {
    if (event.target.matches('.wallet-topup-btn')) {
        // Track wallet topup button click
        window.analytics.trackButtonClick('Wallet Topup', 'Dashboard', {
            button_type: 'topup',
            current_balance: walletBalance
        });
    }
});
```

## Dashboard-Specific Tracking

### Page Navigation

The system automatically tracks navigation between dashboard pages:
- Dashboard → Business
- Dashboard → Creative
- Dashboard → Marketing
- etc.

### User Actions

Track specific user actions in your dashboard:

```javascript
// Track when user switches business
window.analytics.trackBusinessEvent('business_switched', newBusinessId, {
    from_business: oldBusinessId,
    switch_method: 'dropdown'
});

// Track when user views wallet balance
window.analytics.trackWalletEvent('view_balance', null, {
    balance_amount: currentBalance
});

// Track when user creates content
window.analytics.trackCreativeEvent('create', 'image', {
    content_type: 'social_post',
    platform: 'instagram'
});
```

## Testing Your Analytics

### Check Analytics Status

```javascript
// Check if analytics is working
console.log(window.analytics.getStatus());
```

### Test Events

```javascript
// Test tracking
window.analytics.trackEvent('test_event', {
    category: 'Testing',
    label: 'Analytics Test'
});
```

## Best Practices

1. **Use Descriptive Labels**: Make event labels descriptive and consistent
2. **Include Context**: Add relevant context data to events
3. **Track User Journey**: Track the complete user journey through your dashboard
4. **Monitor Performance**: Don't track too many events that could impact performance
5. **Test Thoroughly**: Test all tracking in development before deploying

## Troubleshooting

### Analytics Not Working

1. Check browser console for errors
2. Verify tracking IDs are correct
3. Check if ad blockers are interfering
4. Ensure scripts are loading in correct order

### Events Not Appearing

1. Check Google Analytics Real-Time reports
2. Verify Microsoft Clarity is recording sessions
3. Check if events are being sent to the correct properties
4. Wait a few minutes for data to appear

### Performance Issues

1. Reduce the number of automatic events if needed
2. Use debouncing for high-frequency events
3. Consider using sampling for very frequent events
