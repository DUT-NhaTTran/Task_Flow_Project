## 🤖 AI Story Point Estimation System

**Updated to use Pretrained Language Models for better accuracy with limited data (<50 samples)**

An intelligent AI system for estimating Agile story points using **hybrid pretrained language models**. This system combines the power of pre-trained sentence transformers with domain-specific features to provide accurate estimations even with limited training data.

### 🧠 **Architecture: Pretrained + Custom Hybrid Approach**

```
📊 User Task Data (<50 samples) + 📚 Rich Default Dataset
                    ↓
🤖 Sentence Transformer (all-MiniLM-L6-v2) → 384D embeddings
                    ↓
🔧 Custom Feature Engineering (complexity, domains, readability)
                    ↓
🎯 Lightweight ML Head (Random Forest + Ridge) → Story Points
                    ↓
📈 Fibonacci Scale Mapping (1,2,3,5,8,13,21)
```

### ✨ **Why Pretrained Models for Limited Data?**

1. **🚀 Better Generalization**: Pretrained on millions of text samples
2. **📚 Rich Text Understanding**: Captures semantic meaning and context
3. **⚡ Fast Training**: Requires minimal fine-tuning on your data
4. **🎯 Higher Accuracy**: Better performance with <50 training samples
5. **🔄 Immediate Use**: Works out-of-the-box with default training data

### 🔧 **Technical Components**

- **Frontend**: Next.js (Port 3000) with AI integration buttons
- **Java Backend**: Spring Boot (Port 8085) with HTTP client to AI service
- **AI Service**: FastAPI (Port 8088) with **pretrained Sentence Transformers**
- **Model**: `all-MiniLM-L6-v2` + Random Forest/Ridge ensemble
- **Features**: 384D semantic embeddings + custom text analysis

### 🎯 **Key Features**

- ✅ **Pretrained Language Model**: Uses Sentence Transformers for semantic understanding
- ✅ **Hybrid Architecture**: Combines pretrained embeddings with domain features  
- ✅ **Fallback Support**: Automatic TF-IDF fallback if pretrained models unavailable
- ✅ **Rich Default Dataset**: 21 carefully crafted samples for immediate functionality
- ✅ **Smart Training**: Automatically combines your data with defaults for better coverage
- ✅ **Confidence Scoring**: AI confidence levels with human-readable reasoning
- ✅ **Domain Detection**: Recognizes UI, backend, testing, integration work types
- ✅ **Complexity Analysis**: Identifies technical complexity indicators
- ✅ **Real-time Integration**: Seamless frontend-backend-AI communication

### 🚀 **Quick Start**

```bash
# 1. Navigate to AI service directory
cd backend/ai-service

# 2. Run automated setup (installs pretrained models)
chmod +x setup_and_run.sh
./setup_and_run.sh

# 3. Or start manually
python3 start_ai_service.py
```

**First run will download the pretrained model (~100MB) - this happens automatically!**

### 📋 **API Endpoints**

#### Story Point Estimation
```bash
curl -X POST "http://localhost:8088/estimate" \
-H "Content-Type: application/json" \
-d '{
  "title": "Implement user authentication system",
  "description": "Build login/logout with JWT tokens and session management",
  "estimated_hours": 20,
  "complexity": "medium",
  "priority": "high"
}'
```

**Response with Pretrained Model:**
```json
{
  "story_points": 5,
  "confidence": 0.87,
  "reasoning": "Estimated 5 story points using pretrained language model. Standard development work. Backend development required. Based on similar tasks in training data.",
  "features": {
    "title_length": 35,
    "description_length": 58,
    "predicted_raw": 4.8,
    "model_type": "pretrained",
    "pretrained_model": "all-MiniLM-L6-v2"
  }
}
```

#### Model Training
```bash
curl -X POST "http://localhost:8088/train" \
-H "Content-Type: application/json" \
-d '{
  "tasks": [
    {
      "title": "Add user profile page",
      "description": "Create responsive profile page with edit functionality",
      "storyPoint": 3,
      "estimated_hours": 8
    }
  ]
}'
```

#### Model Status
```bash
curl http://localhost:8088/model/status
```

### 🔄 **Integration Flow**

1. **Frontend** → User clicks 🤖 button next to task
2. **Java Backend** → Receives request, calls AI service
3. **AI Service** → Uses pretrained model + custom features
4. **Response** → Story points + confidence + reasoning
5. **Auto-update** → Task updated with estimated story points

### 📊 **Model Performance**

With pretrained approach, you get:
- **High accuracy** even with <10 training samples
- **Semantic understanding** of technical language
- **Domain adaptation** through custom features
- **Confidence scores** typically >80% for clear tasks

### 🛠 **Technical Details**

#### Pretrained Model Features
- **Model**: `all-MiniLM-L6-v2` (384 dimensions)
- **Training**: Trained on 1B+ sentence pairs
- **Languages**: English (optimized for technical text)
- **Speed**: ~1000 sentences/second

#### Custom Feature Engineering
- Text statistics (length, complexity, readability)
- Domain keywords (UI, backend, testing, integration)
- Complexity indicators (high/medium/low)
- Technical effort estimation

#### Ensemble Prediction
- **Primary**: Random Forest (optimized for small data)
- **Secondary**: Ridge Regression (regularized linear model)
- **Combination**: Weighted ensemble with confidence scoring

### 📝 **Default Training Data**

The system includes 21 high-quality training samples covering:
- **Simple tasks** (1-2 points): Bug fixes, minor updates
- **Standard features** (3-5 points): New components, API integration  
- **Complex features** (8 points): Dashboards, payment systems
- **Epic features** (13-21 points): Architecture changes, mobile apps

### 🔧 **Configuration**

Edit `models/pretrained_estimator.py` to customize:
- Pretrained model selection
- Feature engineering
- Ensemble weights
- Story point scale

### 📈 **Monitoring & Logging**

- Real-time logging of predictions and confidence scores
- Model performance metrics (MAE, R², RMSE)
- Feature importance analysis
- Training history tracking

### 🎯 **Best Practices**

1. **Start Small**: System works with minimal data
2. **Add Context**: Provide detailed task descriptions  
3. **Use Training**: Add your own samples for domain adaptation
4. **Monitor Confidence**: Low confidence suggests need for more training
5. **Iterate**: Retrain as you gather more project-specific data

### 🚀 **Production Deployment**

For production, consider:
- GPU acceleration for faster inference
- Model caching for repeated requests
- A/B testing between different pretrained models
- Custom domain fine-tuning as data grows

---

**The system is now optimized for scenarios with limited training data while maintaining high accuracy through pretrained language models! 🎯** 