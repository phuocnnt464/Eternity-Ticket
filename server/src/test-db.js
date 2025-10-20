// // src/test-db.js
// test-db.js
console.log('🚀 Starting database connection test...');

// Import database pool (this will load .env automatically)
const pool = require('./config/database');

async function testConnection() {
  let client;
  
  try {
    console.log('\n🔄 Attempting to connect to database...');
    
    // Get client from pool
    client = await pool.connect();
    console.log('✅ Database connection established!');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Current database time:', result.rows[0].current_time);
    
    // Test users table
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log('👥 Users in database:', userCount.rows[0].count);
    
    // Test database version
    const version = await client.query('SELECT version()');
    console.log('🐘 PostgreSQL version:', version.rows[0].version.split(',')[0]);
    
    console.log('\n🎉 All database tests passed successfully!');
    
  } catch (err) {
    console.error('\n❌ Database connection failed:');
    console.error('Error:', err.message);
    
    // Provide specific troubleshooting
    if (err.message.includes('password must be a string')) {
      console.error('\n🔧 SOLUTION: Check your .env file');
      console.error('1. Ensure .env file exists in server/ directory');
      console.error('2. Make sure DB_PASSWORD is set with a valid value');
      console.error('3. No spaces around the = sign in .env');
    }
    
    if (err.message.includes('does not exist')) {
      console.error('\n🔧 SOLUTION: Create database/user');
      console.error('1. Run: createdb -U postgres eternity_ticket');
      console.error('2. Create user with proper password');
    }
    
    if (err.message.includes('authentication failed')) {
      console.error('\n🔧 SOLUTION: Check credentials');
      console.error('1. Verify username and password');
      console.error('2. Test manual connection: psql -U eternity_user -d eternity_ticket -h localhost');
    }
    
  } finally {
    // Always release client back to pool
    if (client) {
      client.release();
      console.log('🔌 Database client released');
    }
    
    // Close pool
    await pool.end();
    console.log('🏁 Database pool closed');
  }
}

// Run the test
testConnection().catch(console.error);