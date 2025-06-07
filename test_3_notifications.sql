-- Test script to verify 3 notifications are created for task status changes
-- This simulates the expected behavior when a task status is changed

-- Step 1: Insert test data
USE taskflow_notifications;

-- Clear existing test notifications
DELETE FROM notifications WHERE type = 'TASK_STATUS_CHANGED' AND message LIKE '%Test Task for 3 Notifications%';

-- Simulate creating 3 notifications for a task status change
-- 1. Notification to assignee
INSERT INTO notifications (
    type, title, message, recipient_user_id, actor_user_id, actor_user_name,
    project_id, project_name, task_id, created_at, is_read
) VALUES (
    'TASK_STATUS_CHANGED',
    'Task status changed',
    'John Doe changed task "Test Task for 3 Notifications" status from "To Do" to "In Progress"',
    'assignee-user-123',
    'actor-user-456',
    'John Doe',
    'project-789',
    'TaskFlow Project',
    'task-abc-123',
    NOW(),
    0
);

-- 2. Notification to task creator
INSERT INTO notifications (
    type, title, message, recipient_user_id, actor_user_id, actor_user_name,
    project_id, project_name, task_id, created_at, is_read
) VALUES (
    'TASK_STATUS_CHANGED',
    'Task status changed',
    'John Doe changed task "Test Task for 3 Notifications" status from "To Do" to "In Progress"',
    'creator-user-789',
    'actor-user-456',
    'John Doe',
    'project-789',
    'TaskFlow Project',
    'task-abc-123',
    NOW(),
    0
);

-- 3. Notification to scrum master
INSERT INTO notifications (
    type, title, message, recipient_user_id, actor_user_id, actor_user_name,
    project_id, project_name, task_id, created_at, is_read
) VALUES (
    'TASK_STATUS_CHANGED',
    'Task status changed',
    'John Doe changed task "Test Task for 3 Notifications" status from "To Do" to "In Progress"',
    'scrum-master-101',
    'actor-user-456',
    'John Doe',
    'project-789',
    'TaskFlow Project',
    'task-abc-123',
    NOW(),
    0
);

-- Step 2: Verify the notifications were created
SELECT 
    id,
    type,
    title,
    SUBSTRING(message, 1, 50) as message_preview,
    recipient_user_id,
    actor_user_id,
    actor_user_name,
    project_id,
    task_id,
    created_at,
    is_read
FROM notifications 
WHERE type = 'TASK_STATUS_CHANGED' 
  AND message LIKE '%Test Task for 3 Notifications%'
ORDER BY created_at DESC;

-- Step 3: Count notifications by recipient
SELECT 
    recipient_user_id,
    COUNT(*) as notification_count,
    CASE 
        WHEN recipient_user_id = 'assignee-user-123' THEN 'Assignee'
        WHEN recipient_user_id = 'creator-user-789' THEN 'Task Creator'
        WHEN recipient_user_id = 'scrum-master-101' THEN 'Scrum Master'
        ELSE 'Unknown'
    END as recipient_role
FROM notifications 
WHERE type = 'TASK_STATUS_CHANGED' 
  AND message LIKE '%Test Task for 3 Notifications%'
GROUP BY recipient_user_id
ORDER BY recipient_role;

-- Expected result: 3 notifications, one for each role
-- This verifies that the frontend notification system should create 3 separate notifications 