# 🎯 Hướng dẫn Test AI với Task thật

## Bước 1: Lấy danh sách tasks từ project

```bash
# Thay YOUR_PROJECT_ID bằng project ID thật từ database
curl -X GET http://localhost:8085/api/tasks/project/YOUR_PROJECT_ID
```

**Kết quả sẽ trả về danh sách tasks với ID thật:**

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Create user profile page",
    "description": "Implement user profile with avatar upload and personal info",
    "storyPoint": 0,  // <- Chưa có story point
    "status": "TODO",
    "projectId": "YOUR_PROJECT_ID"
  }
]
```

## Bước 2: Estimate story points cho task cụ thể

```bash
# Sử dụng task ID thật từ bước 1
curl -X POST http://localhost:8085/api/tasks/123e4567-e89b-12d3-a456-426614174000/estimate-story-points
```

**Kết quả:**
```json
{
  "status": "SUCCESS",
  "data": {
    "success": true,
    "data": {
      "estimated_story_points": 5,
      "confidence": 0.85,
      "reasoning": "Estimated 5 story points using pretrained language model...",
      "features_used": {
        "title_length": 24,
        "description_length": 65,
        "predicted_raw": 4.8
      }
    }
  }
}
```

## Bước 3: Kiểm tra task đã được update

```bash
# Lấy lại task để xem story point đã được update
curl -X GET http://localhost:8085/api/tasks/get-by-id/123e4567-e89b-12d3-a456-426614174000
```

**Kết quả:**
```json
{
  "status": "SUCCESS",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Create user profile page",
    "description": "Implement user profile with avatar upload and personal info",
    "storyPoint": 5,  // <- ✅ Đã được AI estimate!
    "status": "TODO",
    "projectId": "YOUR_PROJECT_ID"
  }
}
```

## Bước 4: Bulk estimate cho toàn bộ project

```bash
# Estimate tất cả tasks trong project chưa có story points
curl -X POST http://localhost:8085/api/tasks/project/YOUR_PROJECT_ID/bulk-estimate
```

**Kết quả:**
```json
{
  "status": "SUCCESS",
  "data": {
    "success": true,
    "totalTasks": 10,
    "successCount": 8,
    "failCount": 2,
    "results": [
      {
        "taskId": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Create user profile page",
        "result": { "success": true, "data": { "estimated_story_points": 5 } }
      }
    ]
  }
}
```

## Bước 5: Train AI với data thật từ database

```bash
# AI sẽ lấy tất cả tasks có story points từ database để train
curl -X POST http://localhost:8085/api/tasks/train-ai-model
```

## 🎯 Frontend Integration trong Detail Model

### Thêm button estimate trong task detail:

```javascript
// Trong task detail component
const handleAIEstimate = async (taskId) => {
  try {
    const response = await fetch(`/api/tasks/${taskId}/estimate-story-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (result.status === 'SUCCESS' && result.data.success) {
      // Show success notification
      toast.success(`AI estimated ${result.data.data.estimated_story_points} story points`);
      
      // Refresh task data
      refreshTask();
    }
  } catch (error) {
    toast.error('AI estimation failed');
  }
};

// Render button
<button 
  onClick={() => handleAIEstimate(task.id)}
  className="ai-estimate-btn"
>
  🤖 AI Estimate
</button>
```

### Hiển thị confidence score:

```javascript
// Trong task detail, hiển thị confidence nếu có
{task.aiConfidence && (
  <div className="ai-confidence">
    AI Confidence: {(task.aiConfidence * 100).toFixed(1)}%
  </div>
)}
```

## 📊 Best Practices

1. **Train AI thường xuyên** với data mới
2. **Kiểm tra confidence score** - nếu < 0.7 thì nên review manual
3. **Sử dụng bulk estimate** cho project mới
4. **Backup story points** trước khi estimate để có thể rollback
5. **Monitor accuracy** bằng cách so sánh với actual effort 