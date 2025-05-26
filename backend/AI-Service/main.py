from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from loguru import logger

from app.core.config import settings
from app.api.routes import predictions, analytics, health
from app.core.database import init_db
from app.services.ml_service import MLService

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting AI Service...")
    
    # Initialize database
    await init_db()
    
    # Initialize ML models
    ml_service = MLService()
    await ml_service.initialize_models()
    
    logger.info("✅ AI Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down AI Service...")

app = FastAPI(
    title="TaskFlow AI Service",
    description="AI-powered project management analytics and predictions",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for production and development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])

@app.get("/")
async def root():
    return {
        "message": "TaskFlow AI Service", 
        "version": "1.0.0",
        "status": "running",
        "environment": settings.ENVIRONMENT
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "service": "ai-service",
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    ) 