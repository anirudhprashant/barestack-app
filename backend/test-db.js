const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { initializeDatabase } = require('./db');

const testDbConnection = async () => {
  try {
    console.log('Testing database connection...');
    await initializeDatabase();
    console.log('Database connection and initialization successful.');
    process.exit(0);
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
};

testDbConnection();
