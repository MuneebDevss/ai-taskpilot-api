import GeminiClient from '../config/gemini.js';
import logger from '../utils/logger.js';
const geminiClient = GeminiClient.getInstance();

// Updated AIService class with new methods
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
        - "taskData": array of subtask arrays (Each array contains subtasks for one task, in order of current tasks.)
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

    ;
  }

  async parseUserInput(userMessage, existingTasks = []) {
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

      const contextMessage = existingTasks.length > 0
        ? `\n\nExisting tasks context: ${JSON.stringify(existingTasks)}\n\nUser: ${userMessage}`
        : `\n\nUser: ${userMessage}`;
      logger.info(userMessage);
      const result = await chat.sendMessage(this.systemPrompt + contextMessage);
      let responseText = result.response.text().trim();
      // logger.log(responseText);
      // Enhanced JSON cleanup
      if (responseText.startsWith('```')) {
        const jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/) ||
                        responseText.match(/```\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          responseText = jsonMatch[1].trim();
        } else {
          responseText = responseText.replace(/```(?:json)?/, '').replace(/```$/, '').trim();
        }
      }

      // Validate JSON structure before parsing
      if (!responseText.startsWith('{') || !responseText.endsWith('}')) {
        throw new Error('Response is not valid JSON format');
      }

      const parsedResponse = JSON.parse(responseText);
      // Validate required fields
      if (!parsedResponse.message) {
        throw new Error('Missing required fields in AI response');
      }

      // Validate taskData if present
      if (parsedResponse.taskData && !Array.isArray(parsedResponse.taskData)) {
        throw new Error('taskData must be an array');
      }

      return parsedResponse;

    } catch (error) {
      console.error('AI Service Error:', error);
      return this.handleError(error);
    }
  }

  async improveTasks(existingTasks = []) {
    try {
      const model = geminiClient.initialize();
      const chat = model.startChat({
        history: [],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          topP: 0.8,
          topK: 40
        }
      });

      const result = await chat.sendMessage(this.improveTasksPrompt + JSON.stringify(existingTasks));
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
      return this.handleError(error);
    }
  }
  //function to plan today's tasks based on past 3 days tasks and current tasks
  //
  async planToday(existingTasks = {}, userId, currentTasks = []) {
    try {
      // Build a detailed prompt for Gemini
      const planningPrompt = `
  You are an intelligent task planning assistant. Your job is to analyze past tasks and plan today's work intelligently.

  **EXISTING TASKS FROM PAST 3 DAYS:**
  ${JSON.stringify(existingTasks, null, 2)}

  **TODAY'S CURRENT TASKS (to be enriched with subtasks):**
  ${JSON.stringify(currentTasks, null, 2)}

  **INSTRUCTIONS:**
  1. **Analyze Past Tasks**: For each task in existingTasks (days 1, 2, 3), 
  examine their subtasks and completion status.

  2. **Match with Current Tasks**: Find corresponding tasks in currentTasks based on title similarity 
  or contextual relevance.

  3. **Apply Smart Logic**:
     - For each current task, generate appropriate subtasks based on past task analysis
     - If **some subtasks completed, some pending**: Keep pending subtasks as-is, 
     replace completed ones with new contextually relevant subtasks of similar effort level
     - If **all subtasks pending**: Carry them forward without adding new ones
     - If **all subtasks completed**: Generate entirely new subtasks maintaining similar structure and context
     - If **no matching past task**: Create new appropriate subtasks for the current task
     - **IMPORTANT**: Return subtasks in the same order as currentTasks (first subtask array = first current task)

  4. **Consider Time Constraints**: Use the FromDate and ToDate in currentTasks to ensure realistic scheduling.

  5. **Maintain Quality**:
     - New subtasks should match the effort level of replaced ones
     - Maintain contextual flow and logical progression
     - Avoid overloading the user
     - Encourage progress without skipping unfinished work
     - Write extensive, detailed descriptions for each subtask title to provide clear guidance

  **REQUIRED OUTPUT FORMAT:**
  Return a JSON object with this exact structure:
  {
    "action": "success",
    "message": "Today's tasks have been planned successfully based on past 3 days analysis",
    "taskData": [
      [
        {
          "title": "Subtask title",
          "duration": 5 // duration in minutes as a number, e.g., 5 or 10
        }
      ]
    ]
  }

  **CRITICAL**: 
  - taskData should be an array of subtask arrays
  - Each subtask array corresponds to the subtasks for one current task (in the same order)
  - First subtask array = subtasks for first current task
  - Second subtask array = subtasks for second current task, etc.
  - Each subtask should contain the "title" (string) and "duration" (number, minutes) fields
  - Example: { "title": "Do research on topic", "duration": 5 } or { "title": "Write summary", "duration": 10 }

  **IMPORTANT**: 
  - Subtasks should only contain the "title" and "duration" fields (no status, description, or other metadata)
  - Focus on writing extensive, detailed descriptions for each subtask title
  - Preserve the FromDate and ToDate from currentTasks
  - Ensure contextual relevance between old and new subtasks
  - Return ONLY valid JSON, no additional text or formatting
  `;
      const model = geminiClient.initialize();
      const chat = model.startChat({
        history: [],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3072,
          topP: 0.8,
          topK: 40
        }
      });
      const result = await chat.sendMessage(this.systemPrompt + '\n\n' + planningPrompt);
      let responseText = result.response.text().trim();
      // Clean up response format
      if (responseText.startsWith('```')) {
        const jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/) ||
                          responseText.match(/```\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          responseText = jsonMatch[1].trim();
        } else {
          responseText = responseText.replace(/```(?:json)?/, '').replace(/```$/, '').trim();
        }
      }
      // Additional cleanup for any remaining markdown or extra text
      responseText = responseText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');

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
      // Validate that taskData is an array of subtask arrays
      if (parsedResponse.taskData) {
        if (!Array.isArray(parsedResponse.taskData)) {
          throw new Error('taskData must be an array');
        }

        for (const subtaskArray of parsedResponse.taskData) {
          if (!Array.isArray(subtaskArray)) {
            throw new Error('Each element in taskData must be an array of subtasks');
          }

          // Validate subtasks structure
          for (const subTask of subtaskArray) {
            if (
              !subTask.title ||
              typeof subTask.duration !== 'number' ||
              isNaN(subTask.duration) ||
              subTask.duration <= 0
            ) {
              throw new Error('Invalid subtask structure - missing title or duration (duration must be a positive number in minutes)');
            }
          }
        }
      }

      return parsedResponse;
    } catch (error) {
      console.error('Plan Today Error:', error);
      return this.handleError(error);
    }
  }

  // Helper method for consistent error handling
  handleError(error) {
    if (error instanceof SyntaxError) {
      return {
        action: 'error',
        statusCode: 422,
        message: 'I had trouble understanding the response format. Could you try rephrasing your request?',
        suggestions: ['Try being more specific about the task', 'Include date and time details'],
        taskData: [],
        hasConflicts: false
      };
    }

    if (error.message.includes('JSON')) {
      return {
        action: 'error',
        statusCode: 422,
        message: 'I encountered a formatting issue while processing your request. Please try again.',
        suggestions: ['Simplify your request', 'Try breaking it into smaller parts'],
        taskData: [],
        hasConflicts: false
      };
    }

    if (error.message.includes('Missing required fields') || error.message.includes('Invalid')) {
      return {
        action: 'error',
        statusCode: 422,
        message: 'The AI response format was invalid. Please try again.',
        suggestions: ['Try rephrasing your request', 'Be more specific about your requirements'],
        taskData: [],
        hasConflicts: false
      };
    }

    // Handle Gemini API specific errors
    if (error.message.includes('API_KEY') || error.message.includes('authentication')) {
      return {
        action: 'error',
        statusCode: 503,
        message: 'AI service is temporarily unavailable. Please try again later.',
        suggestions: ['Try again in a few minutes', 'Contact support if the issue persists'],
        taskData: [],
        hasConflicts: false
      };
    }

    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return {
        action: 'error',
        statusCode: 429,
        message: 'AI service is currently busy. Please try again in a moment.',
        suggestions: ['Wait a few seconds and try again', 'Simplify your request'],
        taskData: [],
        hasConflicts: false
      };
    }

    if (error.message.includes('timeout') || error.message.includes('network') || error.code === 'ECONNRESET') {
      return {
        action: 'error',
        statusCode: 503,
        message: 'AI service is temporarily unavailable due to network issues. Please try again.',
        suggestions: ['Check your internet connection', 'Try again in a few moments'],
        taskData: [],
        hasConflicts: false
      };
    }

    return {
      action: 'error',
      statusCode: 500,
      message: 'I\'m having trouble processing your request. Could you try rephrasing it?',
      suggestions: ['Try being more specific about the task', 'Include date and time details'],
      taskData: [],
      hasConflicts: false
    };
  }
}
export default AIService;
