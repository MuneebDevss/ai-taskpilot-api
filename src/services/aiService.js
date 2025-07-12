const geminiClient = require('../config/gemini');
class AIService {
  constructor() {
    this.systemPrompt = `You are an intelligent task management assistant. Your job is to:

1. Parse natural language input to extract task details
2. Create structured task objects with proper scheduling
3. Handle follow-up questions and modifications
4. Resolve time conflicts
5. Suggest optimal scheduling

Always respond in JSON format with:
- "action": "create_task" | "update_task" | "query" | "conflict_resolution"
- "task_data": task object (if creating/updating)
- "message": friendly response to user
- "suggestions": array of helpful suggestions
- "conflicts": array of conflicting tasks (if any)

Current date: ${new Date().toISOString()}

Parse dates intelligently:
- "Monday at 9 PM" = next Monday at 21:00
- "every Monday" = weekly recurrence
- "Daily" or "every day" = Daily
- "Monthly" or every month= "Monthly"
- "Yearly" or every year= "Yearly"

Categories: Personal, Work, Health, Education, Shopping, Travel, Entertainment
Priorities: Low, Medium, High, Urgent`;
  }

  async parseUserInput(userMessage, existingTasks = []) {
    try {
      const model = geminiClient.getModel();
      
      const taskContext = existingTasks.length > 0
        ? `\n\nExisting tasks for context:\n${JSON.stringify(existingTasks.slice(-5), null, 2)}`
        : '';

      const chat = model.startChat({
        history: [],
        generationConfig: { temperature: 0.7 },
      });

      const result = await chat.sendMessage(this.systemPrompt + taskContext + `\n\nUser: ${userMessage}`);
      
      let responseText = result.response.text().trim();

      // Clean up response format
      if (responseText.startsWith("```")) {
        responseText = responseText.replace(/```(?:json)?/, '').replace(/```$/, '').trim();
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        action: "error",
        message: "I'm having trouble processing your request. Could you try rephrasing it?",
        suggestions: ["Try being more specific about the task", "Include date and time details"]
      };
    }
  }
}

module.exports = AIService;
