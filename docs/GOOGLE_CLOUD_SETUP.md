# Google Cloud Vertex AI Setup Guide

## Problem
Your current `VERTEX_AI_API_KEY` is not working because Google Vertex AI requires OAuth2 authentication via service accounts, not simple API keys.

## Solution: Set up a Service Account

### Step 1: Create Service Account in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `the-zuke-project`
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**

### Step 2: Configure Service Account

1. **Name**: `veo-video-generator`
2. **Description**: `Service account for Veo video generation`
3. Click **Create and Continue**

### Step 3: Grant Permissions

Add these roles to your service account:
- `Vertex AI User`
- `AI Platform User` (if available)
- `Service Account Token Creator` (optional, for advanced use)

### Step 4: Create JSON Key

1. After creating the service account, click on it
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. Download the file (e.g., `veo-service-account.json`)

### Step 5: Update Environment Variables

Place the JSON file in your project and update `.env`:

```bash
# Replace with actual path to your downloaded JSON file
GOOGLE_SERVICE_ACCOUNT_PATH=/path/to/veo-service-account.json

# Keep existing values
GOOGLE_CLOUD_PROJECT_ID=the-zuke-project
VERTEX_AI_LOCATION=us-central1

# Remove or comment out (not needed anymore)
# VERTEX_AI_API_KEY=...
```

### Step 6: Test the Setup

Run the test again:
```bash
node api/AI-generators/test-veo.js
```

## Alternative: Enable Required APIs

Make sure these APIs are enabled in your Google Cloud project:
1. **Vertex AI API**
2. **AI Platform API**

Go to **APIs & Services** → **Library** and search for:
- "Vertex AI API" → Enable
- "AI Platform API" → Enable

## Security Note

- Never commit the service account JSON file to version control
- Add `*.json` to your `.gitignore`
- Consider using Google Cloud's Workload Identity for production

## Troubleshooting

If you still get authentication errors:
1. Check that the service account has the right permissions
2. Verify the JSON file path is correct
3. Ensure the APIs are enabled in your project
4. Try regenerating the service account key

## Quick Test Commands

Test if authentication works:
```bash
# Test health endpoint (should work)
curl http://localhost:3000/api/ai-generators/health

# Test video generation (requires auth)
node api/AI-generators/test-veo.js
```