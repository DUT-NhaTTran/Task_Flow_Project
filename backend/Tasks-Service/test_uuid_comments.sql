-- Test Script: Verify UUID Comments Integration
-- This script tests the UUID task_id integration in comments table

-- Step 1: Check if we have tasks with UUID IDs
SELECT 
    id as task_uuid, 
    title, 
    project_id, 
    status 
FROM tasks 
LIMIT 5;

-- Step 2: Get a sample task UUID for testing
SET @test_task_id = (SELECT id FROM tasks LIMIT 1);

-- Step 3: Test inserting a comment with UUID task_id
INSERT INTO comments (task_id, user_id, user_name, user_email, content) 
VALUES (
    @test_task_id,
    'test-user-id',
    'Test User',
    'test@example.com',
    'This is a test comment with UUID task_id'
);

-- Step 4: Verify the comment was inserted correctly
SELECT 
    c.id as comment_id,
    c.task_id,
    c.user_name,
    c.content,
    c.created_at,
    t.title as task_title
FROM comments c
JOIN tasks t ON c.task_id = t.id
WHERE c.content LIKE '%test comment with UUID%';

-- Step 5: Test foreign key constraint by trying to insert invalid task_id
-- This should fail with foreign key constraint error
-- INSERT INTO comments (task_id, user_id, user_name, content) 
-- VALUES (
--     '00000000-0000-0000-0000-000000000000',
--     'test-user-id',
--     'Test User',
--     'This should fail'
-- );

-- Step 6: Check if all existing comments have valid task_id references
SELECT 
    COUNT(*) as total_comments,
    COUNT(t.id) as comments_with_valid_tasks,
    COUNT(*) - COUNT(t.id) as orphaned_comments
FROM comments c
LEFT JOIN tasks t ON c.task_id = t.id;

-- Step 7: Show comments count per task
SELECT 
    t.id as task_id,
    t.title,
    COUNT(c.id) as comment_count
FROM tasks t
LEFT JOIN comments c ON t.id = c.task_id AND c.is_deleted = FALSE
GROUP BY t.id, t.title
HAVING COUNT(c.id) > 0
ORDER BY comment_count DESC
LIMIT 10;

-- Step 8: Clean up test data
DELETE FROM comments 
WHERE content LIKE '%test comment with UUID%';

-- Verification queries
SELECT 'COMMENTS TABLE STRUCTURE:' as info;
DESCRIBE comments;

SELECT 'FOREIGN KEY CONSTRAINTS:' as info;
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'comments'
    AND CONSTRAINT_NAME LIKE 'fk_%';

COMMIT; 