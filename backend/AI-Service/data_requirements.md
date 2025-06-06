# 📊 Dữ liệu đầu vào cho AI Story Point Estimation

## 🔥 REQUIRED FIELDS (Bắt buộc)

### 1. **title** (string) - Tiêu đề task
- **Mục đích**: Xác định loại công việc và độ phức tạp
- **Ví dụ tốt**: 
  - ✅ "Implement user authentication system"
  - ✅ "Fix CSS alignment issue in header"
  - ✅ "Create REST API for user management"
  
- **Ví dụ không tốt**:
  - ❌ "Fix bug" (quá mơ hồ)
  - ❌ "Update" (thiếu thông tin)
  - ❌ "Task 1" (không mô tả)

### 2. **description** (string) - Mô tả chi tiết
- **Mục đích**: Hiểu rõ scope và requirements
- **Ví dụ tốt**:
  ```
  ✅ "Implement user authentication system with login/logout functionality, 
      password validation, session management, and remember me feature. 
      Include error handling and security measures."
  ```
  
- **Ví dụ không tốt**:
  ```
  ❌ "Add login" (thiếu chi tiết)
  ❌ "" (trống)
  ```

### 3. **storyPoint** (integer) - Chỉ cho training data
- **Giá trị**: 1, 2, 3, 5, 8, 13, 21 (Fibonacci scale)
- **Mục đích**: AI học từ các ước lượng có sẵn

## ⭐ OPTIONAL FIELDS (Tùy chọn - nâng cao độ chính xác)

### 1. **estimated_hours** (float)
- **Mục đích**: Tương quan giữa thời gian và story points
- **Ví dụ**: 8.5, 16, 24
- **Mapping gợi ý**:
  - 1-4 hours → 1 story point
  - 4-8 hours → 2-3 story points  
  - 8-16 hours → 5 story points
  - 16-32 hours → 8 story points
  - 32+ hours → 13-21 story points

### 2. **complexity** (string)
- **Giá trị**: "low", "medium", "high"
- **Ví dụ**:
  - `"low"`: Fix typo, minor CSS changes
  - `"medium"`: Add new form, implement API endpoint
  - `"high"`: Complex algorithm, system integration

### 3. **priority** (string)  
- **Giá trị**: "low", "medium", "high", "critical"
- **Ảnh hưởng**: Priority cao có thể cần effort nhiều hơn

## 📈 TRAINING DATA REQUIREMENTS

### Số lượng tối thiểu:
- **10+ tasks**: AI hoạt động cơ bản
- **30+ tasks**: Kết quả khá chính xác  
- **50+ tasks**: Kết quả tốt
- **100+ tasks**: Kết quả rất tốt

### Phân bố story points:
```json
{
  "1 point": "20-30% (bug fixes, typos)",
  "2-3 points": "30-40% (small features)", 
  "5 points": "20-25% (medium features)",
  "8 points": "10-15% (large features)",
  "13+ points": "5-10% (complex features)"
}
```

### Chất lượng mô tả:
- **Tối thiểu**: 20-50 từ trong description
- **Tốt**: 50-100 từ
- **Rất tốt**: 100+ từ với chi tiết requirements

## 🎯 EXAMPLES BY COMPLEXITY

### 1 Story Point - Simple Tasks
```json
{
  "title": "Fix button color in header",
  "description": "Change the login button color from blue to green according to new brand guidelines",
  "storyPoint": 1,
  "complexity": "low",
  "estimated_hours": 0.5
}
```

### 3 Story Points - Small Features  
```json
{
  "title": "Add email validation to registration form",
  "description": "Implement client-side and server-side email validation for user registration form. Show appropriate error messages for invalid email formats.",
  "storyPoint": 3,
  "complexity": "medium", 
  "estimated_hours": 4
}
```

