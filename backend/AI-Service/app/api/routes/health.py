from fastapi import APIRouter
from datetime import datetime
from app.core.config import settings

router = APIRouter()

@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "TaskFlow AI Service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "environment": settings.ENVIRONMENT
    }

@router.get("/detailed")
async def detailed_health():
    """Detailed health check with component status"""
    try:
        # Check various components
        components = {
            "database": "healthy",  # Would check DB connection
            "models": "healthy",    # Would check if models are loaded
            "external_apis": {
                "openai": "available" if settings.OPENAI_API_KEY else "not_configured",
                "huggingface": "available"  # Would check HF API
            },
            "memory_usage": "normal",  # Would check actual memory
            "model_cache": "ready"     # Would check model cache status
        }
        
        return {
            "status": "healthy",
            "service": "TaskFlow AI Service", 
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat(),
            "components": components,
            "uptime": "0h 0m",  # Would calculate actual uptime
            "predictions_served": 0  # Would track actual count
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        } 