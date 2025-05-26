from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    DONE = "DONE"

class PredictionType(str, Enum):
    STORY_POINTS = "story_points"
    COMPLETION_PROBABILITY = "completion_probability"
    TASK_CLASSIFICATION = "task_classification"
    SPRINT_SUCCESS = "sprint_success"
    USER_WORKLOAD = "user_workload"

# Request Models
class TaskPredictionRequest(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: Optional[str] = None
    assignee_id: Optional[str] = None
    project_id: str
    
class SprintPredictionRequest(BaseModel):
    sprint_id: str
    project_id: str
    total_story_points: int
    team_members: List[str]
    sprint_duration_days: int
    
class TaskClassificationRequest(BaseModel):
    title: str
    description: Optional[str] = None
    
class WorkloadAnalysisRequest(BaseModel):
    user_id: str
    project_id: str
    new_story_points: int

# Response Models
class StoryPointPrediction(BaseModel):
    predicted_points: int
    confidence: float
    reasoning: str
    similar_tasks: List[Dict[str, Any]]

class CompletionProbability(BaseModel):
    probability: float
    risk_level: str  # "LOW", "MEDIUM", "HIGH"
    factors: List[str]
    recommendations: List[str]

class TaskClassification(BaseModel):
    tags: List[str]
    confidence_scores: Dict[str, float]
    category: str

class SprintAnalysis(BaseModel):
    success_probability: float
    predicted_completion_rate: float
    risk_factors: List[str]
    recommendations: List[str]
    individual_workloads: Dict[str, Dict[str, Any]]

class WorkloadAnalysis(BaseModel):
    current_workload: int
    recommended_max: int
    overload_risk: float
    suggestion: str

# Database Models
class PredictionLog(BaseModel):
    id: Optional[int] = None
    prediction_type: PredictionType
    input_data: Dict[str, Any]
    output_data: Dict[str, Any]
    confidence: float
    created_at: Optional[datetime] = None
    
class ModelPerformance(BaseModel):
    id: Optional[int] = None
    model_name: str
    accuracy: float
    last_trained: datetime
    training_samples: int
    
# Generic Response
class AIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    timestamp: datetime = datetime.now() 