-- Add priority column to tasks table
-- Run this manually in your PostgreSQL database

-- Step 1: Add priority column with default value
ALTER TABLE tasks 
ADD COLUMN priority VARCHAR(10) DEFAULT 'MEDIUM';

-- Step 2: Add constraint to ensure only valid priority values
ALTER TABLE tasks 
ADD CONSTRAINT check_priority 
CHECK (priority IN ('LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'));

-- Step 3: Update existing tasks to have Medium priority as default
UPDATE tasks 
SET priority = 'MEDIUM' 
WHERE priority IS NULL;

-- Step 4: Add index for better performance when sorting by priority
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Step 5: Add index for combined priority and project sorting  
CREATE INDEX idx_tasks_project_priority ON tasks(project_id, priority DESC, created_at DESC);

-- Priority values explanation:
-- HIGHEST: Critical issues, blockers, urgent features
-- HIGH: Important features, bugs affecting multiple users  
-- MEDIUM: Normal development tasks, enhancements (DEFAULT)
-- LOW: Nice-to-have features, minor improvements
-- LOWEST: Future considerations, backlog items

-- Sample update commands (run after adding column):
-- UPDATE tasks SET priority = 'HIGH' WHERE status = 'TODO' AND due_date < NOW() + INTERVAL '3 days';
-- UPDATE tasks SET priority = 'HIGHEST' WHERE title ILIKE '%critical%' OR title ILIKE '%urgent%';
-- UPDATE tasks SET priority = 'LOW' WHERE title ILIKE '%nice to have%' OR title ILIKE '%enhancement%';

COMMENT ON COLUMN tasks.priority IS 'Task priority: HIGHEST, HIGH, MEDIUM (default), LOW, LOWEST'; 