#!/bin/bash

# Start the backend server
echo "Starting backend server..."
cd backend
python3 run.py &
BACKEND_PID=$!

# Start the frontend server (using Python's built-in HTTP server)
echo "Starting frontend server..."
cd ../frontend
python3 -m http.server 5500 &
FRONTEND_PID=$!

echo "Universal Token Launcher is running!"
echo "Backend API: http://localhost:8000"
echo "Frontend: http://localhost:5500"
echo "Press Ctrl+C to stop both servers"

# Handle termination
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait 