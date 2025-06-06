import pandas as pd
import numpy as np
import joblib
import os
from typing import Dict, List, Any, Optional, Tuple
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import logging

from utils.text_preprocessor import TextPreprocessor

logger = logging.getLogger(__name__)

class StoryPointEstimator:
    """Advanced Story Point Estimation using ensemble ML methods"""
    
    def __init__(self, model_path: str = "data/models"):
        self.model_path = model_path
        self.preprocessor = TextPreprocessor()
        self.scaler = StandardScaler()
        
        # Ensemble models
        self.rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        self.gb_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42
        )
        
        self.lr_model = LinearRegression()
        
        # Model weights for ensemble
        self.model_weights = {
            'rf': 0.5,
            'gb': 0.3,
            'lr': 0.2
        }
        
        self.is_fitted = False
        self.feature_names = []
        self.training_stats = {}
        
        # Fibonacci sequence for story points
        self.story_point_scale = [1, 2, 3, 5, 8, 13, 21]
        
        # Create model directory if it doesn't exist
        os.makedirs(model_path, exist_ok=True)
        
        # Load existing model if available
        self._load_model()

    def _get_default_training_data(self) -> List[Dict[str, Any]]:
        """Get default training data for initial model training"""
        return [
            {
                "title": "Create user login page", 
                "description": "Implement user authentication with email and password validation, error handling, and remember me functionality",
                "storyPoint": 5
            },
            {
                "title": "Setup database schema", 
                "description": "Create comprehensive database tables for users, projects, tasks, and sprints with proper relationships and indexes",
                "storyPoint": 8
            },
            {
                "title": "Fix button alignment bug", 
                "description": "Fix minor CSS issue where submit button is not properly aligned in the form",
                "storyPoint": 1
            },
            {
                "title": "Add password reset functionality", 
                "description": "Allow users to reset password via email with secure token generation and validation",
                "storyPoint": 3
            },
            {
                "title": "Implement REST API for tasks", 
                "description": "Create comprehensive REST API endpoints for task CRUD operations with proper validation and error handling",
                "storyPoint": 5
            },
            {
                "title": "Design responsive dashboard", 
                "description": "Create responsive dashboard with charts, widgets, and real-time data updates using modern UI framework",
                "storyPoint": 8
            },
            {
                "title": "Update footer text", 
                "description": "Change copyright year in footer from 2023 to 2024",
                "storyPoint": 1
            },
            {
                "title": "Integrate payment gateway", 
                "description": "Integrate Stripe payment gateway with webhooks, subscription management, and error handling",
                "storyPoint": 13
            },
            {
                "title": "Add search functionality", 
                "description": "Implement search across projects and tasks with filters, sorting, and pagination",
                "storyPoint": 8
            },
            {
                "title": "Fix typo in error message", 
                "description": "Correct spelling mistake in validation error message",
                "storyPoint": 1
            },
            {
                "title": "Implement real-time notifications", 
                "description": "Add WebSocket-based real-time notifications system with push notifications and email alerts",
                "storyPoint": 13
            },
            {
                "title": "Create user profile page", 
                "description": "Build user profile page with avatar upload, settings, and preferences management",
                "storyPoint": 5
            },
            {
                "title": "Add export functionality", 
                "description": "Allow users to export project data to CSV, Excel, and PDF formats with custom formatting",
                "storyPoint": 8
            },
            {
                "title": "Optimize database queries", 
                "description": "Improve database performance by adding indexes, optimizing queries, and implementing query caching",
                "storyPoint": 8
            },
            {
                "title": "Update button color", 
                "description": "Change primary button color from blue to green as per design requirements",
                "storyPoint": 1
            },
            {
                "title": "Implement user roles and permissions", 
                "description": "Create comprehensive role-based access control system with admin, manager, and user roles",
                "storyPoint": 13
            },
            {
                "title": "Add drag and drop for tasks", 
                "description": "Implement drag and drop functionality for task management with visual feedback and validation",
                "storyPoint": 5
            },
            {
                "title": "Create mobile app", 
                "description": "Develop mobile application for iOS and Android with native features and offline capability",
                "storyPoint": 21
            },
            {
                "title": "Fix date picker validation", 
                "description": "Ensure date picker prevents selection of past dates and validates date ranges properly",
                "storyPoint": 3
            },
            {
                "title": "Implement advanced reporting", 
                "description": "Create comprehensive reporting system with charts, graphs, custom filters, and automated report generation",
                "storyPoint": 13
            }
        ]

    def _prepare_features(self, title: str, description: str = "", 
                         estimated_hours: Optional[float] = None,
                         complexity: Optional[str] = None,
                         priority: Optional[str] = None) -> np.ndarray:
        """Prepare features for prediction"""
        
        # Extract text features
        text_features = self.preprocessor.calculate_text_features(title, description)
        
        # Create feature vector
        feature_vector = []
        
        # Add text features in expected order
        feature_vector.extend([
            text_features['title_length'],
            text_features['description_length'],
            text_features['total_text_length'],
            text_features['word_count'],
            text_features['flesch_reading_ease'],
            text_features['flesch_kincaid_grade'],
            text_features['automated_readability_index'],
            text_features['complexity_high'],
            text_features['complexity_medium'],
            text_features['complexity_low'],
            text_features['effort_high_effort'],
            text_features['effort_medium_effort'],
            text_features['effort_low_effort'],
            text_features['has_ui_words'],
            text_features['has_backend_words'],
            text_features['has_integration_words'],
            text_features['has_testing_words']
        ])
        
        # Add optional features
        if estimated_hours is not None:
            feature_vector.append(estimated_hours)
        else:
            feature_vector.append(0)
            
        if complexity is not None:
            feature_vector.append(self.preprocessor._encode_complexity(complexity))
        else:
            feature_vector.append(2)  # default medium
            
        if priority is not None:
            feature_vector.append(self.preprocessor._encode_priority(priority))
        else:
            feature_vector.append(2)  # default medium
        
        # Add TF-IDF features if available
        combined_text = f"{title} {description}".strip()
        if self.preprocessor.tfidf_vectorizer is not None:
            tfidf_features = self.preprocessor.get_tfidf_features(combined_text)
            feature_vector.extend(tfidf_features)
        
        return np.array(feature_vector).reshape(1, -1)

    def _map_to_fibonacci(self, prediction: float) -> int:
        """Map continuous prediction to nearest Fibonacci number"""
        prediction = max(1, prediction)  # Ensure minimum of 1
        
        # Find closest Fibonacci number
        closest_fib = min(self.story_point_scale, 
                         key=lambda x: abs(x - prediction))
        
        return closest_fib

    def train(self, training_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Train the ensemble model with provided data"""
        try:
            if not training_data:
                logger.info("No training data provided, using default dataset")
                training_data = self._get_default_training_data()
            
            # Prepare training data
            df = self.preprocessor.prepare_training_data(training_data)
            logger.info(f"Training with {len(df)} samples")
            
            if len(df) < 5:
                logger.warning("Very small training dataset, adding default data")
                default_data = self._get_default_training_data()
                default_df = self.preprocessor.prepare_training_data(default_data)
                df = pd.concat([df, default_df], ignore_index=True)
            
            # Prepare TF-IDF features
            combined_texts = (df['title'] + ' ' + df['description']).tolist()
            self.preprocessor.fit_tfidf(combined_texts)
            
            # Extract features
            features = []
            targets = []
            
            for _, row in df.iterrows():
                feature_vector = self._prepare_features(
                    row['title'], 
                    row['description'],
                    row.get('estimated_hours'),
                    row.get('complexity_level'),
                    row.get('priority_level')
                )
                features.append(feature_vector[0])
                targets.append(row['story_points'])
            
            X = np.array(features)
            y = np.array(targets)
            
            # Store feature names
            self.feature_names = self.preprocessor.get_feature_names()
            self.feature_names.extend(['estimated_hours', 'complexity_level', 'priority_level'])
            
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
            
            # Train ensemble models
            self.rf_model.fit(X_train, y_train)
            self.gb_model.fit(X_train, y_train)
            self.lr_model.fit(X_train_scaled, y_train)
            
            # Evaluate models
            rf_pred = self.rf_model.predict(X_test)
            gb_pred = self.gb_model.predict(X_test)
            lr_pred = self.lr_model.predict(X_test_scaled)
            
            # Ensemble prediction
            ensemble_pred = (
                self.model_weights['rf'] * rf_pred +
                self.model_weights['gb'] * gb_pred +
                self.model_weights['lr'] * lr_pred
            )
            
            # Calculate metrics
            mae = mean_absolute_error(y_test, ensemble_pred)
            mse = mean_squared_error(y_test, ensemble_pred)
            r2 = r2_score(y_test, ensemble_pred)
            
            self.training_stats = {
                'samples': len(X),
                'features': len(self.feature_names),
                'mae': float(mae),
                'mse': float(mse),
                'r2': float(r2),
                'rmse': float(np.sqrt(mse))
            }
            
            self.is_fitted = True
            
            # Save model
            self._save_model()
            
            logger.info(f"Model trained successfully. MAE: {mae:.2f}, R²: {r2:.2f}")
            return self.training_stats
            
        except Exception as e:
            logger.error(f"Error during training: {e}")
            raise

    def estimate(self, title: str, description: str = "",
                estimated_hours: Optional[float] = None,
                complexity: Optional[str] = None,
                priority: Optional[str] = None) -> Dict[str, Any]:
        """Estimate story points for a given task"""
        
        if not self.is_fitted:
            logger.warning("Model not trained, using default training data")
            self.train([])
        
        try:
            # Prepare features
            X = self._prepare_features(title, description, estimated_hours, complexity, priority)
            X_scaled = self.scaler.transform(X)
            
            # Get predictions from ensemble
            rf_pred = self.rf_model.predict(X)[0]
            gb_pred = self.gb_model.predict(X)[0]
            lr_pred = self.lr_model.predict(X_scaled)[0]
            
            # Ensemble prediction
            ensemble_pred = (
                self.model_weights['rf'] * rf_pred +
                self.model_weights['gb'] * gb_pred +
                self.model_weights['lr'] * lr_pred
            )
            
            # Map to Fibonacci scale
            fibonacci_prediction = self._map_to_fibonacci(ensemble_pred)
            
            # Calculate confidence based on model agreement
            predictions = [rf_pred, gb_pred, lr_pred]
            std_dev = np.std(predictions)
            confidence = max(0.1, min(1.0, 1.0 - (std_dev / np.mean(predictions))))
            
            # Generate reasoning
            reasoning = self._generate_reasoning(title, description, fibonacci_prediction, X[0])
            
            return {
                "story_points": fibonacci_prediction,
                "confidence": float(confidence),
                "reasoning": reasoning,
                "features": {
                    "title_length": len(title),
                    "description_length": len(description),
                    "predicted_raw": float(ensemble_pred),
                    "model_predictions": {
                        "random_forest": float(rf_pred),
                        "gradient_boosting": float(gb_pred),
                        "linear_regression": float(lr_pred)
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Error during estimation: {e}")
            raise

    def _generate_reasoning(self, title: str, description: str, 
                          prediction: int, features: np.ndarray) -> str:
        """Generate human-readable reasoning for the estimation"""
        
        combined_text = f"{title} {description}".lower()
        reasons = []
        
        # Text length analysis
        total_length = len(f"{title} {description}")
        if total_length > 200:
            reasons.append("Extensive description suggests high complexity")
        elif total_length < 50:
            reasons.append("Brief description indicates simple task")
        
        # Complexity keywords
        high_complexity_words = ['integrate', 'complex', 'algorithm', 'security', 'architecture', 'migration']
        medium_complexity_words = ['implement', 'create', 'develop', 'feature', 'api']
        low_complexity_words = ['fix', 'bug', 'update', 'change', 'css', 'style']
        
        if any(word in combined_text for word in high_complexity_words):
            reasons.append("Contains high-complexity technical terms")
        elif any(word in combined_text for word in medium_complexity_words):
            reasons.append("Involves standard development work")
        elif any(word in combined_text for word in low_complexity_words):
            reasons.append("Appears to be a simple fix or update")
        
        # Technical domain analysis
        if any(word in combined_text for word in ['ui', 'frontend', 'design', 'css']):
            reasons.append("Frontend/UI work identified")
        if any(word in combined_text for word in ['backend', 'api', 'database', 'server']):
            reasons.append("Backend development required")
        if any(word in combined_text for word in ['test', 'testing', 'unit']):
            reasons.append("Testing components included")
        
        if not reasons:
            reasons.append("Based on similar historical tasks")
        
        return f"Estimated {prediction} story points. " + ". ".join(reasons) + "."

    def retrain_with_existing_data(self) -> Dict[str, Any]:
        """Retrain model with default data (placeholder for database integration)"""
        logger.info("Retraining with default dataset")
        return self.train([])

    def is_trained(self) -> bool:
        """Check if model is trained"""
        return self.is_fitted

    def get_model_info(self) -> Dict[str, Any]:
        """Get model information and statistics"""
        return {
            "is_trained": self.is_fitted,
            "feature_count": len(self.feature_names),
            "training_stats": self.training_stats,
            "model_types": ["RandomForest", "GradientBoosting", "LinearRegression"],
            "story_point_scale": self.story_point_scale
        }

    def _save_model(self):
        """Save trained model to disk"""
        try:
            model_data = {
                'rf_model': self.rf_model,
                'gb_model': self.gb_model,
                'lr_model': self.lr_model,
                'scaler': self.scaler,
                'preprocessor': self.preprocessor,
                'feature_names': self.feature_names,
                'training_stats': self.training_stats,
                'is_fitted': self.is_fitted,
                'model_weights': self.model_weights
            }
            
            joblib.dump(model_data, os.path.join(self.model_path, 'story_point_model.pkl'))
            logger.info("Model saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving model: {e}")

    def _load_model(self):
        """Load trained model from disk"""
        try:
            model_file = os.path.join(self.model_path, 'story_point_model.pkl')
            if os.path.exists(model_file):
                model_data = joblib.load(model_file)
                
                self.rf_model = model_data['rf_model']
                self.gb_model = model_data['gb_model']
                self.lr_model = model_data['lr_model']
                self.scaler = model_data['scaler']
                self.preprocessor = model_data['preprocessor']
                self.feature_names = model_data['feature_names']
                self.training_stats = model_data['training_stats']
                self.is_fitted = model_data['is_fitted']
                self.model_weights = model_data.get('model_weights', self.model_weights)
                
                logger.info("Model loaded successfully from disk")
            else:
                logger.info("No existing model found, will train on first use")
                
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self.is_fitted = False 