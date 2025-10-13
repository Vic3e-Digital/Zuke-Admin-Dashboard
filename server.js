const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const { getDatabase } = require("./lib/mongodb");

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------
// Middleware
// -------------------------
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
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
// Business Routes
// -------------------------
app.use('/api/businesses', require('./api/businesses'));

app.use('/api/business-settings', require('./api/business-settings'));


// // Example additional routes
// app.post("/api/businesses-create", async (req, res) => {
//   // Your existing POST logic
// });

// app.get("/api/businesses-stats", async (req, res) => {
//   // Your existing stats logic
// });

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


// });

// app.get("/api/products/stats", async (req, res) => {
//   try {
//     const db = await getDatabase();
//     const collection = db.collection("products");

//     const [total, active, inactive] = await Promise.all([
//       collection.countDocuments(),
//       collection.countDocuments({ status: "Active" }),
//       collection.countDocuments({ status: "Inactive" }),
//     ]);

//     res.json({ success: true, data: { total, active, inactive } });
//   } catch (error) {
//     console.error("Error fetching product stats:", error);
//     res.status(500).json({ success: false, error: "Failed to fetch product statistics" });
//   }
// });
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

const walletRoutes = require('./api/wallet');
app.use('/api/wallet', walletRoutes);

// Simple dashboard route - no trailing slash complications
app.get("/dashboard/", (req, res) => {
  try {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  } catch (error) {
    console.error("Error serving dashboard.html:", error);
    res.status(500).send("Error loading dashboard");
  }
});

// Add this route to serve the Paystack public key
app.get("/api/paystack-key", (req, res) => {
  res.json({ 
    key: process.env.PAYSTACK_TEST_KEY || process.env.PAYSTACK_PUBLIC_KEY 
  });
});

// Static middleware
app.use(express.static(path.join(__dirname, "public")));

// -------------------------
// 404 and Error Handling
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

// server.js - Add before the 404 handler

// -------------------------
// Social Media Post Route
// -------------------------
app.post("/api/social-post", async (req, res) => {
  try {
    const { businessId, content, platforms, mediaUrl } = req.body;

    console.log(`[Social Post] Request for business: ${businessId}, platforms:`, platforms);

    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    const automationSettings = business.automation_settings;
    
    if (!automationSettings?.n8n_config?.enabled) {
      return res.status(400).json({ 
        success: false, 
        error: 'Automation not enabled for this business' 
      });
    }

    const webhookUrl = automationSettings.n8n_config.webhook_url;
    
    if (!webhookUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'n8n webhook URL not configured' 
      });
    }

    // Prepare payload for n8n
    const payload = {
      businessId: businessId,
      businessName: business.store_info?.name,
      businessEmail: business.personal_info?.email,
      content: content,
      platforms: platforms,
      mediaUrl: mediaUrl,
      timestamp: new Date().toISOString(),
      
      // Include platform configurations
      platformConfigs: {}
    };

    // Add platform-specific data
    for (const platform of platforms) {
      const platformSettings = automationSettings.social_media?.[platform];
      
      if (platformSettings && platformSettings.connected) {
        payload.platformConfigs[platform] = {
          node_id: platformSettings.n8n_node_id,
          page_id: platformSettings.page_id,
          account_id: platformSettings.account_id,
          profile_id: platformSettings.profile_id,
          status: platformSettings.status
        };
      }
    }

    // Call n8n webhook
    const n8nHeaders = {
      'Content-Type': 'application/json'
    };

    // Add API key if configured
    if (automationSettings.n8n_config.api_key) {
      n8nHeaders['X-API-Key'] = automationSettings.n8n_config.api_key;
    }

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: n8nHeaders,
      body: JSON.stringify(payload)
    });

    if (n8nResponse.ok) {
      const n8nData = await n8nResponse.json();
      
      // Log the post attempt
      await db.collection('social_posts').insertOne({
        businessId: businessId,
        content: content,
        platforms: platforms,
        mediaUrl: mediaUrl,
        status: 'submitted',
        n8n_response: n8nData,
        created_at: new Date()
      });

      res.json({ 
        success: true, 
        message: 'Post submitted to n8n successfully',
        data: n8nData
      });
    } else {
      throw new Error(`n8n webhook failed: ${n8nResponse.statusText}`);
    }

  } catch (error) {
    console.error('[Social Post] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// -------------------------
// Start Server
// -------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});