from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from loguru import logger

from app.models.schemas import (
    TaskPredictionRequest,
    SprintPredictionRequest, 
    TaskClassificationRequest,
    WorkloadAnalysisRequest,
    StoryPointPrediction,
    CompletionProbability,
    TaskClassification,
    SprintAnalysis,
    WorkloadAnalysis,
    AIResponse
)
from app.services.ml_service import MLService

router = APIRouter()

# Dependency to get ML service instance
def get_ml_service() -> MLService:
    return MLService()

@router.post("/story-points", response_model=AIResponse)
async def predict_story_points(
    request: TaskPredictionRequest,
    ml_service: MLService = Depends(get_ml_service)
):
    """🎯 Predict story points for a new task based on title, description and assignee history"""
    try:
        logger.info(f"Predicting story points for task: {request.title}")
        
        prediction = await ml_service.predict_story_points(
            title=request.title,
            description=request.description or "",
            project_id=request.project_id,
            assignee_id=request.assignee_id
        )
        
        return AIResponse(
            success=True,
            data=prediction.dict()
        )
        
    except Exception as e:
        logger.error(f"Error predicting story points: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/task-completion", response_model=AIResponse)
async def predict_task_completion(
    task_data: Dict[str, Any],
    ml_service: MLService = Depends(get_ml_service)
):
    """📈 Predict probability of task completion on time"""
    try:
        logger.info(f"Predicting completion for task: {task_data.get('id', 'unknown')}")
        
        prediction = await ml_service.predict_task_completion(task_data)
        
        return AIResponse(
            success=True,
            data=prediction.dict()
        )
        
    except Exception as e:
        logger.error(f"Error predicting task completion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/classify-task", response_model=AIResponse)
async def classify_task(
    request: TaskClassificationRequest,
    ml_service: MLService = Depends(get_ml_service)
):
    """🏷️ Classify task and suggest tags/labels"""
    try:
        logger.info(f"Classifying task: {request.title}")
        
        classification = await ml_service.classify_task(
            title=request.title,
            description=request.description or ""
        )
        
        return AIResponse(
            success=True,
            data=classification.dict()
        )
        
    except Exception as e:
        logger.error(f"Error classifying task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sprint-analysis", response_model=AIResponse)
async def analyze_sprint(
    request: SprintPredictionRequest,
    ml_service: MLService = Depends(get_ml_service)
):
    """📊 Analyze sprint success probability and provide recommendations"""
    try:
        logger.info(f"Analyzing sprint: {request.sprint_id}")
        
        analysis = await ml_service.analyze_sprint(request.dict())
        
        return AIResponse(
            success=True,
            data=analysis.dict()
        )
        
    except Exception as e:
        logger.error(f"Error analyzing sprint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/workload-analysis", response_model=AIResponse)
async def analyze_workload(
    request: WorkloadAnalysisRequest,
    ml_service: MLService = Depends(get_ml_service)
):
    """⚖️ Analyze individual workload and detect overload risks"""
    try:
        logger.info(f"Analyzing workload for user: {request.user_id}")
        
        # Get current user workload from Tasks-Service
        current_workload = await _get_user_current_workload(request.user_id, request.project_id)
        
        # Calculate recommended max based on historical performance
        recommended_max = await _calculate_recommended_max_workload(request.user_id)
        
        # Calculate overload risk
        total_workload = current_workload + request.new_story_points
        overload_risk = min(1.0, total_workload / recommended_max) if recommended_max > 0 else 0.5
        
        # Generate suggestion
        if overload_risk > 0.8:
            suggestion = f"⚠️ High overload risk! Current + new = {total_workload} points, recommended max = {recommended_max}"
        elif overload_risk > 0.6:
            suggestion = f"⚠️ Moderate risk. Consider distributing {request.new_story_points} points to other team members"
        else:
            suggestion = f"✅ Workload looks manageable. Total will be {total_workload} points"
            
        analysis = WorkloadAnalysis(
            current_workload=current_workload,
            recommended_max=recommended_max,
            overload_risk=overload_risk,
            suggestion=suggestion
        )
        
        return AIResponse(
            success=True,
            data=analysis.dict()
        )
        
    except Exception as e:
        logger.error(f"Error analyzing workload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/task/{task_id}/risk-assessment", response_model=AIResponse)
async def assess_task_risk(
    task_id: str,
    ml_service: MLService = Depends(get_ml_service)
):
    """🚨 Assess risk factors for a specific task"""
    try:
        logger.info(f"Assessing risk for task: {task_id}")
        
        # Get task data from Tasks-Service
        task_data = await _get_task_data(task_id)
        
        if not task_data:
            raise HTTPException(status_code=404, detail="Task not found")
            
        # Predict completion probability
        completion_prediction = await ml_service.predict_task_completion(task_data)
        
        # Additional risk factors
        risk_factors = []
        if not task_data.get('assigneeId'):
            risk_factors.append("⚠️ Task has no assignee")
        if task_data.get('storyPoint', 0) > 8:
            risk_factors.append("⚠️ High story points (>8) may indicate complex task")
        if task_data.get('dueDate'):
            # Check if due date is approaching
            risk_factors.append("📅 Due date approaching")
            
        risk_assessment = {
            "task_id": task_id,
            "completion_probability": completion_prediction.probability,
            "risk_level": completion_prediction.risk_level,
            "risk_factors": risk_factors + completion_prediction.factors,
            "recommendations": completion_prediction.recommendations
        }
        
        return AIResponse(
            success=True,
            data=risk_assessment
        )
        
    except Exception as e:
        logger.error(f"Error assessing task risk: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions to integrate with other services
async def _get_user_current_workload(user_id: str, project_id: str) -> int:
    """Get user's current workload from Tasks-Service"""
    # This would make HTTP request to Tasks-Service
    # For now, return mock data
    return 12  # Current story points

async def _calculate_recommended_max_workload(user_id: str) -> int:
    """Calculate recommended max workload based on historical performance"""
    # This would analyze historical data
    # For now, return standard 15 points per sprint
    return 15

async def _get_task_data(task_id: str) -> Dict[str, Any]:
    """Get task data from Tasks-Service"""
    # This would make HTTP request to Tasks-Service
    # For now, return mock data
    return {
        "id": task_id,
        "title": "Sample task",
        "description": "Sample description", 
        "storyPoint": 5,
        "assigneeId": "user-123",
        "status": "IN_PROGRESS",
        "dueDate": "2024-01-15"
    } 