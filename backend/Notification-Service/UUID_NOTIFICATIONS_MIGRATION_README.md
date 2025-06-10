# UUID/BIGINT Migration Guide: Notifications Table

## 📋 **Overview**
This migration updates the notifications table to use proper data types:
- `recipient_user_id` and `actor_user_id`: `VARCHAR(255)` → `UUID`
- `task_id` and `sprint_id`: `VARCHAR(255)` → `UUID`
- `comment_id`: `VARCHAR(255)` → `BIGINT`

This ensures proper data integrity and consistency with other services using UUID for entity identification and BIGINT for comment IDs.

## 🚀 **Migration Steps**

### 1. **Database Schema Changes**

#### Before Migration:
```sql
-- Backup existing data
CREATE TABLE notifications_backup AS SELECT * FROM notifications;
```

#### Execute Migration:
```sql
-- Run the migration script
SOURCE update_notifications_user_ids_to_uuid.sql;
```

#### Verify Migration:
```sql
-- Test the changes
SOURCE test_uuid_notifications.sql;
```

### 2. **Code Changes Made**

#### ✅ **Backend Changes:**

**Model Updates:**
- `Notification.java`: Updated all ID fields to proper types:
  - `recipientUserId`: `String` → `UUID`
  - `actorUserId`: `String` → `UUID`
  - `taskId`: `String` → `UUID`
  - `sprintId`: `String` → `UUID`
  - `commentId`: `String` → `Long`
- Updated all getters/setters and Builder pattern methods

**Repository Updates:**
- `NotificationDAO.java`: Updated all method signatures and SQL operations
- Added `setObject()` for UUID handling and `setLong()` for BIGINT
- Added helper methods `getUUIDFromResultSet()` and `getLongFromResultSet()`
- Updated mapping in `mapResultSetToNotification()`

**Service Updates:**
- `NotificationService.java`: Updated interface method signatures
- `NotificationServiceImpl.java`: Updated all method implementations
- Changed parameter types in notification creation methods

**Controller Updates:**
- `NotificationController.java`: Added conversion for all ID types
- Added proper error handling for invalid UUID and Long formats
- Updated request body parsing for all endpoints

#### ✅ **API Changes:**

**Request/Response Format:**
```json
// Before: All String IDs
{
  "recipientUserId": "user-string-id",
  "actorUserId": "actor-string-id", 
  "taskId": "task-string-id",
  "sprintId": "sprint-string-id",
  "commentId": "comment-string-id"
}

// After: Proper data types (still sent as strings in JSON)
{
  "recipientUserId": "550e8400-e29b-41d4-a716-446655440000",  // UUID
  "actorUserId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",      // UUID
  "taskId": "123e4567-e89b-12d3-a456-426614174000",           // UUID
  "sprintId": "789e0123-e89b-12d3-a456-426614174001",         // UUID
  "commentId": "12345"                                         // BIGINT (as string)
}
```

### 3. **Database Migration Details**

#### Before:
```sql
recipient_user_id VARCHAR(255) NOT NULL
actor_user_id VARCHAR(255) NOT NULL
task_id VARCHAR(255) NULL
sprint_id VARCHAR(255) NULL
comment_id VARCHAR(255) NULL
```

#### After:
```sql
recipient_user_id UUID NOT NULL
actor_user_id UUID NOT NULL
task_id UUID NULL
sprint_id UUID NULL
comment_id BIGINT NULL
```

#### Indexes Added:
```sql
CREATE INDEX idx_notifications_recipient_user_id ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_actor_user_id ON notifications(actor_user_id);
CREATE INDEX idx_notifications_task_id ON notifications(task_id);
CREATE INDEX idx_notifications_sprint_id ON notifications(sprint_id);
CREATE INDEX idx_notifications_comment_id ON notifications(comment_id);
```

### 4. **Testing Verification**

#### Backend Tests:
```bash
# Run notification service tests
mvn test -Dtest=NotificationServiceTest

# Test UUID and BIGINT conversion
mvn test -Dtest=NotificationControllerTest
```

#### Database Tests:
```sql
-- Run verification script
SOURCE test_uuid_notifications.sql;
```

#### API Tests:
```bash
# Test notification creation with proper data types
curl -X POST http://localhost:8089/api/notifications/create \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TASK_ASSIGNED",
    "title": "Test notification",
    "message": "Testing proper ID types",
    "recipientUserId": "550e8400-e29b-41d4-a716-446655440000",
    "actorUserId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "actorUserName": "Test User",
    "taskId": "123e4567-e89b-12d3-a456-426614174000",
    "sprintId": "789e0123-e89b-12d3-a456-426614174001",
    "commentId": "12345"
  }'

# Test task comment notification
curl -X POST http://localhost:8089/api/notifications/task-comment \
  -H "Content-Type: application/json" \
  -d '{
    "recipientUserId": "550e8400-e29b-41d4-a716-446655440000",
    "actorUserId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "actorUserName": "Commenter",
    "taskId": "123e4567-e89b-12d3-a456-426614174000",
    "taskTitle": "Test Task",
    "projectId": "test-project",
    "projectName": "Test Project",
    "commentId": "98765"
  }'
```

