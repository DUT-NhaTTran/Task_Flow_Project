-- Get completed tasks with story points for training
SELECT 
    title,
    description,
    story_point as storyPoint,
    priority,
    status,
    ARRAY_TO_STRING(tags, ',') as tags
FROM tasks 
WHERE project_id = '1898e7a8-b1e5-4bcd-8e49-67952efc868a'
AND story_point IS NOT NULL
AND story_point > 0
AND status = 'DONE'
ORDER BY created_at DESC; 