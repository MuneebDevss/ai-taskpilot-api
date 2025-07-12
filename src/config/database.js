// src/config/database.js
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import config from './environment.js';
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
