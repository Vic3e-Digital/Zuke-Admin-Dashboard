const { MongoClient } = require('mongodb');

const options = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

let client;
let clientPromise;

function getClientPromise() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Please add your MongoDB URI to .env file');
  }

  if (clientPromise) {
    return clientPromise;
  }

  const uri = process.env.MONGODB_URI;

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global;

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

async function getDatabase() {
  const clientPromise = getClientPromise();
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME || 'business_directory');
}

function getMongoClientPromise() {
  return getClientPromise();
}

module.exports = {
  getDatabase,
  getMongoClientPromise
};
