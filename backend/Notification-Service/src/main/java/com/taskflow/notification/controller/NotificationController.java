package com.taskflow.notification.controller;

import com.taskflow.notification.model.Notification;
import com.taskflow.notification.payload.enums.NotificationType;
import com.taskflow.notification.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletResponse;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    
    @Autowired
    private NotificationService notificationService;
    
    // Get all notifications for a user
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Notification>>> getUserNotifications(
            @PathVariable String userId,
            HttpServletResponse response) {
        
        // Disable caching
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");
        
        try {
            UUID userUuid = UUID.fromString(userId);
            List<Notification> notifications = notificationService.getNotificationsByUserId(userUuid);
            return ResponseEntity.ok(ApiResponse.success(notifications, "Notifications retrieved successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for userId: " + userId));
        }
    }
    
    // Get unread notifications for a user
    @GetMapping("/user/{userId}/unread")
    public ResponseEntity<ApiResponse<List<Notification>>> getUnreadNotifications(@PathVariable String userId) {
        try {
            UUID userUuid = UUID.fromString(userId);
            List<Notification> notifications = notificationService.getUnreadNotificationsByUserId(userUuid);
            return ResponseEntity.ok(ApiResponse.success(notifications, "Unread notifications retrieved successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for userId: " + userId));
        }
    }
    
    // Get unread count for a user
    @GetMapping("/user/{userId}/unread/count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@PathVariable String userId) {
        try {
            UUID userUuid = UUID.fromString(userId);
            long count = notificationService.getUnreadCount(userUuid);
            return ResponseEntity.ok(ApiResponse.success(count, "Unread count retrieved successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for userId: " + userId));
        }
    }
    
    // Get notification by ID
    @GetMapping("/{notificationId}")
    public ResponseEntity<ApiResponse<Notification>> getNotificationById(@PathVariable Long notificationId) {
        Optional<Notification> notification = notificationService.getNotificationById(notificationId);
        
        if (notification.isPresent()) {
            return ResponseEntity.ok(ApiResponse.success(notification.get(), "Notification retrieved successfully"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    // Mark notification as read
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<String>> markAsRead(@PathVariable Long notificationId) {
        boolean success = notificationService.markAsRead(notificationId);
        if (success) {
            return ResponseEntity.ok(ApiResponse.success("Marked as read", "Notification marked as read successfully"));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("Notification not found or already read"));
        }
    }
    
    // Delete notification
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<ApiResponse<String>> deleteNotification(@PathVariable Long notificationId) {
        boolean success = notificationService.deleteNotification(notificationId);
        if (success) {
            return ResponseEntity.ok(ApiResponse.success("Deleted", "Notification deleted successfully"));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("Notification not found"));
        }
    }
    
    // Health check endpoint
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> health() {
        return ResponseEntity.ok(ApiResponse.success("OK", "Notification service is running"));
    }
    
    // Create notification endpoint
    @PostMapping("/create")
    public ResponseEntity<ApiResponse<Notification>> createNotification(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("🔍 CONTROLLER: Raw payload received:");
            System.out.println("  " + request.toString());
            
            // Extract ONLY fields from standard payload format
            String typeStr = (String) request.get("type");
            String title = (String) request.get("title");
            String message = (String) request.get("message");
            String recipientUserIdStr = (String) request.get("recipientUserId");
            String actorUserIdStr = (String) request.get("actorUserId");
            String actorUserName = (String) request.get("actorUserName");
            String projectIdStr = (String) request.get("projectId");
            String projectName = (String) request.get("projectName");
            String taskIdStr = (String) request.get("taskId");

            // Print parsed payload before processing
            System.out.println("🔍 CONTROLLER: Parsed standard payload:");
            System.out.println("  - type: " + typeStr);
            System.out.println("  - title: " + title);
            System.out.println("  - message: " + message);
            System.out.println("  - recipientUserId: " + recipientUserIdStr);
            System.out.println("  - actorUserId: " + actorUserIdStr);
            System.out.println("  - actorUserName: " + actorUserName);
            System.out.println("  - projectId: " + projectIdStr);
            System.out.println("  - projectName: " + projectName);
            System.out.println("  - taskId: " + taskIdStr);

            // Parse notification type
            NotificationType type = null;
            if (typeStr != null) {
                try {
                    type = NotificationType.valueOf(typeStr.toUpperCase());
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Invalid notification type: " + typeStr));
                }
            }

            // Convert String IDs to UUID
            UUID recipientUserId = null;
            UUID actorUserId = null;
            UUID projectId = null;
            UUID taskId = null;
            
            if (recipientUserIdStr != null) {
                try {
                    recipientUserId = UUID.fromString(recipientUserIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for recipientUserId: " + recipientUserIdStr));
                }
            }
            
            if (actorUserIdStr != null) {
                try {
                    actorUserId = UUID.fromString(actorUserIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for actorUserId: " + actorUserIdStr));
                }
            }
            
            if (projectIdStr != null) {
                try {
                    projectId = UUID.fromString(projectIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for projectId: " + projectIdStr));
                }
            }
            
            if (taskIdStr != null) {
                try {
                    taskId = UUID.fromString(taskIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for taskId: " + taskIdStr));
                }
            }
            
            // Generate action URL only if project exists and it's not a PROJECT_DELETED notification
            String actionUrl = null;
            if (projectId != null && type != NotificationType.PROJECT_DELETED) {
                if (taskId != null) {
                    actionUrl = String.format("/project/project_homescreen?projectId=%s&taskId=%s&from=notification", projectId, taskId);
                } else {
                    actionUrl = String.format("/project/project_homescreen?projectId=%s&from=notification", projectId);
                }
            }
            
            System.out.println("🔍 CONTROLLER: Final values before API call:");
            System.out.println("  - type: " + type);
            System.out.println("  - recipientUserId: " + recipientUserId);
            System.out.println("  - actorUserId: " + actorUserId);
            System.out.println("  - actionUrl: " + actionUrl);
            
            // Validate required fields
            if (type == null || recipientUserId == null || actorUserId == null) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Missing required fields: type, recipientUserId, or actorUserId"));
            }
            
            // Create notification with ONLY standard fields (no optional nulls)
            Notification notification = notificationService.createNotification(
                type, title, message, recipientUserId, actorUserId, actorUserName,
                null, // actorUserAvatar - not in standard payload
                projectId, projectName, taskId, 
                null, // sprintId - not in standard payload
                null, // commentId - not in standard payload
                actionUrl
            );
            
            System.out.println("🔍 CONTROLLER: Notification created successfully");
            return ResponseEntity.ok(ApiResponse.success(notification, "Notification created successfully"));
            
        } catch (IllegalArgumentException e) {
            System.err.println("Invalid notification type: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Invalid notification type: " + e.getMessage()));
        } catch (Exception e) {
            System.err.println("Error creating notification: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create notification: " + e.getMessage()));
        }
    }
    
    // Task comment notification endpoint
    @PostMapping("/task-comment")
    public ResponseEntity<ApiResponse<Notification>> createTaskCommentNotification(@RequestBody Map<String, Object> request) {
        try {
            String recipientUserIdStr = (String) request.get("recipientUserId");
            String actorUserIdStr = (String) request.get("actorUserId");
            String actorUserName = (String) request.get("actorUserName");
            String taskIdStr = (String) request.get("taskId");
            String taskTitle = (String) request.get("taskTitle");
            String projectIdStr = (String) request.get("projectId");
            String projectName = (String) request.get("projectName");
            Object commentIdObj = request.get("commentId");
            
            // Convert String IDs to appropriate types
            UUID recipientUserId = null;
            UUID actorUserId = null;
            UUID projectId = null;
            UUID taskId = null;
            Long commentId = null;
            
            if (recipientUserIdStr != null) {
                try {
                    recipientUserId = UUID.fromString(recipientUserIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for recipientUserId: " + recipientUserIdStr));
                }
            }
            
            if (actorUserIdStr != null) {
                try {
                    actorUserId = UUID.fromString(actorUserIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for actorUserId: " + actorUserIdStr));
                }
            }
            
            if (projectIdStr != null) {
                try {
                    projectId = UUID.fromString(projectIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for projectId: " + projectIdStr));
                }
            }
            
            if (taskIdStr != null) {
                try {
                    taskId = UUID.fromString(taskIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for taskId: " + taskIdStr));
                }
            }
            
            if (commentIdObj != null) {
                try {
                    if (commentIdObj instanceof String) {
                        commentId = Long.parseLong((String) commentIdObj);
                    } else if (commentIdObj instanceof Number) {
                        commentId = ((Number) commentIdObj).longValue();
                    }
                } catch (NumberFormatException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid Long format for commentId: " + commentIdObj));
                }
            }
            
            // Validate required fields
            if (recipientUserId == null || actorUserId == null || taskId == null) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Missing required fields: recipientUserId, actorUserId, or taskId"));
            }
            
            Notification notification = notificationService.createTaskCommentNotification(
                recipientUserId,
                actorUserId,
                actorUserName,
                taskId,
                taskTitle,
                projectId,
                projectName,
                commentId
            );
            
            return ResponseEntity.ok(ApiResponse.success(notification, "Task comment notification created successfully"));
            
        } catch (Exception e) {
            System.err.println("Error creating task comment notification: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create task comment notification: " + e.getMessage()));
        }
    }
    
    // Task assigned notification endpoint
    @PostMapping("/task-assigned")
    public ResponseEntity<ApiResponse<Notification>> createTaskAssignedNotification(@RequestBody Map<String, Object> request) {
        try {
            String recipientUserIdStr = (String) request.get("recipientUserId");
            String actorUserIdStr = (String) request.get("actorUserId");
            String actorUserName = (String) request.get("actorUserName");
            String taskIdStr = (String) request.get("taskId");
            String taskTitle = (String) request.get("taskTitle");
            String projectIdStr = (String) request.get("projectId");
            String projectName = (String) request.get("projectName");
            
            // Convert String IDs to UUID
            UUID recipientUserId = null;
            UUID actorUserId = null;
            UUID projectId = null;
            UUID taskId = null;
            
            if (recipientUserIdStr != null) {
                try {
                    recipientUserId = UUID.fromString(recipientUserIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for recipientUserId: " + recipientUserIdStr));
                }
            }
            
            if (actorUserIdStr != null) {
                try {
                    actorUserId = UUID.fromString(actorUserIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for actorUserId: " + actorUserIdStr));
                }
            }
            
            if (projectIdStr != null) {
                try {
                    projectId = UUID.fromString(projectIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for projectId: " + projectIdStr));
                }
            }
            
            if (taskIdStr != null) {
                try {
                    taskId = UUID.fromString(taskIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for taskId: " + taskIdStr));
                }
            }
            
            // Validate required fields
            if (recipientUserId == null || actorUserId == null || taskId == null) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Missing required fields: recipientUserId, actorUserId, or taskId"));
            }
            
            Notification notification = notificationService.createTaskAssignedNotification(
                recipientUserId, actorUserId, actorUserName, taskId, taskTitle, projectId, projectName
            );
            
            System.out.println("CONTROLLER: Task assigned notification created for user " + recipientUserId);
            return ResponseEntity.ok(ApiResponse.success(notification, "Task assigned notification created successfully"));
            
        } catch (Exception e) {
            System.err.println("Error creating task assigned notification: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create task assigned notification: " + e.getMessage()));
        }
    }
    
    // Task updated notification endpoint
    @PostMapping("/task-updated")
    public ResponseEntity<ApiResponse<Notification>> createTaskUpdatedNotification(@RequestBody Map<String, Object> request) {
        try {
            String recipientUserIdStr = (String) request.get("recipientUserId");
            String actorUserIdStr = (String) request.get("actorUserId");
            String actorUserName = (String) request.get("actorUserName");
            String taskIdStr = (String) request.get("taskId");
            String taskTitle = (String) request.get("taskTitle");
            String projectIdStr = (String) request.get("projectId");
            String projectName = (String) request.get("projectName");
            String updateType = (String) request.get("updateType");
            String newValue = (String) request.get("newValue");
            
            // Convert String IDs to UUID
            UUID recipientUserId = null;
            UUID actorUserId = null;
            UUID projectId = null;
            UUID taskId = null;
            
            if (recipientUserIdStr != null) {
                try {
                    recipientUserId = UUID.fromString(recipientUserIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for recipientUserId: " + recipientUserIdStr));
                }
            }
            
            if (actorUserIdStr != null) {
                try {
                    actorUserId = UUID.fromString(actorUserIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for actorUserId: " + actorUserIdStr));
                }
            }
            
            if (projectIdStr != null) {
                try {
                    projectId = UUID.fromString(projectIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for projectId: " + projectIdStr));
                }
            }
            
            if (taskIdStr != null) {
                try {
                    taskId = UUID.fromString(taskIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for taskId: " + taskIdStr));
                }
            }
            
            // Validate required fields
            if (recipientUserId == null || actorUserId == null || taskId == null) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Missing required fields: recipientUserId, actorUserId, or taskId"));
            }
            
            Notification notification = notificationService.createTaskUpdatedNotification(
                recipientUserId,
                actorUserId,
                actorUserName,
                taskId,
                taskTitle,
                projectId,
                projectName,
                updateType,
                newValue
            );
            
            return ResponseEntity.ok(ApiResponse.success(notification, "Task updated notification created successfully"));
            
        } catch (Exception e) {
            System.err.println("Error creating task updated notification: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create task updated notification: " + e.getMessage()));
        }
    }
    
    // Task status changed notification endpoint
    @PostMapping("/task-status-changed")
    public ResponseEntity<ApiResponse<String>> createTaskStatusChangedNotifications(@RequestBody Map<String, Object> request) {
        try {
            String actorUserIdStr = (String) request.get("actorUserId");
            String actorUserName = (String) request.get("actorUserName");
            String taskIdStr = (String) request.get("taskId");
            String taskTitle = (String) request.get("taskTitle");
            String projectIdStr = (String) request.get("projectId");
            String projectName = (String) request.get("projectName");
            String assigneeUserIdStr = (String) request.get("assigneeUserId");
            String oldStatus = (String) request.get("oldStatus");
            String newStatus = (String) request.get("newStatus");
            
            // Convert String IDs to UUID
            UUID actorUserId = null;
            UUID assigneeUserId = null;
            UUID projectId = null;
            UUID taskId = null;
            
            if (actorUserIdStr != null) {
                try {
                    actorUserId = UUID.fromString(actorUserIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for actorUserId: " + actorUserIdStr));
                }
            }
            
            if (assigneeUserIdStr != null) {
                try {
                    assigneeUserId = UUID.fromString(assigneeUserIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for assigneeUserId: " + assigneeUserIdStr));
                }
            }
            
            if (projectIdStr != null) {
                try {
                    projectId = UUID.fromString(projectIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for projectId: " + projectIdStr));
                }
            }
            
            if (taskIdStr != null) {
                try {
                    taskId = UUID.fromString(taskIdStr);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format for taskId: " + taskIdStr));
                }
            }
            
            // Validate required fields
            if (actorUserId == null || taskId == null || projectId == null) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Missing required fields: actorUserId, taskId, or projectId"));
            }
            
            notificationService.createTaskStatusChangedNotifications(
                actorUserId,
                actorUserName,
                taskId,
                taskTitle,
                projectId,
                projectName,
                assigneeUserId,
                oldStatus,
                newStatus
            );
            
            return ResponseEntity.ok(ApiResponse.success("success", "Task status changed notifications created successfully"));
            
        } catch (Exception e) {
            System.err.println("Error creating task status changed notifications: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create task status changed notifications: " + e.getMessage()));
        }
    }
    
    // API Response wrapper class
    public static class ApiResponse<T> {
        private boolean success;
        private String message;
        private T data;
        
        public ApiResponse() {}
        
        public ApiResponse(boolean success, String message, T data) {
            this.success = success;
            this.message = message;
            this.data = data;
        }
        
        public static <T> ApiResponse<T> success(T data, String message) {
            return new ApiResponse<>(true, message, data);
        }
        
        public static <T> ApiResponse<T> error(String message) {
            return new ApiResponse<>(false, message, null);
        }
        
        // Getters and setters
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        
        public T getData() { return data; }
        public void setData(T data) { this.data = data; }
    }

    // Simple notification response DTO (only essential fields)
    public static class NotificationResponse {
        private Long id;
        private String type;
        private String title;
        private String message;
        private String recipientUserId;
        private String actorUserId;
        private String actorUserName;
        private String projectId;
        private String projectName;
        private String taskId;
        private String actionUrl;
        private Boolean isRead;
        private String createdAt;

        public NotificationResponse(Notification notification) {
            this.id = notification.getId();
            this.type = notification.getType() != null ? notification.getType().toString() : null;
            this.title = notification.getTitle();
            this.message = notification.getMessage();
            this.recipientUserId = notification.getRecipientUserId() != null ? notification.getRecipientUserId().toString() : null;
            this.actorUserId = notification.getActorUserId() != null ? notification.getActorUserId().toString() : null;
            this.actorUserName = notification.getActorUserName();
            this.projectId = notification.getProjectId() != null ? notification.getProjectId().toString() : null;
            this.projectName = notification.getProjectName();
            this.taskId = notification.getTaskId() != null ? notification.getTaskId().toString() : null;
            this.actionUrl = notification.getActionUrl();
            this.isRead = notification.getIsRead();
            this.createdAt = notification.getCreatedAt() != null ? notification.getCreatedAt().toString() : null;
        }

        // Getters
        public Long getId() { return id; }
        public String getType() { return type; }
        public String getTitle() { return title; }
        public String getMessage() { return message; }
        public String getRecipientUserId() { return recipientUserId; }
        public String getActorUserId() { return actorUserId; }
        public String getActorUserName() { return actorUserName; }
        public String getProjectId() { return projectId; }
        public String getProjectName() { return projectName; }
        public String getTaskId() { return taskId; }
        public String getActionUrl() { return actionUrl; }
        public Boolean getIsRead() { return isRead; }
        public String getCreatedAt() { return createdAt; }
    }
} 