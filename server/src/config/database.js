const path = require('path');

require('dotenv').config({ 
  path: path.resolve(__dirname, '../../.env') 
});

const { Pool } = require('pg');

// console.log('🔍 Loading environment variables...');
// console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
// console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');
// console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
// console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
// console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'eternity_ticket',
  user: process.env.DB_USER || 'eternity_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  min: parseInt(process.env.DB_POOL_MIN) || (process.env.NODE_ENV === 'production' ? 10 : 2),
  max: parseInt(process.env.DB_POOL_MAX) || (process.env.NODE_ENV === 'production' ? 50 : 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT) || 2000,

  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 10000, // 10s
  
  log: (msg) => {
    if (process.env.DB_POOL_DEBUG === 'true') {
      console.log('🔵 DB Pool:', msg);
    }
  }
};

if (!dbConfig.password) {
  console.error('ERROR: DB_PASSWORD is not set in environment variables!');
  // console.error('Please check your .env file in the server/ directory');
  process.exit(1);
}

console.log('Database config loaded (password hidden):');
console.log({
  ...dbConfig,
  password: '[HIDDEN]',
  pool: {
    min: dbConfig.min,
    max: dbConfig.max,
    idleTimeout: dbConfig.idleTimeoutMillis + 'ms',
    connectionTimeout: dbConfig.connectionTimeoutMillis + 'ms'
  }
});

const pool = new Pool(dbConfig);

pool.on('connect', (client) => {
  const total = pool.totalCount;
  const idle = pool.idleCount;
  const waiting = pool.waitingCount;
  // console.log(`Client connected | Total: ${total} | Idle: ${idle} | Waiting: ${waiting}`);
  console.log('New client connected to PostgreSQL');
});

pool.on('acquire', (client) => {
  if (process.env.DB_POOL_DEBUG === 'true') {
    console.log('Client acquired from pool');
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
  if (process.env.NODE_ENV === 'production') {
  }
});

pool.getHealthStats = function() {
  return {
    totalCount: this.totalCount,
    idleCount: this.idleCount,
    waitingCount: this.waitingCount,
    maxPoolSize: dbConfig.max,
    utilizationPercent: Math.round((this.totalCount / dbConfig.max) * 100)
  };
};

process.on('SIGINT', async () => {
  console.log('Gracefully shutting down database connections...');
  await pool.end();
  process.exit(0);
});

module.exports = pool;