// server.js
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();
const { join } = require("path");

const { getDatabase } = require("./lib/mongodb"); // Your MongoDB helper

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`[v0] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log(`[v0] Headers:`, req.headers);
  console.log(`[v0] Body:`, req.body);
  next();
});

// API logging middleware
app.use("/api", (req, res, next) => {
  console.log(`[v0] API route intercepted: ${req.method} ${req.path}`);
  next();
});

// -------------------------
// Business Routes
// -------------------------
app.get("/api/businesses", async (req, res) => {
  try {
    const { query } = req.query;
    const db = await getDatabase();
    const collection = db.collection("businesses");

    let filter = {};
    if (query) {
      filter = {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { industry: { $regex: query, $options: "i" } },
          { location: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      };
    }

    const businesses = await collection.find(filter).toArray();

    res.json({
      success: true,
      data: businesses,
    });
  } catch (error) {
    console.error("Error fetching businesses:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch businesses",
    });
  }
});

app.post("/api/businesses", async (req, res) => {
  try {
    const { name, industry, location, email, phone, website, description } = req.body;

    if (!name || !industry || !location || !email) {
      return res.status(400).json({
        success: false,
        error: "Name, industry, location, and email are required",
      });
    }

    const db = await getDatabase();
    const collection = db.collection("businesses");

    const business = {
      name,
      industry,
      location,
      email,
      phone: phone || "",
      website: website || "",
      description: description || "",
      status: "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(business);

    res.json({
      success: true,
      data: { ...business, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Error creating business:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create business",
    });
  }
});

app.get("/api/businesses/stats", async (req, res) => {
  try {
    const db = await getDatabase();
    const collection = db.collection("businesses");

    const [total, active, pending, inactive] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ status: "Active" }),
      collection.countDocuments({ status: "Pending" }),
      collection.countDocuments({ status: "Inactive" }),
    ]);

    res.json({
      success: true,
      data: { total, active, pending, inactive },
    });
  } catch (error) {
    console.error("Error fetching business stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics",
    });
  }
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

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch products",
    });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const { product_name, product_description, price_range, product_image, webhookUrl } = req.body;

    if (!product_name || !product_description) {
      return res.status(400).json({
        success: false,
        error: "Product name and description are required",
      });
    }

    const db = await getDatabase();
    const collection = db.collection("products");

    const adminEmail = "dev@example.com"; // dummy admin
    const productData = {
      product_name,
      product_description,
      product_image: product_image || `https://cdn.example.com/products/${Date.now()}.jpg`,
      price_range: price_range || "",
      admin_profile: {
        name: "TechStore Electronics",
        email: adminEmail,
      },
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

    // Optional webhook
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
    res.status(500).json({
      success: false,
      error: "Failed to create product",
    });
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
// Static Files and HTML
// -------------------------
app.use(express.static(join(__dirname, "public")));
app.use(express.static(join(__dirname, "/pages")));

app.get("/", (_, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

// -------------------------
// 404 and Error Handling
// -------------------------
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ success: false, error: `API route not found: ${req.path}` });
  } else {
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
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// -------------------------
// Start Server
// -------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
