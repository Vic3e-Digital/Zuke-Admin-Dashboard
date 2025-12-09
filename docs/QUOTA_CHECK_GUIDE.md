# Google Cloud Quota Check Guide

## 🔍 Check Your Current Vertex AI Quotas

### Step 1: Go to Google Cloud Console Quotas
1. Visit: https://console.cloud.google.com/iam-admin/quotas
2. Select your project: `the-zuke-project`
3. Search for: `"Vertex AI"` or `"AI Platform"`

### Step 2: Look for These Specific Quotas:
- **Vertex AI API requests per minute**
- **Vertex AI prediction requests per minute** 
- **Generate content requests per minute**
- **Video generation requests per day**
- **Custom model prediction requests**

### Step 3: Check Current Usage
Look for quotas showing:
- Current usage vs limit (e.g., 50/50 requests)
- Regional vs global limits
- Pay-as-you-go vs provisioned limits

## 📊 Common Vertex AI Quota Limits (Default):

| Quota Type | Default Limit | Reset Period |
|------------|---------------|--------------|
| Requests per minute | 60 | Every minute |
| Requests per day | 1,000 | Every day |
| Concurrent requests | 10 | Ongoing |
| Video generation (new users) | 5-10/day | Every day |

## 🚀 Solutions Based on Quota Status:

### If Quotas Are Maxed Out:
```bash
# Wait for reset (check reset times in console)
# Or request quota increase
```

### If Quotas Look Normal:
```bash
# You might have a billing issue or regional limit
# Try different regions or check billing account
```

## 📋 Request Quota Increase:
1. In quotas page, click on the quota you want to increase
2. Click "EDIT QUOTAS" 
3. Fill out the increase request form
4. Justify your need (e.g., "Video generation for business automation")
5. Wait 2-7 days for approval

## ⚡ Quick Commands to Check:

```bash
# Check current quotas via gcloud (if installed)
gcloud compute project-info describe --format="value(quotas)"

# Or use our API to check current usage
curl -s http://localhost:3000/api/ai-generators/health | jq '.aiRouter.providers'
```

## 🎯 Recommended Actions:
1. **Check quotas first** (most likely cause)
2. **Wait 1-24 hours** for quota reset
3. **Request quota increase** if needed  
4. **Consider Provisioned Throughput** for consistent access