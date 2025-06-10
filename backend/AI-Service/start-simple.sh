#!/bin/bash

echo "Starting AI-Service (Simple Version)..."

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
else
    echo "Virtual environment not found. Creating one..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Installing dependencies..."
    pip install fastapi uvicorn pydantic
fi

echo "Starting AI service on port 8088..."
echo "Press Ctrl+C to stop the service"

# Run the simple AI service
python test_simple.py 