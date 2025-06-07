-- Test script to verify Task Status Change Notifications are saved to database
-- Run this script to check if notifications are properly created and stored

-- ========================================
-- 1. CHECK CURRENT NOTIFICATION SETUP
-- ========================================

-- Check notifications table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Check current notification count
SELECT COUNT(*) as total_notifications FROM notifications;

-- Check notification types
SELECT type, COUNT(*) as count 
FROM notifications 
GROUP BY type 
ORDER BY count DESC;

-- ========================================
-- 2. CHECK RECENT TASK STATUS NOTIFICATIONS
-- ========================================

-- Get recent TASK_STATUS_CHANGED notifications
SELECT 
    id,
    type,
    title,
    message,
    recipient_user_id,
    actor_user_id,
    actor_user_name,
    task_id,
    task_title,
    project_id,
    project_name,
    is_read,
    created_at
FROM notifications 
WHERE type = 'TASK_STATUS_CHANGED'
ORDER BY created_at DESC 
LIMIT 10;

-- ========================================
-- 3. CHECK NOTIFICATION RECIPIENTS
-- ========================================

-- Show who received TASK_STATUS_CHANGED notifications with user details
SELECT 
    n.id,
    n.message,
    n.recipient_user_id,
    u.username as recipient_name,
    u.email as recipient_email,
    n.actor_user_name,
    n.task_title,
    n.created_at
FROM notifications n
LEFT JOIN users u ON n.recipient_user_id = u.id
WHERE n.type = 'TASK_STATUS_CHANGED'
ORDER BY n.created_at DESC
LIMIT 20;

-- ========================================
-- 4. VERIFY 3 ROLES RECEIVE NOTIFICATIONS
-- ========================================

-- For a specific task status change, check if 3 types of users got notifications:
-- Replace 'TASK_ID_HERE' with actual task ID that had status changed

/*
-- Example query for specific task (uncomment and replace TASK_ID_HERE):
WITH task_notifications AS (
    SELECT 
        n.*,
        u.username as recipient_name,
        u.email as recipient_email
    FROM notifications n
    LEFT JOIN users u ON n.recipient_user_id = u.id
    WHERE n.type = 'TASK_STATUS_CHANGED' 
    AND n.task_id = 'TASK_ID_HERE'
    ORDER BY n.created_at DESC
),
task_info AS (
    SELECT 
        t.id,
        t.title,
        t.created_by,
        t.assignee_id,
        t.project_id,
        creator.username as creator_name,
        assignee.username as assignee_name
    FROM tasks t
    LEFT JOIN users creator ON t.created_by = creator.id
    LEFT JOIN users assignee ON t.assignee_id = assignee.id
    WHERE t.id = 'TASK_ID_HERE'
)
SELECT 
    'Task Info' as section,
    ti.title as task_title,
    ti.creator_name as task_creator,
    ti.assignee_name as task_assignee,
    NULL as notification_recipient,
    NULL as notification_message,
    NULL as created_at
FROM task_info ti
UNION ALL
SELECT 
    'Notifications' as section,
    tn.task_title,
    NULL as task_creator,
    NULL as task_assignee,
    tn.recipient_name as notification_recipient,
    tn.message as notification_message,
    tn.created_at
FROM task_notifications tn
ORDER BY section, created_at DESC;
*/

-- ========================================
-- 5. CHECK PROJECT SCRUM MASTERS
-- ========================================

-- Show scrum masters for projects that have recent status change notifications
SELECT DISTINCT
    p.id as project_id,
    p.name as project_name,
    u.id as scrum_master_id,
    u.username as scrum_master_name,
    u.email as scrum_master_email
FROM notifications n
JOIN projects p ON n.project_id = p.id
JOIN project_members pm ON p.id = pm.project_id
JOIN users u ON pm.user_id = u.id
WHERE n.type = 'TASK_STATUS_CHANGED'
AND pm.role_in_project = 'scrum_master'
AND n.created_at > NOW() - INTERVAL '1 day'
ORDER BY p.name, u.username;

-- ========================================
-- 6. NOTIFICATION STATS BY USER
-- ========================================

-- Count notifications received by each user for TASK_STATUS_CHANGED
SELECT 
    u.username,
    u.email,
    COUNT(n.id) as notification_count,
    MAX(n.created_at) as latest_notification
FROM users u
JOIN notifications n ON u.id = n.recipient_user_id
WHERE n.type = 'TASK_STATUS_CHANGED'
GROUP BY u.id, u.username, u.email
ORDER BY notification_count DESC;

-- ========================================
-- 7. DEBUGGING QUERIES
-- ========================================

-- Check if tasks have created_by field populated
SELECT 
    COUNT(*) as total_tasks,
    COUNT(created_by) as tasks_with_creator,
    COUNT(assignee_id) as tasks_with_assignee,
    COUNT(CASE WHEN created_by IS NOT NULL AND assignee_id IS NOT NULL THEN 1 END) as tasks_with_both
FROM tasks;

-- Check recent task updates
SELECT 
    t.id,
    t.title,
    t.status,
    t.created_by,
    t.assignee_id,
    t.project_id,
    t.updated_at,
    creator.username as creator_name,
    assignee.username as assignee_name
FROM tasks t
LEFT JOIN users creator ON t.created_by = creator.id
LEFT JOIN users assignee ON t.assignee_id = assignee.id
WHERE t.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY t.updated_at DESC
LIMIT 10;

