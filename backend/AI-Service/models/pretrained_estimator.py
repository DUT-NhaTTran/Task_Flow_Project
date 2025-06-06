import pandas as pd
import numpy as np
import joblib
import os
from typing import Dict, List, Any, Optional, Tuple
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import logging

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print("⚠️ sentence-transformers not available. Using fallback model.")

from utils.text_preprocessor import TextPreprocessor

logger = logging.getLogger(__name__)

class PretrainedStoryPointEstimator:
    """Story Point Estimation using Pretrained Language Models + Lightweight Head"""
    
    def __init__(self, model_path: str = "data/models"):
        self.model_path = model_path
        self.preprocessor = TextPreprocessor()
        self.scaler = StandardScaler()
        
        # Pretrained sentence transformer model
        self.sentence_model = None
        self.prediction_model = RandomForestRegressor(
            n_estimators=50,  # Smaller for limited data
            max_depth=8,
            min_samples_split=3,
            min_samples_leaf=2,
            random_state=42
        )
        
        # Fallback lightweight model
        self.fallback_model = Ridge(alpha=1.0, random_state=42)
        
        self.is_fitted = False
        self.feature_names = []
        self.training_stats = {}
        
        # Story point scale
        self.story_point_scale = [1, 2, 3, 5, 8, 13, 21]
        
        # Create model directory
        os.makedirs(model_path, exist_ok=True)
        
        # Initialize pretrained model
        self._initialize_pretrained_model()
        
        # Load existing model if available
        self._load_model()

    def _initialize_pretrained_model(self):
        """Initialize the pretrained sentence transformer model"""
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            logger.warning("Sentence Transformers not available, using fallback approach")
            return
            
        try:
            # Use a lightweight, efficient model good for short texts
            logger.info("Loading pretrained sentence transformer model...")
            self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("✅ Pretrained model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load pretrained model: {e}")
            self.sentence_model = None

    def _get_pretrained_embeddings(self, texts: List[str]) -> np.ndarray:
        """Get embeddings from pretrained model"""
        if self.sentence_model is None:
            # Fallback to simple TF-IDF if pretrained model not available
            logger.warning("Using TF-IDF fallback instead of pretrained embeddings")
            self.preprocessor.fit_tfidf(texts)
            embeddings = []
            for text in texts:
                tfidf_features = self.preprocessor.get_tfidf_features(text)
                if len(tfidf_features) == 0:
                    embeddings.append(np.zeros(100))  # Default dimension
                else:
                    embeddings.append(tfidf_features[:100])  # Limit dimension
            return np.array(embeddings)
        
        try:
            # Get embeddings from pretrained model
            embeddings = self.sentence_model.encode(texts, show_progress_bar=False)
            return embeddings
        except Exception as e:
            logger.error(f"Error getting embeddings: {e}")
            # Fallback
            return np.random.rand(len(texts), 384)  # all-MiniLM-L6-v2 has 384 dimensions

    def _prepare_features(self, title: str, description: str = "", 
                         estimated_hours: Optional[float] = None,
                         complexity: Optional[str] = None,
                         priority: Optional[str] = None,
                         assignee_history: Optional[List[Dict[str, Any]]] = None,
                         attachments_count: Optional[int] = None) -> np.ndarray:
        """Prepare features focusing on objective factors"""
        
        # Get base features from description only
        embeddings = self._get_pretrained_embeddings([description])[0] if description else np.zeros(384)
        text_features = self.preprocessor.calculate_text_features("", description)  # Ignore title
        
        # Create weighted feature vector
        feature_vector = []
        
        # Add embeddings with increased weight for description
        embeddings_weighted = embeddings * 1.2  # Increase impact of description semantics
        feature_vector.extend(embeddings_weighted)
        
        # Add weighted custom features
        feature_vector.extend([
            text_features['description_length'] * 1.2,     # Increase impact of description length
            text_features['word_count'] * 0.8,            # Keep word count with reduced weight
            text_features['complexity_high'] * 1.2,       # Keep high complexity impact
            text_features['complexity_medium'],           # Keep medium complexity as is
            text_features['complexity_low'] * 0.8,        # Keep low complexity reduced
            text_features['has_ui_words'] * 0.9,         # Slightly reduce UI impact
            text_features['has_backend_words'] * 1.1,     # Slightly increase backend impact
            text_features['has_integration_words'] * 1.2, # Increase integration impact
        ])
        
        # Add attachments count with significant weight
        if attachments_count is not None:
            feature_vector.append(min(attachments_count * 1.5, 10.0))  # Cap at 10 attachments
        else:
            feature_vector.append(0)
            
        # Add assignee history features
        avg_story_points = 0
        if assignee_history and len(assignee_history) > 0:
            completed_points = [task['story_points'] for task in assignee_history if task.get('status') == 'DONE']
            if completed_points:
                avg_story_points = sum(completed_points) / len(completed_points)
        feature_vector.append(avg_story_points * 1.3)  # Give high weight to historical performance
        
        # Add priority with increased weight
        if priority is not None:
            priority_value = self.preprocessor._encode_priority(priority)
            feature_vector.append(priority_value * 1.2)  # Increase priority impact
        else:
            feature_vector.append(2)  # Default to medium
        
        return np.array(feature_vector).reshape(1, -1)

    def _map_to_fibonacci(self, prediction: float) -> int:
        """Map prediction to Fibonacci with conservative rounding"""
        prediction = max(1, prediction)  # Minimum 1 point
        
        # Conservative rounding - bias towards lower story points
        if prediction <= 1.5:
            return 1
        elif prediction <= 2.5:
            return 2
        elif prediction <= 4:
            return 3
        elif prediction <= 6.5:
            return 5
        elif prediction <= 10.5:
            return 8
        elif prediction <= 17:
            return 13
        else:
            return 21

    def _get_default_training_data(self) -> List[Dict[str, Any]]:
        """Default training data optimized for conservative estimates"""
        return [
            # 1 Point Tasks (Very Simple)
            {"title": "Fix typo in text", "description": "Update incorrect spelling in error message", "storyPoint": 1},
            {"title": "Update button color", "description": "Change button color according to design", "storyPoint": 1},
            {"title": "Add loading text", "description": "Show 'Loading...' text during API calls", "storyPoint": 1},
            
            # 2 Point Tasks (Simple)
            {"title": "Add form validation", "description": "Add basic email and required field validation", "storyPoint": 2},
            {"title": "Create error message", "description": "Show error message when API call fails", "storyPoint": 2},
            {"title": "Update API endpoint", "description": "Change API endpoint URL and update tests", "storyPoint": 2},
            
            # 3 Point Tasks (Medium)
            {"title": "Implement pagination", "description": "Add basic pagination to data table", "storyPoint": 3},
            {"title": "Add sort function", "description": "Enable sorting by column in table", "storyPoint": 3},
            {"title": "Create modal dialog", "description": "Build reusable modal component", "storyPoint": 3},
            
            # 5 Point Tasks (Complex)
            {"title": "File upload feature", "description": "Add file upload with preview and validation", "storyPoint": 5},
            {"title": "User authentication", "description": "Implement basic login/logout with JWT", "storyPoint": 5},
            {"title": "Data export function", "description": "Add CSV/Excel export for table data", "storyPoint": 5},
            
            # 8 Point Tasks (Very Complex)
            {"title": "OAuth integration", "description": "Add Google OAuth login with user profile", "storyPoint": 8},
            {"title": "Real-time updates", "description": "Add WebSocket for live data updates", "storyPoint": 8},
            
            # 13 Point Tasks (Major Features)
            {"title": "Payment system", "description": "Integrate payment gateway with subscription", "storyPoint": 13},
            
            # 21 Point Tasks (System Changes)
            {"title": "Database migration", "description": "Migrate database to new schema with zero downtime", "storyPoint": 21}
        ]

    def train(self, training_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Train the model with provided data"""
        try:
            # Combine provided data with default data for better coverage
            default_data = self._get_default_training_data()
            
            if not training_data or len(training_data) < 10:
                logger.info("Limited training data provided, using enriched default dataset")
                combined_data = default_data + (training_data if training_data else [])
            else:
                logger.info(f"Training with {len(training_data)} provided samples + {len(default_data)} default samples")
                combined_data = training_data + default_data
            
            # Prepare training data
            df = self.preprocessor.prepare_training_data(combined_data)
            logger.info(f"Training with {len(df)} total samples")
            
            # Prepare features and targets
            texts = []
            features = []
            targets = []
            
            for _, row in df.iterrows():
                combined_text = f"{row['title']} {row['description']}"
                texts.append(combined_text)
                targets.append(row['story_points'])
            
            # Get pretrained embeddings for all texts at once (more efficient)
            embeddings = self._get_pretrained_embeddings(texts)
            
            # Prepare feature vectors
            for i, (_, row) in enumerate(df.iterrows()):
                # Get embedding for this text
                embedding = embeddings[i]
                
                # Get custom features
                text_features = self.preprocessor.calculate_text_features(row['title'], row['description'])
                
                # Combine features
                feature_vector = list(embedding) + [
                    text_features['title_length'],
                    text_features['description_length'], 
                    text_features['word_count'],
                    text_features['complexity_high'],
                    text_features['complexity_medium'],
                    text_features['complexity_low'],
                    text_features['has_ui_words'],
                    text_features['has_backend_words'],
                    text_features['has_integration_words'],
                    row.get('estimated_hours', 0),
                    row.get('complexity_level', 2),
                    row.get('priority_level', 2)
                ]
                
                features.append(feature_vector)
            
            X = np.array(features)
            y = np.array(targets)
            
            # Split data for validation
            if len(X) > 10:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
            else:
                X_train, X_test, y_train, y_test = X, X, y, y
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train main model
            self.prediction_model.fit(X_train_scaled, y_train)
            
            # Train fallback model
            self.fallback_model.fit(X_train_scaled, y_train)
            
            # Evaluate
            y_pred = self.prediction_model.predict(X_test_scaled)
            
            mae = mean_absolute_error(y_test, y_pred)
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            self.training_stats = {
                'samples': len(X),
                'features': X.shape[1],
                'mae': float(mae),
                'mse': float(mse),
                'r2': float(r2),
                'rmse': float(np.sqrt(mse)),
                'pretrained_model': 'all-MiniLM-L6-v2' if self.sentence_model else 'TF-IDF fallback'
            }
            
            self.is_fitted = True
            
            # Save model
            self._save_model()
            
            logger.info(f"✅ Pretrained model trained successfully. MAE: {mae:.2f}, R²: {r2:.2f}")
            return self.training_stats
            
        except Exception as e:
            logger.error(f"Error during training: {e}")
            raise

    def estimate(self, title: str, description: str = "",
                estimated_hours: Optional[float] = None,
                complexity: Optional[str] = None,
                priority: Optional[str] = None,
                assignee_history: Optional[List[Dict[str, Any]]] = None,
                attachments_count: Optional[int] = None) -> Dict[str, Any]:
        """Estimate story points with focus on objective factors"""
        if not self.is_fitted:
            raise ValueError("Model not trained yet")
            
        # Prepare features with new objective factors
        features = self._prepare_features(
            title=title,
            description=description,
            estimated_hours=estimated_hours,
            complexity=complexity,
            priority=priority,
            assignee_history=assignee_history,
            attachments_count=attachments_count
        )
            
        # Get raw prediction
        if self.sentence_model is not None:
            raw_prediction = self.prediction_model.predict(features)[0]
        else:
            # Fallback model
            raw_prediction = self.fallback_model.predict(features)[0]
            
            # Map to Fibonacci scale
        story_points = self._map_to_fibonacci(raw_prediction)
            
        # Calculate confidence based on objective factors
        confidence = 0.7  # Base confidence
        
        # Adjust confidence based on available information
        if not description:
            confidence *= 0.6  # Significant reduction if no description
        if attachments_count and attachments_count > 0:
            confidence *= 1.2  # Increase confidence if attachments present
        if assignee_history and len(assignee_history) > 0:
            confidence *= 1.3  # Increase confidence if we have assignee history
        if priority:
            confidence *= 1.1  # Slight increase if priority is specified
            
        # Cap confidence
        confidence = min(max(confidence, 0.3), 0.95)
            
            # Generate reasoning
        reasoning = self._generate_reasoning(title, description, story_points, raw_prediction)
            
            return {
            "estimated_story_points": story_points,
            "confidence": confidence,
                "reasoning": reasoning,
            "raw_prediction": float(raw_prediction)
        }

    def _generate_reasoning(self, title: str, description: str, 
                          prediction: int, raw_prediction: float) -> str:
        """Generate human-readable reasoning"""
        
        combined_text = f"{title} {description}".lower()
        reasons = []
        
        # Analysis based on prediction range
        if prediction <= 2:
            reasons.append("Simple task with minimal complexity")
        elif prediction <= 5:
            reasons.append("Standard development work")
        elif prediction <= 8:
            reasons.append("Complex feature requiring significant effort")
        else:
            reasons.append("Large-scale implementation or system change")
        
        # Technical domain analysis
        if any(word in combined_text for word in ['ui', 'frontend', 'design', 'css', 'html']):
            reasons.append("Frontend/UI development identified")
        if any(word in combined_text for word in ['backend', 'api', 'database', 'server']):
            reasons.append("Backend development required")
        if any(word in combined_text for word in ['integration', 'connect', 'sync']):
            reasons.append("System integration involved")
        if any(word in combined_text for word in ['test', 'testing', 'unit']):
            reasons.append("Testing components included")
        
        # Complexity indicators
        if any(word in combined_text for word in ['complex', 'advanced', 'sophisticated']):
            reasons.append("High complexity indicators present")
        elif any(word in combined_text for word in ['simple', 'basic', 'minor']):
            reasons.append("Low complexity indicators present")
        
        # Model type info
        model_info = "using pretrained language model" if self.sentence_model else "using fallback model"
        
        if not reasons:
            reasons.append("Based on similar tasks in training data")

        # ✅ Add warnings about missing information
        if not description.strip():
            reasons.append("Warning: No description provided - estimation may be less accurate")
        elif len(description.strip()) < 50:
            reasons.append("Warning: Description is very brief - consider adding more details")

        if len(title.strip()) < 10:
            reasons.append("Warning: Title is very short - consider being more descriptive")
        
        return f"Estimated {prediction} story points {model_info}. " + ". ".join(reasons) + "."

    def retrain_with_existing_data(self) -> Dict[str, Any]:
        """Retrain model with default data"""
        logger.info("Retraining with default dataset")
        return self.train([])

    def is_trained(self) -> bool:
        """Check if model is trained"""
        return self.is_fitted

    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "is_trained": self.is_fitted,
            "training_stats": self.training_stats,
            "model_type": "pretrained_hybrid",
            "pretrained_model": "all-MiniLM-L6-v2" if self.sentence_model else "TF-IDF fallback",
            "story_point_scale": self.story_point_scale,
            "sentence_transformers_available": SENTENCE_TRANSFORMERS_AVAILABLE
        }

    def _save_model(self):
        """Save trained model to disk"""
        try:
            model_data = {
                'prediction_model': self.prediction_model,
                'fallback_model': self.fallback_model,
                'scaler': self.scaler,
                'preprocessor': self.preprocessor,
                'training_stats': self.training_stats,
                'is_fitted': self.is_fitted,
                'sentence_model_name': 'all-MiniLM-L6-v2' if self.sentence_model else None
            }
            
            joblib.dump(model_data, os.path.join(self.model_path, 'pretrained_story_point_model.pkl'))
            logger.info("✅ Pretrained model saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving model: {e}")

    def _load_model(self):
        """Load trained model from disk"""
        try:
            model_file = os.path.join(self.model_path, 'pretrained_story_point_model.pkl')
            if os.path.exists(model_file):
                model_data = joblib.load(model_file)
                
                self.prediction_model = model_data['prediction_model']
                self.fallback_model = model_data['fallback_model']
                self.scaler = model_data['scaler']
                self.preprocessor = model_data['preprocessor']
                self.training_stats = model_data['training_stats']
                self.is_fitted = model_data['is_fitted']
                
                logger.info("✅ Pretrained model loaded successfully from disk")
            else:
                logger.info("No existing pretrained model found, will train on first use")
                
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self.is_fitted = False 