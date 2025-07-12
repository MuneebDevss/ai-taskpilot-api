
// src/config/database.js
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const config = require('./environment');

class Database {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return this.db;

    try {
      admin.initializeApp({
        credential: admin.credential.cert(config.firebase)
      });

      this.db = getFirestore();
      this.initialized = true;
      console.log('✅ Database initialized successfully');
      return this.db;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  getDatabase() {
    if (!this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }
}

module.exports = new Database();