const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'agriqueue_plus',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

async function query(sql, params) {
  try {
    const p = getPool();
    const [results] = await p.execute(sql, params);
    return results;
  } catch (err) {
    console.error('MySQL Query Error:', err.message);
    throw err;
  }
}

module.exports = {
  getPool,
  query
};
