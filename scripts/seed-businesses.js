const { MongoClient } = require("mongodb")

// Sample business data to seed the database
const sampleBusinesses = [
  {
    name: "TechCorp Solutions",
    industry: "Technology",
    location: "San Francisco, CA",
    phone: "+1 (555) 123-4567",
    email: "contact@techcorp.com",
    website: "www.techcorp.com",
    employees: 150,
    revenue: "$2.5M",
    status: "Active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Green Energy Co",
    industry: "Renewable Energy",
    location: "Austin, TX",
    phone: "+1 (555) 987-6543",
    email: "info@greenenergy.com",
    website: "www.greenenergy.com",
    employees: 75,
    revenue: "$1.8M",
    status: "Active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Urban Cafe Chain",
    industry: "Food & Beverage",
    location: "New York, NY",
    phone: "+1 (555) 456-7890",
    email: "hello@urbancafe.com",
    website: "www.urbancafe.com",
    employees: 200,
    revenue: "$3.2M",
    status: "Pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Digital Marketing Pro",
    industry: "Marketing",
    location: "Los Angeles, CA",
    phone: "+1 (555) 321-0987",
    email: "team@digitalmarketing.com",
    website: "www.digitalmarketing.com",
    employees: 45,
    revenue: "$950K",
    status: "Active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Healthcare Innovations",
    industry: "Healthcare",
    location: "Boston, MA",
    phone: "+1 (555) 654-3210",
    email: "info@healthcareinnovations.com",
    website: "www.healthcareinnovations.com",
    employees: 120,
    revenue: "$4.1M",
    status: "Active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Financial Advisors LLC",
    industry: "Finance",
    location: "Chicago, IL",
    phone: "+1 (555) 789-0123",
    email: "contact@financialadvisors.com",
    website: "www.financialadvisors.com",
    employees: 85,
    revenue: "$2.8M",
    status: "Active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Creative Design Studio",
    industry: "Design",
    location: "Portland, OR",
    phone: "+1 (555) 234-5678",
    email: "hello@creativedesign.com",
    website: "www.creativedesign.com",
    employees: 30,
    revenue: "$750K",
    status: "Pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Manufacturing Solutions",
    industry: "Manufacturing",
    location: "Detroit, MI",
    phone: "+1 (555) 345-6789",
    email: "info@manufacturingsolutions.com",
    website: "www.manufacturingsolutions.com",
    employees: 300,
    revenue: "$8.5M",
    status: "Active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

async function seedDatabase() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    console.error("Please set MONGODB_URI environment variable")
    process.exit(1)
  }

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db("business_directory")
    const collection = db.collection("businesses")

    // Clear existing data
    await collection.deleteMany({})
    console.log("Cleared existing businesses")

    // Insert sample data
    const result = await collection.insertMany(sampleBusinesses)
    console.log(`Inserted ${result.insertedCount} businesses`)

    // Create indexes for better search performance
    await collection.createIndex({ name: "text", industry: "text", location: "text" })
    await collection.createIndex({ status: 1 })
    await collection.createIndex({ industry: 1 })
    console.log("Created search indexes")
  } catch (error) {
    console.error("Error seeding database:", error)
  } finally {
    await client.close()
    console.log("Database connection closed")
  }
}

seedDatabase()
