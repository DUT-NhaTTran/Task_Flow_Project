package com.tmnhat.projectsservice.model;

import java.util.UUID;

public class ProjectMemberDTO {
    private UUID projectId;
    private UUID userId;
    private String role;
    
    public ProjectMemberDTO() {
    }
    
    public UUID getProjectId() {
        return projectId;
    }
    
    public void setProjectId(UUID projectId) {
        this.projectId = projectId;
    }
    
    public UUID getUserId() {
        return userId;
    }
    
    public void setUserId(UUID userId) {
        this.userId = userId;
    }
    
    public String getRole() {
        return role;
    }
    
    public void setRole(String role) {
        this.role = role;
    }
} 