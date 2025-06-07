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

@Service
public class NotificationServiceImpl implements NotificationService {
    
    @Autowired
    private NotificationDAO notificationDAO;
    
    @Override
    @Transactional(readOnly = true)
    public List<Notification> getNotificationsByUserId(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            System.out.println("SERVICE: Warning - Empty or null userId provided");
            return List.of();
        }
        
        List<Notification> notifications = notificationDAO.findByRecipientUserIdOrderByCreatedAtDesc(userId);
        
        return notifications;
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotificationsByUserId(String userId) {
        return notificationDAO.findByRecipientUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }
    
    @Override
    @Transactional(readOnly = true)
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
            String.format("/project/project_homescreen?projectId=%s&taskId=%s&from=notification", projectId, taskId)
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
            String.format("/project/project_homescreen?projectId=%s&taskId=%s&from=notification", projectId, taskId)
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
            String.format("/project/project_homescreen?projectId=%s&taskId=%s&from=notification", projectId, taskId)
        );
    }
    
    @Override
    public Notification createTaskStatusChangedNotification(String recipientUserId, String actorUserId,
                                                          String actorUserName, String taskId,
                                                          String taskTitle, String projectId, String projectName,
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
    public void createTaskStatusChangedNotifications(String actorUserId, String actorUserName,
                                                   String taskId, String taskTitle, 
                                                   String projectId, String projectName,
                                                   String assigneeUserId, String oldStatus, String newStatus) {
        // Get task creator
        String taskCreatorId = getTaskCreator(taskId);
        
        // Get project scrum masters
        List<String> scrumMasters = getProjectScrumMasters(projectId);
        
        // Create set of users to notify (avoid duplicates)
        Set<String> usersToNotify = new HashSet<>();
        
        // Add assignee if exists and different from actor
        if (assigneeUserId != null && !assigneeUserId.trim().isEmpty() && !assigneeUserId.equals(actorUserId)) {
            usersToNotify.add(assigneeUserId);
        }
        
        // Add task creator if exists and different from actor
        if (taskCreatorId != null && !taskCreatorId.equals(actorUserId)) {
            usersToNotify.add(taskCreatorId);
        }
        
        // Add scrum masters (excluding actor)
        scrumMasters.stream()
            .filter(id -> !id.equals(actorUserId))
            .forEach(usersToNotify::add);
        
        // Send notifications to all relevant users
        for (String userId : usersToNotify) {
            String message;
            if (userId.equals(assigneeUserId)) {
                message = String.format("%s moved \"%s\" assigned to you from %s to %s", actorUserName, taskTitle, oldStatus, newStatus);
            } else if (userId.equals(taskCreatorId)) {
                message = String.format("%s moved your task \"%s\" from %s to %s", actorUserName, taskTitle, oldStatus, newStatus);
            } else {
                message = String.format("%s moved task \"%s\" from %s to %s in project \"%s\"", actorUserName, taskTitle, oldStatus, newStatus, projectName);
            }
            
            createNotification(
                NotificationType.TASK_STATUS_CHANGED,
                "Task status changed",
                message,
                userId,
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
    }
    
    // Helper method to get task creator
    private String getTaskCreator(String taskId) {
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String url = "http://localhost:8085/api/tasks/" + taskId;
            org.springframework.http.ResponseEntity<java.util.Map> response = restTemplate.getForEntity(url, java.util.Map.class);
            
            if (response.getBody() != null && response.getBody().get("data") != null) {
                java.util.Map<String, Object> taskData = (java.util.Map<String, Object>) response.getBody().get("data");
                return (String) taskData.get("createdBy"); // Use createdBy field
            }
            return null;
        } catch (Exception e) {
            System.err.println("Error getting task creator: " + e.getMessage());
            return null;
        }
    }
    
    // Helper method to get project scrum masters only
    private List<String> getProjectScrumMasters(String projectId) {
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String url = "http://localhost:8083/api/projects/" + projectId + "/users";
            org.springframework.http.ResponseEntity<java.util.Map> response = restTemplate.getForEntity(url, java.util.Map.class);
            
            java.util.List<String> scrumMasterIds = new java.util.ArrayList<>();
            if (response.getBody() != null && response.getBody().get("data") != null) {
                java.util.List<java.util.Map<String, Object>> members = (java.util.List<java.util.Map<String, Object>>) response.getBody().get("data");
                for (java.util.Map<String, Object> member : members) {
                    String role = (String) member.get("roleInProject");
                    if ("scrum_master".equalsIgnoreCase(role)) {
                        scrumMasterIds.add(member.get("id").toString());
                    }
                }
            }
            return scrumMasterIds;
        } catch (Exception e) {
            System.err.println("Error getting project scrum masters: " + e.getMessage());
            return new java.util.ArrayList<>();
        }
    }
} 