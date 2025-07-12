class Conversation {
  constructor(data = {}) {
    this.id = data.id || '';
    this.userId = data.userId || '';
    this.message = data.message || '';
    this.timestamp = data.timestamp || new Date().toISOString();
    this.type = data.type || 'user'; // 'user' or 'assistant'
    this.data = data.data || null;
  }

  validate() {
    const errors = [];

    if (!this.message.trim()) {
      errors.push('Message is required');
    }

    if (!this.userId) {
      errors.push('User ID is required');
    }

    if (!['user', 'assistant'].includes(this.type)) {
      errors.push('Invalid conversation type');
    }

    return errors;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      message: this.message,
      timestamp: this.timestamp,
      type: this.type,
      data: this.data
    };
  }
}
export default Conversation;
