import requests
import json
import os
import logging
import pandas as pd
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class GitHubDatasetLoader:
    """Utility to load training datasets from GitHub repositories"""
    
    def __init__(self, cache_dir: str = "data/cache"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    def load_from_github(self, github_url: str, file_path: str = None) -> List[Dict[str, Any]]:
        """
        Load dataset from GitHub repository
        
        Args:
            github_url: GitHub repository URL or raw file URL
            file_path: Path to JSON/CSV file in repo (if github_url is repo URL)
            
        Returns:
            List of training tasks
        """
        try:
            # Convert GitHub repo URL to raw file URL if needed
            raw_url = self._convert_to_raw_url(github_url, file_path)
            
            # Generate cache filename
            cache_filename = self._generate_cache_filename(raw_url)
            cache_path = os.path.join(self.cache_dir, cache_filename)
            
            # Try to load from cache first
            if os.path.exists(cache_path):
                logger.info(f"Loading dataset from cache: {cache_path}")
                with open(cache_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            
            # Download from GitHub
            logger.info(f"Downloading dataset from GitHub: {raw_url}")
            response = requests.get(raw_url, timeout=30)
            response.raise_for_status()
            
            # Parse based on file extension
            if raw_url.endswith('.json'):
                data = response.json()
                # Extract tasks if data is wrapped in an object
                if isinstance(data, dict) and 'tasks' in data:
                    tasks = data['tasks']
                elif isinstance(data, list):
                    tasks = data
                else:
                    raise ValueError("Invalid JSON format. Expected list of tasks or object with 'tasks' key")
                    
            elif raw_url.endswith('.csv') or 'data_csv/data' in raw_url or raw_url.endswith('/data'):
                # Parse CSV data (including files without .csv extension)
                from io import StringIO
                csv_data = StringIO(response.text)
                df = pd.read_csv(csv_data)
                tasks = self._convert_csv_to_tasks(df)
                
            else:
                # Try to parse as JSON first, then CSV
                try:
                    data = json.loads(response.text)
                    if isinstance(data, dict) and 'tasks' in data:
                        tasks = data['tasks']
                    elif isinstance(data, list):
                        tasks = data
                    else:
                        raise ValueError("Invalid format")
                except:
                    # Try as CSV
                    from io import StringIO
                    csv_data = StringIO(response.text)
                    df = pd.read_csv(csv_data)
                    tasks = self._convert_csv_to_tasks(df)
            
            # Validate dataset format
            validated_tasks = self._validate_dataset(tasks)
            
            # Cache the dataset
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(validated_tasks, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Successfully loaded {len(validated_tasks)} tasks from GitHub")
            return validated_tasks
            
        except Exception as e:
            logger.error(f"Error loading dataset from GitHub: {e}")
            raise
    
    def _convert_csv_to_tasks(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Convert CSV DataFrame to tasks list"""
        tasks = []
        
        # Common column name mappings
        column_mappings = {
            # Title columns
            'title': ['title', 'Title', 'summary', 'Summary', 'issue_title', 'user_story'],
            # Description columns  
            'description': ['description', 'Description', 'desc', 'Desc', 'issue_description', 'acceptance_criteria', 'user_story'],
            # Story points columns
            'storyPoint': ['storyPoint', 'story_point', 'story_points', 'StoryPoint', 'Story_Point', 'points', 'Points', 'sp', 'point'],
            # Project/label columns
            'project': ['project', 'Project', 'repo', 'repository', 'label', 'category'],
            # Optional columns
            'complexity': ['complexity', 'Complexity', 'difficulty', 'Difficulty'],
            'priority': ['priority', 'Priority', 'importance', 'Importance'],
            'estimated_hours': ['estimated_hours', 'hours', 'Hours', 'time_estimate', 'effort'],
            'concat': ['concat', 'combined', 'full_text', 'complete_text']
        }
        
        # Find actual column names
        actual_columns = {}
        for field, possible_names in column_mappings.items():
            for col_name in possible_names:
                if col_name in df.columns:
                    actual_columns[field] = col_name
                    break
        
        logger.info(f"CSV columns found: {actual_columns}")
        logger.info(f"Available columns: {list(df.columns)}")
        
        # Convert each row to task
        for index, row in df.iterrows():
            try:
                task = {}
                
                # Required fields
                if 'title' in actual_columns:
                    task['title'] = str(row[actual_columns['title']]).strip()
                else:
                    # Use first column as title if no title column found
                    task['title'] = str(row.iloc[0]).strip()
                
                # Description field - prioritize user_story column for this dataset
                if 'user_story' in df.columns:
                    task['description'] = str(row['user_story']).strip()
                elif 'description' in actual_columns:
                    task['description'] = str(row[actual_columns['description']]).strip()
                elif len(df.columns) > 1:
                    task['description'] = str(row.iloc[1]).strip()
                else:
                    task['description'] = task['title']  # Fallback
                
                # Story points handling
                if 'storyPoint' in actual_columns:
                    story_point = row[actual_columns['storyPoint']]
                    if pd.notna(story_point):
                        # Convert non-Fibonacci points to Fibonacci scale
                        raw_point = float(story_point)
                        task['storyPoint'] = self._convert_to_fibonacci(raw_point)
                        task['original_story_point'] = raw_point  # Keep original value
                    else:
                        continue  # Skip rows without story points
                else:
                    # For Agile-User-Story-Point-Estimation dataset, use 'point' column directly
                    if 'point' in df.columns:
                        story_point = row['point']
                        if pd.notna(story_point):
                            raw_point = float(story_point)
                            task['storyPoint'] = self._convert_to_fibonacci(raw_point)
                            task['original_story_point'] = raw_point
                        else:
                            continue
                    else:
                        # Try to find story points in any numeric column
                        numeric_cols = df.select_dtypes(include=['number']).columns
                        if len(numeric_cols) > 0:
                            story_point = row[numeric_cols[0]]
                            if pd.notna(story_point):
                                raw_point = float(story_point)
                                task['storyPoint'] = self._convert_to_fibonacci(raw_point)
                                task['original_story_point'] = raw_point
                            else:
                                continue
                        else:
                            continue  # Skip if no story points found
                
                # Add project/label information - check both mapped and direct columns
                if 'project' in actual_columns:
                    task['project'] = str(row[actual_columns['project']]).strip()
                elif 'project' in df.columns:
                    task['project'] = str(row['project']).strip()
                
                # Add concatenated text if available - check both mapped and direct columns
                if 'concat' in actual_columns:
                    task['full_text'] = str(row[actual_columns['concat']]).strip()
                elif 'concat' in df.columns:
                    task['full_text'] = str(row['concat']).strip()
                
                # Optional fields
                for field in ['complexity', 'priority', 'estimated_hours']:
                    if field in actual_columns:
                        value = row[actual_columns[field]]
                        if pd.notna(value):
                            if field == 'estimated_hours':
                                task[field] = float(value)
                            else:
                                task[field] = str(value).strip().lower()
                
                # Skip empty tasks
                if not task.get('title') or not task.get('description'):
                    continue
                    
                tasks.append(task)
                
            except Exception as e:
                logger.warning(f"Error processing CSV row {index}: {e}")
                continue
        
        logger.info(f"Converted {len(tasks)} tasks from CSV")
        return tasks
    
    def _convert_to_fibonacci(self, raw_point: float) -> int:
        """Convert raw story point to nearest Fibonacci number"""
        fibonacci_scale = [1, 2, 3, 5, 8, 13, 21]
        
        # Handle special cases from the dataset
        if raw_point <= 1:
            return 1
        elif raw_point <= 10:
            return 2
        elif raw_point <= 30:
            return 3
        elif raw_point <= 60:
            return 5
        elif raw_point <= 120:
            return 8
        elif raw_point <= 200:
            return 13
        else:
            return 21
    
    def load_multiple_sources(self, sources: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        Load and combine datasets from multiple GitHub sources
        
        Args:
            sources: List of dicts with 'url' and optional 'file_path' keys
            
        Returns:
            Combined list of training tasks
        """
        all_tasks = []
        
        for source in sources:
            try:
                url = source['url']
                file_path = source.get('file_path')
                
                tasks = self.load_from_github(url, file_path)
                all_tasks.extend(tasks)
                
                logger.info(f"Loaded {len(tasks)} tasks from {url}")
                
            except Exception as e:
                logger.warning(f"Failed to load from {source}: {e}")
                continue
        
        logger.info(f"Total tasks loaded from all sources: {len(all_tasks)}")
        return all_tasks
    
    def _convert_to_raw_url(self, github_url: str, file_path: str = None) -> str:
        """Convert GitHub URL to raw file URL"""
        
        # If already a raw URL, return as is
        if 'raw.githubusercontent.com' in github_url:
            return github_url
        
        # Parse GitHub repo URL
        if 'github.com' in github_url:
            # Extract owner, repo, and branch from URL
            parts = github_url.replace('https://github.com/', '').split('/')
            
            if len(parts) >= 2:
                owner = parts[0]
                repo = parts[1]
                
                # Try both main and master branches
                branches = ['main', 'master']
                
                # If file_path not provided, try common dataset filenames
                if not file_path:
                    common_files = [
                        # JSON files
                        'enhanced_training_data.json',
                        'training_data.json',
                        'dataset.json',
                        'tasks.json',
                        'data/training_data.json',
                        'backend/AI-Service/enhanced_training_data.json',
                        # CSV files
                        'data.csv',
                        'dataset.csv',
                        'training_data.csv',
                        'tasks.csv',
                        'data/data.csv',
                        'data_csv/data.csv',  # For Agile-User-Story-Point-Estimation repo
                        'data_csv/data',      # File without extension (actual file in the repo)
                        'data/dataset.csv',
                        'csv/data.csv',
                        'data',               # Simple data file
                        'dataset'             # Simple dataset file
                    ]
                    
                    # Try each branch and filename combination
                    for branch in branches:
                        for filename in common_files:
                            test_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{filename}"
                            try:
                                response = requests.head(test_url, timeout=10)
                                if response.status_code == 200:
                                    file_path = filename
                                    logger.info(f"Found dataset file: {filename} on branch {branch}")
                                    return test_url
                            except:
                                continue
                    
                    if not file_path:
                        raise ValueError("Could not find dataset file. Please specify file_path parameter")
                else:
                    # Try both branches for specified file_path
                    for branch in branches:
                        test_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{file_path}"
                        try:
                            response = requests.head(test_url, timeout=10)
                            if response.status_code == 200:
                                logger.info(f"Found specified file: {file_path} on branch {branch}")
                                return test_url
                        except:
                            continue
                    
                    # If not found, default to main branch
                    return f"https://raw.githubusercontent.com/{owner}/{repo}/main/{file_path}"
        
        raise ValueError(f"Invalid GitHub URL format: {github_url}")
    
    def _generate_cache_filename(self, url: str) -> str:
        """Generate cache filename from URL"""
        import hashlib
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        return f"github_dataset_{url_hash}.json"
    
    def _validate_dataset(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate and clean dataset"""
        validated_tasks = []
        
        for i, task in enumerate(tasks):
            try:
                # Required fields
                if not task.get('title') or not task.get('description'):
                    logger.warning(f"Task {i}: Missing title or description, skipping")
                    continue
                
                # Story points validation
                story_point = task.get('storyPoint', task.get('story_points', 0))
                if story_point not in [1, 2, 3, 5, 8, 13, 21]:
                    # Try to map to nearest Fibonacci number
                    if isinstance(story_point, (int, float)) and story_point > 0:
                        fibonacci_scale = [1, 2, 3, 5, 8, 13, 21]
                        story_point = min(fibonacci_scale, key=lambda x: abs(x - story_point))
                        logger.info(f"Task {i}: Mapped story point to {story_point}")
                    else:
                        logger.warning(f"Task {i}: Invalid story point {story_point}, skipping")
                        continue
                
                # Normalize task format
                normalized_task = {
                    'title': str(task['title']).strip(),
                    'description': str(task['description']).strip(),
                    'storyPoint': int(story_point)
                }
                
                # Add optional fields if present
                if 'complexity' in task:
                    normalized_task['complexity'] = task['complexity']
                if 'priority' in task:
                    normalized_task['priority'] = task['priority']
                if 'estimated_hours' in task:
                    normalized_task['estimated_hours'] = float(task['estimated_hours'])
                if 'attachments_count' in task:
                    normalized_task['attachments_count'] = int(task['attachments_count'])
                
                # Add dataset-specific fields
                if 'project' in task:
                    normalized_task['project'] = task['project']
                if 'original_story_point' in task:
                    normalized_task['original_story_point'] = task['original_story_point']
                if 'full_text' in task:
                    normalized_task['full_text'] = task['full_text']
                
                validated_tasks.append(normalized_task)
                
            except Exception as e:
                logger.warning(f"Task {i}: Validation error - {e}, skipping")
                continue
        
        logger.info(f"Validated {len(validated_tasks)} out of {len(tasks)} tasks")
        return validated_tasks
    
    def clear_cache(self):
        """Clear cached datasets"""
        try:
            for filename in os.listdir(self.cache_dir):
                if filename.startswith('github_dataset_'):
                    os.remove(os.path.join(self.cache_dir, filename))
            logger.info("Cache cleared successfully")
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")

# Convenience function
def load_github_dataset(github_url: str, file_path: str = None) -> List[Dict[str, Any]]:
    """
    Quick function to load dataset from GitHub
    
    Usage:
        # Load from repo with auto-detection
        tasks = load_github_dataset("https://github.com/username/repo")
        
        # Load specific file
        tasks = load_github_dataset("https://github.com/username/repo", "data/training.json")
        
        # Load CSV file
        tasks = load_github_dataset("https://github.com/username/repo", "data_csv/data.csv")
        
        # Load from raw URL
        tasks = load_github_dataset("https://raw.githubusercontent.com/username/repo/main/data.csv")
    """
    loader = GitHubDatasetLoader()
    return loader.load_from_github(github_url, file_path) 