-- Check if notification service is creating notifications
SELECT 
    COUNT(*) as notifications_last_hour,
    COUNT(CASE WHEN type = 'TASK_STATUS_CHANGED' THEN 1 END) as status_change_notifications,
    MIN(created_at) as first_notification,
    MAX(created_at) as latest_notification
FROM notifications 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- ========================================
-- 8. EXPECTED NOTIFICATION FLOW
-- ========================================

/*
When a task status changes from "TODO" to "REVIEW", you should see:
1. Backend logs: "✅ Task status changed notification sent successfully"
2. Three notifications created in database for:
   - Task creator (created_by field)
   - Task assignee (assignee_id field)  
   - Project scrum masters (users with role 'scrum_master' in project_members)
3. Each notification has personalized message based on user role
4. No duplicate notifications for same user
5. Actor (person who changed status) doesn't get notification

To test:
1. Change a task status via UI (drag & drop or status dropdown)
2. Run this script to verify 3 notifications are created
3. Check that each recipient gets appropriate message
*/

-- Show this explanation
SELECT 'Check the results above to verify 3 notifications were created for task status changes' as instruction;

-- ================================================================
-- TEST SCRIPT: Task Status Change Notifications with /create API
-- ================================================================

-- 1. Check recent notifications with new format
SELECT 
    id,
    type,
    title,
    message,
    recipient_user_id,
    actor_user_id,
    actor_user_name,
    project_id,
    task_id,
    old_status,
    new_status,
    created_at,
    is_read
FROM notifications 
WHERE type = 'TASK_STATUS_CHANGED'
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Count notifications by type to see if TASK_STATUS_CHANGED is being created
SELECT 
    type,
    COUNT(*) as count
FROM notifications 
GROUP BY type
ORDER BY count DESC;

-- 3. Check the JSON data field for task status change notifications
SELECT 
    id,
    type,
    message,
    data,
    created_at
FROM notifications 
WHERE type = 'TASK_STATUS_CHANGED'
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Verify notification recipients for a specific task status change
SELECT 
    n.id,
    n.type,
    n.recipient_user_id,
    n.actor_user_id,
    n.actor_user_name,
    n.message,
    n.task_id,
    n.old_status,
    n.new_status,
    n.created_at
FROM notifications n
WHERE n.type = 'TASK_STATUS_CHANGED'
  AND n.created_at > NOW() - INTERVAL 1 HOUR  -- Last hour
ORDER BY n.created_at DESC;

-- 5. Check if notifications are being created for the right recipients
-- (creator, assignee, scrum masters)
SELECT 
    'Recent TASK_STATUS_CHANGED notifications' as info,
    n.id,
    n.recipient_user_id,
    n.actor_user_id,
    n.message,
    n.old_status,
    n.new_status,
    n.created_at
FROM notifications n
WHERE n.type = 'TASK_STATUS_CHANGED'
  AND n.created_at > NOW() - INTERVAL 2 HOURS
ORDER BY n.created_at DESC;

-- 6. Verify notification data contains all required fields
SELECT 
    id,
    type,
    title,
    message,
    CASE 
        WHEN recipient_user_id IS NOT NULL THEN '✅ Has recipient'
        ELSE '❌ Missing recipient'
    END as recipient_check,
    CASE 
        WHEN actor_user_id IS NOT NULL THEN '✅ Has actor'
        ELSE '❌ Missing actor'
    END as actor_check,
    CASE 
        WHEN task_id IS NOT NULL THEN '✅ Has task_id'
        ELSE '❌ Missing task_id'
    END as task_check,
    CASE 
        WHEN project_id IS NOT NULL THEN '✅ Has project_id'
        ELSE '❌ Missing project_id'
    END as project_check,
    CASE 
        WHEN old_status IS NOT NULL AND new_status IS NOT NULL THEN '✅ Has status change'
        ELSE '❌ Missing status info'
    END as status_check,
    created_at
FROM notifications 
WHERE type = 'TASK_STATUS_CHANGED'
ORDER BY created_at DESC 
LIMIT 5;

-- 7. Check for duplicate notifications (same task, same status change, same time)
SELECT 
    task_id,
    actor_user_id,
    old_status,
    new_status,
    COUNT(*) as duplicate_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM notifications 
WHERE type = 'TASK_STATUS_CHANGED'
  AND created_at > NOW() - INTERVAL 1 HOUR
GROUP BY task_id, actor_user_id, old_status, new_status
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 8. Sample notification data format check
SELECT 
    'Sample notification data format:' as info,
    id,
    type,
    title,
    message,
    JSON_PRETTY(data) as formatted_data,
    created_at
FROM notifications 
WHERE type = 'TASK_STATUS_CHANGED'
ORDER BY created_at DESC 
LIMIT 1;

-- Expected new format should include:
-- {
--   "type": "TASK_STATUS_CHANGED",
--   "title": "Task status changed", 
--   "message": "User changed task 'Task Title' status from 'To Do' to 'In Progress'",
--   "actorUserId": "uuid",
--   "actorUserName": "username",
--   "actorUserAvatar": null,
--   "projectId": "uuid",
--   "projectName": "Project Name",
--   "taskId": "uuid", 
--   "taskTitle": "Task Title",
--   "assigneeUserId": "uuid",
--   "oldStatus": "To Do",
--   "newStatus": "In Progress",
--   "sprintId": "uuid",
--   "actionUrl": "/project/board?projectId=xxx&taskId=yyy"
-- } 