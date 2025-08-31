#!/bin/bash

echo "Starting Motorsport Agent Development Environment"
echo "=================================================="

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $PYTHON_PID $FRONTEND_PID $BACKEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start Python solver
cd solver
uvicorn solver:app --host 0.0.0.0 --port 5000 --reload &
PYTHON_PID=$!
cd ..

# Wait a moment for Python server to start
sleep 5

# Start Node.js backend
echo "📡 Starting Node.js backend server..."
cd server
npm install
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start React frontend
echo "🌐 Starting React frontend..."
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ All servers are starting up..."
echo "🐍 Python solver: http://localhost:5000"
echo "📡 Backend: http://localhost:8000"
echo "🌐 Frontend: http://localhost:3000"
echo "🔍 Health check: http://localhost:8000/health"
echo "🔍 Python health: http://localhost:5000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for all processes
wait
