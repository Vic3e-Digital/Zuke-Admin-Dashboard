# Settings Page Documentation

## Overview

The Settings page is a comprehensive business management interface that allows users to configure social media connections, automation workflows, posting preferences, and business/profile information. It follows a modular component-based architecture with a centralized controller managing all functionality.

**Location**: `/public/pages/settings/`  
**Entry Point**: `settings.js` and `settings.html`

---

## Architecture

### Directory Structure

```
settings/
├── settings.html              # Main HTML template
├── settings.js                # Main controller (SettingsController)
├── components/                # Functional components
│   ├── social-connections.js  # Social media platform connections
│   ├── automation-panel.js    # n8n webhook automation setup
│   ├── preferences-panel.js   # User posting preferences
│   ├── profile-panel.js       # User & business profile management
│   └── business-management.js # Business access control & status
├── services/                  # External service integrations
│   ├── api.service.js         # API communication
│   ├── auth.service.js        # Auth0 authentication
│   └── cloudinary.service.js  # Image upload & management
├── state/                     # State management
│   └── settings-state.js      # Central settings state store
└── utils/                     # Utility functions
    ├── notifications.js       # Toast notifications
    ├── validators.js          # Form validation logic
    └── formatters.js          # Data formatting utilities
```

---

## Core Components

### 1. SettingsController (`settings.js`)

**Responsibility**: Main orchestrator that initializes and manages all components.

**Key Methods**:
- `init()` - Initializes the page (auth check, data loading)
- `loadBusinessSettings()` - Fetches settings from API
- `setupTabNavigation()` - Handles tab switching
- `exposeGlobalFunctions()` - Exposes methods for HTML onclick handlers
- `showNoBusinessState()` / `showSettingsContent()` - Shows/hides content based on business selection

**Dependencies**:
- ApiService
- AuthService
- CloudinaryService
- NotificationManager
- SettingsState
- All component classes

**Workflow**:
1. User loads settings page
2. Controller initializes Auth0
3. Checks if user has selected a business
4. Loads business settings from API
5. Initializes all UI components
6. Sets up tab navigation and global function bindings

---

### 2. Social Connections Component (`components/social-connections.js`)

**Responsibility**: Manages OAuth connections to social media platforms.

**Supported Platforms**:
- Facebook (Pages)
- Instagram (Business Accounts)
- LinkedIn (Organizations)
- YouTube (Channels)
- TikTok (Business Accounts)

**Key Methods**:
- `connectPlatform(platform, currentBusiness)` - Initiates OAuth flow
- `disconnectPlatform(platform, currentBusiness)` - Removes platform connection
- `testConnection(platform, currentBusiness)` - Verifies connection validity
- `refreshToken(platform, currentBusiness)` - Refreshes expired OAuth tokens
- `changePlatformAccount(platform, currentBusiness)` - Switches to different account

**Data Structure** (stored in business settings):
```javascript
social_media: {
  facebook: {
    connected: true,
    status: 'active',
    page_id: '123456789',
    page_name: 'My Business',
    token_expiry: '2025-12-25T10:00:00Z',
    connected_date: '2025-11-20T15:30:00Z'
  },
  instagram: { /* similar structure */ },
  // ... other platforms
}
```

**OAuth Flow**:
1. User clicks "Connect" button
2. Popup window opens to OAuth provider
3. User grants permissions
4. OAuth callback received
5. Token stored in database
6. Connection status updated in UI

---

### 3. Automation Panel Component (`components/automation-panel.js`)

**Responsibility**: Manages n8n webhook configuration for automated social media posting.

**Key Features**:
- Configure webhook URL for receiving posts
- Add optional API key for security
- Enable/disable automation globally
- Test webhook connectivity

**Key Methods**:
- `render()` - Populates automation settings UI
- `saveSettings()` - Saves webhook configuration
- `testWebhook()` - Tests webhook by sending sample data

**Data Structure**:
```javascript
n8n_config: {
  webhook_url: 'https://aigents.container.io/webhook/social-media',
  api_key: 'optional_secret_key',
  enabled: true,
  created_at: '2025-11-20T15:30:00Z',
  last_tested: '2025-11-24T10:15:00Z'
}
```

**Webhook Integration**:
- Receives POST requests from n8n workflows
- Distributes posts to connected social platforms
- Handles scheduling and timing
- Logs all automation events

---

### 4. Preferences Panel Component (`components/preferences-panel.js`)

**Responsibility**: Manages user's posting preferences and behavior.

**Configurable Settings**:
- **Timezone**: For scheduling posts in user's local time
- **Default Posting Time**: Time of day for auto-posting
- **Auto-Post on Approval**: Automatically publish after approval

**Key Methods**:
- `render()` - Loads current preferences
- `savePreferences()` - Persists user preferences to database

