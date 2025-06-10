package com.tmnhat.usersservice.utils;

import com.tmnhat.usersservice.repository.ProjectMembersDAO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.sql.SQLException;
import java.util.UUID;

@Component
public class PermissionChecker {

    @Autowired
    private ProjectMembersDAO projectMembersDAO;

    // Enum for permissions
    public enum Permission {
        // Project management permissions
        CREATE_PROJECT,
        UPDATE_PROJECT, 
        DELETE_PROJECT,
        MANAGE_MEMBERS,
        
        // Sprint permissions
        CREATE_SPRINT,
        UPDATE_SPRINT,
        DELETE_SPRINT,
        START_SPRINT,
        END_SPRINT,
        
        // Task permissions
        CREATE_TASK,
        UPDATE_ANY_TASK,
        UPDATE_ASSIGNED_TASK,
        DELETE_TASK,
        ASSIGN_TASK,
        ESTIMATE_TASK,
        
        // View permissions
        VIEW_PROJECT,
        VIEW_DASHBOARD,
        VIEW_REPORTS,
        
        // AI permissions
        USE_AI_ESTIMATION,
        TRAIN_AI_MODEL,
        
        // Administrative actions
        LOCK_TASK,
        REJECT_TASK,
        MOVE_TASK
    }

    // Check if user has specific permission in project
    public boolean hasPermission(UUID userId, UUID projectId, Permission permission) {
        try {
            String role = projectMembersDAO.getUserRoleInProject(userId, projectId);
            if (role == null) {
                return false; // User not in project
            }
            
            return checkPermissionByRole(role, permission);
        } catch (SQLException e) {
            System.err.println("Error checking permission: " + e.getMessage());
            return false;
        }
    }
    
    // Get user role in project
    public String getUserRole(UUID userId, UUID projectId) {
        try {
            return projectMembersDAO.getUserRoleInProject(userId, projectId);
        } catch (SQLException e) {
            System.err.println("Error getting user role: " + e.getMessage());
            return null;
        }
    }
    
    // Check if user is project owner
    public boolean isProjectOwner(UUID userId, UUID projectId) {
        try {
            String role = projectMembersDAO.getUserRoleInProject(userId, projectId);
            return "project_owner".equals(role);
        } catch (SQLException e) {
            System.err.println("Error checking project owner: " + e.getMessage());
            return false;
        }
    }
    
    // Check if user is scrum master
    public boolean isScrumMaster(UUID userId, UUID projectId) {
        try {
            String role = projectMembersDAO.getUserRoleInProject(userId, projectId);
            return "scrum_master".equals(role);
        } catch (SQLException e) {
            System.err.println("Error checking scrum master: " + e.getMessage());
            return false;
        }
    }
    
    // Check if user has admin privileges (owner or scrum master)
    public boolean hasAdminPrivileges(UUID userId, UUID projectId) {
        return isProjectOwner(userId, projectId) || isScrumMaster(userId, projectId);
    }
    
    // Check permissions based on role
    private boolean checkPermissionByRole(String role, Permission permission) {
        if (role == null) return false;
        
        switch (role.toLowerCase()) {
            case "project_owner":
                return checkOwnerPermissions(permission);
            case "scrum_master":
                return checkScrumMasterPermissions(permission);
            case "member":
            case "developer":
            case "tester":
            case "designer":
                return checkMemberPermissions(permission);
            default:
                return false;
        }
    }
    
