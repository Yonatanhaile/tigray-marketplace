// Quick test to verify environment variables are loaded
require('dotenv').config();

console.log('\n=== Environment Variables Test ===');
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('\n✅ If CLIENT_URL shows https://yohatrade.com, your referral links will be correct!');
console.log('❌ If CLIENT_URL is undefined or localhost, there\'s still an issue.\n');

