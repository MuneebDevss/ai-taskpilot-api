import GeminiClient from '../config/gemini.js';
const geminiClient =  GeminiClient.getInstance();
class AIService {
  constructor() {
    this.improveTasksPrompt = `Improve these tasks by adding breaks and dividing the tasks durations
     into simplier tasks`;

    this.systemPrompt = `You are an intelligent task management assistant. Your job is to:

1. Parse natural language input to extract task details
2. Create structured task objects with proper scheduling
3. Handle follow-up questions and modifications
4. Resolve time conflicts
5. Suggest optimal scheduling
IMPORTANT Be comprehensive in your response if user asks you to create routine. 
Always return ALL relevant tasks mentioned by the user and break the tasks into durations. 
IMPORTANT: Always return tasks in this EXACT simplified format as an array:
[
  {
    "title": "task title here",
    "description": "task description here", 
    "category": "Work|Personal|Health|Education|Shopping|Travel|Entertainment",
    "startDate": "ISO 8601 date string",
    "duration": number_in_minutes,
    "recurrence": {
      "type": "None|Daily|Weekly|Monthly|Yearly",
      "interval": 1,
      "daysOfWeek": [],
      "endDate": null
    },
  }
]

Always respond in JSON format with:
- "action": "create_task" | "update_task" | "query" | "conflict_resolution"
- "taskData": array of task objects (using simplified structure above)
- "message": friendly response to user
- "suggestions": array of helpful suggestions
- "hasConflicts": boolean

Current date: ${new Date().toISOString()}

Parse dates intelligently:
- "Monday at 9 PM" = next Monday at 21:00
- "every Monday" = weekly recurrence
- "Daily" or "every day" = Daily recurrence
- "Monthly" or every month = Monthly recurrence
- "Yearly" or every year = Yearly recurrence

Categories: Personal, Work, Health, Education, Shopping, Travel, Entertainment
Priorities: Low, Medium, High, Urgent`;
  };

  async parseUserInput(userMessage, existingTasks = []) {
    try {
      const model = geminiClient.initialize();
      const taskContext = `\n\nExisting tasks for context follow they keys:\n${existingTasks.length > 0 ?
        JSON.stringify(existingTasks.slice(-4), null, 2) : ''}`;

      const chat = model.startChat({
        history: [],
        generationConfig: { temperature: 1,
          maxOutputTokens: 2048, // Increase output limit
          topP: 0.8,
          topK: 40
        }
      });

      const result = await chat.sendMessage(this.systemPrompt + taskContext + `\n\nUser: ${userMessage}`);

      let responseText = result.response.text().trim();

      // Clean up response format
      if (responseText.startsWith('```')) {
        responseText = responseText.replace(/```(?:json)?/, '').replace(/```$/, '').trim();
      }
      return JSON.parse(responseText);
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        action: 'error',
        message: 'I\'m having trouble processing your request. Could you try rephrasing it?',
        suggestions: ['Try being more specific about the task', 'Include date and time details']
      };
    }
  }
  async improveTasks(existingTasks = []) {
    try {
      const model = geminiClient.initialize();
      const chat = model.startChat({
        history: [],
        generationConfig: { temperature: 0.2,
          maxOutputTokens: 2048, // Increase output limit
          topP: 0.8,
          topK: 40
        }
      });
      const result = await chat.sendMessage(this.improveTasksPrompt + JSON.stringify(existingTasks) );
      let responseText = result.response.text().trim();

      // Clean up response format
      if (responseText.startsWith('```')) {
        const match = responseText.match(/```json\s*(\[\s*{[\s\S]*?}\s*])\s*```/);
        if (match && match[1]) {
          responseText = match[1].trim();
          return JSON.parse(responseText);
        } else {
          throw new Error('No valid JSON array found in response');
        }

      }
      return existingTasks;
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        action: 'error',
        message: 'I\'m having trouble processing your request. Could you try rephrasing it?',
        suggestions: ['Try being more specific about the task', 'Include date and time details']
      };
    }
  }
}
export default AIService;
