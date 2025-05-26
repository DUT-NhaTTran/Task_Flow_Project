from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from loguru import logger

from app.models.schemas import AIResponse

router = APIRouter()

@router.get("/project/{project_id}/insights", response_model=AIResponse)
async def get_project_insights(project_id: str):
    """📊 Get AI-powered insights for a project"""
    try:
        logger.info(f"Generating insights for project: {project_id}")
        
        # Mock insights - would be calculated from real data
        insights = {
            "project_id": project_id,
            "overall_health": "good",
            "completion_trend": "improving",
            "velocity_analysis": {
                "current_velocity": 28,
                "predicted_velocity": 32,
                "trend": "increasing"
            },
            "risk_factors": [
                "2 tasks without assignees",
                "Sprint 3 appears overloaded"
            ],
            "recommendations": [
                "Assign pending tasks before next sprint",
                "Consider moving 3 story points from Sprint 3 to Sprint 4",
                "Team velocity is increasing - good momentum!"
            ],
            "key_metrics": {
                "avg_story_points_per_task": 4.2,
                "completion_rate": 0.87,
                "on_time_delivery": 0.82,
                "team_productivity": "high"
            }
        }
        
        return AIResponse(success=True, data=insights)
        
    except Exception as e:
        logger.error(f"Error generating project insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sprint/{sprint_id}/burndown-analysis", response_model=AIResponse)
async def analyze_burndown(sprint_id: str):
    """📈 AI-powered burndown chart analysis"""
    try:
        logger.info(f"Analyzing burndown for sprint: {sprint_id}")
        
        # Mock burndown analysis
        analysis = {
            "sprint_id": sprint_id,
            "burn_rate": "slightly_behind",
            "predicted_completion": 0.94,
            "days_remaining": 8,
            "points_remaining": 12,
            "daily_burn_rate": {
                "current": 1.8,
                "required": 1.5,
                "recommended": 2.0
            },
            "forecast": {
                "completion_date": "2024-01-28",
                "completion_probability": 0.78,
                "risk_level": "medium"
            },
            "recommendations": [
                "Increase daily burn rate to 2.0 points",
                "Consider removing low-priority tasks",
                "Schedule team sync to address blockers"
            ],
            "daily_progress": [
                {"date": "2024-01-15", "burned": 2, "remaining": 28},
                {"date": "2024-01-16", "burned": 1, "remaining": 27},
                {"date": "2024-01-17", "burned": 3, "remaining": 24}
            ]
        }
        
        return AIResponse(success=True, data=analysis)
        
    except Exception as e:
        logger.error(f"Error analyzing burndown: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/team/{team_id}/performance", response_model=AIResponse)
async def analyze_team_performance(
    team_id: str,
    days: int = Query(30, description="Number of days to analyze")
):
    """👥 Analyze team performance and productivity"""
    try:
        logger.info(f"Analyzing team {team_id} performance for {days} days")
        
        # Mock team performance analysis
        performance = {
            "team_id": team_id,
            "analysis_period": f"{days} days",
            "overall_score": 8.2,
            "productivity_trend": "improving",
            "individual_performance": [
                {
                    "user_id": "user-1",
                    "name": "John Doe",
                    "velocity": 18,
                    "completion_rate": 0.92,
                    "quality_score": 8.5,
                    "workload_balance": "optimal"
                },
                {
                    "user_id": "user-2", 
                    "name": "Jane Smith",
                    "velocity": 22,
                    "completion_rate": 0.88,
                    "quality_score": 9.1,
                    "workload_balance": "slightly_high"
                }
            ],
            "team_metrics": {
                "avg_velocity": 20,
                "collaboration_score": 7.8,
                "delivery_consistency": 0.85,
                "technical_debt": "low"
            },
            "insights": [
                "Team velocity has increased 15% over the period",
                "Jane might be taking on too much work",
                "Overall code quality is excellent"
            ],
            "recommendations": [
                "Redistribute some tasks from Jane to John",
                "Continue current practices - team is performing well",
                "Consider team retrospective to maintain momentum"
            ]
        }
        
        return AIResponse(success=True, data=performance)
        
    except Exception as e:
        logger.error(f"Error analyzing team performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/predictions/accuracy", response_model=AIResponse)
async def get_prediction_accuracy():
    """🎯 Get accuracy metrics for AI predictions"""
    try:
        logger.info("Fetching prediction accuracy metrics")
        
        # Mock accuracy metrics
        accuracy = {
            "story_points": {
                "accuracy": 0.78,
                "avg_error": 1.2,
                "total_predictions": 156,
                "last_updated": "2024-01-15T10:30:00Z"
            },
            "completion_probability": {
                "accuracy": 0.83,
                "precision": 0.81,
                "recall": 0.85,
                "total_predictions": 89
            },
            "sprint_success": {
                "accuracy": 0.91,
                "avg_error": 0.08,
                "total_predictions": 24
            },
            "classification": {
                "accuracy": 0.86,
                "tag_precision": 0.84,
                "category_accuracy": 0.89,
                "total_predictions": 203
            },
            "overall_performance": {
                "avg_accuracy": 0.845,
                "improvement_trend": "+5.2% this month",
                "model_confidence": "high"
            }
        }
        
        return AIResponse(success=True, data=accuracy)
        
    except Exception as e:
        logger.error(f"Error fetching accuracy metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-report", response_model=AIResponse)
async def generate_ai_report(
    project_id: Optional[str] = None,
    sprint_id: Optional[str] = None,
    team_id: Optional[str] = None,
    report_type: str = Query("comprehensive", description="Type of report to generate")
):
    """📋 Generate comprehensive AI-powered reports"""
    try:
        logger.info(f"Generating {report_type} report")
        
        # Mock report generation
        report = {
            "report_id": f"rpt_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "type": report_type,
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_tasks_analyzed": 45,
                "predictions_made": 12,
                "accuracy_score": 0.84,
                "key_insights_count": 7
            },
            "executive_summary": "Project is on track with 84% completion probability. Team velocity is strong but distribution could be improved.",
            "key_findings": [
                "Sprint planning accuracy has improved by 23%",
                "Story point estimates are within 1.2 points on average", 
                "Team workload distribution is 78% optimal",
                "Risk factors identified in 3 upcoming tasks"
            ],
            "recommendations": [
                "Implement AI-suggested story points for 90%+ accuracy",
                "Use workload analysis before task assignment",
                "Schedule sprint review based on burndown predictions"
            ],
            "charts_data": {
                "velocity_trend": [15, 18, 22, 20, 25],
                "accuracy_over_time": [0.72, 0.78, 0.81, 0.84, 0.85],
                "risk_distribution": {"low": 60, "medium": 30, "high": 10}
            }
        }
        
        return AIResponse(success=True, data=report)
        
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 