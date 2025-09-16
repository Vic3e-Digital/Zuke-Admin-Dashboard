const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const path = require("path")
require("dotenv").config()
const { join } = require("path");

const { getDatabase } = require("./lib/mongodb")
const { createSession, verifySession, deleteSession, requireAuth } = require("./lib/auth")

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(
  cors({
    origin: true, // Allow all origins for development
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.use((req, res, next) => {
  console.log(`[v0] ${new Date().toISOString()} - ${req.method} ${req.path}`)
  console.log(`[v0] Headers:`, req.headers)
  console.log(`[v0] Body:`, req.body)
  next()
})

// FIXED: Changed /api/* to /api - this was causing the crash
app.use("/api", (req, res, next) => {
  console.log(`[v0] API route intercepted: ${req.method} ${req.path}`)
  next()
})

// Auth routes
app.post("/api/auth/login", async (req, res) => {
  console.log("[v0] LOGIN ROUTE HIT!")
  try {
    console.log("[v0] Login attempt:", req.body.email)
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      })
    }

    // Demo credentials (in production, verify against database)
    if (email === "admin@business.com" && password === "admin123") {
      createSession(res, email)
      console.log("[v0] Login successful for:", email)

      res.json({
        success: true,
        message: "Login successful",
      })
    } else {
      console.log("[v0] Invalid credentials for:", email)
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      })
    }
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})


app.get("/api/auth/verify", (req, res) => {
  console.log("[v0] VERIFY ROUTE HIT!")
  try {
    console.log("[v0] Auth verification request")
    const session = verifySession(req)

    if (session) {
      console.log("[v0] Session verified for:", session.email)
      res.json({
        success: true,
        authenticated: true,
        user: {
          email: session.email,
          role: session.role,
        },
      })
    } else {
      console.log("[v0] No valid session found")
      res.json({
        success: false,
        authenticated: false,
      })
    }
  } catch (error) {
    console.error("Auth verification error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

app.post("/api/auth/logout", (req, res) => {
  try {
    console.log("[v0] Logout request")
    deleteSession(res)
    res.json({
      success: true,
      message: "Logout successful",
    })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

//Auth0 routes

// Serve static assets from the /public folder
app.use(express.static(join(__dirname, "public")));
app.use(express.static(join(__dirname, "/pages")));

// Endpoint to serve the configuration file
app.get("/auth_config.json", (req, res) => {
  res.sendFile(join(__dirname, "auth_config.json"));
});

// Serve the index page for all other requests
app.get("/", (_, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

// Listen on port 3000
app.listen(3000, () => console.log("Application running on port 3000"));

// Business routes
app.get("/api/businesses", requireAuth, async (req, res) => {
  try {
    const { query } = req.query
    const db = await getDatabase()
    const collection = db.collection("businesses")

    let filter = {}

    if (query) {
      // Create search filter for multiple fields
      filter = {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { industry: { $regex: query, $options: "i" } },
          { location: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      }
    }

    const businesses = await collection.find(filter).toArray()

    res.json({
      success: true,
      data: businesses,
    })
  } catch (error) {
    console.error("Error fetching businesses:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch businesses",
    })
  }
})

app.post("/api/businesses", requireAuth, async (req, res) => {
  try {
    const { name, industry, location, email, phone, website, description } = req.body

    if (!name || !industry || !location || !email) {
      return res.status(400).json({
        success: false,
        error: "Name, industry, location, and email are required",
      })
    }

    const db = await getDatabase()
    const collection = db.collection("businesses")

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
    }

    const result = await collection.insertOne(business)

    res.json({
      success: true,
      data: { ...business, _id: result.insertedId },
    })
  } catch (error) {
    console.error("Error creating business:", error)
    res.status(500).json({
      success: false,
      error: "Failed to create business",
    })
  }
})

app.get("/api/businesses/stats", requireAuth, async (req, res) => {
  try {
    const db = await getDatabase()
    const collection = db.collection("businesses")

    const [total, active, pending, inactive] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ status: "Active" }),
      collection.countDocuments({ status: "Pending" }),
      collection.countDocuments({ status: "Inactive" }),
    ])

    res.json({
      success: true,
      data: {
        total,
        active,
        pending,
        inactive,
      },
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics",
    })
  }
})

// Product routes - ADDED YOUR EXACT JSON OUTPUT FORMAT
app.get("/api/products", requireAuth, async (req, res) => {
  try {
    const { businessId, query } = req.query
    const db = await getDatabase()
    const collection = db.collection("products")

    const filter = {}

    if (businessId) {
      filter.businessId = businessId
    }

    if (query) {
      filter.$or = [
        { product_name: { $regex: query, $options: "i" } },
        { product_description: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ]
    }

    const products = await collection.find(filter).toArray()

    res.json({
      success: true,
      data: products,
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch products",
    })
  }
})

// UPDATED: Product creation route with your exact JSON structure
app.post("/api/products", requireAuth, async (req, res) => {
  try {
    const { product_name, product_description, price_range, product_image, webhookUrl } = req.body
    const session = verifySession(req)

    if (!product_name || !product_description) {
      return res.status(400).json({
        success: false,
        error: "Product name and description are required",
      })
    }

    const db = await getDatabase()
    const collection = db.collection("products")

    // Create your exact JSON structure
    const productData = {
      product_name,
      product_description,
      product_image: product_image || `https://cdn.example.com/products/${Date.now()}.jpg`,
      price_range: price_range || "",
      admin_profile: {
        name: "TechStore Electronics", // You can make this dynamic based on logged in admin
        email: session.email
      },
      created_at: new Date().toISOString(),
      status: "Active"
    }

    const result = await collection.insertOne(productData)

    // Return your exact JSON format with mongo_id
    const responseData = {
      mongo_id: result.insertedId.toString(),
      product_name: productData.product_name,
      product_description: productData.product_description,
      product_image: productData.product_image,
      price_range: productData.price_range,
      admin_profile: productData.admin_profile
    }

    // Send webhook if URL provided
    if (webhookUrl) {
      try {
        const fetch = require("node-fetch")
        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(responseData),
        })
        console.log("[v0] Webhook sent successfully to:", webhookUrl)
      } catch (webhookError) {
        console.error("Webhook error:", webhookError)
        // Don't fail the product creation if webhook fails
      }
    }

    res.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error("Error creating product:", error)
    res.status(500).json({
      success: false,
      error: "Failed to create product",
    })
  }
})

app.get("/api/products/stats", requireAuth, async (req, res) => {
  try {
    const db = await getDatabase()
    const collection = db.collection("products")

    const [total, active, inactive] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ status: "Active" }),
      collection.countDocuments({ status: "Inactive" }),
    ])

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive,
      },
    })
  } catch (error) {
    console.error("Error fetching product stats:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch product statistics",
    })
  }
})

