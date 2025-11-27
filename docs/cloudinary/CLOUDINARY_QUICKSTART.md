# Cloudinary Configuration - Quick Reference

## TL;DR - Setup in 5 Minutes

### 1. Get Credentials
- Cloud Name: https://cloudinary.com/console → Look at top of page
- Upload Preset: Settings → Upload → Create/copy an unsigned preset

### 2. Update Code
Edit `public/pages/creative/model-registration.html` ~line 1208:

```javascript
const cloudName = 'your-cloud-name-here';
const uploadPreset = 'your-preset-name-here';
```

### 3. Test
- Start server: `npm start`
- Go to Creative Hub → "Join as Model"
- Upload image → Submit form
- Check Cloudinary Media Library for image

---

## How It Works Now

```
User Form
  ↓
Selects headshot + portfolio photos
  ↓
Submits form
  ↓
uploadToCloudinary() → Sends to Cloudinary API
  ↓
Gets back HTTPS URLs
  ↓
Stores URLs in MongoDB creative_models.portfolio
  ↓
Creative panel displays headshots in grid
```

---

## File Locations

- **Setup Guide**: `/CLOUDINARY_SETUP.md`
- **Implementation Details**: `/CLOUDINARY_IMPLEMENTATION_SUMMARY.md`
- **Code**: `/public/pages/creative/model-registration.html` (function starts ~line 1205)
- **Display**: `/public/pages/settings/components/creative-panel.js` (already reads URLs)

---

## Cloudinary URLs Format

All images stored as:
```
https://res.cloudinary.com/{cloudName}/image/upload/v{timestamp}/zuke-models/{filename}
```

Examples:
- Headshot: `...zuke-models/headshot-1700000000000.jpg`
- Portfolio: `...zuke-models/portfolio-0-1700000000001.jpg`

---

## Status Messages During Upload

✅ "Headshot selected: filename.jpg (2.5MB)\nWill be uploaded to Cloudinary when you submit."
⏳ "Uploading headshot to Cloudinary..."
✅ "Headshot uploaded successfully"
⏳ "Uploading portfolio photos..."
✅ "3 portfolio photos uploaded"
⏳ "Finalizing registration..."
✅ "Registration submitted!"

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| Credentials not configured | Replace placeholder values with real ones |
| CORS error | Add domain to Cloudinary Security settings |
| Upload fails | Check internet connection, file size, image format |
| Can't find preset | Verify exact spelling, case-sensitive |

---

## What's Stored in MongoDB

**Before**: Large image files or base64 strings
**After**: Clean URLs like `https://res.cloudinary.com/.../zuke-models/headshot-123456.jpg`

Advantages:
- MongoDB stays small and fast
- Images served from CDN worldwide
- Can transform images without re-uploading
- Easy to manage in Cloudinary dashboard

---

## Next Time You See Images in Settings

The creative-panel.js grid now displays these Cloudinary URLs as headshots! 🎉

The system flow is:
1. Model uploads photo → Cloudinary
2. URL stored in MongoDB
3. Settings page queries MongoDB
4. Gets Cloudinary URL
5. Displays in square grid with info modal
