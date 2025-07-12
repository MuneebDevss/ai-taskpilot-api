import database from '../config/database.js';
import Conversation from '../models/Conversation.js';
export class ConversationRepository {
  constructor() {
    this.collectionName = 'conversations';
  }

  async findByUserId(userId) {
    try {
      const db = database.getDatabase();
      const conversationsRef = db.collection('users').doc(userId).collection(this.collectionName);
      const snapshot = await conversationsRef.orderBy('timestamp', 'desc').limit(50).get();

      const conversations = [];
      snapshot.forEach(doc => {
        conversations.push(new Conversation({ id: doc.id, ...doc.data() }));
      });

      return conversations.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  async create(conversationData) {
    try {
      const db = database.getDatabase();
      const conversation = new Conversation(conversationData);

      const validationErrors = conversation.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      const conversationsRef = db.collection('users').doc(conversation.userId).collection(this.collectionName);
      const docRef = await conversationsRef.add(conversation.toJSON());

      conversation.id = docRef.id;
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }
}
export default ConversationRepository;
