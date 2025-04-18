package com.tmnhat.notificationsservice.model;

import java.time.LocalDateTime;
import java.util.UUID;

public class Notifications {
    private UUID id;
    private UUID userId;
    private String title;
    private String message;
    private String type; // 'alert', 'reminder', 'task_update', etc.
    private Boolean isRead;
    private LocalDateTime createdAt;

    public Notifications() {}

    // --- Builder Class ---
    public static class Builder {
        private UUID id;
        private UUID userId;
        private String title;
        private String message;
        private String type;
        private Boolean isRead;
        private LocalDateTime createdAt;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder userId(UUID userId) { this.userId = userId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder message(String message) { this.message = message; return this; }
        public Builder type(String type) { this.type = type; return this; }
        public Builder isRead(Boolean isRead) { this.isRead = isRead; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public Notifications build() {
            Notifications n = new Notifications();
            n.id = this.id;
            n.userId = this.userId;
            n.title = this.title;
            n.message = this.message;
            n.type = this.type;
            n.isRead = this.isRead;
            n.createdAt = this.createdAt;
            return n;
        }
    }

    // --- Getters ---
    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getTitle() {
        return title;
    }

    public String getMessage() {
        return message;
    }

    public String getType() {
        return type;
    }

    public Boolean getIsRead() {
        return isRead;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    // --- Setters ---
    public void setId(UUID id) {
        this.id = id;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setIsRead(Boolean isRead) {
        this.isRead = isRead;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
