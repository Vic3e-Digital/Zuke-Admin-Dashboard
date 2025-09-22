require("dotenv").config()
const { MongoClient } = require("mongodb")

// Create admin user for the system
const adminUser = {
  name: "System Administrator",
  email: "admin@zuke.co.za",
  password: "admin123", // In production, this should be hashed
  role: "admin",
  status: "Active",
  createdAt: new Date(),
  updatedAt: new Date(),
}

async function seedUsers() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    console.error("Please set MONGODB_URI environment variable")
    process.exit(1)
  }

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db(process.env.MONGODB_DB_NAME || "zuke-cluster-00")
    const collection = db.collection("users")

    // Check if admin user already exists
    const existingAdmin = await collection.findOne({ email: adminUser.email })

    if (!existingAdmin) {
      // Insert admin user
      const result = await collection.insertOne(adminUser)
      console.log(`Created admin user with ID: ${result.insertedId}`)
    } else {
      console.log("Admin user already exists")
    }

    // Create indexes for better performance
    await collection.createIndex({ email: 1 }, { unique: true })
    await collection.createIndex({ role: 1 })
    console.log("Created user indexes")
  } catch (error) {
    console.error("Error seeding users:", error)
  } finally {
    await client.close()
    console.log("Database connection closed")
  }
}

seedUsers()
