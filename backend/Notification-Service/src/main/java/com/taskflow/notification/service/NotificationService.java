package com.taskflow.notification.service;

import com.taskflow.notification.model.Notification;
import com.taskflow.notification.payload.enums.NotificationType;

import java.util.List;

public interface NotificationService {
    
    // Get all notifications for a user
    List<Notification> getNotificationsByUserId(String userId);
    
    // Get notifications with pagination
    List<Notification> getNotificationsByUserId(String userId, int page, int size);
    
    // Get unread notifications for a user
    List<Notification> getUnreadNotificationsByUserId(String userId);
    
    // Get unread count for a user
    long getUnreadCount(String userId);
    
    // Create a new notification
    Notification createNotification(NotificationType type, String title, String message,
                                  String recipientUserId, String actorUserId, String actorUserName,
                                  String actorUserAvatar, String projectId, String projectName,
                                  String taskId, String sprintId, String commentId,
                                  String actionUrl);
    
    // Mark notification as read
    boolean markAsRead(Long notificationId);
    
    // Mark all notifications as read for a user
    int markAllAsRead(String userId);
    
    // Delete notification
    boolean deleteNotification(Long notificationId);
    
    // Get recent notifications (last 7 days)
    List<Notification> getRecentNotifications(String userId);
    
    // Clean up old read notifications (older than 30 days)
    int cleanupOldNotifications();
    
    // Helper methods for specific notification types
    Notification createTaskAssignedNotification(String recipientUserId, String actorUserId, 
                                              String actorUserName, String taskId, 
                                              String taskTitle, String projectId, String projectName);
    
    Notification createTaskCommentNotification(String recipientUserId, String actorUserId,
                                             String actorUserName, String taskId,
                                             String taskTitle, String projectId, String projectName,
                                             String commentId);
    
    Notification createTaskUpdatedNotification(String recipientUserId, String actorUserId,
                                             String actorUserName, String taskId,
                                             String taskTitle, String projectId, String projectName,
                                             String updateType, String newValue);
} 