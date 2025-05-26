-- Create Comments Table for Task Comments Feature
-- Run this manually in your database

CREATE TABLE comments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    task_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL, 
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    parent_comment_id BIGINT NULL, -- For nested comments/replies
    is_deleted BOOLEAN DEFAULT FALSE,
    
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Sample data for testing
-- INSERT INTO comments (task_id, user_id, user_name, user_email, content) 
-- VALUES ('your-task-id', 'user-id', 'John Doe', 'john@example.com', 'This is a test comment'); 