**Data Structure**:
```javascript
posting_preferences: {
  timezone: 'Africa/Johannesburg',
  default_post_time: '09:00',
  auto_post_on_approval: false
}
```

---

### 5. Profile Panel Component (`components/profile-panel.js`)

**Responsibility**: Manages user profile and active business information.

**Two Sub-sections**:

#### 5a. User Account Profile
Displays and allows editing of:
- Profile picture (uploaded to Cloudinary)
- Full name
- Email (read-only)
- User ID from Auth0
- Email verification status
- Last updated timestamp

**Key Methods**:
- `populateUserProfile()` - Loads Auth0 user data
- `toggleEditProfile()` - Switches between view/edit mode
- `saveProfileChanges()` - Updates profile in Auth0
- `handleFileSelect()` - Processes profile picture uploads

#### 5b. Business Profile
Displays business information:
- Business name & logo
- Category
- Contact email & phone
- Address
- Managers list
- Creation & update dates
- Status badge

---

### 6. Business Management Component (`components/business-management.js`)

**Responsibility**: Controls business access, managers, and operational status.

**Key Features**:
- Add/remove business managers
- Toggle business active/inactive status
- Delete business (irreversible)

**Key Methods**:
- `loadBusinessManagers(currentBusiness)` - Fetches manager list
- `addBusinessManager(email, currentBusiness)` - Grants access to another user
- `removeBusinessManager(email, currentBusiness)` - Revokes access
- `toggleBusinessStatus()` - Activates/deactivates business
- `deleteBusiness()` - Permanently deletes business (with confirmation)

**Manager Roles**:
- **Owner**: Creator of business (cannot be removed)
- **Manager**: Full access granted by owner

**Data Structure**:
```javascript
managers: [
  {
    name: 'John Doe',
    email: 'john@example.com',
    added_date: '2025-11-20T15:30:00Z'
  }
],
status: 'active' // or 'inactive'
```

---

## Services

### ApiService (`services/api.service.js`)

**Purpose**: Handles all API communication with the backend.

**Key Methods**:
- `getBusinessSettings(businessId)` - Fetches business configuration
- `saveBusinessSettings(businessId, settings)` - Persists settings
- `testOAuthConnection(platform, businessId)` - Validates OAuth tokens
- `getDefaultWebhookConfig()` - Retrieves default n8n webhook URL

---

### AuthService (`services/auth.service.js`)

**Purpose**: Manages Auth0 authentication and user data.

**Key Methods**:
- `initialize()` - Sets up Auth0 client
- `isAuthenticated()` - Checks if user is logged in
- `getUser()` - Retrieves current user data
- `logout()` - Handles user logout

---

### CloudinaryService (`services/cloudinary.service.js`)

**Purpose**: Handles image uploads and transformations.

**Key Methods**:
- `uploadImage(file)` - Uploads image to Cloudinary
- `deleteImage(publicId)` - Removes image from Cloudinary
- `getImageUrl(publicId)` - Gets optimized image URL

---

## State Management

### SettingsState (`state/settings-state.js`)

**Purpose**: Centralized state store for settings page.

**Key Methods**:
- `getCurrentBusiness()` - Get selected business
- `setCurrentBusiness(business)` - Update selected business
- `getCurrentSettings()` - Get all current settings
- `updateSettings(settings)` - Merge settings updates

---

## UI Structure

### Tabs

The settings page uses a tabbed interface with 4 main sections:

1. **Social Media**
   - Connection cards for each platform
   - Display connected account details
   - Token expiry information
   - Action buttons (connect, disconnect, refresh, test)

2. **Automation**
   - Social media automation (always available)
   - Sales automation (Growth & Blaze plans only)
   - Marketing campaigns (Growth & Blaze plans only)
   - Email automation (Growth & Blaze plans only)
   - AI assistants (Coming soon)

3. **Preferences**
   - Timezone selection
   - Default posting time
   - Auto-post toggle

4. **Profile**
   - User account information
   - Business profile information
   - Business management modal

---

## Key Features

### 1. Modal Management

The settings page includes several modals:

**Business Management Modal** (`data-no-enhance`)
- Excluded from modal manager to prevent conflicts
- Manages business access and settings
- Contains danger zone for business deletion

---

### 2. Global Event Handlers

The SettingsController exposes global functions for HTML onclick bindings:

**Social Media Functions**:
```javascript
window.connectPlatform(platform)
window.disconnectPlatform(platform)
window.testConnection(platform)
window.refreshToken(platform)
window.changeFacebookPage()
window.changeInstagramAccount()
window.changeLinkedInOrganization()
window.changeYouTubeChannel()
window.changeTikTokAccount()
```

