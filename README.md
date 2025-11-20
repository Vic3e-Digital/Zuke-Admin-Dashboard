# Zuke Admin Dashboard

A comprehensive web-based admin dashboard for managing Zuke businesses, creatives, and audio transcription services with real-time analytics and multi-platform social media integration.

## 🚀 Features

### Core Functionality
- **Authentication:** Auth0 SPA integration with secure, iframe-compatible authentication flow
- **Database:** MongoDB for persistent data storage
- **Frontend:** HTML5, CSS3, and vanilla JavaScript with responsive design
- **Backend:** Node.js/Express RESTful API

### Audio Transcription System
- **Azure OpenAI Whisper Integration:** High-accuracy audio transcription with configurable deployments
- **Speaker Diarization:** Identify multiple speakers using Azure GPT-4o deployment
- **Cloudinary Storage:** Secure CDN-based audio file storage with automatic scaling
- **Cost Tracking:** N8N wallet integration for real-time billing (R15.00 per transcription)
- **Email Delivery:** Webhook-based transcription result delivery to users

### Business Management
- **Product Management:** Create and manage business products
- **Service Management:** Track and organize business services
- **Settings Management:** Granular control over business configurations

### Social Media Integration
- **Multi-Platform Support:** Facebook, Instagram, LinkedIn, TikTok, YouTube
- **OAuth Integration:** Secure OAuth 2.0 implementations for each platform
- **Content Management:** Schedule and publish posts across platforms
- **Analytics:** Track performance metrics per platform

## 📋 Prerequisites

