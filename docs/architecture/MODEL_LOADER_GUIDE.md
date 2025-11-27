# ModelLoader & ModelSelectorComponent - Usage Guide

## Overview

Two reusable utilities for loading and displaying creative models throughout your app:

1. **ModelLoader** - Low-level utility for fetching and managing models
2. **ModelSelectorComponent** - High-level component for forms and interfaces

## Quick Start

### Option 1: Use ModelSelectorComponent (Recommended for Forms)

Best for product forms, business settings, any place where you need a model selector.

#### In add-product.html

```html
<!-- Add to your scripts section -->
<script src="/js/model-loader.js"></script>
<script src="/js/model-selector-component.js"></script>

<!-- Add to your form where you want the model selector -->
<div id="modelSelectorContainer"></div>

<script>
  // Initialize when page loads
  document.addEventListener('DOMContentLoaded', async () => {
    // Inject component styles
    ModelSelectorComponent.injectStyles();

    // Initialize component
    const modelSelector = new ModelSelectorComponent('modelSelectorContainer', {
      label: 'Photography Model',
      storeInfo: storeInfo,  // From your business data
      allowChange: true,
      showDetails: true,
      onModelSelect: (model) => {
        console.log('Selected model:', model);
        
        // Do something with selected model
        selectedPhotographyModel = model;
        
        // Update image preview if you have one
        document.getElementById('modelImagePreview').src = model.imageUrl;
      }
    });

    await modelSelector.init();
  });
</script>
```

### Option 2: Use ModelLoader Directly (For More Control)

For simple info icons or custom implementations.

```javascript
// Initialize loader
const loader = new ModelLoader();

// Show selector modal
const selected = await loader.showSelector({
  defaultModelId: 'xxx',
  title: 'Select a Model',
  onSelect: (model) => {
    console.log('Selected:', model);
  }
});

// Or create an info icon button
const infoIcon = loader.createModelInfoIcon('model-id-123', {
  size: '24px',
  color: '#FF8B00',
  onLoad: (model) => {
    console.log('Model loaded:', model);
  }
});

// Append to your element
document.querySelector('.your-container').appendChild(infoIcon);
```

## Architecture

### ModelLoader Class

```javascript
// Create instance
const loader = new ModelLoader();

// Methods
await loader.fetchModels()              // Fetch all models (cached)
await loader.fetchModels(true)          // Force refresh, ignore cache
loader.getModelById(id)                 // Get single model by ID
await loader.showSelector(options)      // Show selection modal
loader.createModelInfoIcon(id, options) // Create info icon button
```

**Model Object Structure:**
```javascript
{
  id: "ObjectId",
  name: "Full Name",
  description: "Bio or description",
  type: "male/female/model",
  tags: ["skill1", "skill2", ...],
  imageUrl: "https://...",
  additionalPhotos: ["photo1", "photo2", ...],
  email: "model@example.com",
  phone: "+27123456789",
  location: "City",
  socialMedia: {...},
  status: "active/pending-review"
}
```

### ModelSelectorComponent Class

```javascript
// Initialize
const selector = new ModelSelectorComponent('containerId', {
  label: 'Photography Model',
  storeInfo: storeInfo,
  onModelSelect: (model) => { ... },
  allowChange: true,
  showDetails: true
});

await selector.init();

// Methods
selector.getSelectedModel()         // Get current selection
selector.setSelectedModel(modelId)  // Set selection programmatically
selector.showSelector()             // Open selector modal
selector.showProfile()              // Open full profile modal
selector.render()                   // Re-render component
```

## Real-World Examples

### Example 1: Add Model Selector to Add Product Form

**In add-product.html, add this to your form:**

```html
<!-- Add after the "Product Images" section -->
<div class="section">
  <div class="section-title">Photography Model</div>
  
  <!-- Model Selector Component -->
  <div id="modelSelectorContainer" style="margin-bottom: 20px;"></div>
  
  <!-- Hidden input to store selected model ID for form submission -->
  <input type="hidden" id="selectedModelId" name="selectedModelId">
</div>
```

**In your JavaScript initialization:**

```javascript
<script src="/js/model-loader.js"></script>
<script src="/js/model-selector-component.js"></script>

<script>
  let selectedModel = null;

  document.addEventListener('DOMContentLoaded', async () => {
    // Inject styles
    ModelSelectorComponent.injectStyles();

    // Initialize component
    const modelSelector = new ModelSelectorComponent('modelSelectorContainer', {
      label: 'Photography Model (Optional)',
      storeInfo: storeInfo,
      allowChange: true,
      onModelSelect: (model) => {
        selectedModel = model;
        document.getElementById('selectedModelId').value = model.id;
        
        console.log('Selected model:', model.name);
      }
    });

    await modelSelector.init();
  });

  // When submitting form, include selectedModelId
  submitProductBtn.addEventListener('click', async () => {
    const formData = {
      // ... other fields
      photographyModelId: selectedModel?.id,
      photographyModelName: selectedModel?.name
    };
    // ... submit
  });
</script>
```

### Example 2: Simple Info Icon with Model Popup

```javascript
const loader = new ModelLoader();

// Create info icon that opens model selector
const icon = loader.createModelInfoIcon('default-model-id', {
  size: '20px',
  color: '#FF8B00',
  onLoad: (model) => {
    console.log('Model loaded:', model);
    // Update your UI with model info
  }
});

// Add to your page
document.querySelector('.product-section').appendChild(icon);
```

### Example 3: Get Model and Display Image

