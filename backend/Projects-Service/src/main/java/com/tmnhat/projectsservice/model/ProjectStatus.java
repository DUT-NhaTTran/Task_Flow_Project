package com.tmnhat.projectsservice.model;

public class ProjectStatus {
    public static final String ACTIVE = "ACTIVE";
    public static final String COMPLETED = "COMPLETED"; 
    public static final String ARCHIVED = "ARCHIVED";
    
    private ProjectStatus() {
        // Prevent instantiation
    }
    
    public static boolean isValidStatus(String status) {
        return ACTIVE.equals(status) || COMPLETED.equals(status) || ARCHIVED.equals(status);
    }
} 