- **Node.js & npm** - [Download](https://nodejs.org/)
- **MongoDB** - Local or remote instance
- **Auth0 Account** - [Create Free Account](https://auth0.com/)
- **Azure Account** - For OpenAI models (Whisper, GPT-4o)
- **Cloudinary Account** - For audio file storage
- **N8N Webhook URL** - For wallet/billing integration

## 🔧 Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/Vic3e-Digital/Zuke-Admin-Dashboard.git
cd Zuke-Admin-Dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/zuke

# Auth0
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_AUDIENCE=your-auth0-audience

# Azure OpenAI (Audio Transcription)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper
AZURE_OPENAI_DIARIZATION_DEPLOYMENT=gpt-4o-transcribe-diarize

# Cloudinary (Audio Storage)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_UPLOAD_PRESET=zuke_uploads

# N8N Wallet Webhook (Billing)
N8N_WALLET_WEBHOOK_URL=https://your-n8n-instance.com/webhook/...

# Email Configuration (Optional)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
```

### 4. Auth0 Configuration

Update `auth_config.json` in the project root:

```json
{
  "domain": "YOUR_AUTH0_DOMAIN.auth0.com",
  "clientId": "YOUR_AUTH0_CLIENT_ID",
  "audience": "YOUR_AUTH0_API_AUDIENCE"
}
```

Also copy this file to `public/auth_config.json` for frontend authentication.

### 5. MongoDB Setup

Ensure MongoDB is running. Update connection string in `lib/mongodb.js` if needed:

```javascript
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/zuke";
```

### 6. Start the Server

**Production Mode:**
```bash
npm start
```

**Development Mode (with auto-reload):**
```bash
npm run dev
```

Access the dashboard at: `http://localhost:3000/public/dashboard.html`

## 📁 Project Structure

```
├── api/                           # Backend API endpoints
│   ├── audio-transcribe-api.js   # Audio transcription with Cloudinary & Azure
│   ├── business-case-api.js      # Business case management
│   ├── businesses.js             # Business CRUD operations
│   ├── send-email-api.js         # Email delivery service
│   ├── wallet.js                 # Wallet/billing operations
│   ├── middleware/               # Express middleware
│   │   └── validation.middleware.js
│   ├── routes/                   # API route definitions
│   │   └── business-settings.js
│   ├── services/                 # Business logic services
│   │   ├── business-settings.service.js
│   │   ├── encryption.service.js
│   │   ├── token-refresh.service.js
│   │   └── oauth/               # OAuth implementations
│   │       ├── facebook-oauth.service.js
│   │       ├── instagram-oauth.service.js
│   │       ├── linkedin-oauth.service.js
│   │       ├── tiktok-oauth.service.js
│   │       └── youtube-oauth.service.js
│   ├── utils/
│   │   └── format.utils.js
│   └── webhook/                  # Webhook handlers
│       ├── product-created.js
│       └── service-created.js
│
├── public/                        # Frontend files
│   ├── index.html               # Login page
│   ├── dashboard.html           # Main dashboard
│   ├── auth_config.json         # Auth0 frontend config
│   ├── js/                      # JavaScript modules
│   │   ├── app.js              # Main app initialization (Auth0 global exposure)
│   │   ├── dashboard.js        # Dashboard logic
│   │   ├── analytics.js        # Analytics tracking
│   │   ├── dataManager.js      # Data management utilities
│   │   └── ...
│   ├── pages/
│   │   ├── creative/
│   │   │   ├── transcribe-audio.html  # Audio transcription UI
│   │   │   ├── audio-transcribe.html  # Alternative transcribe UI
│   │   │   └── ...
│   │   ├── business/           # Business management pages
│   │   └── ...
│   ├── css/                    # Stylesheets
│   └── tools/                  # Utility tools
│
├── lib/
│   └── mongodb.js             # MongoDB connection manager
│
├── server.js                   # Express server entry point
├── nodemon.json               # Development auto-reload config
├── package.json               # Dependencies
└── README.md                  # This file
```

## 🔑 Recent Changes & Improvements

### Audio Transcription System (Latest Session - November 20, 2025)

#### 1. **Auth0 Authentication Fix**
- **Issue:** Auth0 not available in iframe context
- **Solution:** Exposed `window.auth0Client` globally in `app.js` after client initialization
- **Impact:** All pages can now reuse Auth0 client, enabling proper authentication in iframes
- **Files:** `public/js/app.js`

#### 2. **API Route Correction**
- **Issue:** Frontend fetching `/api/audio-transcribe` returning 404
- **Solution:** Updated frontend to call correct endpoint `/api/audio-transcribe/transcribe`
- **Impact:** Audio transcription endpoint now properly routed and accessible
- **Files:** `public/pages/creative/transcribe-audio.html`, `public/pages/creative/audio-transcribe.html`

#### 3. **Environment Variable Parameterization**
- **Issue:** Azure model deployments hardcoded in code
- **Solution:** Added environment variables for flexible deployment management:
  - `AZURE_OPENAI_WHISPER_DEPLOYMENT`
  - `AZURE_OPENAI_DIARIZATION_DEPLOYMENT`
- **Impact:** Easy model switching without code changes
- **Files:** `api/audio-transcribe-api.js`

#### 4. **Cloudinary Storage Integration** ⭐ Major Change
- **Issue:** Audio files stored locally on disk, limiting scalability
- **Solution:** Migrated to Cloudinary CDN with complete refactoring:
  - Changed `multer` from disk storage to memory storage
  - Created `uploadAudioToCloudinary()` function with Cloudinary API integration
  - Updated database to store Cloudinary URLs instead of local filenames
  - Environment variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET`
- **Impact:** 
  - ✅ Scalable, global CDN storage
  - ✅ No local disk usage or file cleanup needed
  - ✅ Automatic file lifecycle management
  - ✅ Public URLs for future retrieval
  - ✅ Cloud-ready architecture for Azure deployment
- **Files:** `api/audio-transcribe-api.js`

#### 5. **Buffer-Based Processing**
- **Issue:** Filesystem dependency limited cloud deployment options
- **Solution:** Modified transcription pipeline to use memory buffers:
  - File stays in memory as `req.file.buffer` (multer memory storage)
  - Passed directly to Cloudinary upload function
  - Forwarded to Azure Whisper transcription
  - No temporary files created or cleanup required
- **Impact:** 
  - ✅ Faster processing (no I/O wait)
  - ✅ Reduced system resource usage
  - ✅ Cloud-friendly architecture
- **Files:** `api/audio-transcribe-api.js`

#### 6. **Authentication Flow Improvements**
- **Solution:** Implemented multi-level fallback pattern for iframe compatibility:
  - Primary: URL parameters (most reliable)
  - Secondary: Parent window dataManager (iframe parent)
  - Tertiary: Own window dataManager
  - Fallback: Auth0 getUser() method
- **Impact:** Works in all contexts (standalone page, iframe, embedded)
- **Files:** `public/pages/creative/transcribe-audio.html`, `public/pages/creative/audio-transcribe.html`

### Database Schema Updates

**Audio Transcription Record** now includes:
```javascript
{
  businessId: ObjectId,
  userEmail: String,
  businessName: String,
  audioCloudinary: {                // New Cloudinary integration
    public_id: String,              // Cloudinary asset ID
    url: String,                    // CDN URL for playback/download
    size: Number                    // File size from Cloudinary
  },
  audioFileName: String,            // Original filename for reference
  audioSize: Number,                // Original file size
  enableDiarization: Boolean,       // Speaker identification enabled
  language: String,                 // Detected language
  duration: Number,                 // Audio duration in seconds
  transcriptionPreview: String,     // First 500 chars of transcription
  fullTranscription: JSON,          // Complete transcription with segments
  cost: Number,                     // R15.00 per transcription
  charged: Boolean,                 // Payment processed
  emailSent: Boolean,               // Results emailed to user
  emailRecipient: String,           // Email address
  status: String,                   // 'completed', 'processing', 'failed'
  created_at: Date                  // Timestamp
}
```

## 🔐 Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` for reference
2. **Auth0 Secrets** - Store API audience and client secrets securely
3. **Cloudinary Preset** - Use unsigned upload preset for browser uploads
4. **Azure Keys** - Rotate API keys regularly
5. **N8N Webhooks** - Use HTTPS endpoints only
6. **MongoDB** - Use connection string encryption and IP whitelisting
7. **File Uploads** - Validate file size and type before processing

## 📊 API Documentation

### Audio Transcription Endpoint

**POST** `/api/audio-transcribe/transcribe`

**Request (FormData):**
```
file              (File)     - Audio file (MP3, WAV, FLAC, OGG)
businessId        (string)   - Business identifier
userEmail         (string)   - User email address
businessName      (string)   - Business name
enableDiarization (boolean)  - Enable speaker identification
sendEmail         (boolean)  - Send results via email
emailRecipient    (string)   - Email recipient address (if sendEmail=true)
```

**Response:**
```json
{
  "success": true,
  "transcription": {
    "text": "Full transcription text...",
    "language": "en",
    "duration": 120,
    "segments": [
      {
        "id": 0,
        "seek": 0,
        "start": 0.0,
        "end": 2.5,
        "text": "Segment text",
        "tokens": [...]
      }
    ]
  },
  "diarization": {
    "speakers": ["Speaker 1", "Speaker 2"],
    "timeline": [...]
  },
  "cost": 15.00,
  "charged": true,
  "emailSent": true,
  "cloudinaryUrl": "https://res.cloudinary.com/dekgwsl3c/video/upload/..."
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description",
  "details": "Additional error details"
}
```

## 🧪 Testing

### Manual Testing

1. **Test Authentication:**
   - Navigate to `/public/index.html`
   - Verify Auth0 login flow
   - Check `window.auth0Client` is available in browser console

2. **Test Audio Transcription:**
   - Upload an audio file (MP3, WAV) in the transcription page
   - Verify Cloudinary upload (check network tab → FormData post to api.cloudinary.com)
   - Verify transcription completion
   - Check MongoDB for stored Cloudinary URL in audioCloudinary.url
   - Verify email received if email option enabled

3. **Test OAuth Integrations:**
   - Click social platform buttons
   - Verify OAuth flow completes
   - Check token storage in database

## 📦 Dependencies

### Core
- `express` - Web framework
- `mongodb` - Database driver
- `auth0-spa-js` - Auth0 authentication SDK
- `multer` - File upload handling
- `axios` - HTTP client
- `form-data` - FormData handling for Cloudinary

### Optional
- `nodemon` - Development auto-reload (npm run dev)
- `dotenv` - Environment variable management

## 🚀 Deployment

### Azure Deployment

The project is configured for Azure App Service deployment. See `deploy_setup.ps1` and `publishProfile-*.xml` for deployment configuration.

**Deployment Steps:**
1. Push code to repository
2. Configure environment variables in Azure App Service → Configuration
3. Verify MongoDB accessible from Azure
4. Test transcription endpoint after deployment

**Required Environment Variables in Azure:**
```
MONGODB_URI
AUTH0_DOMAIN
AUTH0_CLIENT_ID
AUTH0_AUDIENCE
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_API_KEY
AZURE_OPENAI_WHISPER_DEPLOYMENT
AZURE_OPENAI_DIARIZATION_DEPLOYMENT
CLOUDINARY_CLOUD_NAME
CLOUDINARY_UPLOAD_PRESET
N8N_WALLET_WEBHOOK_URL
```

### Production Checklist

- [ ] All environment variables configured in Azure App Service
- [ ] MongoDB connection string verified and accessible
- [ ] Auth0 production domain configured
- [ ] Cloudinary account setup with unsigned upload preset
- [ ] Azure OpenAI endpoints tested and quota verified
- [ ] N8N webhook URL verified and accessible
- [ ] HTTPS enabled on all endpoints
- [ ] CORS properly configured for production domain
- [ ] Rate limiting enabled
- [ ] Error logging configured
- [ ] Backup strategy for MongoDB implemented
- [ ] Monitoring and alerts configured

## �� Troubleshooting

### Audio Transcription Returns 404
- Verify endpoint is `/api/audio-transcribe/transcribe` (not `/api/audio-transcribe`)
- Check that `audio-transcribe-api.js` route is mounted in `server.js`
- Ensure multer middleware is configured for file uploads

### Auth0 Not Available
- Check `window.auth0Client` is exposed in `app.js`
- Verify `auth_config.json` has correct credentials (domain, clientId)
- Check browser console for Auth0 SDK errors
- Verify Auth0 app configuration allows your domain

### Cloudinary Upload Fails
- Verify `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` in `.env`
- Check network tab for API errors (status 400, 401, etc.)
- Verify unsigned upload preset is configured in Cloudinary dashboard
- Ensure preset is set to "unsigned" for browser uploads

### Azure Whisper Errors
- Verify `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY`
- Check deployment names match exactly: `AZURE_OPENAI_WHISPER_DEPLOYMENT`
- Ensure audio format is supported (WAV, MP3, FLAC, OGG)
- Check API quota and rate limits in Azure portal

### Database Connection Errors
- Verify `MONGODB_URI` in `.env` (local or cloud)
- Check MongoDB is running (if local)
- Test connection string in MongoDB Compass
- Verify IP whitelist (if using MongoDB Atlas)

## 📞 Support & Documentation

- **Auth0 Docs:** https://auth0.com/docs
- **Azure OpenAI Docs:** https://learn.microsoft.com/en-us/azure/cognitive-services/openai/
- **Cloudinary Docs:** https://cloudinary.com/documentation
- **MongoDB Docs:** https://docs.mongodb.com/
- **Express Docs:** https://expressjs.com/

## 📝 License

Private project for Zuke Admin Dashboard - Vic3e Digital

---

**Last Updated:** November 20, 2025
**Current Version:** 2.0.0 (Audio Transcription with Cloudinary & Azure OpenAI)
**Session:** Audio transcription system complete - Auth0 auth flow fixed, API routes corrected, Cloudinary CDN integration, Azure models parameterized
