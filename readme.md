# AI Task Manager

A powerful AI-powered task management API built with Node.js, Express, Firebase, and Google's Gemini AI.

## Features

- 🤖 Natural language task creation and management
- 📅 Intelligent scheduling and conflict resolution
- 🔄 Recurring task support
- 💬 Conversational AI interface
- 🔐 Secure authentication and authorization
- 📊 Real-time task synchronization
- ⏳ Time optimization based on user availability
- 🌐 RESTful API design
- 🚀 Production-ready architecture
- 🔗 Ready for integration with mobile/web frontends

## 🛠 Tech Stack
- Node.js
- Express
- Docker
- GitHub Actions (CI/CD)
- ESLint + Jest (Linting & Testing)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-task-manager.git
   cd ai-task-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Visit** `http://localhost:3000/health` to verify the API is running

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get specific task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Chat
- `POST /api/chat` - Process natural language commands
- `POST /api/chat/resolve-conflict` - Resolve scheduling conflicts

### Conversations
- `GET /api/conversations` - Get chat history

## Architecture

This project follows a clean architecture pattern with the following layers:

- **Presentation Layer**: Routes and Controllers
- **Business Logic Layer**: Services and Models
- **Data Access Layer**: Repositories
- **External Services**: AI and Database integrations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## About the Author

This project was built with ❤️ by Muneeb Ur Rehman. I'm passionate about building tools that solve real problems.

If you use this code, please consider giving credit or a shoutout!

## License

This project is licensed under the [MIT License](./LICENSE).
