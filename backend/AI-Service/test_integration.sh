#!/bin/bash

echo "🔄 Testing AI Integration with Java Backend"
echo "==========================================="

BACKEND_URL="http://localhost:8085/api/tasks"
AI_URL="http://localhost:8088"

# First, ensure AI service is trained
echo "1. Training AI Model through AI Service..."
curl -s -X POST $AI_URL/train -H "Content-Type: application/json" -d @train_sample.json
echo ""

# Test 2: Train AI Model through Java Backend
echo "2. Training AI Model through Java Backend..."
curl -s -X POST $BACKEND_URL/train-ai-model | python3 -m json.tool
echo ""

# Test 3: Get a task ID for testing (you'll need to replace with actual task ID)
echo "3. Getting tasks from project to test estimation..."
echo "   Please replace PROJECT_ID with your actual project ID:"
echo "   curl -X GET $BACKEND_URL/project/{PROJECT_ID}"
echo ""

# Test 4: Estimate story points for a specific task (replace TASK_ID)
echo "4. Test Single Task Estimation (replace TASK_ID):"
echo "   curl -X POST $BACKEND_URL/{TASK_ID}/estimate-story-points"
echo ""
echo "   Example with dummy UUID:"
DUMMY_TASK_ID="550e8400-e29b-41d4-a716-446655440000"
echo "   curl -X POST $BACKEND_URL/$DUMMY_TASK_ID/estimate-story-points"
echo ""

# Test 5: Bulk estimation for project
echo "5. Test Bulk Estimation for Project (replace PROJECT_ID):"
echo "   curl -X POST $BACKEND_URL/project/{PROJECT_ID}/bulk-estimate"
echo ""

# Test 6: Direct AI service test with task data
echo "6. Testing Direct AI Service with Task Data..."
curl -s -X POST $AI_URL/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "title": "Implement user dashboard",
      "description": "Create interactive dashboard with charts, analytics, and user management features including real-time data updates"
    }
  }' | python3 -m json.tool
echo ""

# Test 7: Check AI model status
echo "7. Checking AI Model Status..."
curl -s -X GET $AI_URL/model/status | python3 -m json.tool
echo ""

echo "✅ Integration Testing Guide Complete!"
echo "======================================="
echo ""
echo "📋 Quick Guide for Manual Testing:"
echo "1. Get project tasks: GET $BACKEND_URL/project/{PROJECT_ID}"
echo "2. Pick a task ID from the response"
echo "3. Estimate story points: POST $BACKEND_URL/{TASK_ID}/estimate-story-points"
echo "4. Check the task to see updated story points"
echo ""
echo "🎯 Frontend Integration:"
echo "- Use 🤖 buttons next to tasks to trigger estimation"
echo "- Train AI Model button to improve accuracy"
echo "- Bulk estimate button for entire projects" 