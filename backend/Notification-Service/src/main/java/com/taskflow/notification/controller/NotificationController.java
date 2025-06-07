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
        
        List<Notification> notifications = notificationService.getNotificationsByUserId(userId);
                
        return ResponseEntity.ok(ApiResponse.success(notifications, "Notifications retrieved successfully"));
    }
    
    // Get unread notifications for a user
    @GetMapping("/user/{userId}/unread")
    public ResponseEntity<ApiResponse<List<Notification>>> getUnreadNotifications(@PathVariable String userId) {
        List<Notification> notifications = notificationService.getUnreadNotificationsByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(notifications, "Unread notifications retrieved successfully"));
    }
    
    // Get unread count for a user
    @GetMapping("/user/{userId}/unread/count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@PathVariable String userId) {
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(ApiResponse.success(count, "Unread count retrieved successfully"));
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
            return ResponseEntity.ok(ApiResponse.success("success", "Notification marked as read"));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("Notification not found"));
        }
    }
    
    // Delete notification
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<ApiResponse<String>> deleteNotification(@PathVariable Long notificationId) {
        boolean success = notificationService.deleteNotification(notificationId);
        
        if (success) {
            return ResponseEntity.ok(ApiResponse.success("success", "Notification deleted successfully"));
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
            NotificationType type = NotificationType.valueOf((String) request.get("type"));
            String title = (String) request.get("title");
            String message = (String) request.get("message");
            String recipientUserId = (String) request.get("recipientUserId");
            String actorUserId = (String) request.get("actorUserId");
            String actorUserName = (String) request.get("actorUserName");
            String actorUserAvatar = (String) request.get("actorUserAvatar");
            String projectId = (String) request.get("projectId");
            String projectName = (String) request.get("projectName");
            String taskId = (String) request.get("taskId");
            String sprintId = (String) request.get("sprintId");
            String commentId = (String) request.get("commentId");
            
            // Generate action URL for project homescreen with taskId if available
            String actionUrl = null;
            if (projectId != null) {
                if (taskId != null) {
                    actionUrl = String.format("/project/project_homescreen?projectId=%s&taskId=%s&from=notification", projectId, taskId);
                } else {
                    actionUrl = String.format("/project/project_homescreen?projectId=%s&from=notification", projectId);
                }
            }
            
            System.out.println("🔍 CONTROLLER: Creating notification with actorUserName: '" + actorUserName + "'");
            System.out.println("🔍 CONTROLLER: Generated actionUrl: '" + actionUrl + "'");
            
            // Validate required fields
            if (type == null || recipientUserId == null || actorUserId == null) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Missing required fields: type, recipientUserId, or actorUserId"));
            }
            
            Notification notification = notificationService.createNotification(
                type, title, message, recipientUserId, actorUserId, actorUserName,
                actorUserAvatar, projectId, projectName, taskId, sprintId, commentId, actionUrl
            );
            
            System.out.println("🔍 CONTROLLER: Notification created with ID: " + notification.getId());
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
            String taskId = (String) request.get("taskId");
            String taskTitle = (String) request.get("taskTitle");
            String taskAssigneeId = (String) request.get("taskAssigneeId");
            String commentAuthorId = (String) request.get("commentAuthorId");
            String commentAuthorName = (String) request.get("commentAuthorName");
            String commentId = (String) request.get("commentId");
            String projectId = (String) request.get("projectId");
            String projectName = (String) request.get("projectName");
            
            // Validate required fields
            if (taskAssigneeId == null || commentAuthorId == null || taskId == null) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Missing required fields: taskAssigneeId, commentAuthorId, or taskId"));
            }
            
            // Don't send notification if user comments on their own assigned task
            if (taskAssigneeId.equals(commentAuthorId)) {
                return ResponseEntity.ok(ApiResponse.success(null, "No notification needed - user commented on own task"));
            }
            
            Notification notification = notificationService.createTaskCommentNotification(
                taskAssigneeId,
                commentAuthorId,
                commentAuthorName,
                taskId,
                taskTitle,
                projectId,
                projectName,
                commentId
            );
            
            System.out.println("CONTROLLER: Task comment notification created for user " + taskAssigneeId);
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
            String recipientUserId = (String) request.get("recipientUserId");
            String actorUserId = (String) request.get("actorUserId");
            String actorUserName = (String) request.get("actorUserName");
            String taskId = (String) request.get("taskId");
            String taskTitle = (String) request.get("taskTitle");
            String projectId = (String) request.get("projectId");
            String projectName = (String) request.get("projectName");
            
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
            String recipientUserId = (String) request.get("recipientUserId");
            String actorUserId = (String) request.get("actorUserId");
            String actorUserName = (String) request.get("actorUserName");
            String taskId = (String) request.get("taskId");
            String taskTitle = (String) request.get("taskTitle");
            String projectId = (String) request.get("projectId");
            String projectName = (String) request.get("projectName");
            String updateType = (String) request.get("updateType");
            String newValue = (String) request.get("newValue");
            
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
            String actorUserId = (String) request.get("actorUserId");
            String actorUserName = (String) request.get("actorUserName");
            String taskId = (String) request.get("taskId");
            String taskTitle = (String) request.get("taskTitle");
            String projectId = (String) request.get("projectId");
            String projectName = (String) request.get("projectName");
            String assigneeUserId = (String) request.get("assigneeUserId");
            String oldStatus = (String) request.get("oldStatus");
            String newStatus = (String) request.get("newStatus");
            
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
    
    // Task deleted notification endpoint
    @PostMapping("/task-deleted")
    public ResponseEntity<ApiResponse<String>> createTaskDeletedNotifications(@RequestBody Map<String, Object> request) {
        try {
            String actorUserId = (String) request.get("actorUserId");
            String actorUserName = (String) request.get("actorUserName");
            String taskId = (String) request.get("taskId");
            String taskTitle = (String) request.get("taskTitle");
            String projectId = (String) request.get("projectId");
            String projectName = (String) request.get("projectName");
            String assigneeUserId = (String) request.get("assigneeUserId");
            
            // Validate required fields
            if (actorUserId == null || taskId == null || projectId == null) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Missing required fields: actorUserId, taskId, or projectId"));
            }
            
            notificationService.createTaskDeletedNotifications(
                actorUserId,
                actorUserName,
                taskId,
                taskTitle,
                projectId,
                projectName,
                assigneeUserId
            );
            
            return ResponseEntity.ok(ApiResponse.success("success", "Task deleted notifications created successfully"));
            
        } catch (Exception e) {
            System.err.println("Error creating task deleted notifications: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create task deleted notifications: " + e.getMessage()));
        }
    }
    
    // Task overdue notification endpoint
    @PostMapping("/task-overdue")
    public ResponseEntity<ApiResponse<String>> createTaskOverdueNotifications(@RequestBody Map<String, Object> request) {
        try {
            String taskId = (String) request.get("taskId");
            String taskTitle = (String) request.get("taskTitle");
            String projectId = (String) request.get("projectId");
            String projectName = (String) request.get("projectName");
            String assigneeUserId = (String) request.get("assigneeUserId");
            
            // Validate required fields
            if (taskId == null || projectId == null) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Missing required fields: taskId or projectId"));
            }
            
            notificationService.createTaskOverdueNotifications(
                taskId,
                taskTitle,
                projectId,
                projectName,
                assigneeUserId
            );
            
            return ResponseEntity.ok(ApiResponse.success("success", "Task overdue notifications created successfully"));
            
        } catch (Exception e) {
            System.err.println("Error creating task overdue notifications: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create task overdue notifications: " + e.getMessage()));
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
} 