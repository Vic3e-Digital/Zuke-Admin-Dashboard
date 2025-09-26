const { MongoClient } = require('mongodb');

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env file');
}

const uri = process.env.MONGODB_URI;
const options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

async function connectToDatabase() {
  try {
    const client = await clientPromise;
    // Specifically connect to zukeDatabase
    const db = client.db('zukeDatabase'); // Explicitly specify the database
    return { db, client };
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

// Also export getDatabase for compatibility with your server.js
async function getDatabase() {
  const { db } = await connectToDatabase();
  return db;
}

module.exports = { connectToDatabase, getDatabase };