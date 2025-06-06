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

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    
    @Autowired
    private NotificationService notificationService;
    
    // Get all notifications for a user (recipient_id)
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Notification>>> getUserNotifications(
            @PathVariable String userId,
            HttpServletResponse response) {
        
        // Disable caching to ensure fresh data on every request/refresh
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");
        response.setDateHeader("Date", System.currentTimeMillis());
        response.setDateHeader("Last-Modified", System.currentTimeMillis());
        
        // Generate unique ETag to prevent any caching
        String eTag = String.format("\"%s-%d\"", userId, System.currentTimeMillis());
        response.setHeader("ETag", eTag);
        
        // Log request for debugging
        System.out.println("API: Fetching ALL notifications for recipient_id: " + userId + " at " + System.currentTimeMillis());
        
        // Get ALL notifications for this user (recipient_id) - no filtering, no conditions
        List<Notification> notifications = notificationService.getNotificationsByUserId(userId);
        
        // Log response for debugging
        System.out.println("API: Returning " + notifications.size() + " total notifications for user: " + userId);
        
        return ResponseEntity.ok(ApiResponse.success(notifications, "All notifications retrieved successfully"));
    }
    
    // Get notifications with pagination
    @GetMapping("/user/{userId}/page")
    public ResponseEntity<ApiResponse<List<Notification>>> getUserNotificationsWithPaging(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<Notification> notifications = notificationService.getNotificationsByUserId(userId, page, size);
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
    
    // Get recent notifications (last 7 days)
    @GetMapping("/user/{userId}/recent")
    public ResponseEntity<ApiResponse<List<Notification>>> getRecentNotifications(@PathVariable String userId) {
        List<Notification> notifications = notificationService.getRecentNotifications(userId);
        return ResponseEntity.ok(ApiResponse.success(notifications, "Recent notifications retrieved successfully"));
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
    
    // Mark all notifications as read for a user
    @PatchMapping("/user/{userId}/mark-all-read")
    public ResponseEntity<ApiResponse<Integer>> markAllAsRead(@PathVariable String userId) {
        int updatedCount = notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success(updatedCount, "All notifications marked as read"));
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
    
    // Clean up old notifications (admin endpoint)
    @DeleteMapping("/cleanup/old")
    public ResponseEntity<ApiResponse<Integer>> cleanupOldNotifications() {
        int deletedCount = notificationService.cleanupOldNotifications();
        return ResponseEntity.ok(ApiResponse.success(deletedCount, "Old notifications cleaned up"));
    }
    
    // New endpoint for creating notifications from other services
    @PostMapping("/create")
    public ResponseEntity<Notification> createNotification(@RequestBody Map<String, Object> request) {
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
            String actionUrl = (String) request.get("actionUrl");
            
            Notification notification = notificationService.createNotification(
                type, title, message, recipientUserId, actorUserId, actorUserName,
                actorUserAvatar, projectId, projectName, taskId, sprintId, commentId, actionUrl
            );
            
            return ResponseEntity.ok(notification);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
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