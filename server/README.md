# Agent Backend

A Node.js Express server that acts as a bridge between your React frontend and Python agent.

## Features

- 🚀 Express.js server with CORS support
- 🔄 API endpoint for agent communication
- ⏱️ Request timeout handling
- 🛡️ Error handling and validation
- 📊 Health check endpoint
- 🔧 Environment-based configuration

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your settings:

```env
PORT=8000
PYTHON_AGENT_URL=http://localhost:5000
```

### 3. Start the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## API Endpoints

### POST `/api/agent`

Send prompts to your Python agent.

**Request:**
```json
{
  "prompt": "Your prompt here"
}
```

**Response:**
```json
{
  "response": "Agent response",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### GET `/health`

Check if the server is running.

**Response:**
```json
{
  "status": "OK",
  "message": "Agent backend is running"
}
```

## Architecture

```
React Frontend → Node.js Backend → Python Agent
     (3000)         (8000)         (5000)
```

## Configuration

- **PORT**: Backend server port (default: 8000)
- **PYTHON_AGENT_URL**: URL of your Python agent (default: http://localhost:5000)

## Error Handling

The backend handles various error scenarios:

- **400**: Missing or invalid prompt
- **408**: Request timeout (30 seconds)
- **503**: Python agent unavailable
- **500**: Internal server error

## Development

- Uses `nodemon` for auto-restart during development
- CORS enabled for frontend communication
- Request timeout set to 30 seconds
- Comprehensive error logging
