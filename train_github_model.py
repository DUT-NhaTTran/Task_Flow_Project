#!/usr/bin/env python3
"""
Train model with GitHub CSV dataset
"""

from utils.github_dataset_loader import load_github_dataset
from models.pretrained_estimator import PretrainedStoryPointEstimator
import time
import json

def main():
    print('🚀 TRAINING MODEL WITH GITHUB CSV DATASET')
    print('=' * 60)

    # Load dataset
    print('📥 Loading GitHub dataset...')
    start_time = time.time()
    github_url = 'https://github.com/mrthlinh/Agile-User-Story-Point-Estimation'
    tasks = load_github_dataset(github_url)
    load_time = time.time() - start_time

    print(f'✅ Loaded {len(tasks)} tasks in {load_time:.1f}s')

    # Initialize model
    print('🤖 Initializing PretrainedStoryPointEstimator...')
    estimator = PretrainedStoryPointEstimator(model_path='data/models')

    # Train model
    print('🔥 Training model with full dataset...')
    print('   This may take a few minutes...')
    train_start = time.time()
    result = estimator.train(tasks)
    train_time = time.time() - train_start

    print(f'✅ Training completed in {train_time:.1f}s')
    print('📊 Training Results:')
    print(f'   - Samples: {result["samples"]}')
    print(f'   - Features: {result["features"]}')
    print(f'   - MAE: {result["mae"]:.3f}')
    print(f'   - R²: {result["r2"]:.3f}')
    print(f'   - RMSE: {result["rmse"]:.3f}')
    print(f'   - Model: {result["pretrained_model"]}')
    
    # Test a sample prediction
    print('\n🧪 Testing model with sample prediction...')
    test_result = estimator.estimate(
        title="User authentication system",
        description="Implement secure user login with password validation, session management, and remember me functionality",
        complexity="high",
        priority="critical"
    )
    
    print(f'📝 Test Prediction:')
    print(f'   - Story Points: {test_result["story_points"]}')
    print(f'   - Confidence: {test_result["confidence"]:.1%}')
    print(f'   - Reasoning: {test_result["reasoning"]}')
    
    print('\n🎉 Model training completed successfully!')
    print('💾 Model saved to: data/models/pretrained_story_point_model.pkl')

if __name__ == "__main__":
    main() 