package com.taskflow.notification.model;

import com.taskflow.notification.payload.enums.NotificationType;
import java.time.LocalDateTime;

public class Notification {
    
    private Long id;
    private NotificationType type;
    private String title;
    private String message;
    private String recipientUserId;
    private String actorUserId;
    private String actorUserName;
    private String actorUserAvatar;
    private String projectId;
    private String projectName;
    private String taskId;
    private String sprintId;
    private String commentId;
    private String actionUrl;
    private Boolean isRead = false;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;

    public Notification() {
    }

    private Notification(Builder builder) {
        this.id = builder.id;
        this.type = builder.type;
        this.title = builder.title;
        this.message = builder.message;
        this.recipientUserId = builder.recipientUserId;
        this.actorUserId = builder.actorUserId;
        this.actorUserName = builder.actorUserName;
        this.actorUserAvatar = builder.actorUserAvatar;
        this.projectId = builder.projectId;
        this.projectName = builder.projectName;
        this.taskId = builder.taskId;
        this.sprintId = builder.sprintId;
        this.commentId = builder.commentId;
        this.actionUrl = builder.actionUrl;
        this.isRead = builder.isRead;
        this.createdAt = builder.createdAt;
        this.readAt = builder.readAt;
    }

    // Helper method to set creation time if not set
    public void setCreationTime() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
    
    // Helper method to mark as read
    public void markAsRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public NotificationType getType() {
        return type;
    }

    public void setType(NotificationType type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getRecipientUserId() {
        return recipientUserId;
    }

    public void setRecipientUserId(String recipientUserId) {
        this.recipientUserId = recipientUserId;
    }

    public String getActorUserId() {
        return actorUserId;
    }

    public void setActorUserId(String actorUserId) {
        this.actorUserId = actorUserId;
    }

    public String getActorUserName() {
        return actorUserName;
    }

    public void setActorUserName(String actorUserName) {
        this.actorUserName = actorUserName;
    }

    public String getActorUserAvatar() {
        return actorUserAvatar;
    }

    public void setActorUserAvatar(String actorUserAvatar) {
        this.actorUserAvatar = actorUserAvatar;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getSprintId() {
        return sprintId;
    }

    public void setSprintId(String sprintId) {
        this.sprintId = sprintId;
    }

    public String getCommentId() {
        return commentId;
    }

    public void setCommentId(String commentId) {
        this.commentId = commentId;
    }

    public String getActionUrl() {
        return actionUrl;
    }

    public void setActionUrl(String actionUrl) {
        this.actionUrl = actionUrl;
    }

    public Boolean getIsRead() {
        return isRead;
    }

    public void setIsRead(Boolean isRead) {
        this.isRead = isRead;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public void setReadAt(LocalDateTime readAt) {
        this.readAt = readAt;
    }

    // Builder class
    public static class Builder {
        private Long id;
        private NotificationType type;
        private String title;
        private String message;
        private String recipientUserId;
        private String actorUserId;
        private String actorUserName;
        private String actorUserAvatar;
        private String projectId;
        private String projectName;
        private String taskId;
        private String sprintId;
        private String commentId;
        private String actionUrl;
        private Boolean isRead = false;
        private LocalDateTime createdAt;
        private LocalDateTime readAt;

        public Builder() {
        }

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder type(NotificationType type) {
            this.type = type;
            return this;
        }

        public Builder title(String title) {
            this.title = title;
            return this;
        }

        public Builder message(String message) {
            this.message = message;
            return this;
        }

        public Builder recipientUserId(String recipientUserId) {
            this.recipientUserId = recipientUserId;
            return this;
        }

        public Builder actorUserId(String actorUserId) {
            this.actorUserId = actorUserId;
            return this;
        }

        public Builder actorUserName(String actorUserName) {
            this.actorUserName = actorUserName;
            return this;
        }

        public Builder actorUserAvatar(String actorUserAvatar) {
            this.actorUserAvatar = actorUserAvatar;
            return this;
        }

        public Builder projectId(String projectId) {
            this.projectId = projectId;
            return this;
        }

        public Builder projectName(String projectName) {
            this.projectName = projectName;
            return this;
        }

        public Builder taskId(String taskId) {
            this.taskId = taskId;
            return this;
        }

        public Builder sprintId(String sprintId) {
            this.sprintId = sprintId;
            return this;
        }

        public Builder commentId(String commentId) {
            this.commentId = commentId;
            return this;
        }

        public Builder actionUrl(String actionUrl) {
            this.actionUrl = actionUrl;
            return this;
        }

        public Builder isRead(Boolean isRead) {
            this.isRead = isRead;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder readAt(LocalDateTime readAt) {
            this.readAt = readAt;
            return this;
        }

        public Notification build() {
            return new Notification(this);
        }
    }
} 