// Static file serving (skip for API routes)
app.use(
  (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      console.log(`[v0] Skipping static files for API route: ${req.path}`)
      return next()
    }
    next()
  },
  express.static(path.join(__dirname)),
)

// HTML Routes (after static files)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})


// app.get("/dashboard.html", (req, res) => {
//   res.sendFile(path.join(__dirname, "dashboard.html"));
// });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err)
  res.status(500).json({
    success: false,
    error: "Internal server error",
  })
})

// 404 handler
app.use((req, res) => {
  console.log(`[v0] 404 - Route not found: ${req.method} ${req.path}`)
  console.log(`[v0] Request headers:`, req.headers)

  // Return JSON for API routes, HTML for others
  if (req.path.startsWith("/api/")) {
    console.log(`[v0] Returning JSON 404 for API route`)
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.path}`,
    })
  } else {
    console.log(`[v0] Returning HTML 404 for non-API route`)
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>404 - Page Not Found</title></head>
      <body>
        <h1>404 - Page Not Found</h1>
        <p>The page could not be found.</p>
      </body>
      </html>
    `)
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Serving static files from: ${__dirname}`)
  console.log(`Login at: http://localhost:${PORT}`)
  console.log(`Dashboard at: http://localhost:${PORT}/dashboard.html`)
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
  console.log("")
  console.log("Demo credentials:")
  console.log("Email: admin@business.com")
  console.log("Password: admin123")
  console.log("")
  console.log("API Endpoints:")
  console.log("POST /api/products - Create product with your JSON format")
  console.log("GET  /api/products - List all products")
  console.log("POST /api/auth/login - Admin login")
  console.log("GET  /api/auth/verify - Check auth status")
})