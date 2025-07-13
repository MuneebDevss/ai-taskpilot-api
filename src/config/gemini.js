import { GoogleGenerativeAI } from '@google/generative-ai';
import config from './environment.js';
class GeminiClient {
  constructor() {
    this.client = null;
    this.model = null;
    this.initialized = false;
    if (!GeminiClient._instance) {
      return GeminiClient._instance; // Return existing instance
    }
    GeminiClient._instance = this;
  }
  static getInstance() {
    if (!GeminiClient._instance) {
      GeminiClient._instance = new GeminiClient();
    }
    return GeminiClient._instance;
  }
  initialize() {
    if (this.initialized) return this.model;

    try {
      this.client = new GoogleGenerativeAI(config.gemini.apiKey);
      this.model = this.client.getGenerativeModel({ model: 'gemini-1.5-pro' });
      this.initialized = true;
      return this.model;
    } catch (error) {
      console.error('❌ Gemini initialization failed:', error);
      throw error;
    }
  }

  getModel() {
    if (!this.initialized) {
      throw new Error('Gemini client not initialized. Call initialize() first.');
    }
    return this.model;
  }
}
export default GeminiClient;
