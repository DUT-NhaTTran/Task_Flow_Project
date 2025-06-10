package com.taskflow.notification.service;

import com.taskflow.notification.model.Notification;
import com.taskflow.notification.payload.enums.NotificationType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationService {
    
    // Get all notifications for a user
    List<Notification> getNotificationsByUserId(UUID userId);
    
    // Get unread notifications for a user
    List<Notification> getUnreadNotificationsByUserId(UUID userId);
    
    // Get unread count for a user
    long getUnreadCount(UUID userId);
    
    // Create a new notification
    Notification createNotification(NotificationType type, String title, String message,
                                  UUID recipientUserId, UUID actorUserId, String actorUserName,
                                  String actorUserAvatar, UUID projectId, String projectName,
                                  UUID taskId, UUID sprintId, Long commentId,
                                  String actionUrl);
    
    // Get notification by ID
    Optional<Notification> getNotificationById(Long notificationId);
    
    // Mark notification as read
    boolean markAsRead(Long notificationId);
    
    // Delete notification
    boolean deleteNotification(Long notificationId);
    
    // Helper methods for specific notification types
    Notification createTaskAssignedNotification(UUID recipientUserId, UUID actorUserId, 
                                              String actorUserName, UUID taskId, 
                                              String taskTitle, UUID projectId, String projectName);
    
    Notification createTaskCommentNotification(UUID recipientUserId, UUID actorUserId,
                                             String actorUserName, UUID taskId,
                                             String taskTitle, UUID projectId, String projectName,
                                             Long commentId);
    
    Notification createTaskUpdatedNotification(UUID recipientUserId, UUID actorUserId,
                                             String actorUserName, UUID taskId,
                                             String taskTitle, UUID projectId, String projectName,
                                             String updateType, String newValue);
                                             
    // New notification methods
    Notification createTaskStatusChangedNotification(UUID recipientUserId, UUID actorUserId,
                                                   String actorUserName, UUID taskId,
                                                   String taskTitle, UUID projectId, String projectName,
                                                   String oldStatus, String newStatus);
                                                   
    void createTaskStatusChangedNotifications(UUID actorUserId, String actorUserName,
                                            UUID taskId, String taskTitle, 
                                            UUID projectId, String projectName,
                                            UUID assigneeUserId, String oldStatus, String newStatus);
} 