import os
import json
import psycopg2
from datetime import datetime
from models.pretrained_estimator import PretrainedStoryPointEstimator

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database="postgres",
        user="postgre",
        password="Nhatvn123"
    )

def load_training_data():
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Load training data SQL
    with open('src/main/resources/db/get_training_data.sql', 'r') as f:
        training_query = f.read()
    
    cur.execute(training_query)
    training_rows = cur.fetchall()
    
    # Convert to list of dicts
    training_data = []
    for row in training_rows:
        training_data.append({
            'title': row[0],
            'description': row[1],
            'storyPoint': row[2],
            'priority': row[3],
            'status': row[4],
            'tags': row[5].split(',') if row[5] else []
        })
    
    cur.close()
    conn.close()
    return training_data

def get_tasks_to_estimate():
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Load tasks to estimate SQL
    with open('src/main/resources/db/get_tasks_to_estimate.sql', 'r') as f:
        estimate_query = f.read()
    
    cur.execute(estimate_query)
    task_rows = cur.fetchall()
    
    # Convert to list of dicts
    tasks = []
    for row in task_rows:
        tasks.append({
            'id': row[0],
            'title': row[1],
            'description': row[2],
            'priority': row[3],
            'status': row[4],
            'tags': row[5].split(',') if row[5] else []
        })
    
    cur.close()
    conn.close()
    return tasks

def main():
    # Initialize model
    model = PretrainedStoryPointEstimator()
    
    # Load and combine training data
    print("Loading training data...")
    training_data = load_training_data()
    
    if not training_data:
        print("No training data found in database")
        return
        
    print(f"Found {len(training_data)} training samples")
    
    # Train model
    print("Training model...")
    stats = model.train(training_data)
    print("Training stats:", json.dumps(stats, indent=2))
    
    # Get tasks to estimate
    print("\nGetting tasks to estimate...")
    tasks = get_tasks_to_estimate()
    
    if not tasks:
        print("No tasks found that need estimation")
        return
        
    print(f"Found {len(tasks)} tasks to estimate")
    
    # Estimate each task
    print("\nEstimating tasks:")
    print("-" * 80)
    
    for task in tasks:
        estimate = model.estimate(
            title=task['title'],
            description=task['description'],
            priority=task['priority']
        )
        
        print(f"\nTask: {task['title']}")
        print(f"Story Points: {estimate['story_points']}")
        print(f"Confidence: {estimate['confidence']:.1%}")
        print(f"Reasoning: {estimate['reasoning']}")
        print("-" * 80)

if __name__ == "__main__":
    main() 