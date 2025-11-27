<!-- 
  EXAMPLE: How to integrate ModelSelectorComponent into add-product.html
  
  This shows the exact changes needed to add model selection to the product form.
-->

<!-- ============================================================ -->
<!-- STEP 1: Add script imports (after existing scripts) -->
<!-- ============================================================ -->

<!--
ADD THESE LINES after the existing scripts around line 1420:

  <script src="/js/model-loader.js"></script>
  <script src="/js/model-selector-component.js"></script>
-->

<!-- ============================================================ -->
<!-- STEP 2: Add form section (after "Product Images" section) -->
<!-- ============================================================ -->

<!--
ADD THIS SECTION after the image generation section (around line 450):

  <div class="section">
    <div class="section-title">Photography Model</div>
    
    <div class="form-group">
      <p class="field-note">
        Select which model should be featured in product photography.
        This helps maintain consistent visual branding.
      </p>
    </div>
    
    <div id="modelSelectorContainer"></div>
  </div>
-->

<!-- ============================================================ -->
<!-- STEP 3: Initialize component (in the main script tag) -->
<!-- ============================================================ -->

<!--
ADD THIS CODE in the main <script> section, right after the 
loadBusinessInfo() function definition (around line 1500):

  // ========== MODEL SELECTOR INITIALIZATION ==========
  let selectedPhotographyModel = null;

  async function initializeModelSelector() {
    try {
      // Inject component styles
      ModelSelectorComponent.injectStyles();

      // Initialize model selector with business's default model
      const modelSelector = new ModelSelectorComponent('modelSelectorContainer', {
        label: 'Photography Model',
        storeInfo: storeInfo,  // Auto-loads photography_model_id from store_info
        allowChange: true,
        showDetails: true,
        onModelSelect: (model) => {
          selectedPhotographyModel = model;
          console.log('✅ Photography model selected:', model.name);
        }
      });

      await modelSelector.init();
      console.log('✅ Model selector initialized');

      return modelSelector;

    } catch (error) {
      console.error('Error initializing model selector:', error);
      return null;
    }
  }
-->

<!-- ============================================================ -->
<!-- STEP 4: Call initialization in loadBusinessInfo() -->
<!-- ============================================================ -->

<!--
IN THE loadBusinessInfo() FUNCTION, add this line at the end
(after console.log for AI Generator):

      // Initialize model selector
      await initializeModelSelector();
-->

<!-- ============================================================ -->
<!-- STEP 5: Use selected model in submitProduct() -->
<!-- ============================================================ -->

<!--
IN THE submitProduct() FUNCTION, add the model info to 
webhookPayload.productData (around line 1380):

      webhookPayload = {
        businessId: businessId,
        userEmail: userEmail,
        productData: {
          // ... existing fields ...

          // ← ADD THESE LINES:
          photographyModel: selectedPhotographyModel ? {
            id: selectedPhotographyModel.id,
            name: selectedPhotographyModel.name,
            imageUrl: selectedPhotographyModel.imageUrl,
            email: selectedPhotographyModel.email
          } : null,

          // ... rest of fields ...
        },
-->

<!-- ============================================================ -->
<!-- COMPLETE EXAMPLE CODE (Ready to use) -->
<!-- ============================================================ -->

<!--
OPTION A: If you want the full code block ready to paste:

In your add-product.html <body>, find the section where you have:
  <div class="section">
    <div class="section-title">Additional Options</div>

RIGHT BEFORE THAT, add this:

  <div class="section">
    <div class="section-title">Photography Model (Optional)</div>
    
    <div class="form-group">
      <p class="field-note">
        Select which creative model should be featured for your product images.
        This helps maintain consistent branding across your catalog.
      </p>
    </div>
    
    <div id="modelSelectorContainer"></div>
  </div>

Then in your <script> tag, find where you have:
  const aiEnhanceBtn = document.getElementById('aiEnhanceBtn');
  const suggestionsDropdown = document.getElementById('suggestionsDropdown');
  // ... more DOM elements

ADD after those:
  const modelSelectorContainer = document.getElementById('modelSelectorContainer');
  let selectedPhotographyModel = null;

Then find the loadBusinessInfo() function and add at the END 
(after all other initialization):

  // ========== MODEL SELECTOR ==========
  try {
    ModelSelectorComponent.injectStyles();
    
    const modelSelector = new ModelSelectorComponent('modelSelectorContainer', {
      label: 'Photography Model',
      storeInfo: storeInfo,
      allowChange: true,
      showDetails: true,
      onModelSelect: (model) => {
        selectedPhotographyModel = model;
        console.log('Selected model:', model.name);
      }
    });

    await modelSelector.init();
  } catch (error) {
    console.warn('Model selector failed to initialize:', error);
  }

Then in submitProduct(), in the webhookPayload definition, 
find the productData section and add:

  productData: {
    name: productNameInput.value,
    description: productDescriptionInput.value,
    // ... other fields ...
    
    // ADD THESE LINES:
    photographyModel: selectedPhotographyModel ? {
      id: selectedPhotographyModel.id,
      name: selectedPhotographyModel.name,
      imageUrl: selectedPhotographyModel.imageUrl,
      email: selectedPhotographyModel.email
    } : null,
  },
-->

<!-- ============================================================ -->
<!-- USAGE PATTERNS IN add-product.html -->
<!-- ============================================================ -->

<!--
Pattern 1: Just show the component
  <div id="modelSelectorContainer"></div>
  // Component shows default model and allows changing

Pattern 2: Get the selected model
  const model = selector.getSelectedModel();
  console.log(model.id, model.name);

Pattern 3: Programmatically set a model
  selector.setSelectedModel('model-id-123');

Pattern 4: Handle selection in real-time
  onModelSelect: (model) => {
    // Update product preview
    updateProductImage(model.imageUrl);
    
    // Update form
    document.getElementById('modelInput').value = model.id;
    
    // Track for submission
    selectedPhotographyModel = model;
  }

Pattern 5: Validate model is selected
  if (!selectedPhotographyModel) {
    showStatus('Please select a photography model', 'error', statusEl);
    return false;
  }
-->

<!-- ============================================================ -->
<!-- HOW IT WORKS STEP BY STEP -->
<!-- ============================================================ -->

<!--
1. Page loads:
   - loadBusinessInfo() is called
   - initializeModelSelector() runs
   - ModelSelectorComponent.init() fetches models from API
   - Component checks storeInfo for photography_model_id
   - If found, displays that model by default
   - Component renders with image, name, location, skills

2. User sees:
   ┌────────────────────────────┐
   │ Photography Model          │
   │ [Change Model]             │
   ├────────────────────────────┤
   │ [Photo] Model Name         │
   │         Type: Female       │
   │         📍 Cape Town       │
   │         [Skill1] [Skill2]  │
   │         Bio text...        │
   │         [View Full Profile]│
   └────────────────────────────┘

3. User clicks "Change Model":
   - Modal opens showing all available models
   - User selects a different model
   - Component updates with new selection
   - onModelSelect callback fires
   - selectedPhotographyModel variable is updated

4. User submits product:
   - submProduct() is called
   - webhookPayload includes photographyModel info
   - Data sent to webhook/API with model details
   - Product created with model association

5. Later:
   - Admin can see which model was used for the product
   - Analytics can track model usage
   - Can generate recommendations based on model
-->

<!-- ============================================================ -->
<!-- TESTING THE INTEGRATION -->
<!-- ============================================================ -->

<!--
Quick test in browser console:

// 1. Check if component loaded
window.ModelSelectorComponent
// Should return the class definition

// 2. Check if models loaded
window.dataManager.getCreativeModels()
// Should return array of models

// 3. Check selected model
selectedPhotographyModel
// Should show the selected model object

// 4. Test model change
selector.setSelectedModel('some-id')
// Should update the display

// 5. Check form submission
console.log(webhookPayload.productData.photographyModel)
// Should show model in final payload
-->

<!-- ============================================================ -->
<!-- COMMON QUESTIONS -->
<!-- ============================================================ -->

<!--
Q: What if there's no default model?
A: Component shows empty state with "Select Model" button

Q: Can I make it required?
A: Yes, add validation:
   if (!selectedPhotographyModel) {
     alert('Please select a model');
     return;
   }

Q: How do I customize the display?
A: Pass options to ModelSelectorComponent:
   label: 'Your Label'
   allowChange: false (read-only)
   showDetails: true/false

Q: Can I use this in other forms?
A: Yes! Just create new instance with different container

Q: Where does it fetch models from?
A: /api/creative-models/all?limit=100

Q: Does it cache?
A: Yes, in window.dataManager.getCreativeModels()

Q: Can I clear cache?
A: Yes, window.dataManager.clearCreativeModelsCache()

Q: Mobile responsive?
A: Yes, included in component CSS
-->

<!-- ============================================================ -->
<!-- SUMMARY OF CHANGES -->
<!-- ============================================================ -->

<!--
File: add-product.html

1. Add 2 script imports (after existing scripts)
   - /js/model-loader.js
   - /js/model-selector-component.js

2. Add 1 new form section (after "Product Images" section)
   - Model selector container div

3. Add initialization code in main script (in loadBusinessInfo)
   - Initialize ModelSelectorComponent
   - Handle onModelSelect callback

4. Use selected model in submitProduct()
   - Add photographyModel to webhookPayload

Total changes: ~60 lines of code
Time to implement: ~10 minutes
Value: Reusable model selection everywhere!
-->
