from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import os
from models.pretrained_estimator import PretrainedStoryPointEstimator
from utils.text_preprocessor import TextPreprocessor

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Story Point Estimation Service",
    description="Pretrained model-based AI service for estimating Agile story points",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend
        "http://localhost:8085",  # Backend
        "http://localhost:8088",  # This service
        "https://your-frontend-domain.com"  # Add your production domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance
estimator = None
preprocessor = TextPreprocessor()

class TaskData(BaseModel):
    title: str
    description: Optional[str] = ""
    estimated_hours: Optional[float] = None
    complexity: Optional[str] = None
    priority: Optional[str] = None
    assignee_history: Optional[List[Dict[str, Any]]] = None
    attachments_count: Optional[int] = None

class EstimationRequest(BaseModel):
    task: TaskData

class EstimationResponse(BaseModel):
    estimated_story_points: int
    confidence: float
    reasoning: str
    features_used: Dict[str, Any]

class TrainingData(BaseModel):
    tasks: List[Dict[str, Any]]

@app.on_event("startup")
async def startup_event():
    """Initialize the model on startup"""
    global estimator
    try:
        if not estimator.is_trained():
            logger.info("Training model with default data...")
            estimator.train([])  # Train with default data
        logger.info("✅ Pretrained AI Story Point Estimator initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize model: {e}")
        estimator = None

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "AI Story Point Estimation Service",
        "status": "running",
        "model_loaded": estimator is not None
    }

@app.post("/estimate", response_model=EstimationResponse)
async def estimate_story_points(task: TaskData):
    """Estimate story points for a given task"""
    if estimator is None:
        raise HTTPException(
            status_code=503, 
            detail="AI model not available. Please train the model first."
        )
    
    try:
        # Estimate story points with new objective factors
        result = estimator.estimate(
            title=task.title,
            description=task.description,
            estimated_hours=task.estimated_hours,
            complexity=task.complexity,
            priority=task.priority,
            assignee_history=task.assignee_history,
            attachments_count=task.attachments_count
        )
        
        return EstimationResponse(
            estimated_story_points=result["story_points"],
            confidence=result["confidence"],
            reasoning=result["reasoning"],
            features_used=result["features"]
        )
        
    except Exception as e:
        logger.error(f"Error estimating story points: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train")
async def train_model(training_data: TrainingData):
    """Train the AI model with provided data"""
    global estimator
    
    try:
        if estimator is None:
            estimator = PretrainedStoryPointEstimator(model_path="data/models")
        
        # Train the model
        result = estimator.train(training_data.tasks)
        
        logger.info("Model training completed successfully")
        return {
            "message": "Model trained successfully",
            "training_stats": result
        }
        
    except Exception as e:
        logger.error(f"Error during training: {e}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.get("/model/status")
async def get_model_status():
    """Get current model status and performance metrics"""
    if estimator is None:
        return {"status": "not_loaded", "trained": False}
    
    return {
        "status": "loaded",
        "trained": estimator.is_trained(),
        "model_info": estimator.get_model_info()
    }

@app.post("/retrain")
async def retrain_model():
    """Retrain the model using all available data"""
    global estimator
    
    try:
        if estimator is None:
            estimator = PretrainedStoryPointEstimator(model_path="data/models")
        
        # This would fetch data from your database
        # For now, we'll use the default training
        result = estimator.retrain_with_existing_data()
        
        return {
            "message": "Model retrained successfully",
            "training_stats": result
        }
        
    except Exception as e:
        logger.error(f"Error during retraining: {e}")
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8088) 