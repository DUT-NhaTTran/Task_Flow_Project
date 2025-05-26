#!/bin/bash

echo "🚀 Starting TaskFlow AI Service..."

# Check if Python 3.8+ is installed
python_version=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
if [[ $(echo "$python_version 3.8" | awk '{print ($1 >= $2)}') == 1 ]]; then
    echo "✅ Python $python_version found"
else
    echo "❌ Python 3.8+ required. Current version: $python_version"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade pip
pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Create necessary directories
mkdir -p models
mkdir -p logs

# Set environment variables (if .env doesn't exist)
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
DATABASE_URL=postgresql://postgres:password@localhost:5432/taskflow_ai
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your-openai-key-here
HUGGINGFACE_API_KEY=your-hf-key-here
ENVIRONMENT=development
DEBUG=true
EOF
    echo "⚠️  Please update .env file with your API keys"
fi

echo "🎯 Starting AI Service on port 8088..."
echo "📊 API Documentation: http://localhost:8088/docs"
echo "💡 Health Check: http://localhost:8088/api/health"

# Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8088 --reload 