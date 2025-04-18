package com.tmnhat.projectsservice.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class Projects {

    private UUID id;
    private String name;
    private String description;
    private UUID ownerId;
    private LocalDate deadline;
    private LocalDateTime createdAt;

    public Projects() {
    }

    private Projects(Builder builder) {
        this.id = builder.id;
        this.name = builder.name;
        this.description = builder.description;
        this.ownerId = builder.ownerId;
        this.deadline = builder.deadline;
        this.createdAt = builder.createdAt;
    }

    // Getters & Setters

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
    }

    public LocalDate getDeadline() {
        return deadline;
    }

    public void setDeadline(LocalDate deadline) {
        this.deadline = deadline;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    // ✅ Builder class
    public static class Builder {
        private UUID id;
        private String name;
        private String description;
        private UUID ownerId;
        private LocalDate deadline;
        private LocalDateTime createdAt;

        public Builder() {}

        public Builder id(UUID id) {
            this.id = id;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder description(String description) {
            this.description = description;
            return this;
        }

        public Builder ownerId(UUID ownerId) {
            this.ownerId = ownerId;
            return this;
        }

        public Builder deadline(LocalDate deadline) {
            this.deadline = deadline;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Projects build() {
            return new Projects(this);
        }
    }
}
