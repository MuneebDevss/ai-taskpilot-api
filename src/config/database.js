// src/config/database.js
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import config from './environment.js';
class Database {
  constructor() {
    if (Database._instance) {
      return Database._instance; // Return existing instance
    }

    this.db = null; // Initialize your DB connection here
    Database._instance = this;
  }
  static getInstance() {
    if (!Database._instance) {
      Database._instance = new Database();
    }
    return Database._instance;
  }
  async initialize() {
    if (this.initialized) return this.db;

    try {
      admin.initializeApp({
        credential: admin.credential.cert(config.firebase)
      });

      this.db = getFirestore();
      this.initialized = true;
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
export default Database;
