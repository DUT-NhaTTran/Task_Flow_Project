# 🧪 TEST: Drag & Drop gửi 3 Notifications

## ✅ **LOGIC MỚI ĐÃ ĐƯỢC CÀI ĐẶT**

### **🎯 Flow mới trong handleDragEnd():**

```javascript
// 1. Update task status trong database
const response = await axios.put(`/api/tasks/${task.id}`, updatedTask);

// 2. Gọi send3StatusChangeNotifications() - CUSTOM LOGIC
await send3StatusChangeNotifications(task, oldStatus, newStatus);
```

### **🔥 Logic trong send3StatusChangeNotifications():**

```javascript
const recipients = [];

// Recipient 1: Assignee
if (task.assigneeId && task.assigneeId !== actorUserId) {
  recipients.push({ userId: task.assigneeId, role: 'assignee' });
}

// Recipient 2: Task Creator (từ cột created_by)
if (task.createdBy && task.createdBy !== actorUserId && task.createdBy !== task.assigneeId) {
  recipients.push({ userId: task.createdBy, role: 'creator' });
}

// Recipient 3: Scrum Master (từ Project API)
const projectResponse = await axios.get(`/api/projects/${projectId}`);
const scrumMasterId = projectResponse.data.data.scrumMasterId;
if (scrumMasterId && không duplicate) {
  recipients.push({ userId: scrumMasterId, role: 'scrum_master' });
}

// Gửi 3 API calls riêng biệt
recipients.forEach(recipient => {
  axios.post('/notifications/create', {
    ...baseData,
    recipientUserId: recipient.userId  // 🎯 KHÁC NHAU
  });
});
```

---

## 🧪 **TESTING STEPS:**

### **1. Mở Project Homepage:**
```
http://localhost:3003/project/project_homescreen?projectId=YOUR_PROJECT_ID
```

### **2. Mở Browser Console (F12):**
```javascript
console.clear();
console.log("🧪 Testing drag & drop 3 notifications...");
```

### **3. Drag Task từ "To Do" → "In Progress"**

### **4. Expected Console Output:**
```bash
🔄 DRAG&DROP: Updating task status in database...
✅ DRAG&DROP: Task status updated successfully

🔔 DRAG&DROP: Starting to send 3 notifications...

🔍 DRAG&DROP: Current user: {actorUserId: "user-123", actorUserName: "John Doe"}
🔍 DRAG&DROP: Task info: {
  id: "task-456", 
  title: "Fix Login Bug", 
  assigneeId: "user-assignee-789", 
  createdBy: "user-creator-101", 
  projectId: "project-xyz"
}

✅ DRAG&DROP: Added assignee to recipients: user-assignee-789
✅ DRAG&DROP: Added task creator to recipients: user-creator-101

🔍 DRAG&DROP: Fetching scrum master for project: project-xyz
🔍 DRAG&DROP: Project API response: {status: "SUCCESS", data: {...}}
✅ DRAG&DROP: Added scrum master to recipients: user-scrum-master-202

🎯 DRAG&DROP: Total recipients to notify: 3

📤 DRAG&DROP: Sending notification 1/3 to assignee: user-assignee-789
📤 DRAG&DROP: Notification data: {
  type: "TASK_STATUS_CHANGED",
  recipientUserId: "user-assignee-789",
  ...
}
✅ DRAG&DROP: Notification 1 sent successfully to assignee

📤 DRAG&DROP: Sending notification 2/3 to creator: user-creator-101
✅ DRAG&DROP: Notification 2 sent successfully to creator

📤 DRAG&DROP: Sending notification 3/3 to scrum_master: user-scrum-master-202
✅ DRAG&DROP: Notification 3 sent successfully to scrum_master

📊 DRAG&DROP: Notification results: 3 success, 0 failed
🎉 DRAG&DROP: Successfully sent 3 notifications!
```

### **5. Verify Database:**
```sql
SELECT 
    id,
    type,
    recipient_user_id,
    SUBSTRING(message, 1, 60) as message_preview,
    actor_user_name,
    created_at
FROM notifications 
WHERE type = 'TASK_STATUS_CHANGED'
    AND task_id = 'task-456'
ORDER BY created_at DESC 
LIMIT 3;
```

**Expected Result:**
| id | recipient_user_id | message_preview | actor_user_name |
|----|------------------|-----------------|-----------------|
| 1001 | user-assignee-789 | John Doe changed task "Fix Login Bug" from "To Do"... | John Doe |
| 1002 | user-creator-101 | John Doe changed task "Fix Login Bug" from "To Do"... | John Doe |
| 1003 | user-scrum-master-202 | John Doe changed task "Fix Login Bug" from "To Do"... | John Doe |

---

## 🎯 **Success Criteria:**

✅ **3 console logs** với "Sending notification X/3"  
✅ **3 API calls** tới POST /notifications/create  
✅ **3 database rows** với khác `recipient_user_id`  
✅ **3 recipients:** assignee + creator + scrum_master  
✅ **Deduplication** working properly  

---

## 🔧 **Mock Data để test:**

Nếu task không có đủ data, thêm vào database:

```sql
-- Đảm bảo task có assignee và creator
UPDATE tasks SET 
    assignee_id = 'test-assignee-123',
    created_by = 'test-creator-456'
WHERE id = 'YOUR_TEST_TASK_ID';

-- Đảm bảo project có scrum master
UPDATE projects SET 
    scrum_master_id = 'test-scrum-789'
WHERE id = 'YOUR_PROJECT_ID';
```

---

## 🚀 **LOGIC ĐÃ CÀI ĐẶT HOÀN CHỈNH**

- ✅ **Direct implementation** trong handleDragEnd()
- ✅ **3 separate API calls** với different recipientUserId
- ✅ **Data sources:** task table + project API
- ✅ **Error handling** và detailed logging
- ✅ **Deduplication** logic
- ✅ **Production ready**

**Sẵn sàng test ngay!** 🎉 