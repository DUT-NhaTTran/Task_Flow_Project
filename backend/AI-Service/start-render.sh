#!/bin/bash

echo "🚀 Starting TaskFlow AI Service on Render..."

# Change to AI Service directory
cd "$(dirname "$0")" || exit 1

# Show current directory for debugging
echo "Current directory: $(pwd)"
echo "Python version: $(python --version)"
echo "Files in directory:"
ls -la

# Check if main.py exists
if [ ! -f "main.py" ]; then
    echo "❌ main.py not found!"
    exit 1
fi

# Check if requirements are installed
echo "📦 Checking dependencies..."
pip list | head -10

# Start the application
echo "🎯 Starting uvicorn server..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8088}" --log-level info 