### 5 Story Points - Medium Features
```json
{
  "title": "Implement user profile management",
  "description": "Create user profile page where users can update personal information, upload avatar, change password, and manage notification preferences. Include form validation and success/error feedback.",
  "storyPoint": 5,
  "complexity": "medium",
  "estimated_hours": 8
}
```

### 8 Story Points - Large Features
```json
{
  "title": "Implement real-time notifications system", 
  "description": "Build notification system with WebSocket connection, push notifications, notification history, mark as read/unread functionality, and different notification types (email, SMS, in-app). Include admin panel for managing notifications.",
  "storyPoint": 8,
  "complexity": "high",
  "estimated_hours": 16
}
```

### 13 Story Points - Complex Features
```json
{
  "title": "Implement advanced search with AI recommendations",
  "description": "Create sophisticated search system with full-text search, filters, faceted search, autocomplete, search suggestions, AI-powered recommendations, search analytics, and personalized results. Support multiple data sources and real-time indexing.",
  "storyPoint": 13,
  "complexity": "high", 
  "estimated_hours": 32
}
```

## 🔍 DATA QUALITY CHECKLIST

### Title Quality:
- [ ] Specific and descriptive
- [ ] Contains action verb (Implement, Fix, Add, Create)
- [ ] Mentions technology/component if relevant
- [ ] 3-10 words length

### Description Quality:
- [ ] Explains WHAT needs to be done
- [ ] Mentions WHY (business value/requirement)
- [ ] Lists key features/requirements
- [ ] Includes acceptance criteria if possible
- [ ] 30+ words minimum

### Story Point Accuracy:
- [ ] Consistent with team's definition of done
- [ ] Includes testing and code review time  
- [ ] Accounts for integration complexity
- [ ] Relative to other tasks in backlog

## ⚠️ COMMON MISTAKES TO AVOID

### Bad Training Data:
```json
// ❌ Too vague
{
  "title": "Fix issue",
  "description": "Fix the problem",
  "storyPoint": 3
}

// ❌ Inconsistent story points
{
  "title": "Add simple button", 
  "description": "Add a button to the page",
  "storyPoint": 8  // Should be 1-2
}

// ❌ Missing description
{
  "title": "Implement payment system",
  "description": "",
  "storyPoint": 5
}
```

### Good Training Data:
```json
// ✅ Clear and detailed
{
  "title": "Implement payment processing with Stripe",
  "description": "Integrate Stripe payment gateway for subscription billing, including payment form, webhook handling, payment confirmation, and error handling for failed payments",
  "storyPoint": 8,
  "complexity": "high",
  "estimated_hours": 16
}
```

## 🚀 DATA PREPARATION WORKFLOW

### 1. Collect Historical Data
```bash
# Export existing tasks with story points from database
SELECT title, description, story_point, estimated_hours 
FROM tasks 
WHERE story_point > 0 
AND description IS NOT NULL;
```

### 2. Clean and Validate
- Remove tasks with missing descriptions
- Standardize story point values to Fibonacci scale
- Remove duplicate or similar tasks
- Validate story point consistency

### 3. Enhance Descriptions
- Add missing details to sparse descriptions
- Include acceptance criteria in description
- Mention technical requirements and constraints

### 4. Format for Training
```json
{
  "tasks": [
    // ... cleaned and enhanced tasks
  ]
}
```

### 5. Train AI Model
```bash
curl -X POST http://localhost:8088/train \
  -H "Content-Type: application/json" \
  -d @enhanced_training_data.json
```

## 📊 MONITORING DATA QUALITY

### Check Training Stats:
```json
{
  "training_stats": {
    "samples": 45,           // Should be 30+
    "features": 396,         // Feature count
    "mae": 2.41,            // Lower is better (<3)
    "confidence": 0.85,      // Higher is better (>0.7)
    "r2": 0.18              // Model fit (>0.1)
  }
}
```

### Improve Data Quality if:
- MAE > 3.0 → Add more training data
- Confidence < 0.7 → Improve description quality  
- R² < 0.1 → Check story point consistency 