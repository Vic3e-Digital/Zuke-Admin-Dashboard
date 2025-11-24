# DataManager Cache Usage Guide

The `dataManager` singleton provides client-side caching to avoid unnecessary API calls. It stores data in both memory and `sessionStorage` with a **5-minute expiry**.

## Quick Start

### 1. Business Data Caching

```javascript
// Store businesses
dataManager.setBusinesses(businessesArray);

// Retrieve cached businesses (returns null if expired)
const businesses = dataManager.getBusinesses();
```

### 2. Selected Business Caching

```javascript
// Set the active business
dataManager.setSelectedBusiness(businessObject);

// Get currently selected business
const selected = dataManager.getSelectedBusiness();

// Get selected or fallback to first
const business = dataManager.getSelectedBusinessOrFirst();
```

### 3. User Email Caching

```javascript
// Store authenticated user email
dataManager.setUserEmail('user@example.com');

// Retrieve cached email
const email = dataManager.getUserEmail();
```

### 4. Business Case Caching

```javascript
// Store business case from MongoDB
dataManager.setBusinessCase(businessCaseObject);

// Retrieve cached business case
const businessCase = dataManager.getBusinessCase();
```

## Example: Complete Flow

```javascript
// After fetching businesses from API
const response = await fetch('/api/businesses?email=' + userEmail);
const data = await response.json();

// Cache the businesses
dataManager.setBusinesses(data.businesses);

// Set the selected one
const selectedBusiness = data.businesses[0];
dataManager.setSelectedBusiness(selectedBusiness);

// Cache the business case separately
dataManager.setBusinessCase(selectedBusiness.initial_business_case);

// Cache user email
dataManager.setUserEmail(userEmail);

// Next time you need this data:
const cached = dataManager.getBusinessCase(); // ✅ No API call!
```

## Cache Expiry

- **Duration**: 5 minutes (300,000 ms)
- **Checked automatically** when retrieving data
- Returns `null` if cache is expired
- **Persistent**: Survives page reloads via `sessionStorage`
- **Cleared on**: Browser session ends or logout

## Storage Locations

| Data | Memory | SessionStorage | Expires |
|------|--------|----------------|---------|
| `businesses` | ✅ | `cachedBusinesses` | 5 min |
| `selectedBusiness` | ✅ | `selectedBusiness` | ✗ |
| `userEmail` | ✅ | `cachedUserEmail` | 5 min |
| `businessCase` | ✅ | `cachedBusinessCase` | 5 min |

## Business Change Callbacks

Register functions to run whenever the selected business changes:

```javascript
// Register a callback
function onBusinessChanged(business) {
  console.log('Business switched to:', business.store_info.name);
  // Update UI, fetch related data, etc.
}

dataManager.onBusinessChange(onBusinessChanged);

// Remove the callback later
dataManager.offBusinessChange(onBusinessChanged);

// When you set a business, all callbacks fire automatically
dataManager.setSelectedBusiness(newBusiness); // ← Callbacks triggered
```

## Updating Business Data

When a business is updated:

```javascript
const updatedBusiness = {
  _id: "...",
  store_info: { name: "Updated Name" },
  initial_business_case: { ... },
  // ... other fields
};

// Updates both the cached business and selected business if matched
dataManager.updateBusiness(updatedBusiness);
```

## Clearing Cache

```javascript
// Clear all cached data
dataManager.clearCache();
```

## Real-World Example: Business Case Page

```javascript
// 1. Try to get from cache first (no API call)
let businessCase = dataManager.getBusinessCase();

if (!businessCase || Object.keys(businessCase).length === 0) {
  // 2. If not cached, get from business object
  const business = dataManager.getSelectedBusinessOrFirst();
  businessCase = business.initial_business_case || {};
  
  // 3. Store for next visit
  if (businessCase && Object.keys(businessCase).length > 0) {
    dataManager.setBusinessCase(businessCase);
  }
}

// 4. Use the business case
populateForm(businessCase);
```

**Result**: First visit fetches from API, second visit loads from cache instantly! ⚡

## Performance Benefits

| Scenario | Without Cache | With Cache |
|----------|---------------|-----------|
| Load business on page 1 | API call | API call |
| Switch to page 2 within 5 min | API call | **Instant** (sessionStorage) |
| Return to page 1 within 5 min | API call | **Instant** (memory) |
| After 5 minutes | Expired, new API call | Expired, new API call |

## Browser DevTools Debugging

**View cached data in console:**

```javascript
// Check what's cached
console.log(window.dataManager.cache);

// Check sessionStorage
console.log(sessionStorage.getItem('cachedBusinesses'));
console.log(sessionStorage.getItem('cachedUserEmail'));
console.log(sessionStorage.getItem('cachedBusinessCase'));
```

**Clear cache manually:**

```javascript
dataManager.clearCache();
// or
sessionStorage.clear();
```

## Important Notes

⚠️ **Cache expires after 5 minutes** — Update `cacheExpiry` in `dataManager.js` constructor if you need different duration

⚠️ **SessionStorage is cleared when browser closes** — User must re-login on next session

⚠️ **Each tab has separate sessionStorage** — Cache doesn't sync across tabs

✅ **Memory cache is fastest** — Check memory first, then sessionStorage

✅ **Automatic persistence** — Data survives page reloads, even without sessionStorage

---

## Files Using Cache

- `dashboard.html` - Loads and caches businesses on startup
- `business-case.html` - Caches business case to avoid re-fetching
- `transcribe-audio.html` - Gets business ID from cache for API calls
- Any page accessing `window.dataManager`

---

For questions or updates, see `public/js/dataManager.js` ✨
