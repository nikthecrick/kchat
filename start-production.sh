#!/bin/bash

# Production startup script for Passk Chat Application
# This script starts the app in production mode with proper process management

echo "🚀 Starting Passk Chat Application in Production Mode..."

# Set production environment
export NODE_ENV=production
export PORT=3000

# Ensure we're using the right database
export DATABASE_URL="file:/home/z/my-project/db/custom.db"

# WebAuthn configuration for your domain
export RP_ID="keychat.nikniksen.de"
export ORIGIN="https://keychat.nikniksen.de"

# JWT secret (change this in production!)
export JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

echo "📡 Environment variables set:"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "RP_ID: $RP_ID"
echo "ORIGIN: $ORIGIN"
echo "DATABASE_URL: $DATABASE_URL"

# Navigate to project directory
cd /home/z/my-project

# Kill any existing processes
echo "🔄 Stopping any existing processes..."
pkill -f "next dev" 2>/dev/null
pkill -f "node.*server.js" 2>/dev/null
sleep 2

# Start the production server
echo "🔥 Starting Next.js production server..."
nohup node .next/standalone/server.js > /home/z/my-project/logs/app.log 2>&1 &

# Get the process ID
PID=$!
echo "✅ Server started with PID: $PID"
echo "📋 Logs: /home/z/my-project/logs/app.log"
echo "🌐 App URL: https://keychat.nikniksen.de"
echo "📊 Process Status:"

# Check if process is running
sleep 3
if ps -p $PID > /dev/null; then
    echo "✅ Server is running successfully!"
    echo "📡 To stop: kill $PID"
    echo "📡 To view logs: tail -f /home/z/my-project/logs/app.log"
else
    echo "❌ Server failed to start"
    echo "📋 Check logs: cat /home/z/my-project/logs/app.log"
    exit 1
fi