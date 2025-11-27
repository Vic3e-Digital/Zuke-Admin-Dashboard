# Model Selector Integration Testing

## What Was Done

✅ **Integration Complete!** ModelSelectorComponent has been integrated into `add-product.html`

### Changes Made:

1. **Script Imports Added** (lines 12-13)
   ```html
   <script src="/js/model-loader.js"></script>
   <script src="/js/model-selector-component.js"></script>
   ```

2. **HTML Container Added** (line 41)
   ```html
   <!-- Model Selector Component -->
   <div id="modelSelectorContainer"></div>
   ```

3. **Initialization Code Added** (lines 1533-1549)
   - Component initialized with businessId
   - Model selection stored in `window.selectedModel`
   - Change event handler logs selected model

---

## How to Test

### Test 1: Component Loads
1. Open `/dashboard.html?email=<email>&businessId=<businessId>`
2. Navigate to "Add Product"
3. **Expected:** After category field, you should see:
   - "Model Selection" heading
   - Default model loaded with headshot image
   - "Change Model" button
   - No JavaScript errors in console

### Test 2: Default Model Display
1. Form should automatically load default model for your business
2. **Expected:** Model image shows in the selector
3. **Check Console:** Should see log `✅ Model selected:` with model data

### Test 3: Change Model
1. Click "Change Model" button
2. **Expected:** Modal opens showing all available models in grid
3. Click on a different model
4. **Expected:** 
   - Modal closes
   - Selected model updates in form
   - Console shows new model selection log

### Test 4: Form Submission (Optional)
1. Fill in product details
2. Selected model should be available as `window.selectedModel`
3. Can be accessed in form submit handler

---

## What You Can Access

### In JavaScript
```javascript
// Get the currently selected model
const selectedModel = window.selectedModel;

// Object contains:
{
  id: "model-id",
  name: "Model Name",
  email: "model@email.com",
  phone: "+27...",
  whatsapp: "+27...",
  headshot_url: "https://...",
  portfolio: [...],
  // ... other model properties
}
```

### In Console
- All model loading operations are logged
- Look for `✅ Model selected:` logs
- Check for any `❌ Error:` messages

---

## Quick Troubleshooting

### Issue: Model selector doesn't appear
- Check browser console for errors
- Verify scripts loaded: Check Network tab for `/js/model-loader.js` and `/js/model-selector-component.js`
- Verify container ID is correct: `modelSelectorContainer`

### Issue: Default model not loading
- Check Network tab for `/api/creative-models/default?businessId=...`
- Verify businessId is being passed correctly
- Check MongoDB for store_submissions collection

### Issue: Modal doesn't open
- Check browser console for errors
- Verify model list data loading: Check Network tab for `/api/creative-models/all`
- Check that at least one creative model exists in database

### Issue: Selected model not updating
- Check console for `onModelChanged` callback log
- Verify `window.selectedModel` is being set
- Check for JavaScript errors in model-selector-component.js

---

## Next Steps After Testing

1. ✅ Verify component loads and displays correctly
2. ✅ Test model selection workflow
3. ✅ Confirm `window.selectedModel` contains correct data
4. Then: Update form submission to include model data
5. Then: Add model to product creation webhook payload

---

## Files Modified

- `/public/pages/business/add-product.html` - Added scripts, container, initialization

## Files Required

- `/public/js/model-loader.js` - ✅ Exists
- `/public/js/model-selector-component.js` - ✅ Exists
- `/api/creative-models/all` - Endpoint should exist
- `/api/creative-models/default` - Endpoint should exist

---

## Success Criteria

- [ ] Component loads without errors
- [ ] Default model displays with image
- [ ] "Change Model" button is clickable
- [ ] Modal opens with model grid
- [ ] Can select different model
- [ ] Selected model updates in form
- [ ] `window.selectedModel` contains correct data
- [ ] No JavaScript errors in console
