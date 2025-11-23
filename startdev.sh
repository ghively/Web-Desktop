#!/bin/bash

# Web Desktop Development Starter
# Starts both backend and frontend in parallel

echo "🚀 Starting Web Desktop Development Environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "backend" ] && [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    jobs -p | xargs -r kill
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
echo "📦 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend dev server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Development servers started!"
echo "🔗 Backend:  http://localhost:3001"
echo "🔗 Frontend: http://localhost:5173"
echo ""
echo "💡 Press Ctrl+C to stop both servers"

# Wait for any background process to finish
wait