const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./environment');

class GeminiClient {
  constructor() {
    this.client = null;
    this.model = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return this.model;

    try {
      this.client = new GoogleGenerativeAI(config.gemini.apiKey);
      this.model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.initialized = true;
      console.log('✅ Gemini client initialized successfully');
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

module.exports = new GeminiClient();
