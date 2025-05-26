import os
from typing import Optional

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://localhost/taskflow")
    
    # AI Services
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    HUGGINGFACE_API_KEY: Optional[str] = os.getenv("HUGGINGFACE_API_KEY")
    
    # Server
    PORT: int = int(os.getenv("PORT", 8088))
    
    # Paths (use /tmp for Render compatibility)
    MODEL_CACHE_DIR: str = os.getenv("MODEL_CACHE_DIR", "/tmp/models")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp/uploads")
    
    # Other Services URLs (for inter-service communication)
    TASKS_SERVICE_URL: str = os.getenv("TASKS_SERVICE_URL", "http://localhost:8084")
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://localhost:8081")
    PROJECTS_SERVICE_URL: str = os.getenv("PROJECTS_SERVICE_URL", "http://localhost:8083")
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # CORS
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",  # Local development
        "https://taskflow-frontend.onrender.com",  # Production frontend
        "https://*.onrender.com"  # All Render subdomains
    ]

settings = Settings() 