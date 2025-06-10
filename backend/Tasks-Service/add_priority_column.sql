-- Add priority column to tasks table
-- Run this manually in your PostgreSQL database

-- Step 1: Add priority column with default value
ALTER TABLE tasks 
ADD COLUMN priority VARCHAR(10) DEFAULT 'MEDIUM';

-- Step 2: Drop existing constraint if exists (for updating)
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS check_priority;

-- Step 3: Add updated constraint to ensure only valid priority values including BLOCKER
ALTER TABLE tasks 
ADD CONSTRAINT check_priority 
CHECK (priority IN ('LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST', 'BLOCKER'));

-- Step 4: Update existing tasks to have Medium priority as default
UPDATE tasks 
SET priority = 'MEDIUM' 
WHERE priority IS NULL;

-- Step 5: Add index for better performance when sorting by priority
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Step 6: Add index for combined priority and project sorting  
CREATE INDEX IF NOT EXISTS idx_tasks_project_priority ON tasks(project_id, priority DESC, created_at DESC);

-- Priority values explanation:
-- BLOCKER: Tasks that block development/testing, critical bugs that stop work
-- HIGHEST: Critical issues, blockers, urgent features
-- HIGH: Important features, bugs affecting multiple users  
-- MEDIUM: Normal development tasks, enhancements (DEFAULT)
-- LOW: Nice-to-have features, minor improvements
-- LOWEST: Future considerations, backlog items

-- Sample update commands (run after adding column):
-- UPDATE tasks SET priority = 'BLOCKER' WHERE title ILIKE '%block%' OR title ILIKE '%critical bug%';
-- UPDATE tasks SET priority = 'HIGH' WHERE status = 'TODO' AND due_date < NOW() + INTERVAL '3 days';
-- UPDATE tasks SET priority = 'HIGHEST' WHERE title ILIKE '%critical%' OR title ILIKE '%urgent%';
-- UPDATE tasks SET priority = 'LOW' WHERE title ILIKE '%nice to have%' OR title ILIKE '%enhancement%';

COMMENT ON COLUMN tasks.priority IS 'Task priority: BLOCKER, HIGHEST, HIGH, MEDIUM (default), LOW, LOWEST'; 