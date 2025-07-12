const ConversationRepository = require('../repositories/conversationRepository');
class ConversationService {
  constructor() {
    this.conversationRepository = new ConversationRepository();
  }

  async getConversationHistory(userId) {
    return await this.conversationRepository.findByUserId(userId);
  }

  async saveConversation(conversationData) {
    return await this.conversationRepository.create(conversationData);
  }
}

module.exports = ConversationService;