    // Project owner permissions (full access)
    private boolean checkOwnerPermissions(Permission permission) {
        switch (permission) {
            // Project management
            case CREATE_PROJECT:
            case UPDATE_PROJECT:
            case DELETE_PROJECT:
            case MANAGE_MEMBERS:
            
            // Sprint management
            case CREATE_SPRINT:
            case UPDATE_SPRINT:
            case DELETE_SPRINT:
            case START_SPRINT:
            case END_SPRINT:
            
            // Task management
            case CREATE_TASK:
            case UPDATE_ANY_TASK:
            case UPDATE_ASSIGNED_TASK:
            case DELETE_TASK:
            case ASSIGN_TASK:
            case ESTIMATE_TASK:
            
            // View permissions
            case VIEW_PROJECT:
            case VIEW_DASHBOARD:
            case VIEW_REPORTS:
            
            // AI permissions
            case USE_AI_ESTIMATION:
            case TRAIN_AI_MODEL:
            
            // Administrative actions
            case LOCK_TASK:
            case REJECT_TASK:
            case MOVE_TASK:
                return true;
            default:
                return false;
        }
    }
    
    // Scrum master permissions (similar to owner but no project deletion)
    private boolean checkScrumMasterPermissions(Permission permission) {
        switch (permission) {
            // Project management (limited)
            case UPDATE_PROJECT:
            case MANAGE_MEMBERS:
            
            // Sprint management
            case CREATE_SPRINT:
            case UPDATE_SPRINT:
            case DELETE_SPRINT:
            case START_SPRINT:
            case END_SPRINT:
            
            // Task management
            case CREATE_TASK:
            case UPDATE_ANY_TASK:
            case UPDATE_ASSIGNED_TASK:
            case DELETE_TASK:
            case ASSIGN_TASK:
            case ESTIMATE_TASK:
            
            // View permissions
            case VIEW_PROJECT:
            case VIEW_DASHBOARD:
            case VIEW_REPORTS:
            
            // AI permissions
            case USE_AI_ESTIMATION:
            case TRAIN_AI_MODEL:
            
            // Administrative actions
            case LOCK_TASK:
            case REJECT_TASK:
            case MOVE_TASK:
                return true;
                
            // Cannot delete project or create new projects
            case CREATE_PROJECT:
            case DELETE_PROJECT:
                return false;
            default:
                return false;
        }
    }
    
    // Member permissions (limited access)
    private boolean checkMemberPermissions(Permission permission) {
        switch (permission) {
            // Basic task operations
            case CREATE_TASK:
            case UPDATE_ASSIGNED_TASK:
            case ESTIMATE_TASK:
            
            // View permissions
            case VIEW_PROJECT:
            case VIEW_DASHBOARD: // Read-only
            
            // AI permissions
            case USE_AI_ESTIMATION:
                return true;
                
            // Cannot manage project, sprints, or other users' tasks
            case CREATE_PROJECT:
            case UPDATE_PROJECT:
            case DELETE_PROJECT:
            case MANAGE_MEMBERS:
            case CREATE_SPRINT:
            case UPDATE_SPRINT:
            case DELETE_SPRINT:
            case START_SPRINT:
            case END_SPRINT:
            case UPDATE_ANY_TASK:
            case DELETE_TASK:
            case ASSIGN_TASK:
            case VIEW_REPORTS:
            case TRAIN_AI_MODEL:
            case LOCK_TASK:
            case REJECT_TASK:
            case MOVE_TASK:
                return false;
            default:
                return false;
        }
    }
    
    // Utility method to create permission response
    public PermissionResponse createPermissionResponse(UUID userId, UUID projectId) {
        try {
            String role = getUserRole(userId, projectId);
            if (role == null) {
                return new PermissionResponse(false, null, "User not found in project");
            }
            
            return new PermissionResponse(true, role, "Permission check successful");
        } catch (Exception e) {
            return new PermissionResponse(false, null, "Error checking permissions: " + e.getMessage());
        }
    }
    
    // Permission response wrapper
    public static class PermissionResponse {
        private boolean hasAccess;
        private String role;
        private String message;
        
        public PermissionResponse(boolean hasAccess, String role, String message) {
            this.hasAccess = hasAccess;
            this.role = role;
            this.message = message;
        }
        
        // Getters
        public boolean hasAccess() { return hasAccess; }
        public String getRole() { return role; }
        public String getMessage() { return message; }
    }
} 