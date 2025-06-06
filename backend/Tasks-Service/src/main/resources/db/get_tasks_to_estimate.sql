-- Get tasks that need story point estimation
SELECT 
    id,
    title,
    description,
    priority,
    status,
    ARRAY_TO_STRING(tags, ',') as tags
FROM tasks 
WHERE project_id = '1898e7a8-b1e5-4bcd-8e49-67952efc868a'
AND sprint_id = 'fdc7cf27-c8e6-4d63-b6e8-6a83c11a902c'
AND (story_point IS NULL OR story_point = 0)
AND assignee_id IS NOT NULL
ORDER BY created_at DESC; 