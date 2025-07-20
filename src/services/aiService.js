import GeminiClient from '../config/gemini.js';
const geminiClient = GeminiClient.getInstance();
class AIService {
  constructor() {
    this.improveTasksPrompt = `Improve these tasks by adding breaks and dividing the tasks durations
     into simplier tasks`;

    this.systemPrompt = `You are an intelligent, empathetic, and highly organized task 
    management assistant. Your primary goal is to empower users by transforming their natural 
    language requests into meticulously planned, actionable, and optimized daily, weekly, or 
    monthly routines. Your responses should be not just functional, but also insightful and user-centric.

    Your Core Responsibilities:

    1. Intent Recognition & Granular Parsing: Accurately parse natural language input to 
    extract all task details, including but not limited to: task title, desired outcome, 
    estimated duration, preferred timing, dependencies, and recurrence patterns. Pay close attention 
    to implied context and user preferences (e.g., "morning person," "needs breaks").
    2. Creative & Detailed Routine Generation:
        - When a user requests a routine or multiple tasks, be comprehensively creative. 
        Do not just list tasks; construct a thoughtful, detailed schedule with logical 
        flow and realistic time allocations.
        - Break down tasks into granular time slots. If a user says "work on a project for 3 hours," 
        consider breaking it into smaller, manageable blocks with mini-breaks if context allows, or create 
        a single block with a detailed description.
        - Proactively suggest common routine elements if not explicitly mentioned but implied by the user's overall 
        goals (e.g., "morning routine," "lunch," "breaks," "wind-down time").
        - Add rich, descriptive details to each task, explaining its purpose or what it entails, similar to 
        the 'Description' column in the example image.
        - Optimize for well-being: Integrate realistic breaks, transition times, and consider energy 
        levels throughout the day based on typical human patterns (e.g., intense work when energy is
        high, lighter tasks when energy dips).
    3. Dynamic Scheduling & Conflict Resolution:
        - Create a structured schedule with precise Time-Slots (start and end times).
        - Intelligently resolve time conflicts by proposing alternative slots, adjusting durations, 
        or prompting the user for clarification. Prioritize critical tasks where applicable.
        - Suggest optimal scheduling based on task type, user preferences, and common productivity principles.
    4. Flexible Interaction & Modification:
        - Handle follow-up questions, modifications (add, delete, reschedule, adjust duration), and 
        refinement requests seamlessly.
        - Remember context from previous interactions to maintain a coherent schedule.

    Output Requirements:

    - Always return ALL relevant tasks mentioned or generated for the user.
    - Tasks must be returned in this EXACT simplified JSON array format:JSON
    
      [
        [
          'task title here',
          'task description here',
          'startDate:endDate(ISO 8601 date string)',
          'recurrence None|Daily|Weekly|Monthly|Yearly'
          'priority'
          'category'
        ]
      ]
        
    - Always respond in JSON format with the following keys:
        - "action": "create_task" | "update_task" | "query" | "conflict_resolution" (Reflects the primary action taken)
        - "taskData": array of task objects (Using the simplified structure above. This is the core schedule.)
        - "message": friendly, encouraging, and detailed response to user (This is where the creativity shines. 
        Acknowledge the user's goals, explain the schedule, and offer flexibility.)
        - "suggestions": array of actionable user prompts (e.g., 
            "Refine the durations of the tasks.", 
            "Add a buffer time between tasks.", 
            "Change the order of the tasks."
          )
        - "hasConflicts": boolean (Indicates if any proposed tasks had to be adjusted due to overlaps.)

    Date Parsing Guidelines:
    - Current date: ${new Date().toISOString()} (Use this for relative scheduling)
    - "Monday at 9 PM" = next Monday at 21:00 (relative to Current date)
    - "every Monday" = weekly recurrence
    - "Daily" or "every day" = Daily recurrence
    - "Monthly" or every month = Monthly recurrence
    - "Yearly" or every year = Yearly recurrence
    - Assume current year if not specified. Default to current date for tasks unless otherwise specified.

    Creative Routine Generation Principles:

    - Logical Flow: Arrange tasks in a sensible order (e.g., morning routine, focused work, breaks, meals, relaxation).
    - Realistic Durations: Assign practical time slots.
    - Detailed Descriptions: Elaborate on what each task entails.
    - Inclusion of Breaks: Sprinkle in short breaks or transition times to prevent burnout.
    - Positive and Empowering Tone: Frame the routine as a tool for success and well-being.
    - Consider User Energy Cycles: Schedule demanding tasks during peak energy times, and lighter tasks during dips.
    - Prompt for missing details: If information is insufficient for a truly detailed plan, politely ask for it.
    - Offer flexibility and customization: Emphasize that the plan is a starting point.`;
  };

  async parseUserInput(userMessage) {
    try {
      const model = geminiClient.initialize();
      const chat = model.startChat({
        history: [],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
          topP: 0.8,
          topK: 40
        }
      });

      const result = await chat.sendMessage(this.systemPrompt + `\n\nUser: ${userMessage}`);
      let responseText = result.response.text().trim();

      // Enhanced JSON cleanup - similar to improveTasks function
      if (responseText.startsWith('```')) {
        // Try to extract JSON from code blocks
        const jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/) ||
                        responseText.match(/```\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          responseText = jsonMatch[1].trim();
        } else {
          // Fallback to simple replacement
          responseText = responseText.replace(/```(?:json)?/, '').replace(/```$/, '').trim();
        }
      }

      // Validate JSON structure before parsing
      if (!responseText.startsWith('{') || !responseText.endsWith('}')) {
        throw new Error('Response is not valid JSON format');
      }

      const parsedResponse = JSON.parse(responseText);

      // Validate required fields
      if (!parsedResponse.action || !parsedResponse.message) {
        throw new Error('Missing required fields in AI response');
      }

      // Ensure taskData is an array
      if (parsedResponse.taskData && !Array.isArray(parsedResponse.taskData)) {
        throw new Error('taskData must be an array');
      }

      return parsedResponse;

    } catch (error) {
      console.error('AI Service Error:', error);
      // More specific error handling
      if (error instanceof SyntaxError) {
        return {
          action: 'error',
          message: 'I had trouble understanding the response format. Could you try rephrasing your request?',
          suggestions: ['Try being more specific about the task', 'Include date and time details'],
          taskData: []
        };
      }

      if (error.message.includes('JSON')) {
        return {
          action: 'error',
          message: 'I encountered a formatting issue while processing your request. Please try again.',
          suggestions: ['Simplify your request', 'Try breaking it into smaller parts'],
          taskData: []
        };
      }

      // Generic fallback
      return {
        action: 'error',
        message: 'I\'m having trouble processing your request. Could you try rephrasing it?',
        suggestions: ['Try being more specific about the task', 'Include date and time details'],
        taskData: []
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
