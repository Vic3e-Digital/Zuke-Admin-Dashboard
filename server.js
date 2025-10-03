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

// Example additional routes
app.post("/api/businesses-create", async (req, res) => {
  // Your existing POST logic
});

app.get("/api/businesses-stats", async (req, res) => {
  // Your existing stats logic
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

app.post("/api/products", async (req, res) => {
  try {
    const { product_name, product_description, price_range, product_image, webhookUrl } = req.body;

    if (!product_name || !product_description) {
      return res.status(400).json({ success: false, error: "Product name and description are required" });
    }

    const db = await getDatabase();
    const collection = db.collection("products");

    const adminEmail = "dev@example.com";
    const productData = {
      product_name,
      product_description,
      product_image: product_image || `https://cdn.example.com/products/${Date.now()}.jpg`,
      price_range: price_range || "",
      admin_profile: { name: "TechStore Electronics", email: adminEmail },
      created_at: new Date().toISOString(),
      status: "Active",
    };

    const result = await collection.insertOne(productData);

    const responseData = {
      mongo_id: result.insertedId.toString(),
      product_name: productData.product_name,
      product_description: productData.product_description,
      product_image: productData.product_image,
      price_range: productData.price_range,
      admin_profile: productData.admin_profile,
    };

    if (webhookUrl) {
      try {
        const fetch = require("node-fetch");
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(responseData),
        });
      } catch (err) {
        console.error("Webhook error:", err);
      }
    }

    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ success: false, error: "Failed to create product" });
  }
});

app.get("/api/products/stats", async (req, res) => {
  try {
    const db = await getDatabase();
    const collection = db.collection("products");

    const [total, active, inactive] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ status: "Active" }),
      collection.countDocuments({ status: "Inactive" }),
    ]);

    res.json({ success: true, data: { total, active, inactive } });
  } catch (error) {
    console.error("Error fetching product stats:", error);
    res.status(500).json({ success: false, error: "Failed to fetch product statistics" });
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

// Simple dashboard route - no trailing slash complications
app.get("/dashboard/", (req, res) => {
  try {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  } catch (error) {
    console.error("Error serving dashboard.html:", error);
    res.status(500).send("Error loading dashboard");
  }
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

// -------------------------
// Start Server
// -------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});