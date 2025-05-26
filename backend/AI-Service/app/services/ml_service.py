import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_absolute_error
from typing import Dict, List, Any, Optional
import os
from datetime import datetime, timedelta
from loguru import logger
import openai
from transformers import pipeline
import httpx

from app.core.config import settings
from app.models.schemas import (
    StoryPointPrediction, 
    CompletionProbability, 
    TaskClassification,
    SprintAnalysis,
    WorkloadAnalysis
)

class MLService:
    def __init__(self):
        self.models = {}
        self.model_path = settings.MODEL_CACHE_DIR
        os.makedirs(self.model_path, exist_ok=True)
        
        # Initialize OpenAI
        if settings.OPENAI_API_KEY:
            openai.api_key = settings.OPENAI_API_KEY
            
        # Initialize HuggingFace classifier
        self.text_classifier = None
        
    async def initialize_models(self):
        """Initialize or load pre-trained models"""
        try:
            # Load existing models or create new ones
            await self._load_or_create_story_point_model()
            await self._load_or_create_completion_model()
            await self._initialize_text_classifier()
            
            logger.info("✅ All ML models initialized successfully")
        except Exception as e:
            logger.error(f"❌ Error initializing models: {e}")
            
    async def _load_or_create_story_point_model(self):
        """Load or create story point prediction model"""
        model_file = os.path.join(self.model_path, "story_point_model.pkl")
        
        if os.path.exists(model_file):
            self.models['story_points'] = joblib.load(model_file)
            logger.info("📦 Loaded existing story point model")
        else:
            # Create and train new model with synthetic data
            self.models['story_points'] = RandomForestRegressor(
                n_estimators=100, 
                random_state=42
            )
            await self._train_story_point_model()
            
    async def _load_or_create_completion_model(self):
        """Load or create task completion probability model"""
        model_file = os.path.join(self.model_path, "completion_model.pkl")
        
        if os.path.exists(model_file):
            self.models['completion'] = joblib.load(model_file)
            logger.info("📦 Loaded existing completion model")
        else:
            self.models['completion'] = RandomForestClassifier(
                n_estimators=100, 
                random_state=42
            )
            await self._train_completion_model()
            
    async def _initialize_text_classifier(self):
        """Initialize HuggingFace text classifier"""
        try:
            self.text_classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli"
            )
            logger.info("🤗 HuggingFace classifier initialized")
        except Exception as e:
            logger.warning(f"⚠️ Could not load HuggingFace model: {e}")
            
    async def predict_story_points(self, title: str, description: str = "", project_id: str = "", assignee_id: str = None) -> StoryPointPrediction:
        """Predict story points for a task"""
        try:
            # Get assignee's historical data and current workload if available
            assignee_history = None
            current_workload = None
            if assignee_id:
                assignee_history = await self._get_assignee_history(assignee_id)
                current_workload = await self._get_assignee_workload(assignee_id)

            # Feature extraction
            features = self._extract_task_features(title, description)
            
            # Add assignee features if available
            if assignee_history:
                features.extend([
                    assignee_history['avg_story_points'],
                    assignee_history['avg_completion_time'],
                    assignee_history['completion_rate'],
                    current_workload['total_points']
                ])
            
            # Get similar tasks from database
            similar_tasks = await self._get_similar_tasks(title, project_id)
            
            if 'story_points' in self.models:
                # Use ML model prediction
                predicted_points = int(self.models['story_points'].predict([features])[0])
                confidence = 0.8
            else:
                # Fallback to enhanced rule-based prediction
                predicted_points = await self._enhanced_rule_based_story_points(
                    title, 
                    description, 
                    assignee_history,
                    current_workload
                )
                confidence = 0.6
                
            # Adjust prediction based on assignee's history and workload
            if assignee_history:
                predicted_points = await self._adjust_prediction_for_assignee(
                    predicted_points,
                    assignee_history,
                    current_workload
                )
                
            # Get reasoning from OpenAI if available
            reasoning = await self._get_openai_reasoning_with_history(
                title, 
                description, 
                predicted_points,
                assignee_history,
                current_workload
            )
            
            return StoryPointPrediction(
                predicted_points=max(1, min(13, predicted_points)),
                confidence=confidence,
                reasoning=reasoning,
                similar_tasks=similar_tasks[:3]
            )
            
        except Exception as e:
            logger.error(f"Error predicting story points: {e}")
            return StoryPointPrediction(
                predicted_points=3,
                confidence=0.5,
                reasoning="Default prediction due to error",
                similar_tasks=[]
            )
            
    async def predict_task_completion(self, task_data: Dict[str, Any]) -> CompletionProbability:
        """Predict task completion probability"""
        try:
            # Extract features for completion prediction
            features = self._extract_completion_features(task_data)
            
            if 'completion' in self.models:
                probability = self.models['completion'].predict_proba([features])[0][1]
            else:
                probability = self._rule_based_completion_probability(task_data)
                
            # Determine risk level
            if probability >= 0.8:
                risk_level = "LOW"
            elif probability >= 0.6:
                risk_level = "MEDIUM"
            else:
                risk_level = "HIGH"
                
            # Generate factors and recommendations
            factors = self._analyze_completion_factors(task_data)
            recommendations = self._generate_completion_recommendations(task_data, probability)
            
            return CompletionProbability(
                probability=probability,
                risk_level=risk_level,
                factors=factors,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"Error predicting completion: {e}")
            return CompletionProbability(
                probability=0.7,
                risk_level="MEDIUM",
                factors=["Unable to analyze"],
                recommendations=["Monitor task progress"]
            )
            
    async def classify_task(self, title: str, description: str = "") -> TaskClassification:
        """Classify task into categories and tags"""
        try:
            text = f"{title}. {description}".strip()
            
            # Predefined categories
            categories = [
                "bug", "feature", "enhancement", "documentation", 
                "testing", "refactoring", "deployment", "research"
            ]
            
            tags = [
                "frontend", "backend", "database", "ui/ux", "api",
                "urgent", "easy", "complex", "breaking-change"
            ]
            
            if self.text_classifier:
                # HuggingFace classification
                category_result = self.text_classifier(text, categories)
                tag_result = self.text_classifier(text, tags)
                
                # Extract results
                main_category = category_result['labels'][0]
                predicted_tags = [
                    label for label, score in zip(tag_result['labels'], tag_result['scores'])
                    if score > 0.3  # Confidence threshold
                ][:3]  # Max 3 tags
                
                confidence_scores = {
                    label: score for label, score in 
                    zip(category_result['labels'], category_result['scores'])
                }
                
            else:
                # Fallback rule-based classification
                main_category, predicted_tags, confidence_scores = self._rule_based_classification(title, description)
                
            return TaskClassification(
                tags=predicted_tags,
                confidence_scores=confidence_scores,
                category=main_category
            )
            
        except Exception as e:
            logger.error(f"Error classifying task: {e}")
            return TaskClassification(
                tags=["general"],
                confidence_scores={"general": 0.5},
                category="feature"
            )
            
    async def analyze_sprint(self, sprint_data: Dict[str, Any]) -> SprintAnalysis:
        """Analyze sprint success probability"""
        try:
            # Get team velocity and historical data
            team_velocity = await self._get_team_velocity(sprint_data['project_id'], sprint_data['team_members'])
            
            # Calculate success probability
            total_points = sprint_data['total_story_points']
            estimated_capacity = team_velocity * (sprint_data['sprint_duration_days'] / 14)  # 2-week sprint baseline
            
            success_probability = min(1.0, estimated_capacity / total_points)
            predicted_completion_rate = min(1.0, estimated_capacity / total_points)
            
            # Analyze risk factors
            risk_factors = []
            if total_points > estimated_capacity * 1.2:
                risk_factors.append("Sprint appears overloaded")
            if len(sprint_data['team_members']) < 3:
                risk_factors.append("Small team size may impact delivery")
                
            # Generate recommendations
            recommendations = []
            if success_probability < 0.7:
                recommendations.append(f"Consider reducing scope by {int((total_points - estimated_capacity) * 0.8)} points")
            if success_probability > 0.9:
                recommendations.append("Sprint has room for additional work")
                
            # Analyze individual workloads
            individual_workloads = await self._analyze_individual_workloads(
                sprint_data['team_members'], 
                total_points,
                sprint_data['project_id']
            )
            
            return SprintAnalysis(
                success_probability=success_probability,
                predicted_completion_rate=predicted_completion_rate,
                risk_factors=risk_factors,
                recommendations=recommendations,
                individual_workloads=individual_workloads
            )
            
        except Exception as e:
            logger.error(f"Error analyzing sprint: {e}")
            return SprintAnalysis(
                success_probability=0.7,
                predicted_completion_rate=0.7,
                risk_factors=["Unable to analyze"],
                recommendations=["Monitor sprint progress closely"],
                individual_workloads={}
            )
            
    # Helper methods
    def _extract_task_features(self, title: str, description: str) -> List[float]:
        """Extract numerical features from task text"""
        features = [
            len(title.split()),  # Title word count
            len(description.split()) if description else 0,  # Description word count
            len(title),  # Title character count
            title.lower().count('bug'),  # Bug keywords
            title.lower().count('fix'),
            title.lower().count('implement'),
            title.lower().count('add'),
            title.lower().count('create'),
            description.lower().count('complex') if description else 0,
            description.lower().count('simple') if description else 0,
        ]
        return features
        
    def _rule_based_story_points(self, title: str, description: str) -> int:
        """Rule-based story point estimation"""
        points = 3  # Base points
        
        # Adjust based on keywords
        if any(word in title.lower() for word in ['bug', 'fix', 'hotfix']):
            points = 2
        elif any(word in title.lower() for word in ['implement', 'create', 'build']):
            points = 5
        elif any(word in title.lower() for word in ['refactor', 'optimize']):
            points = 8
            
        # Adjust based on description length
        if description:
            if len(description.split()) > 50:
                points += 2
            elif len(description.split()) < 10:
                points = max(1, points - 1)
                
        return min(13, max(1, points))
        
    async def _get_openai_reasoning(self, title: str, description: str, predicted_points: int) -> str:
        """Get reasoning from OpenAI"""
        if not settings.OPENAI_API_KEY:
            return f"Predicted {predicted_points} points based on task complexity analysis"
            
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a project manager estimating story points. Explain your reasoning briefly."
                    },
                    {
                        "role": "user", 
                        "content": f"Task: {title}\nDescription: {description}\nEstimated: {predicted_points} points\nWhy?"
                    }
                ],
                max_tokens=100
            )
            return response.choices[0].message.content.strip()
        except:
            return f"Predicted {predicted_points} points based on task complexity analysis"
            
    async def _get_similar_tasks(self, title: str, project_id: str) -> List[Dict[str, Any]]:
        """Get similar tasks from the database"""
        # This would query the Tasks-Service for similar tasks
        # For now, return empty list
        return []
        
    # Additional helper methods would be implemented here...
    
    def _extract_completion_features(self, task_data: Dict[str, Any]) -> List[float]:
        """Extract features for completion prediction"""
        # Implementation would extract relevant features
        return [0.5, 0.7, 0.3]  # Placeholder
        
    def _rule_based_completion_probability(self, task_data: Dict[str, Any]) -> float:
        """Rule-based completion probability"""
        return 0.75  # Placeholder
        
    def _analyze_completion_factors(self, task_data: Dict[str, Any]) -> List[str]:
        """Analyze factors affecting completion"""
        return ["Task complexity", "Team availability"]  # Placeholder
        
    def _generate_completion_recommendations(self, task_data: Dict[str, Any], probability: float) -> List[str]:
        """Generate recommendations"""
        return ["Monitor progress daily"]  # Placeholder 

    async def _get_assignee_history(self, assignee_id: str) -> Dict[str, Any]:
        """Get assignee's historical performance data"""
        try:
            # Query the database for completed tasks by this assignee
            query = """
                SELECT 
                    AVG(actual_story_points) as avg_story_points,
                    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_completion_time,
                    COUNT(CASE WHEN status = 'COMPLETED' AND completed_at <= due_date THEN 1 END)::float / 
                        NULLIF(COUNT(*), 0) as completion_rate
                FROM training_data
                WHERE assignee_id = :assignee_id
                AND status = 'COMPLETED'
                AND completed_at IS NOT NULL
            """
            
            async with self.db.acquire() as conn:
                result = await conn.fetch_one(query, {"assignee_id": assignee_id})
                
            if result:
                return {
                    "avg_story_points": float(result["avg_story_points"] or 3),
                    "avg_completion_time": float(result["avg_completion_time"] or 24),
                    "completion_rate": float(result["completion_rate"] or 0.8)
                }
            return None
            
        except Exception as e:
            logger.error(f"Error getting assignee history: {e}")
            return None
        
    async def _get_assignee_workload(self, assignee_id: str) -> Dict[str, Any]:
        """Get assignee's current workload"""
        try:
            # Query current active tasks
            query = """
                SELECT 
                    COUNT(*) as active_tasks,
                    SUM(story_points) as total_points
                FROM tasks
                WHERE assignee_id = :assignee_id
                AND status IN ('TODO', 'IN_PROGRESS')
            """
            
            async with self.db.acquire() as conn:
                result = await conn.fetch_one(query, {"assignee_id": assignee_id})
                
            if result:
                return {
                    "active_tasks": int(result["active_tasks"] or 0),
                    "total_points": int(result["total_points"] or 0)
                }
            return {"active_tasks": 0, "total_points": 0}
            
        except Exception as e:
            logger.error(f"Error getting assignee workload: {e}")
            return {"active_tasks": 0, "total_points": 0}

    async def _enhanced_rule_based_story_points(
        self, 
        title: str, 
        description: str,
        assignee_history: Optional[Dict[str, Any]],
        current_workload: Optional[Dict[str, Any]]
    ) -> int:
        """Enhanced rule-based story point estimation including assignee factors"""
        points = await self._rule_based_story_points(title, description)
        
        if assignee_history:
            # Adjust based on assignee's historical performance
            if assignee_history['avg_story_points'] > points * 1.5:
                # Assignee typically handles larger tasks
                points = min(13, points + 2)
            elif assignee_history['avg_story_points'] < points * 0.5:
                # Assignee typically handles smaller tasks
                points = max(1, points - 2)
                
            # Adjust based on completion rate
            if assignee_history['completion_rate'] < 0.6:
                # Lower completion rate suggests underestimation
                points = min(13, points + 1)
                
        if current_workload:
            # Consider current workload impact
            if current_workload['total_points'] > 20:
                # High workload might affect performance
                points = min(13, points + 1)
                
        return points

    async def _adjust_prediction_for_assignee(
        self,
        predicted_points: int,
        assignee_history: Dict[str, Any],
        current_workload: Dict[str, Any]
    ) -> int:
        """Adjust prediction based on assignee's history and current workload"""
        adjustment = 0
        
        # Historical performance adjustment
        if assignee_history:
            performance_ratio = assignee_history['avg_story_points'] / predicted_points
            if performance_ratio > 1.3:  # Historically takes longer
                adjustment += 1
            elif performance_ratio < 0.7:  # Historically faster
                adjustment -= 1
                
            # Completion rate impact
            if assignee_history['completion_rate'] < 0.7:
                adjustment += 1
                
        # Workload impact
        if current_workload:
            if current_workload['total_points'] > 20:  # High workload
                adjustment += 1
            elif current_workload['total_points'] < 8:  # Low workload
                adjustment -= 1
                
        return max(1, min(13, predicted_points + adjustment))

    async def _get_openai_reasoning_with_history(
        self,
        title: str,
        description: str,
        predicted_points: int,
        assignee_history: Optional[Dict[str, Any]],
        current_workload: Optional[Dict[str, Any]]
    ) -> str:
        """Get enhanced reasoning from OpenAI including assignee factors"""
        if not settings.OPENAI_API_KEY:
            return self._generate_reasoning_with_history(
                predicted_points,
                assignee_history,
                current_workload
            )
            
        try:
            context = f"Task: {title}\nDescription: {description}\n"
            if assignee_history:
                context += f"\nAssignee History:\n"
                context += f"- Average story points: {assignee_history['avg_story_points']}\n"
                context += f"- Completion rate: {assignee_history['completion_rate']*100}%\n"
            if current_workload:
                context += f"\nCurrent Workload:\n"
                context += f"- Active tasks: {current_workload['active_tasks']}\n"
                context += f"- Total points: {current_workload['total_points']}\n"
                
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a project manager estimating story points. Consider both task complexity and assignee factors in your reasoning."
                    },
                    {
                        "role": "user",
                        "content": f"{context}\nEstimated: {predicted_points} points\nWhy?"
                    }
                ],
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        except:
            return self._generate_reasoning_with_history(
                predicted_points,
                assignee_history,
                current_workload
            )

    def _generate_reasoning_with_history(
        self,
        predicted_points: int,
        assignee_history: Optional[Dict[str, Any]],
        current_workload: Optional[Dict[str, Any]]
    ) -> str:
        """Generate reasoning when OpenAI is not available"""
        reasoning = f"Predicted {predicted_points} points based on task complexity"
        
        if assignee_history:
            reasoning += f". Assignee historically averages {assignee_history['avg_story_points']:.1f} points"
            reasoning += f" with {assignee_history['completion_rate']*100:.0f}% completion rate"
            
        if current_workload:
            reasoning += f". Current workload: {current_workload['total_points']} points"
            
        return reasoning 