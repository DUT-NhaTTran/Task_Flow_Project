-- Add soft delete functionality to projects table
-- This allows notifications to reference deleted projects

-- Step 1: Add deleted_at column
ALTER TABLE projects 
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Step 2: Add index for better performance when filtering non-deleted projects
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);

-- Step 3: Add index for active projects (deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(id) WHERE deleted_at IS NULL;

-- Step 4: Update existing queries to filter out deleted projects
-- All existing queries should add WHERE deleted_at IS NULL

-- Example of soft delete operation:
-- UPDATE projects SET deleted_at = NOW() WHERE id = 'project-uuid';

-- Example of restoring a soft deleted project:
-- UPDATE projects SET deleted_at = NULL WHERE id = 'project-uuid';

-- To permanently delete old soft deleted projects (optional cleanup):
-- DELETE FROM projects WHERE deleted_at < NOW() - INTERVAL '30 days';

COMMENT ON COLUMN projects.deleted_at IS 'Timestamp when project was soft deleted. NULL means active project'; 