const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function initMySQL() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = process.env.DB_PORT || 3306;

  console.log(`Connecting to MySQL on ${host}:${port} as ${user}...`);

  try {
    const connection = await mysql.createConnection({
      host,
      user,
      password,
      port,
      multipleStatements: true
    });

    console.log('Connected to MySQL successfully! Reading schema.sql...');

    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing database schema creation & seeding...');
    await connection.query(sql);

    console.log('====================================================');
    console.log('✅ MySQL Database `agriqueue_plus` created & seeded!');
    console.log('====================================================');

    await connection.end();
  } catch (err) {
    console.error('❌ Failed to initialize MySQL database:', err.message);
    console.log('\nTip: Please verify your MySQL password in backend/.env');
  }
}

if (require.main === module) {
  initMySQL();
}

module.exports = initMySQL;
