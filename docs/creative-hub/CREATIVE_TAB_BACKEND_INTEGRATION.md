# Creative Tab Backend Integration Guide

## Current State

The Creative Tab is implemented with **mock data**. The frontend is fully functional and ready to connect to backend APIs.

## Mock Data Currently Used

In `creative-panel.js`, the `fetchAvailableModels()` method returns hardcoded models:

```javascript
async fetchAvailableModels() {
  // Mock data - replace with actual API call
  return [
    { id: 'gpt-4-vision', name: 'GPT-4 Vision', description: '...', type: 'image' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: '...', type: 'text' },
    // ... more models
  ];
}
```

## Integration Steps

### Step 1: Update fetchAvailableModels()

Replace mock data with API call:

```javascript
async fetchAvailableModels() {
  try {
    const response = await this.api.request('/api/creative-tools/models', {
      method: 'GET'
    });
    return response.models || [];
  } catch (error) {
    console.error('Failed to fetch models:', error);
    // Fallback to mock data if API fails
    return [];
  }
}
```

### Step 2: Update saveCreativeSettings()

The method already calls `this.api.saveBusinessSettings()`. Ensure backend supports:

**Required Endpoint**: `PUT /api/businesses/:businessId/settings`

**Expected Payload**:
```javascript
{
  creative_settings: {
    selected_model: {
      id: 'model-id',
      name: 'Model Name',
      description: '...',
      type: 'image|video|text'
    },
    selected_voice: null, // For future voice integration
    updated_at: '2024-01-20T...'
  }
}
```

**Response**:
```javascript
{
  success: true,
  message: 'Settings saved',
  creative_settings: { /* saved data */ }
}
```

### Step 3: Update Profile Load

Ensure `getBusinessSettings()` returns the `creative_settings` field:

**Expected Response from GET /api/businesses/:businessId/settings**:
```javascript
{
  _id: '...',
  automation_settings: { /* existing */ },
  creative_settings: {
    selected_model: { /* model data */ },
    selected_voice: null,
    updated_at: '...'
  }
}
```

## Backend Requirements

### Required Endpoints

#### 1. Get Available Models
```
GET /api/creative-tools/models

Response:
{
  "models": [
    {
      "id": "gpt-4-vision",
      "name": "GPT-4 Vision",
      "description": "Advanced image understanding",
      "type": "image",
      "pricing": { "input": 0.01, "output": 0.03 },
      "capabilities": ["image-generation", "image-analysis"],
      "maxTokens": 4096
    },
    // ... more models
  ]
}
```

#### 2. Get Business Creative Settings
```
GET /api/businesses/:businessId/settings

Response includes:
{
  "creative_settings": {
    "selected_model": { /* model object */ },
    "selected_voice": null,
    "updated_at": "ISO-8601-timestamp"
  }
}
```

#### 3. Save Creative Settings
```
PUT /api/businesses/:businessId/settings

Body:
{
  "creative_settings": {
    "selected_model": { /* model object */ },
    "selected_voice": null
  }
}

Response:
{
  "success": true,
  "creative_settings": { /* saved data */ }
}
```

#### 4. (Optional) Get Available Voices
```
GET /api/creative-tools/voices

Response:
{
  "voices": [
    {
      "id": "voice-1",
      "name": "Natural Female",
      "language": "en-US",
      "provider": "eleven-labs",
      "preview_url": "https://..."
    }
  ]
}
```

## Database Schema

### Business Settings Collection

```javascript
{
  _id: ObjectId,
  business_id: ObjectId,
  
  // Existing fields
  automation_settings: { /* ... */ },
  social_media: { /* ... */ },
  
  // New field for Creative Tab
  creative_settings: {
    selected_model: {
      id: String,           // e.g., "gpt-4-vision"
      name: String,         // e.g., "GPT-4 Vision"
      description: String,  // Model description
      type: String,         // "image", "video", or "text"
      // Additional fields optional:
      pricing: { input: Number, output: Number },
      capabilities: [String],
      maxTokens: Number
    },
    selected_voice: {
      // Reserved for Eleven Labs integration
      id: String,
      name: String,
      language: String,
      provider: String
    },
    updated_at: Date,
    updated_by: ObjectId
  }
}
```

## Frontend to Backend Data Flow

```
User Opens Settings Page
  ↓
SettingsController.loadBusinessSettings()
  ↓
GET /api/businesses/:businessId/settings
  ↓
CreativePanelComponent.render() loads saved selection
  ↓
Modal opens → GET /api/creative-tools/models
  ↓
User selects model
  ↓
confirmModelSelection() called
  ↓
PUT /api/businesses/:businessId/settings
  ↓
Save successful → Display notification
```

## Error Handling

The component handles these cases:

1. **Models API fails**: Catches error, shows console log, empty models list
2. **Save fails**: Shows error notification "Failed to save creative settings"
3. **Network timeout**: Retried by ApiService layer
4. **Invalid model**: Frontend validation prevents invalid selections

### Frontend Error Messages

```javascript
this.notifications.show('Failed to load available models', 'error');
this.notifications.show('Please select a model', 'warning');
this.notifications.show('Creative settings saved successfully', 'success');
this.notifications.show('Failed to save creative settings', 'error');
```

## Testing with Mock Backend

For development/testing without backend:

1. **Keep current mock data** - models load instantly
2. **Disable saves** - Comment out `this.api.saveBusinessSettings()` call
3. **Test locally** - All UI/UX works without network

## Future Enhancements

### Phase 2: Voice Integration
- Implement voice picker UI similar to model picker
- Integrate with Eleven Labs API
- Store selected voice in `creative_settings.selected_voice`

### Phase 3: Model Capabilities
- Show model capabilities on card (e.g., "Image Gen, Analysis")
- Display pricing information
- Recommend models based on use case

### Phase 4: Usage Analytics
- Track which models users select most often
- Monitor model performance and costs
- Show usage statistics in dashboard

## Quick Start for Backend Dev

1. Create `/api/creative-tools/models` endpoint returning models list
2. Update business settings schema to include `creative_settings` field
3. Modify `GET /api/businesses/:businessId/settings` to return creative settings
4. Modify `PUT /api/businesses/:businessId/settings` to save creative settings
5. Test with frontend by opening Settings → Creative tab

## Debugging

### Check what's being saved:
```javascript
// In creative-panel.js saveCreativeSettings()
console.log('Saving:', settings);
```

### Check what's being loaded:
```javascript
// In creativePanel.render()
console.log('Business settings:', businessSettings);
```

### Check available models:
```javascript
// In browser console after page load
settingsController.creativePanel.availableModels
```

### Check selected model:
```javascript
// In browser console
settingsController.creativePanel.selectedModel
```

---

**Ready for Backend Integration**: Yes ✅
**Frontend Implementation Status**: Complete ✅
**Backend Implementation Status**: Pending
