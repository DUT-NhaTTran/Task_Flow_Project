-- Migration Script: Update Notifications Table User IDs to UUID
-- Execute this script to update existing notifications table structure
-- BACKUP YOUR DATA BEFORE RUNNING THIS SCRIPT!

-- Step 1: Create backup table (optional but recommended)
CREATE TABLE notifications_backup AS SELECT * FROM notifications;

-- Step 2: Remove any invalid user_id values that are not valid UUIDs
-- This will help prevent constraint violations
DELETE FROM notifications 
WHERE recipient_user_id NOT REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
   OR actor_user_id NOT REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- Step 3: Update the recipient_user_id column type to UUID
ALTER TABLE notifications 
MODIFY COLUMN recipient_user_id UUID NOT NULL;

-- Step 4: Update the actor_user_id column type to UUID  
ALTER TABLE notifications 
MODIFY COLUMN actor_user_id UUID NOT NULL;

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_user_id ON notifications(actor_user_id);

-- Step 6: Add any foreign key constraints if needed (optional)
-- Note: Uncomment if you have a users table to reference
-- ALTER TABLE notifications 
-- ADD CONSTRAINT fk_notifications_recipient_user_id 
-- FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ALTER TABLE notifications 
-- ADD CONSTRAINT fk_notifications_actor_user_id 
-- FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 7: Verify the migration
SHOW COLUMNS FROM notifications LIKE '%user_id%';

-- Step 8: Test basic queries
SELECT 
    'recipient_user_id check' as test_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT recipient_user_id) as unique_recipients
FROM notifications;

SELECT 
    'actor_user_id check' as test_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT actor_user_id) as unique_actors
FROM notifications;

-- Step 9: Clean up backup table after verification (optional)
-- DROP TABLE IF EXISTS notifications_backup;

COMMIT; 