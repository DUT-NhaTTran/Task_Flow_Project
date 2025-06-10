from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn

app = FastAPI(title="AI Test Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TaskData(BaseModel):
    title: str
    description: Optional[str] = ""

class TaskRequest(BaseModel):
    task: TaskData

@app.get("/")
def root():
    return {"message": "AI Service Test", "status": "running"}

@app.post("/estimate")
def estimate(request: TaskRequest):
    task = request.task
    # Simple estimation logic based on title and description length
    title_len = len(task.title) if task.title else 0
    desc_len = len(task.description) if task.description else 0
    
    # Basic estimation: 1-8 story points based on content complexity
    total_length = title_len + desc_len
    if total_length < 50:
        points = 1
    elif total_length < 100:
        points = 2
    elif total_length < 200:
        points = 3
    elif total_length < 300:
        points = 5
    else:
        points = 8
    
    return {
        "estimated_story_points": points,
        "confidence": 0.7,
        "reasoning": f"Based on task complexity and length ({total_length} characters)",
        "features_used": {"title_length": title_len, "desc_length": desc_len}
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8088) 