-- Migration to add soft delete functionality to sprints and tasks
-- Add deleted_at column to sprints table
ALTER TABLE sprints
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Add deleted_at column to tasks table  
ALTER TABLE tasks
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Add indexes for better performance when filtering out deleted items
CREATE INDEX IF NOT EXISTS idx_sprints_deleted_at ON sprints(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);

-- Add combined indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sprints_project_not_deleted ON sprints(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project_not_deleted ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_not_deleted ON tasks(sprint_id) WHERE deleted_at IS NULL;

-- Comments for documentation
COMMENT ON COLUMN sprints.deleted_at IS 'Timestamp when sprint was soft deleted. NULL means not deleted.';
COMMENT ON COLUMN tasks.deleted_at IS 'Timestamp when task was soft deleted. NULL means not deleted.'; 