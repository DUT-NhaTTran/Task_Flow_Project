import re
import string
import nltk
import pandas as pd
import numpy as np
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
import textstat

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

class TextPreprocessor:
    """Text preprocessing utility for story point estimation"""
    
    def __init__(self):
        self.stop_words = set(stopwords.words('english'))
        self.tfidf_vectorizer = None
        self.complexity_keywords = {
            'high': [
                'integrate', 'integration', 'complex', 'algorithm', 'optimization',
                'performance', 'security', 'authentication', 'authorization', 
                'migration', 'refactor', 'architecture', 'framework', 'api',
                'database', 'schema', 'synchronization', 'real-time', 'scalable'
            ],
            'medium': [
                'implement', 'create', 'develop', 'build', 'add', 'feature',
                'function', 'component', 'service', 'validation', 'form',
                'interface', 'ui', 'frontend', 'backend', 'endpoint'
            ],
            'low': [
                'fix', 'bug', 'typo', 'update', 'change', 'modify', 'style',
                'css', 'color', 'text', 'button', 'link', 'minor', 'small',
                'simple', 'quick', 'easy'
            ]
        }
        
        self.effort_keywords = {
            'high_effort': [
                'full', 'complete', 'entire', 'comprehensive', 'multiple',
                'several', 'all', 'various', 'many', 'numerous'
            ],
            'medium_effort': [
                'some', 'few', 'partial', 'specific', 'particular', 'certain'
            ],
            'low_effort': [
                'single', 'one', 'minor', 'small', 'quick', 'simple'
            ]
        }

    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove special characters and numbers (keep spaces)
        text = re.sub(r'[^a-zA-Z\s]', ' ', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text

    def extract_keywords(self, text: str, keyword_dict: Dict[str, List[str]]) -> Dict[str, int]:
        """Extract keyword counts from text"""
        clean_text = self.clean_text(text)
        word_counts = {}
        
        for category, keywords in keyword_dict.items():
            count = 0
            for keyword in keywords:
                count += clean_text.count(keyword.lower())
            word_counts[category] = count
            
        return word_counts

    def calculate_text_features(self, title: str, description: str = "") -> Dict[str, Any]:
        """Calculate various text-based features"""
        combined_text = f"{title} {description}".strip()
        clean_combined = self.clean_text(combined_text)
        
        features = {}
        
        # Basic text statistics
        features['title_length'] = len(title)
        features['description_length'] = len(description)
        features['total_text_length'] = len(combined_text)
        features['word_count'] = len(word_tokenize(clean_combined)) if clean_combined else 0
        
        # Readability metrics
        if combined_text:
            features['flesch_reading_ease'] = textstat.flesch_reading_ease(combined_text)
            features['flesch_kincaid_grade'] = textstat.flesch_kincaid_grade(combined_text)
            features['automated_readability_index'] = textstat.automated_readability_index(combined_text)
        else:
            features['flesch_reading_ease'] = 0
            features['flesch_kincaid_grade'] = 0
            features['automated_readability_index'] = 0
        
        # Complexity keywords
        complexity_counts = self.extract_keywords(combined_text, self.complexity_keywords)
        for key, value in complexity_counts.items():
            features[f'complexity_{key}'] = value
        
        # Effort keywords
        effort_counts = self.extract_keywords(combined_text, self.effort_keywords)
        for key, value in effort_counts.items():
            features[f'effort_{key}'] = value
        
        # Technical indicators
        features['has_ui_words'] = int(any(word in clean_combined for word in ['ui', 'interface', 'frontend', 'design', 'css', 'html']))
        features['has_backend_words'] = int(any(word in clean_combined for word in ['backend', 'api', 'database', 'server', 'service']))
        features['has_integration_words'] = int(any(word in clean_combined for word in ['integrate', 'connect', 'sync', 'import', 'export']))
        features['has_testing_words'] = int(any(word in clean_combined for word in ['test', 'testing', 'unit', 'integration', 'e2e']))
        
        return features

    def prepare_training_data(self, tasks: List[Dict[str, Any]]) -> pd.DataFrame:
        """Prepare training data with extracted features"""
        data = []
        
        for task in tasks:
            title = task.get('title', '')
            description = task.get('description', '')
            story_points = task.get('storyPoint', task.get('story_points', 0))
            
            # Extract text features
            text_features = self.calculate_text_features(title, description)
            
            # Add other features
            row = {
                'title': title,
                'description': description,
                'story_points': story_points,
                **text_features
            }
            
            # Add optional features if available
            if 'estimated_hours' in task:
                row['estimated_hours'] = task['estimated_hours']
            if 'complexity' in task:
                row['complexity_level'] = self._encode_complexity(task['complexity'])
            if 'priority' in task:
                row['priority_level'] = self._encode_priority(task['priority'])
                
            data.append(row)
        
        return pd.DataFrame(data)

    def _encode_complexity(self, complexity: str) -> int:
        """Encode complexity levels to numerical values"""
        complexity_map = {
            'low': 1, 'simple': 1, 'easy': 1,
            'medium': 2, 'moderate': 2, 'normal': 2,
            'high': 3, 'complex': 3, 'hard': 3, 'difficult': 3
        }
        return complexity_map.get(complexity.lower() if complexity else '', 2)

    def _encode_priority(self, priority: str) -> int:
        """Encode priority levels to numerical values"""
        priority_map = {
            'low': 1, 'minor': 1,
            'medium': 2, 'normal': 2, 'moderate': 2,
            'high': 3, 'critical': 3, 'urgent': 3, 'blocker': 4
        }
        return priority_map.get(priority.lower() if priority else '', 2)

    def fit_tfidf(self, texts: List[str]):
        """Fit TF-IDF vectorizer on training texts"""
        clean_texts = [self.clean_text(text) for text in texts]
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=100,  # Limit features to avoid overfitting
            stop_words='english',
            ngram_range=(1, 2)  # Include bigrams
        )
        self.tfidf_vectorizer.fit(clean_texts)

    def get_tfidf_features(self, text: str) -> np.ndarray:
        """Get TF-IDF features for a text"""
        if self.tfidf_vectorizer is None:
            return np.array([])
        
        clean_text = self.clean_text(text)
        return self.tfidf_vectorizer.transform([clean_text]).toarray()[0]

    def get_feature_names(self) -> List[str]:
        """Get all feature names for the model"""
        base_features = [
            'title_length', 'description_length', 'total_text_length', 'word_count',
            'flesch_reading_ease', 'flesch_kincaid_grade', 'automated_readability_index',
            'complexity_high', 'complexity_medium', 'complexity_low',
            'effort_high_effort', 'effort_medium_effort', 'effort_low_effort',
            'has_ui_words', 'has_backend_words', 'has_integration_words', 'has_testing_words'
        ]
        
        tfidf_features = []
        if self.tfidf_vectorizer:
            tfidf_features = [f"tfidf_{i}" for i in range(len(self.tfidf_vectorizer.get_feature_names_out()))]
        
        return base_features + tfidf_features 