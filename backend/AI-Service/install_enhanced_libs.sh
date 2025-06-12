#!/bin/bash

echo "🤖 Installing Enhanced AI Libraries for Story Point Estimation"
echo "Based on: https://github.com/mrthlinh/Agile-User-Story-Point-Estimation"
echo "=========================================================="

# Activate virtual environment
source venv/bin/activate

echo "📦 Installing Advanced Gradient Boosting Libraries..."
pip install lightgbm>=4.1.0
pip install catboost>=1.2.0  
pip install xgboost>=2.0.0

echo "🧠 Installing Advanced NLP Libraries..."
pip install gensim>=4.3.0
pip install beautifulsoup4>=4.12.0
pip install unidecode>=1.3.0
pip install contractions>=0.1.0

echo "🔧 Installing Feature Engineering Libraries..."
pip install feature-engine>=1.6.0
pip install category-encoders>=2.6.0

echo "📊 Installing Model Evaluation & Monitoring..."
pip install scikit-plot>=0.3.7
pip install yellowbrick>=1.5.0
pip install mlflow>=2.8.0
pip install memory-profiler>=0.61.0
pip install psutil>=5.9.0

echo "🛠️ Installing Development Tools..."
pip install pytest-cov>=4.1.0
pip install black>=23.0.0
pip install flake8>=6.0.0
pip install python-dotenv>=1.0.0

echo "📈 Installing Visualization Libraries..."
pip install matplotlib>=3.7.0
pip install seaborn>=0.12.0
pip install plotly>=5.17.0

echo "📋 Installing Data Processing Libraries..."
pip install openpyxl>=3.1.0
pip install xlrd>=2.0.0

echo "🎯 Installing Production Monitoring..."
pip install prometheus-client>=0.19.0

echo "✅ Enhanced AI Libraries Installation Complete!"
echo ""
echo "📚 Key Libraries for Story Point Estimation:"
echo "  🏆 Best Performance: TF-IDF + Random Forest (MAE: 3.96)"
echo "  ⚡ LightGBM: Fast gradient boosting"
echo "  🧠 Word2Vec/Doc2Vec: Text embeddings with Gensim"
echo "  🔍 LSTM: Deep learning with PyTorch"
echo ""
echo "🚀 Ready to implement advanced AI story point estimation!" 