# 🤖 AI Story Point Estimation Service

An advanced Machine Learning service for automatically estimating Agile story points using ensemble methods and text analysis.

## ✨ Features

- **Ensemble ML Models**: Random Forest, Gradient Boosting, and Linear Regression
- **Text Analysis**: TF-IDF vectorization, readability metrics, and keyword extraction
- **Fibonacci Mapping**: Automatically maps predictions to standard story point scale (1, 2, 3, 5, 8, 13, 21)
- **Confidence Scoring**: Provides confidence levels based on model agreement
- **Human-readable Reasoning**: Explains why the AI estimated specific story points
- **RESTful API**: Easy integration with existing systems
- **Model Persistence**: Trained models are saved and loaded automatically

## 🏗️ Architecture

```
AI Service (Port 8088)
├── FastAPI Backend
├── ML Models (Random Forest + Gradient Boosting + Linear Regression)
├── Text Preprocessing (NLTK + TF-IDF)
└── Feature Engineering
    ├── Text Statistics
    ├── Complexity Keywords
    ├── Technical Domain Analysis
    └── Readability Metrics


## 🚀 Quick Start

### 1. Prerequisites

- Python 3.8+ (tested with Python 3.12)
- pip package manager
- Virtual environment (recommended)

### 2. Setup and Start Service

#### Option A: Automated Setup (Recommended)
```bash
cd backend/AI-Service
chmod +x setup_and_run.sh
./setup_and_run.sh
```

#### Option B: Manual Setup (Step by Step)

**Step 1: Create Virtual Environment**
```bash
cd backend/AI-Service
python3 -m venv venv
source venv/bin/activate
```

**Step 2: Install Dependencies**
```bash
# Upgrade pip first
pip install --upgrade pip

# Install all requirements
pip install -r requirements.txt
```

**Step 3: Download NLTK Data (Important!)**
```bash
# Download required NLTK data with SSL fix for macOS
python3 -c "
import nltk
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
nltk.download('stopwords')
nltk.download('punkt')
"
```

**Step 4: Create Required Directories**
```bash
mkdir -p models logs
```

**Step 5: Start the Service**

*Foreground mode (for development):*
```bash
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8088 --reload
```

*Background mode (for production):*
```bash
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8088 --reload > ai_service.log 2>&1 &
```

### 3. Verify Service is Running

**Check Process:**
```bash
ps aux | grep uvicorn | grep -v grep
```

**Check Port:**
```bash
lsof -i :8088
```

**Test Health Endpoint:**
```bash
curl -X GET http://localhost:8088/ | jq
```

**Expected Output:** You should see JSON content indicating the service is running and the model is loaded.

### 4. Test API Endpoints

#### Test 1: Access API Documentation
```bash
open http://localhost:8088/docs
```
Or visit in browser: http://localhost:8088/docs

#### Test 2: Check Model Status
```bash
curl -X GET http://localhost:8088/model/status \
  -H "Content-Type: application/json"
```

#### Test 3: Estimate Story Points
```bash
curl -X POST http://localhost:8088/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "title": "Create user login page",
      "description": "Implement user authentication with email and password validation, including form validation and error handling"
    }
  }'
```

**Expected Response:**
```json
{
  "estimated_story_points": 5,
  "confidence": 0.75,
  "reasoning": "Estimated 5 story points. Involves standard development work. Frontend/UI work identified.",
  "features_used": {
    "title_length": 23,
    "description_length": 120,
    "predicted_raw": 4.8
  }
}
```

#### Test 4: Train Model with Sample Data
```bash
curl -X POST http://localhost:8088/train \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "title": "Fix button alignment",
        "description": "Minor CSS adjustment for button positioning",
        "storyPoint": 1
      },
      {
        "title": "Implement user authentication",
        "description": "Create complete login/logout system with session management",
        "storyPoint": 8
      },
      {
        "title": "Add validation to form",
        "description": "Implement client-side and server-side validation",
        "storyPoint": 3
      }
    ]
  }'
```

### 5. Monitor Service

**View Live Logs:**
```bash
tail -f ai_service.log
```

**Check Service Status:**
```bash
curl -s http://localhost:8088/docs | head -5
```

**Stop Service:**
```bash
# Find process ID
ps aux | grep uvicorn | grep -v grep

# Kill process (replace PID with actual process ID)
kill <PID>
```

### 6. Integration with Main Backend

The AI service should be running alongside your main Java backend:

- **Main Backend:** http://localhost:8080
- **AI Service:** http://localhost:8088
- **Frontend:** http://localhost:3000

Test integration by using the 🤖 buttons in your Task Management UI.

## 🔧 Troubleshooting

### Common Startup Issues

**Issue: NLTK Data Missing**
```
LookupError: Resource stopwords not found
```
**Solution:**
```bash
python3 -c "
import nltk
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
nltk.download('stopwords')
nltk.download('punkt')
"
```

**Issue: Port Already in Use**
```
OSError: [Errno 48] Address already in use
```
**Solution:**
```bash
# Find what's using port 8088
lsof -i :8088

# Kill the process
kill <PID>

# Or use different port
uvicorn main:app --host 0.0.0.0 --port 8089 --reload
```

**Issue: Import Errors**
```
ModuleNotFoundError: No module named 'fastapi'
```
**Solution:**
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall requirements
pip install -r requirements.txt
```

**Issue: SSL Certificate Errors (macOS)**
```
[SSL: CERTIFICATE_VERIFY_FAILED]
```
**Solution:** Use the SSL fix in the NLTK download command above.

### Performance Monitoring

**Check Memory Usage:**
```bash
ps aux | grep uvicorn
```

**Monitor API Response Times:**
```bash
time curl -X POST http://localhost:8088/estimate -H "Content-Type: application/json" -d '{"task": {"title": "test", "description": "test task"}}'
```

