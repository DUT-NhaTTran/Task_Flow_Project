package com.taskflow.notification.service.impl;

import com.taskflow.notification.model.Notification;
import com.taskflow.notification.payload.enums.NotificationType;
import com.taskflow.notification.repository.NotificationDAO;
import com.taskflow.notification.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.UUID;

@Service
public class NotificationServiceImpl implements NotificationService {
    
    @Autowired
    private NotificationDAO notificationDAO;
    
    @Override
    @Transactional(readOnly = true)
    public List<Notification> getNotificationsByUserId(UUID userId) {
        if (userId == null) {
            System.out.println("SERVICE: Warning - Null userId provided");
            return List.of();
        }
        
        List<Notification> notifications = notificationDAO.findByRecipientUserIdOrderByCreatedAtDesc(userId);
        
        return notifications;
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotificationsByUserId(UUID userId) {
        return notificationDAO.findByRecipientUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }
    
    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationDAO.countByRecipientUserIdAndIsReadFalse(userId);
    }
    
    @Override
    @Transactional
    public Notification createNotification(NotificationType type, String title, String message,
                                         UUID recipientUserId, UUID actorUserId, String actorUserName,
                                         String actorUserAvatar, UUID projectId, String projectName,
                                         UUID taskId, UUID sprintId, Long commentId,
                                         String actionUrl) {
        
        System.out.println("🔍 SERVICE: Creating notification with actorUserName: '" + actorUserName + "'");
        
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
    @Transactional(readOnly = true)
    public Optional<Notification> getNotificationById(Long notificationId) {
        return notificationDAO.findById(notificationId);
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
    public boolean deleteNotification(Long notificationId) {
        if (notificationDAO.existsById(notificationId)) {
            notificationDAO.deleteById(notificationId);
            return true;
        }
        
        return false;
    }
    
    @Override
    public Notification createTaskAssignedNotification(UUID recipientUserId, UUID actorUserId, 
                                                     String actorUserName, UUID taskId, 
                                                     String taskTitle, UUID projectId, String projectName) {
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
            String.format("/project/project_homescreen?projectId=%s&taskId=%s&from=notification", projectId, taskId)
        );
    }
    
    @Override
    public Notification createTaskCommentNotification(UUID recipientUserId, UUID actorUserId,
                                                    String actorUserName, UUID taskId,
                                                    String taskTitle, UUID projectId, String projectName,
                                                    Long commentId) {
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
            String.format("/project/project_homescreen?projectId=%s&taskId=%s&from=notification", projectId, taskId)
        );
    }
    
    @Override
    public Notification createTaskUpdatedNotification(UUID recipientUserId, UUID actorUserId,
                                                    String actorUserName, UUID taskId,
                                                    String taskTitle, UUID projectId, String projectName,
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
            String.format("/project/project_homescreen?projectId=%s&taskId=%s&from=notification", projectId, taskId)
        );
    }
    
    @Override
    public Notification createTaskStatusChangedNotification(UUID recipientUserId, UUID actorUserId,
                                                          String actorUserName, UUID taskId,
                                                          String taskTitle, UUID projectId, String projectName,
                                                          String oldStatus, String newStatus) {
        return createNotification(
            NotificationType.TASK_STATUS_CHANGED,
            "Task status changed",
            String.format("%s moved \"%s\" from %s to %s", actorUserName, taskTitle, oldStatus, newStatus),
            recipientUserId,
            actorUserId,
            actorUserName,
            null, // actorUserAvatar
            projectId,
            projectName,
            taskId,
            null, // sprintId
            null, // commentId
            String.format("/project/project_homescreen?projectId=%s&taskId=%s&from=notification", projectId, taskId)
        );
    }
    
    @Override
    public void createTaskStatusChangedNotifications(UUID actorUserId, String actorUserName,
                                                    UUID taskId, String taskTitle, 
                                                    UUID projectId, String projectName,
                                                    UUID assigneeUserId, String oldStatus, String newStatus) {
        // Implementation for creating multiple task status change notifications
        // This method can be expanded based on requirements
    }
} 