```javascript
const loader = new ModelLoader();
await loader.fetchModels();

// Get a specific model
const model = loader.getModelById('some-id');

if (model) {
  // Display image
  const img = document.createElement('img');
  img.src = model.imageUrl;
  img.alt = model.name;
  document.querySelector('.preview').appendChild(img);

  // Display info
  console.log(`Model: ${model.name}`);
  console.log(`Location: ${model.location}`);
  console.log(`Skills: ${model.tags.join(', ')}`);
}
```

### Example 4: Get Default Model from Business and Allow Change

This is the pattern you asked about! Perfect for add-product.html.

```html
<script src="/js/model-loader.js"></script>
<script src="/js/model-selector-component.js"></script>

<script>
  document.addEventListener('DOMContentLoaded', async () => {
    // Get default model from store_info
    const defaultModelId = storeInfo?.photography_model_id;

    // Inject styles
    ModelSelectorComponent.injectStyles();

    // Initialize selector with default
    const modelSelector = new ModelSelectorComponent('modelSelectorContainer', {
      label: 'Photography Model',
      storeInfo: storeInfo,  // This contains photography_model_id
      allowChange: true,
      onModelSelect: (model) => {
        // Do something when model changes
        updateProductPreview(model);
      }
    });

    // Initialize and load default
    await modelSelector.init();

    // Now it shows the default and allows changing
  });
</script>
```

## Integration Steps

### Step 1: Add Script Imports

```html
<!-- In your HTML file, in the scripts section -->
<script src="/js/model-loader.js"></script>
<script src="/js/model-selector-component.js"></script>
```

### Step 2: Create Container (if using ModelSelectorComponent)

```html
<div id="modelSelectorContainer"></div>
```

### Step 3: Initialize in JavaScript

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  ModelSelectorComponent.injectStyles();

  const selector = new ModelSelectorComponent('modelSelectorContainer', {
    label: 'Your Label',
    storeInfo: yourBusinessData,
    onModelSelect: (model) => {
      // Handle selection
    }
  });

  await selector.init();
});
```

### Step 4: Get Selected Model When Needed

```javascript
const selectedModel = selector.getSelectedModel();
console.log(selectedModel.id);
console.log(selectedModel.name);
```

## Styling

Both utilities have built-in styles that inject automatically. To customize:

### Option A: Override with CSS

```css
/* Override default styles */
.model-selector-component-label {
  color: your-color;
}

.model-selector-change-btn {
  background: your-color;
}
```

### Option B: Pass Custom Classes

Modify the component to add custom className options.

## Caching Behavior

- First load: Fetches from API
- Subsequent loads: Uses DataManager cache
- Force refresh: `loader.fetchModels(true)`
- Cache key: `creativeModels` in DataManager

## Error Handling

```javascript
try {
  const selector = new ModelSelectorComponent('id', options);
  await selector.init();
} catch (error) {
  console.error('Failed to initialize:', error);
  // Show user-friendly error
}
```

## Performance Tips

1. **Reuse loader instance** - Don't create new instances unnecessarily
2. **Lazy load** - Initialize only when needed
3. **Cache models** - First fetch caches in DataManager
4. **Batch operations** - Load all models once, reuse in multiple places

## Complete add-product.html Example

```html
<!-- After your existing form sections, add: -->
<div class="section">
  <div class="section-title">Photography Model Selection</div>
  <div id="modelSelectorContainer"></div>
</div>

<!-- Add scripts -->
<script src="/js/model-loader.js"></script>
<script src="/js/model-selector-component.js"></script>

<script>
  let selectedPhotographyModel = null;

  document.addEventListener('DOMContentLoaded', async () => {
    // Initialize model selector
    ModelSelectorComponent.injectStyles();

    const modelSelector = new ModelSelectorComponent('modelSelectorContainer', {
      label: 'Photography Model (Optional)',
      storeInfo: storeInfo,
      allowChange: true,
      showDetails: true,
      onModelSelect: (model) => {
        selectedPhotographyModel = model;
        console.log('Selected model:', model.name);
      }
    });

    await modelSelector.init();
  });

  // Then in your submitProduct function:
  async function submitProduct() {
    const webhookPayload = {
      // ... existing fields
      
      // Add model info
      photographyModel: {
        id: selectedPhotographyModel?.id,
        name: selectedPhotographyModel?.name,
        imageUrl: selectedPhotographyModel?.imageUrl
      }
    };
    
    // ... rest of submission
  }
</script>
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Models not loading | Check API endpoint in ModelLoader options |
| Styles not applied | Call `ModelSelectorComponent.injectStyles()` first |
| Icon not appearing | Ensure containerId exists in HTML |
| Cache stale | Call `loader.fetchModels(true)` to force refresh |
| Modal z-index conflicts | Adjust CSS z-index values |

## FAQ

**Q: Can I use both utilities together?**
A: Yes! ModelSelectorComponent internally uses ModelLoader.

**Q: Where does it fetch models from?**
A: From `/api/creative-models/all?limit=100` endpoint.

**Q: Can I customize the modal appearance?**
A: Yes, override the injected CSS styles.

**Q: Does it work with mobile?**
A: Yes, responsive design included.

**Q: How do I update the model after selection?**
A: Use `selector.setSelectedModel(modelId)`.

## Files

- `public/js/model-loader.js` - Core ModelLoader class
- `public/js/model-selector-component.js` - Component wrapper
- This guide - Documentation

## Next Steps

1. Copy the scripts to your project
2. Add to add-product.html as shown
3. Update store_submissions to include `photography_model_id` field
4. Test with model selection flow
5. Extend as needed for your use case