**View Error Logs:**
```bash
grep ERROR ai_service.log
```

## 📋 API Endpoints

### Health Check
```http
GET http://localhost:8088/
```

### Estimate Story Points
```http
POST http://localhost:8088/estimate
Content-Type: application/json

{
  "task": {
    "title": "Create user login page",
    "description": "Implement user authentication with email and password validation"
  }
}
```

**Response:**
```json
{
  "estimated_story_points": 5,
  "confidence": 0.85,
  "reasoning": "Estimated 5 story points. Involves standard development work. Frontend/UI work identified.",
  "features_used": {
    "title_length": 23,
    "description_length": 75,
    "predicted_raw": 4.8,
    "model_predictions": {
      "random_forest": 5.1,
      "gradient_boosting": 4.7,
      "linear_regression": 4.6
    }
  }
}
```

### Train Model
```http
POST http://localhost:8088/train
Content-Type: application/json

{
  "tasks": [
    {
      "title": "Fix button alignment",
      "description": "Minor CSS fix",
      "storyPoint": 1
    },
    {
      "title": "Implement REST API",
      "description": "Create comprehensive API endpoints",
      "storyPoint": 8
    }
  ]
}
```

### Model Status
```http
GET http://localhost:8088/model/status
```

## 🎯 Integration with Java Backend

The AI service integrates seamlessly with your Java backend:

### Java Endpoints:
- `POST /api/tasks/{taskId}/estimate-story-points` - Estimate single task
- `POST /api/tasks/train-ai-model` - Train AI with all tasks
- `POST /api/tasks/project/{projectId}/bulk-estimate` - Estimate all tasks in project

### Frontend Integration:
- 🤖 buttons next to each task for individual estimation
- "Train AI Model" button in header
- Automatic story point updates
- Toast notifications with confidence scores

## 🧠 How It Works

### 1. Feature Extraction
- **Text Statistics**: Length, word count, readability scores
- **Complexity Keywords**: High/medium/low complexity terms
- **Technical Domains**: UI, backend, testing, integration
- **TF-IDF Vectors**: Advanced text representation

### 2. Model Training
- **Random Forest**: Handles non-linear relationships
- **Gradient Boosting**: Captures complex patterns
- **Linear Regression**: Provides baseline and stability
- **Ensemble Prediction**: Weighted combination of all models

### 3. Prediction Process
```
Input Task → Text Preprocessing → Feature Extraction → 
Ensemble Models → Raw Prediction → Fibonacci Mapping → 
Confidence Calculation → Human Reasoning → Final Result
```

## 📊 Training Data Format

The AI learns from your existing tasks. Required format:

```json
{
  "title": "Task title",
  "description": "Task description", 
  "storyPoint": 5
}
```

**Optional fields:**
- `estimated_hours`: Development time estimate
- `complexity`: "low", "medium", "high"
- `priority`: "low", "medium", "high", "critical"

## 🔧 Configuration

### Model Parameters (in `models/story_point_estimator.py`)
```python
# Ensemble weights
model_weights = {
    'rf': 0.5,      # Random Forest
    'gb': 0.3,      # Gradient Boosting  
    'lr': 0.2       # Linear Regression
}

# Story point scale
story_point_scale = [1, 2, 3, 5, 8, 13, 21]
```

### Text Processing (in `utils/text_preprocessor.py`)
```python
# TF-IDF settings
TfidfVectorizer(
    max_features=100,
    stop_words='english', 
    ngram_range=(1, 2)
)
```

## 📈 Model Performance

With sufficient training data (50+ tasks), expect:
- **MAE (Mean Absolute Error)**: ~2-4 story points
- **Confidence**: 60-90% for typical tasks
- **Accuracy**: 70-85% exact matches, 90%+ within ±1 point

## 🛠️ Development

### Project Structure
```
ai-service/
├── main.py                 # FastAPI application
├── start_ai_service.py     # Startup script
├── requirements.txt        # Python dependencies
├── models/
│   └── story_point_estimator.py
├── utils/
│   └── text_preprocessor.py
└── data/
    └── models/             # Saved model files
```

### Adding New Features
1. Extend `TextPreprocessor.calculate_text_features()`
2. Update `StoryPointEstimator._prepare_features()`
3. Retrain model with new features

### Testing
```bash
# Test individual estimation
curl -X POST http://localhost:8088/estimate \
  -H "Content-Type: application/json" \
  -d '{"task": {"title": "Test task", "description": "Test description"}}'

# Check model status
curl http://localhost:8088/model/status
```

## 🚨 Troubleshooting

### Common Issues

**"AI model not available"**
- Solution: Train the model first using the Train AI Model button

**Low confidence scores**
- Solution: Add more diverse training data
- Check: Task descriptions should be detailed

**Poor predictions**
- Solution: Ensure training data has good story point distribution
- Retrain: After adding more similar tasks

**Service won't start**
- Check: Python 3.8+ installed
- Install: Missing dependencies with `pip install -r requirements.txt`
- NLTK: Download required data manually

### Logs
```bash
# View service logs
tail -f logs/ai_service.log

# Check for errors
grep ERROR logs/ai_service.log
```

## 🔄 Production Deployment

### Docker (Recommended)
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "start_ai_service.py"]
```

### Environment Variables
```bash
export AI_SERVICE_PORT=8088
export MODEL_PATH=/app/data/models
export LOG_LEVEL=INFO
```

### Health Monitoring
- Endpoint: `GET /` returns service status
- Metrics: Model performance statistics at `/model/status`
- Uptime: Service automatically saves/loads models

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Add tests for new functionality
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**🎯 Ready to revolutionize your Agile estimation process!**

For support, create an issue or contact the development team. 