package com.taskflow.notification.service;

import com.taskflow.notification.model.Notification;
import com.taskflow.notification.payload.enums.NotificationType;

import java.util.List;
import java.util.Optional;

public interface NotificationService {
    
    // Get all notifications for a user
    List<Notification> getNotificationsByUserId(String userId);
    
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
    
    // Get notification by ID
    Optional<Notification> getNotificationById(Long notificationId);
    
    // Mark notification as read
    boolean markAsRead(Long notificationId);
    
    // Delete notification
    boolean deleteNotification(Long notificationId);
    
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
                                             
    // New notification methods
    Notification createTaskStatusChangedNotification(String recipientUserId, String actorUserId,
                                                   String actorUserName, String taskId,
                                                   String taskTitle, String projectId, String projectName,
                                                   String oldStatus, String newStatus);
                                                   
    void createTaskStatusChangedNotifications(String actorUserId, String actorUserName,
                                            String taskId, String taskTitle, 
                                            String projectId, String projectName,
                                            String assigneeUserId, String oldStatus, String newStatus);
} 