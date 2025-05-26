from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
from loguru import logger

from app.core.config import settings

# Database setup
engine = create_engine(settings.DATABASE_URL, echo=settings.DEBUG)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

async def init_db():
    """Initialize database and create tables if they don't exist"""
    try:
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        logger.info("✅ Database connection successful")
        
        # Create tables if they don't exist
        await create_tables()
        
    except OperationalError as e:
        logger.warning(f"⚠️ Database connection failed: {e}")
        logger.info("AI Service will continue without database persistence")
    except Exception as e:
        logger.error(f"❌ Database initialization error: {e}")

async def create_tables():
    """Create necessary tables for AI service"""
    try:
        with engine.connect() as conn:
            # Create prediction_logs table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS prediction_logs (
                    id SERIAL PRIMARY KEY,
                    prediction_type VARCHAR(50) NOT NULL,
                    input_data JSONB,
                    output_data JSONB,
                    confidence FLOAT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Create model_performance table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS model_performance (
                    id SERIAL PRIMARY KEY,
                    model_name VARCHAR(100) NOT NULL,
                    accuracy FLOAT,
                    last_trained TIMESTAMP,
                    training_samples INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Create training_data table for ML models
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS training_data (
                    id SERIAL PRIMARY KEY,
                    task_id VARCHAR(50),
                    project_id VARCHAR(50),
                    title TEXT,
                    description TEXT,
                    actual_story_points INTEGER,
                    actual_completion_time INTEGER,
                    status VARCHAR(20),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            conn.commit()
            
        logger.info("✅ Database tables created successfully")
        
    except Exception as e:
        logger.error(f"❌ Error creating tables: {e}")

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 