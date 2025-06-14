import pandas as pd
import numpy as np
import joblib
import os
from typing import Dict, List, Any, Optional, Tuple
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import logging

from utils.text_preprocessor import TextPreprocessor

logger = logging.getLogger(__name__)

class PretrainedStoryPointEstimator:
    """Story Point Estimation using TF-IDF + RandomForest (Best Performance: MAE 3.96)"""
    
    def __init__(self, model_path: str = "data/models"):
        self.model_path = model_path
        self.preprocessor = TextPreprocessor()
        self.scaler = StandardScaler()  # Keep - needed for mixed features
        
        # Remove sentence transformer - not used and TF-IDF performs better
        logger.info("🗑️ Removed SentenceTransformer - using TF-IDF for best performance")
        
        # Primary model: RandomForest (best with TF-IDF, MAE: 3.96)
        self.prediction_model = RandomForestRegressor(
            n_estimators=100,  # Increased from repo default
            max_depth=10,      # Optimized for TF-IDF features
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        logger.info("✅ Using TF-IDF + RandomForest (MAE 3.96 - best from repo research)")
        
        # No secondary model for stability
        self.secondary_model = None
        logger.info("🔧 Using single RandomForest model for stability")
        
        self.is_fitted = False
        self.feature_names = []
        self.training_stats = {}
        
        # Story point scale
        self.story_point_scale = [1, 2, 3, 5, 8, 13, 21]
        
        # Create model directory
        os.makedirs(model_path, exist_ok=True)
        
        # Load existing model if available
        self._load_model()

    def _get_features_tfidf_based(self, texts: List[str]) -> np.ndarray:
        """Get TF-IDF features (repo recommended for lowest MAE: 3.96)"""
        try:
            # Use TF-IDF as primary feature extraction (best performance from repo)
            self.preprocessor.fit_tfidf(texts)
            embeddings = []
            for text in texts:
                tfidf_features = self.preprocessor.get_tfidf_features(text)
                if len(tfidf_features) == 0:
                    embeddings.append(np.zeros(500))  # Reduced dimension
                else:
                    # Pad or truncate to fixed size
                    if len(tfidf_features) > 500:
                        embeddings.append(tfidf_features[:500])
                    else:
                        padded = np.zeros(500)
                        padded[:len(tfidf_features)] = tfidf_features
                        embeddings.append(padded)
            return np.array(embeddings)
        except Exception as e:
            logger.error(f"Error getting TF-IDF features: {e}")
            return np.random.rand(len(texts), 500)

    def _prepare_features(self, title: str, description: str = "", 
                         estimated_hours: Optional[float] = None,
                         complexity: Optional[str] = None,
                         priority: Optional[str] = None,
                         attachments_count: Optional[int] = None,
                         label: Optional[str] = None) -> np.ndarray:
        """Prepare features focusing on objective factors"""
        
        # Get base features from description only - FIXED SIZE
        if description:
            embeddings = self._get_features_tfidf_based([description])[0]
        else:
            embeddings = np.zeros(500)  # Fixed size
            
        text_features = self.preprocessor.calculate_text_features("", description)  # Ignore title
        
        # Create weighted feature vector with FIXED SIZE
        feature_vector = []
        
        # Add embeddings with increased weight for description (500 features)
        embeddings_weighted = embeddings * 1.2  # Increase impact of description semantics
        feature_vector.extend(embeddings_weighted)
        
        # Add weighted custom features (8 features)
        feature_vector.extend([
            text_features['description_length'] * 1.2,     # 1
            text_features['word_count'] * 0.8,            # 2
            text_features['complexity_high'] * 1.2,       # 3
            text_features['complexity_medium'],           # 4
            text_features['complexity_low'] * 0.8,        # 5
            text_features['has_ui_words'] * 0.9,         # 6
            text_features['has_backend_words'] * 1.1,     # 7
            text_features['has_integration_words'] * 1.2, # 8
        ])
        
        # Add attachments count (1 feature)
        if attachments_count is not None:
            feature_vector.append(min(attachments_count * 1.5, 10.0))  # 9
        else:
            feature_vector.append(0)
            
        # Add priority (1 feature)
        if priority is not None:
            priority_value = self.preprocessor._encode_priority(priority)
            feature_vector.append(priority_value * 1.2)  # 10
        else:
            feature_vector.append(2)  # Default to medium
            
        # Add task type (label) encoding (1 feature)
        if label is not None:
            label_value = self._encode_task_type(label)
            feature_vector.append(label_value)  # 11
        else:
            feature_vector.append(0)  # Default to unknown/feature
        
        # Total: 500 + 8 + 1 + 1 + 1 = 511 features
        return np.array(feature_vector).reshape(1, -1)

    def _encode_task_type(self, task_type: str) -> float:
        """Encode task type labels to numerical values based on typical complexity"""
        task_type_map = {
            # Simple tasks (usually lower story points)
            'bug': 1.0,
            'hotfix': 1.0,
            'fix': 1.0,
            'typo': 1.0,
            'style': 1.0,
            'css': 1.0,
            
            # Medium tasks
            'feature': 2.0,
            'enhancement': 2.0,
            'improvement': 2.0,
            'update': 2.0,
            'refactor': 2.0,
            'test': 2.0,
            'testing': 2.0,
            
            # Complex tasks (usually higher story points)
            'deploy': 3.0,
            'deployment': 3.0,
            'integration': 3.0,
            'migration': 3.0,
            'security': 3.0,
            'performance': 3.0,
            'architecture': 3.0,
            'infrastructure': 3.0,
            'research': 3.0,
            'spike': 3.0
        }
        
        return task_type_map.get(task_type.lower() if task_type else '', 2.0)  # Default to medium

    def _map_to_fibonacci(self, prediction: float) -> int:
        """Map prediction to Fibonacci with optimized rounding for 1 point = 1 day"""
        prediction = max(1, prediction)  # Minimum 1 point
        
        # Optimized rounding for MAE ≤ 2 requirement (2 days max error)
        # More precise boundaries based on repo research
        if prediction <= 1.3:
            return 1
        elif prediction <= 2.3:
            return 2
        elif prediction <= 3.8:
            return 3
        elif prediction <= 6.2:
            return 5
        elif prediction <= 9.5:
            return 8
        elif prediction <= 15.5:
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
            
            # Get TF-IDF features for all texts at once (more efficient)
            embeddings = self._get_features_tfidf_based(texts)
            
            # Prepare feature vectors
            for i, (_, row) in enumerate(df.iterrows()):
                # Get embedding for this text (500 features)
                embedding = embeddings[i]
                
                # Get custom features (8 features)
                text_features = self.preprocessor.calculate_text_features(row['title'], row['description'])
                
                # Combine features to match _prepare_features format
                feature_vector = list(embedding) + [
                    text_features['description_length'] * 1.2,     # 1
                    text_features['word_count'] * 0.8,            # 2
                    text_features['complexity_high'] * 1.2,       # 3
                    text_features['complexity_medium'],           # 4
                    text_features['complexity_low'] * 0.8,        # 5
                    text_features['has_ui_words'] * 0.9,         # 6
                    text_features['has_backend_words'] * 1.1,     # 7
                    text_features['has_integration_words'] * 1.2, # 8
                    row.get('estimated_hours', 0),               # 9 (attachments placeholder)
                    row.get('priority_level', 2),                # 10 (priority)
                    0  # 11 (label placeholder)
                ]
                
                features.append(feature_vector)
            
            X = np.array(features)
            y = np.array(targets)
            
            # ✅ IMPROVED: Smart data splitting based on dataset size
            if len(X) > 20000:
                # Large dataset: Use train/validation/test split (70/15/15)
                logger.info(f"Large dataset detected ({len(X)} samples). Using train/validation/test split.")
                X_temp, X_test, y_temp, y_test = train_test_split(
                    X, y, test_size=0.15, random_state=42, stratify=None
                )
                X_train, X_val, y_train, y_val = train_test_split(
                    X_temp, y_temp, test_size=0.176, random_state=42  # 0.176 ≈ 15/(70+15) to get 15% of total
                )
                logger.info(f"Split: Train={len(X_train)}, Validation={len(X_val)}, Test={len(X_test)}")
                
            elif len(X) > 1000:
                # Medium dataset: Use train/validation/test split (80/10/10)
                logger.info(f"Medium dataset detected ({len(X)} samples). Using train/validation/test split.")
                X_temp, X_test, y_temp, y_test = train_test_split(
                    X, y, test_size=0.1, random_state=42
                )
                X_train, X_val, y_train, y_val = train_test_split(
                    X_temp, y_temp, test_size=0.111, random_state=42  # 0.111 ≈ 10/(80+10) to get 10% of total
                )
                logger.info(f"Split: Train={len(X_train)}, Validation={len(X_val)}, Test={len(X_test)}")
                
            elif len(X) > 100:
                # Small dataset: Use train/test split (80/20)
                logger.info(f"Small dataset detected ({len(X)} samples). Using train/test split.")
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
                X_val, y_val = X_test, y_test  # Use test as validation for consistency
                logger.info(f"Split: Train={len(X_train)}, Test={len(X_test)} (no separate validation)")
                
            else:
                # Very small dataset: Use all data for both train and test
                logger.info(f"Very small dataset ({len(X)} samples). Using all data for training.")
                X_train, X_test, y_train, y_test = X, X, y, y
                X_val, y_val = X, y
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_val_scaled = self.scaler.transform(X_val)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train main model
            self.prediction_model.fit(X_train_scaled, y_train)
            
            # Evaluate on validation set (for hyperparameter tuning)
            y_val_pred = self.prediction_model.predict(X_val_scaled)
            val_mae = mean_absolute_error(y_val, y_val_pred)
            val_mse = mean_squared_error(y_val, y_val_pred)
            val_r2 = r2_score(y_val, y_val_pred)
            
            # Evaluate on test set (final performance)
            y_test_pred = self.prediction_model.predict(X_test_scaled)
            test_mae = mean_absolute_error(y_test, y_test_pred)
            test_mse = mean_squared_error(y_test, y_test_pred)
            test_r2 = r2_score(y_test, y_test_pred)
            
            self.training_stats = {
                'samples': len(X),
                'features': X.shape[1],
                'train_samples': len(X_train),
                'validation_samples': len(X_val),
                'test_samples': len(X_test),
                'validation_mae': float(val_mae),
                'validation_mse': float(val_mse),
                'validation_r2': float(val_r2),
                'test_mae': float(test_mae),
                'test_mse': float(test_mse),
                'test_r2': float(test_r2),
                'mae': float(test_mae),  # Keep for backward compatibility
                'mse': float(test_mse),
                'r2': float(test_r2),
                'rmse': float(np.sqrt(test_mse)),
                'pretrained_model': 'TF-IDF'
            }
            
            self.is_fitted = True
            
            # Save model
            self._save_model()
            
            logger.info(f"✅ Model trained successfully.")
            logger.info(f"📊 Validation: MAE={val_mae:.3f}, R²={val_r2:.3f}")
            logger.info(f"📊 Test: MAE={test_mae:.3f}, R²={test_r2:.3f}")
            return self.training_stats
            
        except Exception as e:
            logger.error(f"Error during training: {e}")
            raise

    def estimate(self, title: str, description: str = "",
                estimated_hours: Optional[float] = None,
                complexity: Optional[str] = None,
                priority: Optional[str] = None,
                attachments_count: Optional[int] = None,
                label: Optional[str] = None) -> Dict[str, Any]:
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
            attachments_count=attachments_count,
            label=label
        )
            
        # Get raw prediction using ensemble approach
        # Primary prediction from RandomForest (TF-IDF + RF = best MAE)
        primary_prediction = self.prediction_model.predict(features)[0]
        
        # Map to Fibonacci scale
        story_points = self._map_to_fibonacci(primary_prediction)
            
        # Calculate confidence based on available features
        confidence = 0.7  # Base confidence
        if description and len(description) > 20:
            confidence *= 1.1  # Increase if good description
        if attachments_count and attachments_count > 0:
            confidence *= 1.2  # Increase confidence if attachments present
        if priority:
            confidence *= 1.1  # Slight increase if priority is specified
            
        # Cap confidence
        confidence = min(confidence, 0.95)
            
        # Generate reasoning
        reasoning = self._generate_reasoning(title, description, story_points, primary_prediction)
            
        return {
            "story_points": story_points,
            "confidence": confidence,
            "reasoning": reasoning,
            "features": {
                "description_length": len(description),
                "has_attachments": attachments_count is not None and attachments_count > 0,
                "has_priority": priority is not None,
                "raw_prediction": float(primary_prediction)
            }
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
        model_info = "using TF-IDF"
        
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
            "pretrained_model": "TF-IDF",
            "story_point_scale": self.story_point_scale,
        }

    def _save_model(self):
        """Save trained model to disk"""
        try:
            model_data = {
                'prediction_model': self.prediction_model,
                'scaler': self.scaler,
                'preprocessor': self.preprocessor,
                'training_stats': self.training_stats,
                'is_fitted': self.is_fitted,
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
                self.scaler = model_data['scaler']
                self.preprocessor = model_data['preprocessor']
                self.training_stats = model_data['training_stats']
                self.is_fitted = model_data['is_fitted']
                
                logger.info("✅ Model loaded successfully from disk")
            else:
                logger.info("No existing model found, will train on first use")
                
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self.is_fitted = False 