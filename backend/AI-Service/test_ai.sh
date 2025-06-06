#!/bin/bash

echo "🧪 Testing AI Story Point Estimation Service"
echo "============================================="

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -s -X GET http://localhost:8088/ | jq
echo ""

# Test 2: Model Status (before training)
echo "2. Checking Model Status (before training)..."
curl -s -X GET http://localhost:8088/model/status | jq
echo ""

# Test 3: Train Model with Sample Data
echo "3. Training Model with Sample Data..."
curl -s -X POST http://localhost:8088/train \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "title": "Fix button alignment",
        "description": "Minor CSS adjustment for button positioning",
        "storyPoint": 1
      },
      {
        "title": "Create user login form", 
        "description": "Implement user authentication form with email and password validation",
        "storyPoint": 3
      },
      {
        "title": "Implement REST API",
        "description": "Create comprehensive API endpoints for user management and data operations",
        "storyPoint": 8
      },
      {
        "title": "Database migration",
        "description": "Update database schema and migrate existing data",
        "storyPoint": 5
      },
      {
        "title": "Fix typo in header",
        "description": "Correct spelling mistake in navigation header",
        "storyPoint": 1
      },
      {
        "title": "Implement file upload",
        "description": "Add functionality to upload and process user files with validation",
        "storyPoint": 5
      },
      {
        "title": "Create dashboard",
        "description": "Build interactive dashboard with charts and analytics for admin users",
        "storyPoint": 13
      }
    ]
  }' | jq
echo ""

# Test 4: Model Status (after training)
echo "4. Checking Model Status (after training)..."
curl -s -X GET http://localhost:8088/model/status | jq
echo ""

# Test 5: Estimate Story Points for Different Tasks
echo "5. Testing Story Point Estimation..."

echo "5a. Simple Bug Fix (Expected: 1-2 points):"
curl -s -X POST http://localhost:8088/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "title": "Fix text color issue",
      "description": "Change text color from black to blue in footer"
    }
  }' | jq
echo ""

echo "5b. Medium Feature (Expected: 3-5 points):"
curl -s -X POST http://localhost:8088/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "title": "Add search functionality",
      "description": "Implement search feature with filters and pagination for user list"
    }
  }' | jq
echo ""

echo "5c. Complex Feature (Expected: 8-13 points):"
curl -s -X POST http://localhost:8088/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "title": "Implement real-time chat system",
      "description": "Build complete chat system with WebSocket, message history, file sharing, and notification system"
    }
  }' | jq
echo ""

# Test 6: Test with Additional Context
echo "6. Testing with Additional Context..."
curl -s -X POST http://localhost:8088/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "title": "Optimize database queries",
      "description": "Improve performance of user search queries and add proper indexing",
      "estimated_hours": 16,
      "complexity": "high",
      "priority": "medium"
    }
  }' | jq
echo ""

echo "✅ AI Service Testing Complete!"
echo "================================"
echo "🔗 API Documentation: http://localhost:8088/docs"
echo "💡 Health Check: http://localhost:8088/" 