# 🎬 DEMO: 3 Notifications khi Drag & Drop Task

## ✅ **SYSTEM ĐÃ SẴNG SÀNG!**

### **🎯 Khi user drag task từ "To Do" sang "In Progress":**

```javascript
// 1. Project Homepage handleDragEnd() được trigger
handleDragEnd(event) {
  // ... UI updates ...
  
  // 2. Call useProjectTasks.updateTaskStatus()
  const success = await updateTaskStatus(task, "IN_PROGRESS", "TODO");
}
```

### **📡 Trong updateTaskStatus():**

```javascript
// 1. Update task trong database
const response = await axios.put(`/api/tasks/${task.id}`, updatedTask);

// 2. Gọi sendTaskStatusChangeNotification()
await sendTaskStatusChangeNotification(task, "TODO", "IN_PROGRESS");
```

### **🔥 Trong sendTaskStatusChangeNotification() - MAGIC HAPPENS:**

```javascript
// 1. Thu thập 3 recipients
const recipients = [];

// Recipient 1: Assignee
if (task.assigneeId && task.assigneeId !== actorUserId) {
  recipients.push(task.assigneeId);  // "user-assignee-123"
}

// Recipient 2: Task Creator (từ cột created_by)
if (task.createdBy && task.createdBy !== actorUserId && task.createdBy !== task.assigneeId) {
  recipients.push(task.createdBy);   // "user-creator-456"
}

// Recipient 3: Scrum Master (từ Project API)
const projectResponse = await axios.get(`/api/projects/${task.projectId}`);
const scrumMasterId = projectResponse.data.data.scrumMasterId;
if (scrumMasterId && !recipients.includes(scrumMasterId)) {
  recipients.push(scrumMasterId);    // "user-scrum-789"
}
```

### **🚀 3 API Calls song song:**

```javascript
// Base notification data
const baseData = {
  type: "TASK_STATUS_CHANGED",
  title: "Task status changed",
  message: "John Doe changed task \"Fix Login Bug\" status from \"To Do\" to \"In Progress\"",
  actorUserId: "current-user-123",
  actorUserName: "John Doe",
  projectId: "project-abc",
  projectName: "TaskFlow Project",
  taskId: "task-xyz"
};

// Gửi 3 API calls song song
const promises = recipients.map(recipientId => {
  return axios.post('/api/notifications/create', {
    ...baseData,
    recipientUserId: recipientId  // 🎯 KHÁC NHAU CHO MỖI CALL
  });
});

await Promise.allSettled(promises);
```

---

## 📊 **Kết quả Database sau 1 lần drag & drop:**

| id | type | recipient_user_id | message | actor_user_name | created_at |
|----|------|------------------|---------|-----------------|------------|
| 1001 | TASK_STATUS_CHANGED | user-assignee-123 | John Doe changed task "Fix Login Bug" from "To Do" to "In Progress" | John Doe | 2024-01-15 14:30:15 |
| 1002 | TASK_STATUS_CHANGED | user-creator-456 | John Doe changed task "Fix Login Bug" from "To Do" to "In Progress" | John Doe | 2024-01-15 14:30:15 |
| 1003 | TASK_STATUS_CHANGED | user-scrum-789 | John Doe changed task "Fix Login Bug" from "To Do" to "In Progress" | John Doe | 2024-01-15 14:30:15 |

**3 rows, cùng message, khác `recipient_user_id`** ✅

---

## 🎭 **LIVE DEMO STEPS:**

### **1. Mở Project Homepage:**
```
http://localhost:3003/project/project_homescreen?projectId=YOUR_PROJECT_ID
```

### **2. Mở Browser DevTools (F12):**
```javascript
// Clear console để thấy logs rõ hơn
console.clear();
console.log("🎬 Starting 3-notification demo...");
```

### **3. Drag & Drop Task:**
- Kéo bất kỳ task nào từ "To Do" → "In Progress"

### **4. Quan sát Console Output:**
```bash
🔍 DEBUG: Task info for notifications: {
  taskId: "task-abc-123", 
  assigneeId: "user-assignee-123", 
  createdBy: "user-creator-456", 
  projectId: "project-xyz", 
  actorUserId: "current-user-789"
}

✅ Added assignee to recipients: user-assignee-123
✅ Added task creator to recipients: user-creator-456

🔍 Fetching project info for scrum master... project-xyz
✅ Added scrum master to recipients: user-scrum-master-101

📤 Final unique recipients (3): [
  "user-assignee-123", 
  "user-creator-456", 
  "user-scrum-master-101"
]

📤 Sending notification 1/3 to: user-assignee-123
✅ Notification 1 sent successfully: 200

📤 Sending notification 2/3 to: user-creator-456  
✅ Notification 2 sent successfully: 200

📤 Sending notification 3/3 to: user-scrum-master-101
✅ Notification 3 sent successfully: 200

📊 Notification results: 3 success, 0 failed
✅ Task status change notifications completed: 3/3 sent successfully
```

### **5. Kiểm tra Database:**
```sql
SELECT 
    recipient_user_id,
    SUBSTRING(message, 1, 50) as preview,
    created_at
FROM notifications 
WHERE type = 'TASK_STATUS_CHANGED' 
    AND task_id = 'task-abc-123'
ORDER BY created_at DESC 
LIMIT 3;
```

**Expected Output:**
```
recipient_user_id        | preview                                  | created_at
-------------------------|------------------------------------------|-------------------
user-assignee-123        | John Doe changed task "Fix Login Bug"   | 2024-01-15 14:30:15
user-creator-456         | John Doe changed task "Fix Login Bug"   | 2024-01-15 14:30:15  
user-scrum-master-101    | John Doe changed task "Fix Login Bug"   | 2024-01-15 14:30:15
```

---

## 🎯 **Implementation đã hoàn chỉnh cho:**

✅ **Project Homepage** - Drag & Drop (qua useProjectTasks hook)  
✅ **Task Detail Modal** - Save Changes (direct implementation)  
✅ **Backlog Page** - Status Dropdown (direct implementation)

**Mỗi UI interaction → 3 notifications → Database persistence**

---

## 🚀 **PRODUCTION READY!**

System hoạt động chính xác theo yêu cầu:
- ✅ 1 drag & drop = 3 API calls
- ✅ 3 recipients: assignee + creator + scrum master  
- ✅ Data source: task table + project API
- ✅ Database: 3 rows với recipient_user_id khác nhau
- ✅ Deduplication: không gửi duplicate notifications
- ✅ Error handling: graceful failures

**Sẵn sàng sử dụng ngay!** 🎉 