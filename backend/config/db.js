const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');

// Read full database
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`Database file not found at ${DB_PATH}`);
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database:', err);
    return {
      users: [],
      mspData: [],
      cropPriceMap: {},
      centers: [],
      timeSlots: [],
      bookings: [],
      complaints: [],
      agentQueue: [],
      stats: {}
    };
  }
}

// Write full database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing to database:', err);
    return false;
  }
}

// Helper to get a specific collection
function getCollection(collectionName) {
  const db = readDB();
  return db[collectionName] || [];
}

// Helper to save a specific collection
function saveCollection(collectionName, items) {
  const db = readDB();
  db[collectionName] = items;
  return writeDB(db);
}

module.exports = {
  readDB,
  writeDB,
  getCollection,
  saveCollection
};
