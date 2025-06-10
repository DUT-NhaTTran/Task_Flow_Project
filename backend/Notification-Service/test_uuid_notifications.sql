-- Test Script for UUID/BIGINT Notifications Migration
-- This script tests the updated notifications table structure

-- Test 1: Insert test data with proper UUID and BIGINT formats
-- Clean up any existing test data first
DELETE FROM notifications WHERE actor_user_name = 'Test Migration User';

-- Insert test notifications with UUID task_id, sprint_id and BIGINT comment_id
INSERT INTO notifications (
    type, title, message, 
    recipient_user_id, actor_user_id, actor_user_name,
    project_id, project_name,
    task_id, sprint_id, comment_id,
    is_read, created_at
) VALUES 
(
    'TASK_ASSIGNED'::notification_type,
    'Test Task Assignment',
    'You have been assigned to "Test Task"',
    '550e8400-e29b-41d4-a716-446655440000',
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    'Test Migration User',
    'test-project-1',
    'Test Project',
    '123e4567-e89b-12d3-a456-426614174000',  -- UUID task_id
    '789e0123-e89b-12d3-a456-426614174001',  -- UUID sprint_id  
    12345,                                    -- BIGINT comment_id
    false,
    NOW()
),
(
    'TASK_COMMENT'::notification_type,
    'New Comment',
    'Test Migration User commented on "Another Task"',
    '550e8400-e29b-41d4-a716-446655440000',
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    'Test Migration User',
    'test-project-2',
    'Another Project',
    '456e7890-e89b-12d3-a456-426614174002',  -- UUID task_id
    NULL,                                     -- NULL sprint_id
    67890,                                    -- BIGINT comment_id
    false,
    NOW()
),
(
    'SPRINT_CREATED'::notification_type,
    'Sprint Created',
    'Test Migration User created a new sprint',
    '550e8400-e29b-41d4-a716-446655440000',
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    'Test Migration User',
    'test-project-3',
    'Sprint Project',
    NULL,                                     -- NULL task_id
    '789e0123-e89b-12d3-a456-426614174003',  -- UUID sprint_id
    NULL,                                     -- NULL comment_id
    true,
    NOW()
);

-- Test 2: Verify table structure
SELECT 'Table Structure Check' as test_name;
DESCRIBE notifications;

-- Test 3: Check column types specifically
SELECT 
    'Column Types Check' as test_name,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'notifications' 
  AND COLUMN_NAME IN ('recipient_user_id', 'actor_user_id', 'task_id', 'sprint_id', 'comment_id')
ORDER BY ORDINAL_POSITION;

-- Test 4: Verify inserted test data
SELECT 'Test Data Verification' as test_name;
SELECT 
    id,
    type,
    title,
    recipient_user_id,
    actor_user_id,
    actor_user_name,
    task_id,
    sprint_id,
    comment_id,
    is_read,
    created_at
FROM notifications 
WHERE actor_user_name = 'Test Migration User'
ORDER BY created_at DESC;

-- Test 5: Check data type validation
SELECT 'Data Type Validation' as test_name;

-- Check UUID format for recipient_user_id
SELECT 
    'recipient_user_id UUID check' as validation_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN recipient_user_id IS NOT NULL THEN 1 END) as non_null_count,
    COUNT(CASE WHEN CHAR_LENGTH(CAST(recipient_user_id AS CHAR)) = 36 THEN 1 END) as valid_uuid_count
FROM notifications;

-- Check UUID format for actor_user_id
SELECT 
    'actor_user_id UUID check' as validation_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN actor_user_id IS NOT NULL THEN 1 END) as non_null_count,
    COUNT(CASE WHEN CHAR_LENGTH(CAST(actor_user_id AS CHAR)) = 36 THEN 1 END) as valid_uuid_count
FROM notifications;

-- Check UUID format for task_id
SELECT 
    'task_id UUID check' as validation_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN task_id IS NOT NULL THEN 1 END) as non_null_count,
    COUNT(CASE WHEN task_id IS NOT NULL AND CHAR_LENGTH(CAST(task_id AS CHAR)) = 36 THEN 1 END) as valid_uuid_count
FROM notifications;

-- Check UUID format for sprint_id
SELECT 
    'sprint_id UUID check' as validation_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN sprint_id IS NOT NULL THEN 1 END) as non_null_count,
    COUNT(CASE WHEN sprint_id IS NOT NULL AND CHAR_LENGTH(CAST(sprint_id AS CHAR)) = 36 THEN 1 END) as valid_uuid_count
FROM notifications;

-- Check BIGINT format for comment_id
SELECT 
    'comment_id BIGINT check' as validation_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN comment_id IS NOT NULL THEN 1 END) as non_null_count,
    MIN(comment_id) as min_value,
    MAX(comment_id) as max_value
FROM notifications;

-- Test 6: Index verification
SELECT 'Index Verification' as test_name;
SHOW INDEX FROM notifications WHERE Column_name IN ('recipient_user_id', 'actor_user_id', 'task_id', 'sprint_id', 'comment_id');

-- Test 7: Query performance test
SELECT 'Performance Test' as test_name;

-- Test query by recipient_user_id (UUID)
EXPLAIN SELECT * FROM notifications 
WHERE recipient_user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC;

-- Test query by task_id (UUID)
EXPLAIN SELECT * FROM notifications 
WHERE task_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY created_at DESC;

-- Test query by sprint_id (UUID)
EXPLAIN SELECT * FROM notifications 
WHERE sprint_id = '789e0123-e89b-12d3-a456-426614174001'
ORDER BY created_at DESC;

-- Test query by comment_id (BIGINT)
EXPLAIN SELECT * FROM notifications 
WHERE comment_id = 12345
ORDER BY created_at DESC;

-- Test 8: Statistics summary
SELECT 'Migration Statistics Summary' as test_name;

SELECT 
    'Overall Statistics' as category,
    COUNT(*) as total_notifications,
    COUNT(DISTINCT recipient_user_id) as unique_recipients,
    COUNT(DISTINCT actor_user_id) as unique_actors,
    COUNT(CASE WHEN task_id IS NOT NULL THEN 1 END) as notifications_with_task,
    COUNT(CASE WHEN sprint_id IS NOT NULL THEN 1 END) as notifications_with_sprint,
    COUNT(CASE WHEN comment_id IS NOT NULL THEN 1 END) as notifications_with_comment,
    COUNT(CASE WHEN is_read = true THEN 1 END) as read_notifications,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications
FROM notifications;

-- Test 9: Type distribution
SELECT 
    'Notification Type Distribution' as test_name,
    type,
    COUNT(*) as count,
    AVG(CASE WHEN is_read THEN 1.0 ELSE 0.0 END) as read_rate
FROM notifications 
GROUP BY type 
ORDER BY count DESC;

-- Test 10: Clean up test data
DELETE FROM notifications WHERE actor_user_name = 'Test Migration User';

SELECT 'Migration Test Completed Successfully!' as result; 