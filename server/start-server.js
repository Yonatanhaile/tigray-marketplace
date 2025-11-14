#!/usr/bin/env node

/**
 * Server Startup Script
 * This ensures .env is loaded before starting the server
 */

// Load environment variables FIRST
require('dotenv').config();

// Verify CLIENT_URL is loaded
console.log('\n🔧 Starting server with environment:');
console.log('   CLIENT_URL:', process.env.CLIENT_URL);
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   PORT:', process.env.PORT);
console.log('');

if (!process.env.CLIENT_URL) {
  console.error('❌ ERROR: CLIENT_URL is not set in .env file!');
  console.error('   Please add: CLIENT_URL=https://yohatrade.com');
  process.exit(1);
}

if (process.env.CLIENT_URL.includes('localhost')) {
  console.warn('⚠️  WARNING: CLIENT_URL contains "localhost"');
  console.warn('   Referral links will only work locally, not for internet users!');
  console.warn('   Change to: CLIENT_URL=https://yohatrade.com');
  console.warn('');
}

console.log('✅ Environment loaded successfully!');
console.log('   Referral links will use:', process.env.CLIENT_URL);
console.log('');

// Start the actual server
require('./src/server');

