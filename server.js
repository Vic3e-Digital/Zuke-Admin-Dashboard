const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const { getDatabase } = require("./lib/mongodb");

const app = express();
const PORT = process.env.PORT || 3000;
const getOpenAIConfig = require('./api/get-openai-config');

// -------------------------
// Middleware
// -------------------------
app.use(cors({ origin: true, credentials: true }));
// app.use(express.json());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

app.get("/dashboard/", (req, res) => {
  try {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  } catch (error) {
    console.error("Error serving dashboard.html:", error);
    res.status(500).send("Error loading dashboard");
  }
});

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