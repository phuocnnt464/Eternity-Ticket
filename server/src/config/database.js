// config/database.js
const path = require('path');

// Load .env from the server root directory
require('dotenv').config({ 
  path: path.resolve(__dirname, '../../.env') 
});

const { Pool } = require('pg');

// Debug environment variables
console.log('🔍 Loading environment variables...');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');

// Fallback to default values if env vars not loaded
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'eternity_ticket',
  user: process.env.DB_USER || 'eternity_user',
  password: process.env.DB_PASSWORD,  // This will cause the error if empty
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Connection pool settings
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT) || 2000,
};

// Validate critical config
if (!dbConfig.password) {
  console.error('ERROR: DB_PASSWORD is not set in environment variables!');
  console.error('Please check your .env file in the server/ directory');
  process.exit(1);
}

console.log('Database config loaded (password hidden):');
console.log({
  ...dbConfig,
  password: '[HIDDEN]'
});

const pool = new Pool(dbConfig);

// Connection event handlers
pool.on('connect', (client) => {
  console.log('New client connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Gracefully shutting down database connections...');
  await pool.end();
  process.exit(0);
});

module.exports = pool;