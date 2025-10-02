const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();
const { join } = require("path");

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
  next();
});

// -------------------------
// Business Routes
// -------------------------
app.use('/api/businesses', require('./api/businesses'));

// -------------------------
// Static Files and HTML
// -------------------------

app.get("/", (req, res) => {
  try {
    res.sendFile(join(__dirname, "public", "index.html"));
  } catch (error) {
    console.error("Error serving index.html:", error);
    res.status(500).send("Error loading page");
  }
});

app.get("/login", (req, res) => {
  res.redirect("/");
});

// Simple dashboard route - no trailing slash complications
app.get("/dashboard/", (req, res) => {
  try {
    res.sendFile(join(__dirname, "public", "dashboard.html"));
  } catch (error) {
    console.error("Error serving dashboard.html:", error);
    res.status(500).send("Error loading dashboard");
  }
});

// Static middleware
app.use(express.static(join(__dirname, "public")));

// -------------------------
// 404 and Error Handling
// -------------------------
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ success: false, error: `API route not found: ${req.path}` });
  } else {
    res.status(404).send("Page not found");
  }
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