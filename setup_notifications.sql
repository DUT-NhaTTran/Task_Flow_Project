-- Create notification_type enum
CREATE TYPE notification_type AS ENUM (
    'TASK_CREATED',
    'TASK_UPDATED', 
    'TASK_COMMENT',
    'COMMENT_REPLY',
    'TASK_ASSIGNED',
    'TASK_REASSIGNED',
    'TASK_DELETED',
    'TASK_MOVED',
    'TASK_STATUS_CHANGED',
    'TASK_DUE_SOON',
    'TASK_OVERDUE',
    'TASK_MENTIONED',
    'MENTIONED_IN_COMMENT',
    'PROJECT_CREATED',
    'PROJECT_DELETED',
    'PROJECT_ROLE_CHANGED',
    'PROJECT_INVITE',
    'SPRINT_CREATED',
    'SPRINT_UPDATED',
    'SPRINT_STARTED',
    'SPRINT_ENDED',
    'SPRINT_COMPLETED',
    'SPRINT_GOAL_UPDATED',
    'FILE_ATTACHED',
    'TAGGED_IN_TASK',
    'REMINDER'
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    recipient_user_id VARCHAR(255) NOT NULL,
    actor_user_id VARCHAR(255),
    actor_user_name VARCHAR(255),
    actor_user_avatar VARCHAR(500),
    project_id VARCHAR(255),
    project_name VARCHAR(255),
    task_id VARCHAR(255),
    sprint_id VARCHAR(255),
    comment_id VARCHAR(255),
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITHOUT TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON notifications(task_id);

-- Insert sample notification for testing
INSERT INTO notifications (
    type, title, message, recipient_user_id, actor_user_id, actor_user_name,
    project_id, project_name, task_id, action_url
) VALUES (
    'TASK_ASSIGNED',
    'Task assigned via setup',
    'You have been assigned to a test task from database setup',
    'test-user-123',
    'admin-456',
    'Database Admin',
    'test-project',
    'Test Project',
    'test-task-123',
    '/project/board?projectId=test-project&taskId=test-task-123'
) ON CONFLICT DO NOTHING; 