### 5. **Migration Checklist**

- [x] **Backup existing data** ✅
- [x] **Run database migration script** ✅
- [x] **Update Java models** ✅ 
- [x] **Update repository layer** ✅
- [x] **Update service layer** ✅
- [x] **Update controller layer** ✅
- [x] **Test API endpoints** ✅
- [x] **Verify database queries** ✅
- [x] **Create comprehensive test script** ✅
- [ ] **Run integration tests** ⏳
- [ ] **Update frontend if needed** ⏳

### 6. **Compatibility Notes**

#### Frontend Impact:
- **No changes required** for frontend code
- All IDs are still sent as strings in JSON
- Backend handles type conversion automatically
- API endpoints remain the same

#### Other Services:
- **Task Service**: Should send UUID strings for taskId when creating notifications
- **Sprint Service**: Should send UUID strings for sprintId in sprint notifications
- **Comment Service**: Should send Long values as strings for commentId
- **Project Service**: Should send UUID strings for all relevant IDs

### 7. **Rollback Plan**

If issues arise, you can rollback using:

```sql
-- Rollback step 1: Restore table structure
ALTER TABLE notifications 
MODIFY COLUMN recipient_user_id VARCHAR(255) NOT NULL;

ALTER TABLE notifications 
MODIFY COLUMN actor_user_id VARCHAR(255) NOT NULL;

ALTER TABLE notifications 
MODIFY COLUMN task_id VARCHAR(255) NULL;

ALTER TABLE notifications 
MODIFY COLUMN sprint_id VARCHAR(255) NULL;

ALTER TABLE notifications 
MODIFY COLUMN comment_id VARCHAR(255) NULL;

-- Rollback step 2: Restore data from backup
TRUNCATE TABLE notifications;
INSERT INTO notifications SELECT * FROM notifications_backup;

-- Rollback step 3: Clean up
DROP TABLE notifications_backup;
```

### 8. **Performance Improvements**

#### Benefits:
- **UUID Benefits**: Better indexing performance, consistent data types, improved referential integrity
- **BIGINT Benefits**: Efficient storage and indexing for numeric comment IDs
- **Future-proof**: Ready for service scaling and proper foreign key relationships

#### Index Performance:
```sql
-- Query performance examples
EXPLAIN SELECT * FROM notifications 
WHERE recipient_user_id = '550e8400-e29b-41d4-a716-446655440000'
AND task_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY created_at DESC;

EXPLAIN SELECT * FROM notifications 
WHERE comment_id = 12345
ORDER BY created_at DESC;
```

### 9. **Troubleshooting**

#### Common Issues:

**Invalid UUID Format:**
```
Error: Invalid UUID format for taskId: task-123
Solution: Ensure all UUIDs are in proper format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
```

**Invalid BIGINT Format:**
```
Error: Invalid Long format for commentId: comment-abc
Solution: Ensure commentId is a valid number (e.g., "12345")
```

**Migration Constraint Errors:**
```
Error: Data too long for column 'task_id'
Solution: Clean invalid data before migration
```

#### Debug Queries:
```sql
-- Find invalid UUID data
SELECT * FROM notifications 
WHERE task_id IS NOT NULL 
  AND task_id NOT REGEXP '^[0-9a-fA-F-]{36}$';

-- Find invalid BIGINT data  
SELECT * FROM notifications 
WHERE comment_id IS NOT NULL 
  AND comment_id NOT REGEXP '^[0-9]+$';

-- Check table structure
DESCRIBE notifications;

-- Verify all indexes
SHOW INDEX FROM notifications WHERE Column_name IN 
('recipient_user_id', 'actor_user_id', 'task_id', 'sprint_id', 'comment_id');
```

### 10. **Data Type Summary**

| Field | Old Type | New Type | Purpose |
|-------|----------|----------|---------|
| `recipient_user_id` | `VARCHAR(255)` | `UUID` | User receiving notification |
| `actor_user_id` | `VARCHAR(255)` | `UUID` | User performing action |
| `task_id` | `VARCHAR(255)` | `UUID` | Related task reference |
| `sprint_id` | `VARCHAR(255)` | `UUID` | Related sprint reference |
| `comment_id` | `VARCHAR(255)` | `BIGINT` | Related comment reference |

### 11. **Deployment Steps**

1. **Schedule maintenance window**
2. **Backup production database**
3. **Stop notification service**
4. **Run migration script**
5. **Deploy updated code**
6. **Start notification service**
7. **Run smoke tests**
8. **Monitor logs for errors**
9. **Verify all notification types work**
10. **Test integration with other services**

---

## 📞 **Support**

If you encounter any issues during migration:
1. Check the troubleshooting section above
2. Review the test script results
3. Verify database migration completed successfully
4. Check application logs for UUID/BIGINT-related errors
5. Test API endpoints with proper data types

**Migration completed successfully! 🎉**

All notifications now use proper data types for better performance and consistency across the Task Flow Project. 