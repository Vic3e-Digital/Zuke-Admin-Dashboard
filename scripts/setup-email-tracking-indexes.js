/**
 * Setup MongoDB indexes for email tracking
 * Run this script once to create the necessary indexes for optimal performance
 * 
 * Usage: node scripts/setup-email-tracking-indexes.js
 */

require('dotenv').config();
const { connectToDatabase } = require('../lib/mongodb');

async function setupIndexes() {
  try {
    console.log('🔧 Connecting to database...');
    const { db } = await connectToDatabase();
    
    console.log('📊 Creating indexes for email_tracking collection...');
    const trackingCollection = db.collection('email_tracking');
    
    // Index for quick businessId lookup
    await trackingCollection.createIndex(
      { businessId: 1 },
      { unique: true, name: 'businessId_unique' }
    );
    console.log('✅ Created index: businessId_unique');
    
    // Index for last updated queries
    await trackingCollection.createIndex(
      { lastUpdated: -1 },
      { name: 'lastUpdated_desc' }
    );
    console.log('✅ Created index: lastUpdated_desc');

    console.log('\n📊 Creating indexes for email_history collection...');
    const historyCollection = db.collection('email_history');
    
    // Compound index for businessId + sentAt (most common query)
    await historyCollection.createIndex(
      { businessId: 1, sentAt: -1 },
      { name: 'businessId_sentAt' }
    );
    console.log('✅ Created index: businessId_sentAt');
    
    // Index for campaign lookup
    await historyCollection.createIndex(
      { campaignId: 1 },
      { name: 'campaignId' }
    );
    console.log('✅ Created index: campaignId');
    
    // Index for date-based queries
    await historyCollection.createIndex(
      { sentAt: -1 },
      { name: 'sentAt_desc' }
    );
    console.log('✅ Created index: sentAt_desc');

    // List all indexes
    console.log('\n📋 Current indexes:');
    console.log('\nemail_tracking:');
    const trackingIndexes = await trackingCollection.listIndexes().toArray();
    trackingIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    console.log('\nemail_history:');
    const historyIndexes = await historyCollection.listIndexes().toArray();
    historyIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    console.log('\n✅ All indexes created successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error setting up indexes:', error);
    process.exit(1);
  }
}

setupIndexes();