**Automation Functions**:
```javascript
window.saveAutomationSettings()
window.testWebhook()
```

**Preferences Functions**:
```javascript
window.savePreferences()
```

**Profile Functions**:
```javascript
window.toggleEditProfile()
window.cancelProfileEdit()
window.saveProfileChanges()
window.openBusinessManagement()
```

**Business Management Functions**:
```javascript
window.closeBusinessManagement()
window.addBusinessManager()
window.removeBusinessManager(email)
```

---

## Error Handling

### Null Check Pattern

All DOM element access includes null checks to prevent errors:

```javascript
const modal = document.getElementById('businessManagementModal');
if (!modal) {
  console.error('businessManagementModal element not found in DOM');
  this.notifications.show('Error: Modal not found. Please refresh the page.', 'error');
  return;
}
```

### Modal Manager Integration

The businessManagementModal uses `data-no-enhance` attribute to prevent the modal manager from automatically enhancing it, avoiding timing conflicts and DOM restructuring issues.

---

## Data Flow

### Loading Settings

```
User Opens Settings Page
    ↓
SettingsController.init()
    ↓
Auth0 Authentication Check
    ↓
Get Current Business from DataManager
    ↓
loadBusinessSettings() → API Call
    ↓
Initialize Components with Settings
    ↓
Render UI with Current Data
```

### Saving Settings

```
User Makes Change
    ↓
Component Save Method Called
    ↓
Validation (if required)
    ↓
API Request to Backend
    ↓
Success: Update Local State + Show Toast
    ↓
Error: Show Error Toast + Keep Original Values
```

---

## Common Tasks

### Adding a New Social Platform

1. Update `platformPrefixMap` in `social-connections.js`
2. Add HTML connection card in `settings.html`
3. Add OAuth service in backend
4. Update OAuth templates in services
5. Add platform-specific handlers in `social-connections.js`

### Modifying Automation Features

1. Edit `automation-panel.js` for UI updates
2. Update API endpoints in `api.service.js`
3. Modify webhook configuration in backend
4. Test with sample n8n workflow

### Adding New Settings Field

1. Add field to HTML template in `settings.html`
2. Add field to database schema (backend)
3. Create getter/setter in appropriate component
4. Add validation in `validators.js` if needed
5. Add formatter in `formatters.js` if needed

---

## Testing

### Manual Testing Checklist

- [ ] Social media connections work for all 5 platforms
- [ ] OAuth tokens refresh when expired
- [ ] Webhook test sends sample data successfully
- [ ] Settings persist after page refresh
- [ ] Business managers can be added/removed
- [ ] Business can be toggled active/inactive
- [ ] Profile picture uploads to Cloudinary
- [ ] Timezone and posting preferences save
- [ ] Modals open/close without errors
- [ ] Responsive on mobile devices

---

## Troubleshooting

### Modal Not Found Error
**Issue**: "businessManagementModal element not found in DOM"  
**Solution**: Ensure the modal has `data-no-enhance` attribute. The modal manager may be interfering with DOM access.

### OAuth Connection Fails
**Issue**: OAuth popup closes without connecting  
**Solution**: Check browser console for auth errors. Verify OAuth credentials in backend config.

### Webhook Not Receiving Posts
**Issue**: Test webhook fails or posts don't reach social media  
**Solution**: 
1. Verify webhook URL is correct
2. Check n8n workflow is running and configured
3. Test webhook connectivity from settings page
4. Check API logs for webhook delivery

### Settings Not Saving
**Issue**: Changes disappear after refresh  
**Solution**:
1. Check API endpoint connectivity
2. Verify user has permission to modify settings
3. Check browser console for API errors
4. Verify database connection on backend

---

## Dependencies

### External Libraries
- Auth0.js - Authentication
- Cloudinary SDK - Image management

### Custom Services
- ApiService - All API communication
- AuthService - Auth0 integration
- CloudinaryService - Image handling

### Utilities
- Validators - Form validation
- Formatters - Data formatting
- NotificationManager - Toast notifications

---

## Performance Considerations

1. **Lazy Loading**: Components only render visible tabs
2. **Caching**: Business settings cached in SettingsState
3. **Debouncing**: Save operations should debounce rapid changes
4. **Image Optimization**: Cloudinary handles image scaling

---

## Security

1. **OAuth Tokens**: Never logged to console, stored securely
2. **API Keys**: Hashed in database, never sent to frontend
3. **Access Control**: Managers list ensures authorization
4. **CSRF Protection**: Backend validates all modification requests

---

## Future Enhancements

- [ ] Bulk action support for multiple platforms
- [ ] Advanced scheduling for posts
- [ ] Performance analytics integration
- [ ] Team collaboration features
- [ ] Custom automation workflows
- [ ] Social media monitoring dashboard

