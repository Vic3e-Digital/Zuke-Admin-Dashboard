# Cloudinary Setup for Model Image Uploads

This document explains how to configure Cloudinary for the model registration form image uploads.

## Overview

The model registration form (`public/pages/creative/model-registration.html`) now uploads images directly to Cloudinary before saving the URLs to MongoDB. This eliminates the need to store large image files in MongoDB and provides faster image delivery via Cloudinary's CDN.

## Setup Steps

### 1. Create a Cloudinary Account (if you don't have one)
- Go to https://cloudinary.com
- Sign up for a free account
- Verify your email

### 2. Get Your Cloud Name
1. Log in to your Cloudinary Dashboard: https://cloudinary.com/console
2. Look at the top of the dashboard - you'll see your **Cloud Name**
3. Copy this value (e.g., `dxyz1234abc`)

### 3. Create an Upload Preset
1. In the Cloudinary dashboard, go to **Settings** (⚙️ icon)
2. Click on the **Upload** tab
3. Scroll to **Upload Presets** section
4. Click **Add upload preset**
5. Configure:
   - **Name**: `zuke-model-uploads` (or any name you prefer)
   - **Signing Mode**: Unsigned (for client-side uploads)
   - **Folder**: `zuke-models` (where images will be stored)
   - Leave other settings as default
6. Click **Save**
7. Copy the preset name exactly as shown

### 4. Update model-registration.html

Open `public/pages/creative/model-registration.html` and find the `uploadToCloudinary()` function (around line 1100):

```javascript
// ========== CLOUDINARY UPLOAD ==========
async function uploadToCloudinary(file, fieldName) {
  try {
    // 🔐 CONFIGURE THESE WITH YOUR CLOUDINARY CREDENTIALS:
    const cloudName = 'YOUR_CLOUDINARY_CLOUD_NAME';        // ← Replace this
    const uploadPreset = 'YOUR_CLOUDINARY_UPLOAD_PRESET';  // ← Replace this
```

Replace:
- `YOUR_CLOUDINARY_CLOUD_NAME` with your actual cloud name (e.g., `dxyz1234abc`)
- `YOUR_CLOUDINARY_UPLOAD_PRESET` with your upload preset name (e.g., `zuke-model-uploads`)

**Example:**
```javascript
const cloudName = 'dxyz1234abc';
const uploadPreset = 'zuke-model-uploads';
```

### 5. Test the Setup

1. Start your server: `npm start`
2. Go to the Creative Hub and click "Join as Model"
3. Fill out Phase 1 and 2
4. Upload a headshot and portfolio photos
5. Submit the form
6. Check the browser console for upload confirmation
7. Verify images appear in your Cloudinary dashboard under Media Library > Folder: zuke-models

## How It Works

### Upload Flow

1. **User selects image** → File is stored in memory
2. **User submits form** → All images upload to Cloudinary in parallel
3. **Cloudinary returns URLs** → URLs are stored in MongoDB (not the image data)
4. **Success** → User sees confirmation and is redirected

### Data Structure in MongoDB

Images are now stored as URLs in the `creative_models` collection:

```javascript
{
  portfolio: {
    headshots: [
      "https://res.cloudinary.com/dxyz1234abc/image/upload/v1234567890/zuke-models/headshot-1700000000000.jpg"
    ],
    additionalPhotos: [
      "https://res.cloudinary.com/.../zuke-models/portfolio-0-1700000000001.jpg",
      "https://res.cloudinary.com/.../zuke-models/portfolio-1-1700000000002.jpg"
    ],
    socialMedia: { /* ... */ }
  }
}
```

## Features

### Image Uploads
- **Headshot**: Required, up to 10MB
- **Portfolio Photos**: Optional, up to 5 photos, 10MB each
- **Auto Upload**: Images upload to Cloudinary on form submission
- **Preview**: Local preview shown while uploading
- **Error Handling**: Clear error messages if upload fails

### Image Transformations (Available via Cloudinary)

Once images are in Cloudinary, you can use the dashboard or API to:
- Resize/crop images
- Add filters
- Convert formats
- Generate thumbnails
- Optimize delivery

Example: Get a thumbnail URL:
```
https://res.cloudinary.com/{cloudName}/image/fetch/w_150,h_150,c_fill/{originalUrl}
```

## Troubleshooting

### ❌ "Cloudinary credentials not configured"
**Solution**: You didn't replace `YOUR_CLOUDINARY_CLOUD_NAME` and `YOUR_CLOUDINARY_UPLOAD_PRESET` in the code.

### ❌ Upload fails with CORS error
**Solution**: 
1. Check that your upload preset is set to **Unsigned**
2. In Cloudinary Settings > Security, add your domain to **Allowed Origins**

### ❌ Images not appearing in dashboard
**Solution**: Check the Media Library > Folder > zuke-models. Verify the images are there with correct timestamps.

### ❌ Upload preset not found
**Solution**: Double-check the preset name matches exactly in both Cloudinary and the code (case-sensitive).

## Security Notes

- ✅ Using **unsigned uploads** is safe for client-side use
- ✅ Images go directly from user to Cloudinary (not through your server)
- ✅ URLs are stored in MongoDB, images stay on Cloudinary's CDN
- ⚠️ Never put API keys in client-side code
- ⚠️ Use upload presets to enforce folder structure and transformations

## Cost Considerations

Cloudinary's free tier includes:
- 25 GB storage
- 25 GB bandwidth per month
- Unlimited transformations
- Great for starting out!

Paid plans available if you exceed limits.

## Next Steps

After setup:
1. The creative-panel.js will automatically fetch headshot URLs from MongoDB
2. Images display in the grid view in Settings > Creative
3. Admin dashboard can manage model approvals
4. Consider adding image optimization transformations

## Reference Links

- Cloudinary Dashboard: https://cloudinary.com/console
- Upload Presets Docs: https://cloudinary.com/documentation/upload_presets
- API Docs: https://cloudinary.com/documentation/image_upload_api_reference
- Web Developer Community: https://cloudinary.com/community
