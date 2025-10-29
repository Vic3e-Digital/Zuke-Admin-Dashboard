const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const { getDatabase } = require("./lib/mongodb");

const sendEmailRoutes = require('./api/send-email-api');
const veoRoutes = require('./api/veo-api');



const app = express();
const PORT = process.env.PORT || 3000;
const getOpenAIConfig = require('./api/get-openai-config');

// Add these at the top with other imports
const { ManagementClient } = require('auth0');

// Initialize Auth0 Management Client
const management = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  scope: 'read:users update:users'
});


// -------------------------
// Middleware
// -------------------------
app.use(cors({ origin: true, credentials: true }));
// app.use(express.json());


app.use(express.json({ limit: '50mb' }));  
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`[v0] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log(`[v0] Headers:`, req.headers);
  console.log(`[v0] Body:`, req.body);
  next();
});

// -------------------------
// API Logging
// -------------------------
app.use("/api", (req, res, next) => {
  console.log(`[v0] API route intercepted: ${req.method} ${req.path}`);
  next();
});

// -------------------------
// API Routes (BEFORE static files)
// -------------------------
app.use('/api/businesses', require('./api/businesses'));
app.use('/api/business-settings', require('./api/business-settings'));
app.use('/api/wallet', require('./api/wallet'));
app.use('/api/social-post', require('./api/social-post')); // ✅ Add this



// Paystack key route
app.get("/api/paystack-key", (req, res) => {
  res.json({ 
    key: process.env.PAYSTACK_TEST_KEY || process.env.PAYSTACK_PUBLIC_KEY 
  });
});

// -------------------------
// Product Routes
// -------------------------
app.get("/api/products", async (req, res) => {
  try {
    const { businessId, query } = req.query;
    const db = await getDatabase();
    const collection = db.collection("products");

    const filter = {};
    if (businessId) filter.businessId = businessId;
    if (query) {
      filter.$or = [
        { product_name: { $regex: query, $options: "i" } },
        { product_description: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ];
    }

    const products = await collection.find(filter).toArray();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

app.get('/api/get-openai-config', getOpenAIConfig);


// Get Cloudinary config
app.get('/api/cloudinary-config', (req, res) => {
  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'user_profiles'
  });
});



// Update user profile in User metadata
app.post('/api/user/update-profile', express.json(), async (req, res) => {
  try {
    const { user_id, name, picture } = req.body;
    
    console.log('📝 Update request received:', { user_id, name, picture: picture ? 'URL provided' : 'none' });
    
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    // ✅ Store EVERYTHING in user_metadata (for social logins)
    const updateData = {
      user_metadata: {
        custom_name: name,           // Store custom name here
        custom_picture: picture,      // Store custom picture here
        updated_at: new Date().toISOString()
      }
    };

    // ✅ Pass user_id directly as string
    const updatedUser = await management.users.update(
      user_id,
      updateData
    );

    console.log('✅ Auth0 user_metadata updated:', updatedUser.user_id);

    res.json({
      success: true,
      name: updatedUser.user_metadata?.custom_name || name,
      picture: updatedUser.user_metadata?.custom_picture || picture
    });

  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    
    if (error.statusCode) {
      console.error('Status:', error.statusCode);
      console.error('Body:', JSON.stringify(error.data || error.message, null, 2));
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update profile'
    });
  }
});
// -------------------------
// Serve Static Files
// -------------------------
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "pages")));

// -------------------------
// Clean URL Handling
// -------------------------
app.get("/:page", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();

  const page = req.params.page;
  const htmlPathPages = path.join(__dirname, "pages", `${page}.html`);
  const htmlPathPublic = path.join(__dirname, "public", `${page}.html`);

  if (fs.existsSync(htmlPathPages)) return res.sendFile(htmlPathPages);
  if (fs.existsSync(htmlPathPublic)) return res.sendFile(htmlPathPublic);

  next();
});


// User Profile Update
app.post('/api/user/update-profile', express.json(), async (req, res) => {
  try {
    const { user_id, name, picture } = req.body;
    
    // Store in your database (optional)
    // await UserProfile.updateOne({ user_id }, { name, picture });
    
    res.json({
      success: true,
      name,
      picture
    });
    
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// Get default webhook config
app.get('/api/default-webhook-config', (req, res) => {
  res.json({
    webhook_url: process.env.DEFAULT_N8N_WEBHOOK_URL || '',
    enabled: true
  });
});

// Add Business Manager
app.post('/api/business/:businessId/managers', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { email } = req.body;
    
    const business = await Business.findById(businessId);
    
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    
    // Initialize managers array if not exists
    if (!business.managers) {
      business.managers = [];
    }
    
    // Add manager
    business.managers.push({
      email,
      added_at: new Date(),
      role: 'manager'
    });
    
    await business.save();
    
    res.json({ success: true, managers: business.managers });
    
  } catch (error) {
    console.error('Error adding manager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove Business Manager
app.delete('/api/business/:businessId/managers', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { email } = req.body;
    
    const business = await Business.findById(businessId);
    
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    
    // Remove manager
    business.managers = business.managers.filter(m => m.email !== email);
    
    await business.save();
    
    res.json({ success: true, managers: business.managers });
    
  } catch (error) {
    console.error('Error removing manager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Business Status
app.patch('/api/business/:businessId/status', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status } = req.body;
    
    const business = await Business.findByIdAndUpdate(
      businessId,
      { status, updated_at: new Date() },
      { new: true }
    );
    
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    
    res.json({ success: true, business });
    
  } catch (error) {
    console.error('Error updating business status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete Business
app.delete('/api/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const business = await Business.findByIdAndDelete(businessId);
    
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    
    res.json({ success: true, message: 'Business deleted' });
    
  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// Add this where you have other route registrations
const businessWebhookConfig = require('./api/business-webhook-config');
app.use('/api/business-webhook-config', businessWebhookConfig);

// -------------------------
// Root Route
// -------------------------
app.get("/", (_, res) => {
  const dashboardPath = path.join(__dirname, "pages", "dashboard.html");
  if (fs.existsSync(dashboardPath)) return res.sendFile(dashboardPath);

  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
  res.redirect("/");
});

app.get("/dashboard/", (req, res) => {
  try {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  } catch (error) {
    console.error("Error serving dashboard.html:", error);
    res.status(500).send("Error loading dashboard");
  }
});

app.use('/api/send-email', sendEmailRoutes);
app.use('/api/veo', veoRoutes);  // ✅ Add this



// -------------------------
// 404 and Error Handling (MUST BE LAST)
// -------------------------
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ success: false, error: `API route not found: ${req.path}` });
  }

  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head><title>404 - Page Not Found</title></head>
    <body>
      <h1>404 - Page Not Found</h1>
      <p>The page could not be found.</p>
    </body>
    </html>
  `);
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  console.error("Error stack:", err.stack);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// -------------------------
// Start Server
// -------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});