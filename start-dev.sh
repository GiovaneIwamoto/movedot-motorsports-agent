#!/bin/bash

echo "🚀 Starting Motorsport Agent Development Environment"
echo "=================================================="

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

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

echo "✅ Both servers are starting up..."
echo "📡 Backend: http://localhost:8000"
echo "🌐 Frontend: http://localhost:3000"
echo "🔍 Health check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait
