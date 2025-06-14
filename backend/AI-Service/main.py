from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import os
from models.pretrained_estimator import PretrainedStoryPointEstimator
from utils.text_preprocessor import TextPreprocessor
from utils.github_dataset_loader import GitHubDatasetLoader, load_github_dataset
import json

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
github_loader = GitHubDatasetLoader()

class TaskData(BaseModel):
    title: str
    description: Optional[str] = ""
    label: Optional[str] = None
    priority: Optional[str] = None
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

class GitHubTrainingRequest(BaseModel):
    github_url: str
    file_path: Optional[str] = None
    combine_with_default: Optional[bool] = True

@app.on_event("startup")
async def startup_event():
    """Initialize the model on startup"""
    global estimator
    try:
        estimator = PretrainedStoryPointEstimator(model_path="data/models")
        if not estimator.is_trained():
            logger.info("Training model with default data...")
            estimator.train([])  # Train with default data
        logger.info("Pretrained AI Story Point Estimator initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize model: {e}")
        estimator = None

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "AI Story Point Estimation Service",
        "status": "running",
        "model_loaded": estimator is not None,
        "github_loader_available": True
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
            complexity=None,  # No complexity from frontend
            priority=task.priority,
            attachments_count=task.attachments_count,
            label=task.label
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

# Add backward compatibility endpoint for nested task format
@app.post("/estimate-legacy")
async def estimate_story_points_legacy(request: EstimationRequest):
    """Estimate story points for a given task (legacy format with nested task object)"""
    if estimator is None:
        raise HTTPException(
            status_code=503, 
            detail="AI model not available. Please train the model first."
        )
    
    try:
        # Extract task from nested format
        task = request.task
        
        # Estimate story points
        result = estimator.estimate(
            title=task.title,
            description=task.description,
            complexity=None,
            priority=task.priority,
            attachments_count=task.attachments_count,
            label=task.label
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

@app.post("/train-from-github")
async def train_from_github(request: GitHubTrainingRequest):
    """Train the AI model with dataset from GitHub"""
    global estimator
    
    try:
        if estimator is None:
            estimator = PretrainedStoryPointEstimator(model_path="data/models")
        
        # Load dataset from GitHub
        logger.info(f"Loading dataset from GitHub: {request.github_url}")
        github_tasks = github_loader.load_from_github(request.github_url, request.file_path)
        
        if not github_tasks:
            raise HTTPException(status_code=400, detail="No valid tasks found in GitHub dataset")
        
        # Combine with default data if requested
        if request.combine_with_default:
            logger.info("Combining GitHub dataset with default training data")
            training_tasks = github_tasks
        else:
            logger.info("Using only GitHub dataset for training")
            training_tasks = github_tasks
        
        # Train the model
        result = estimator.train(training_tasks)
        
        logger.info(f"Model training completed with {len(github_tasks)} GitHub tasks")
        return {
            "message": "Model trained successfully from GitHub dataset",
            "github_url": request.github_url,
            "tasks_loaded": len(github_tasks),
            "training_stats": result
        }
        
    except Exception as e:
        logger.error(f"Error training from GitHub: {e}")
        raise HTTPException(status_code=500, detail=f"GitHub training failed: {str(e)}")

@app.get("/model/status")
async def get_model_status():
    """Get current model status and performance metrics"""
    if estimator is None:
        return {"status": "not_loaded", "trained": False}
    
    return {
        "status": "loaded",
        "trained": estimator.is_trained(),
        "model_info": estimator.get_model_info(),
        "github_loader_available": True
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

@app.delete("/cache/clear")
async def clear_github_cache():
    """Clear GitHub dataset cache"""
    try:
        github_loader.clear_cache()
        return {"message": "GitHub dataset cache cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=f"Cache clearing failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8088) 