package com.taskflow.notification.service.impl;

import com.taskflow.notification.model.Notification;
import com.taskflow.notification.payload.enums.NotificationType;
import com.taskflow.notification.repository.NotificationDAO;
import com.taskflow.notification.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class NotificationServiceImpl implements NotificationService {
    
    @Autowired
    private NotificationDAO notificationDAO;
    
    @Override
    @Transactional(readOnly = true)
    public List<Notification> getNotificationsByUserId(String userId) {
        // Validate userId
        if (userId == null || userId.trim().isEmpty()) {
            System.out.println("SERVICE: Warning - Empty or null userId provided");
            return List.of(); // Return empty list instead of null
        }
        
        // Log the request to track database access
        System.out.println("SERVICE: Getting notifications for user " + userId + " at " + System.currentTimeMillis());
        
        // Force fresh data from database
        List<Notification> notifications = notificationDAO.findByRecipientUserIdOrderByCreatedAtDesc(userId);
        
        // Log the results
        System.out.println("SERVICE: Found " + notifications.size() + " notifications for user " + userId);
        
        // Log details of each notification for debugging
        if (!notifications.isEmpty()) {
            System.out.println("SERVICE: Latest notification ID: " + notifications.get(0).getId());
            
            for (Notification notification : notifications) {
                System.out.println("SERVICE: Notification[" + notification.getId() + "] - " 
                    + "Type: " + notification.getType() 
                    + ", Title: " + notification.getTitle()
                    + ", RecipientId: " + notification.getRecipientUserId()
                    + ", IsRead: " + notification.getIsRead());
            }
        }
        
        return notifications;
    }
    
    @Override
    public List<Notification> getNotificationsByUserId(String userId, int page, int size) {
        int offset = page * size;
        return notificationDAO.findByRecipientUserIdOrderByCreatedAtDesc(userId, size, offset);
    }
    
    @Override
    public List<Notification> getUnreadNotificationsByUserId(String userId) {
        return notificationDAO.findByRecipientUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }
    
    @Override
    public long getUnreadCount(String userId) {
        return notificationDAO.countByRecipientUserIdAndIsReadFalse(userId);
    }
    
    @Override
    @Transactional
    public Notification createNotification(NotificationType type, String title, String message,
                                         String recipientUserId, String actorUserId, String actorUserName,
                                         String actorUserAvatar, String projectId, String projectName,
                                         String taskId, String sprintId, String commentId,
                                         String actionUrl) {
        
        // Check for duplicate notifications (prevent spam)
        if (taskId != null && shouldPreventDuplicate(recipientUserId, actorUserId, type, taskId)) {
            return null;
        }
        
        Notification notification = new Notification.Builder()
                .type(type)
                .title(title)
                .message(message)
                .recipientUserId(recipientUserId)
                .actorUserId(actorUserId)
                .actorUserName(actorUserName)
                .actorUserAvatar(actorUserAvatar)
                .projectId(projectId)
                .projectName(projectName)
                .taskId(taskId)
                .sprintId(sprintId)
                .commentId(commentId)
                .actionUrl(actionUrl)
                .build();
        
        notification = notificationDAO.save(notification);
        
        return notification;
    }
    
    @Override
    @Transactional
    public boolean markAsRead(Long notificationId) {
        Optional<Notification> optionalNotification = notificationDAO.findById(notificationId);
        
        if (optionalNotification.isPresent()) {
            Notification notification = optionalNotification.get();
            notification.markAsRead();
            notificationDAO.save(notification);
            return true;
        }
        
        return false;
    }
    
    @Override
    @Transactional
    public int markAllAsRead(String userId) {
        int updatedCount = notificationDAO.markAllAsReadByUserId(userId, LocalDateTime.now());
        return updatedCount;
    }
    
    @Override
    @Transactional
    public boolean deleteNotification(Long notificationId) {
        if (notificationDAO.existsById(notificationId)) {
            notificationDAO.deleteById(notificationId);
            return true;
        }
        
        return false;
    }
    
    @Override
    public List<Notification> getRecentNotifications(String userId) {
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        return notificationDAO.findRecentNotifications(userId, sevenDaysAgo);
    }
    
    @Override
    @Transactional
    public int cleanupOldNotifications() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        int deletedCount = notificationDAO.deleteOldReadNotifications(thirtyDaysAgo);
        return deletedCount;
    }
    
    // Check if we should prevent duplicate notification
    private boolean shouldPreventDuplicate(String recipientUserId, String actorUserId, 
                                         NotificationType type, String taskId) {
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        return notificationDAO.existsSimilarNotification(recipientUserId, actorUserId, type, taskId, oneHourAgo);
    }
    
    @Override
    public Notification createTaskAssignedNotification(String recipientUserId, String actorUserId, 
                                                     String actorUserName, String taskId, 
                                                     String taskTitle, String projectId, String projectName) {
        return createNotification(
            NotificationType.TASK_ASSIGNED,
            "New task assigned",
            String.format("You have been assigned to \"%s\"", taskTitle),
            recipientUserId,
            actorUserId,
            actorUserName,
            null, // actorUserAvatar
            projectId,
            projectName,
            taskId,
            null, // sprintId
            null, // commentId
            String.format("/project/board?projectId=%s&taskId=%s", projectId, taskId)
        );
    }
    
    @Override
    public Notification createTaskCommentNotification(String recipientUserId, String actorUserId,
                                                    String actorUserName, String taskId,
                                                    String taskTitle, String projectId, String projectName,
                                                    String commentId) {
        return createNotification(
            NotificationType.TASK_COMMENT,
            "New comment",
            String.format("%s commented on \"%s\"", actorUserName, taskTitle),
            recipientUserId,
            actorUserId,
            actorUserName,
            null, // actorUserAvatar
            projectId,
            projectName,
            taskId,
            null, // sprintId
            commentId,
            String.format("/project/board?projectId=%s&taskId=%s", projectId, taskId)
        );
    }
    
    @Override
    public Notification createTaskUpdatedNotification(String recipientUserId, String actorUserId,
                                                    String actorUserName, String taskId,
                                                    String taskTitle, String projectId, String projectName,
                                                    String updateType, String newValue) {
        return createNotification(
            NotificationType.TASK_UPDATED,
            "Task updated",
            String.format("%s %s \"%s\" to %s", actorUserName, updateType, taskTitle, newValue),
            recipientUserId,
            actorUserId,
            actorUserName,
            null, // actorUserAvatar
            projectId,
            projectName,
            taskId,
            null, // sprintId
            null, // commentId
            String.format("/project/board?projectId=%s&taskId=%s", projectId, taskId)
        );
    }
} 