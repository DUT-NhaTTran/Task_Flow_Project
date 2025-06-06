package com.tmnhat.projectsservice.service.Impl;

import com.tmnhat.common.client.NotificationClient;
import com.tmnhat.common.exception.DatabaseException;
import com.tmnhat.common.exception.ResourceNotFoundException;
import com.tmnhat.projectsservice.model.ProjectMembers;
import com.tmnhat.projectsservice.model.Projects;
import com.tmnhat.projectsservice.model.Users;
import com.tmnhat.projectsservice.repository.ProjectDAO;
import com.tmnhat.projectsservice.repository.ProjectMemberDAO;
import com.tmnhat.projectsservice.service.ProjectService;
import com.tmnhat.projectsservice.validation.ProjectValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;

@Service
public class ProjectServiceImpl implements ProjectService {

    private final ProjectMemberDAO projectMemberDAO = new ProjectMemberDAO();
    private final ProjectDAO projectDAO = new ProjectDAO();
    
    @Autowired
    private NotificationClient notificationClient;

    @Override
    public void addProject(Projects project) {
        try {
            ProjectValidator.validateProject(project);
            projectDAO.addProject(project);
        } catch (Exception e) {
            throw new DatabaseException("Error adding project: " + e.getMessage());
        }
    }

    @Override
    public void updateProject(UUID id, Projects project) {
        try {
            ProjectValidator.validateProjectId(id);
            ProjectValidator.validateProject(project);
            Projects existingProject = projectDAO.getProjectById(id);
            if (existingProject == null) {
                throw new ResourceNotFoundException("Project not found with ID " + id);
            }
            projectDAO.updateProject(id, project);
        } catch (Exception e) {
            throw new DatabaseException("Error updating project: " + e.getMessage());
        }
    }

    @Override
    public void deleteProject(UUID id) {
        try {
            ProjectValidator.validateProjectId(id);
            Projects existingProject = projectDAO.getProjectById(id);
            if (existingProject == null) {
                throw new ResourceNotFoundException("Project not found with ID " + id);
            }
            
            // Get all project members to notify them before deleting
            List<Users> projectMembers = projectMemberDAO.getProjectUsers(id);
            String ownerName = getUserName(existingProject.getOwnerId());
            
            // Notify all members about project deletion
            for (Users member : projectMembers) {
                if (!member.getId().equals(existingProject.getOwnerId())) { // Don't notify owner
                    Map<String, Object> request = new HashMap<>();
                    request.put("type", "PROJECT_DELETED");
                    request.put("title", "Project deleted");
                    request.put("message", String.format("Project \"%s\" has been deleted by %s", 
                        existingProject.getName(), ownerName));
                    request.put("recipientUserId", member.getId().toString());
                    request.put("actorUserId", existingProject.getOwnerId().toString());
                    request.put("actorUserName", ownerName);
                    request.put("projectId", id.toString());
                    request.put("projectName", existingProject.getName());
                    request.put("actionUrl", "/projects");
                    
                    sendNotificationDirect(request);
                }
            }
            
            projectDAO.deleteProject(id);
        } catch (Exception e) {
            throw new DatabaseException("Error deleting project: " + e.getMessage());
        }
    }

    @Override
    public Projects getProjectById(UUID id) {
        try {
            ProjectValidator.validateProjectId(id);
            Projects project = projectDAO.getProjectById(id);
            if (project == null) {
                throw new ResourceNotFoundException("Project not found with ID " + id);
            }
            return project;
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving project: " + e.getMessage());
        }
    }

    @Override
    public List<Projects> getAllProjects() {
        try {
            return projectDAO.getAllProjects();
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving projects: " + e.getMessage());
        }
    }

    @Override
    public List<Projects> getAllProjectsByUserMembership(UUID userId) {
        try {
            return projectDAO.getAllProjectsByUserMembership(userId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving projects by user membership: " + e.getMessage());
        }
    }
    
    @Override
    public void assignMember(UUID projectId, UUID userId, String roleInProject) {
        try {
            Projects project = projectDAO.getProjectById(projectId);
            if (project == null) {
                throw new ResourceNotFoundException("Project not found with ID " + projectId);
            }
            projectMemberDAO.assignMember(projectId, userId, roleInProject);
        } catch (Exception e) {
            throw new DatabaseException("Error assigning member: " + e.getMessage());
        }
    }
    
    @Override
    public void assignMember(ProjectMembers memberDTO) {
        try {
            projectMemberDAO.assignMember(memberDTO.getProjectId(), memberDTO.getUserId(), memberDTO.getRoleInProject());
            
            // Send project invitation notification
            Projects project = projectDAO.getProjectById(memberDTO.getProjectId());
            if (project != null) {
                String ownerName = getUserName(project.getOwnerId());
                
                notificationClient.sendProjectInviteNotification(
                    memberDTO.getUserId().toString(),
                    project.getOwnerId().toString(),
                    ownerName,
                    memberDTO.getProjectId().toString(),
                    project.getName(),
                    memberDTO.getRoleInProject()
                );
            }
        } catch (Exception e) {
            throw new DatabaseException("Error assigning member: " + e.getMessage());
        }
    }

    @Override
    public void removeMember(UUID projectId, UUID userId) {
        try {
            Projects project = projectDAO.getProjectById(projectId);
            if (project == null) {
                throw new ResourceNotFoundException("Project not found with ID " + projectId);
            }
            
            // Send notification to removed member before removing
            String ownerName = getUserName(project.getOwnerId());
            
            Map<String, Object> request = new HashMap<>();
            request.put("type", "PROJECT_ROLE_CHANGED");
            request.put("title", "Removed from project");
            request.put("message", String.format("%s removed you from project \"%s\"", ownerName, project.getName()));
            request.put("recipientUserId", userId.toString());
            request.put("actorUserId", project.getOwnerId().toString());
            request.put("actorUserName", ownerName);
            request.put("projectId", projectId.toString());
            request.put("projectName", project.getName());
            request.put("actionUrl", "/projects");
            
            sendNotificationDirect(request);
            
            projectMemberDAO.removeMember(projectId, userId);
        } catch (Exception e) {
            throw new DatabaseException("Error removing member: " + e.getMessage());
        }
    }

    @Override
    public void changeProjectOwner(UUID projectId, UUID newOwnerId) {
        try {
            Projects project = projectDAO.getProjectById(projectId);
            if (project == null) {
                throw new ResourceNotFoundException("Project not found with ID " + projectId);
            }
            projectMemberDAO.changeProjectOwner(projectId, newOwnerId);
        } catch (Exception e) {
            throw new DatabaseException("Error changing project owner: " + e.getMessage());
        }
    }

    @Override
    public List<Projects> searchProjects(String keyword) {
        try {
            return projectDAO.searchProjects(keyword);
        } catch (Exception e) {
            throw new DatabaseException("Error searching projects: " + e.getMessage());
        }
    }

    @Override
    public List<Projects> searchProjectsByUserMembership(String keyword, UUID userId) {
        try {
            return projectDAO.searchProjectsByUserMembership(keyword, userId);
        } catch (Exception e) {
            throw new DatabaseException("Error searching projects by user membership: " + e.getMessage());
        }
    }

    @Override
    public List<Projects> filterProjectsByType(String projectType) {
        try {
            return projectDAO.filterProjectsByType(projectType);
        } catch (Exception e) {
            throw new DatabaseException("Error filtering projects by type: " + e.getMessage());
        }
    }

    @Override
    public void archiveProject(UUID projectId) {
        try {
            Projects project = projectDAO.getProjectById(projectId);
            if (project == null) {
                throw new ResourceNotFoundException("Project not found with ID " + projectId);
            }
            projectDAO.archiveProject(projectId);
        } catch (Exception e) {
            throw new DatabaseException("Error archiving project: " + e.getMessage());
        }
    }

    @Override
    public List<Projects> paginateProjects(int page, int size) {
        try {
            return projectDAO.paginateProjects(page, size);
        } catch (Exception e) {
            throw new DatabaseException("Error paginating projects: " + e.getMessage());
        }
    }

    @Override
    public UUID getLastInsertedProjectId() {
        try {
            return projectDAO.getLastInsertedProjectId();
        } catch (SQLException e) {
            System.err.println("Error getting last inserted project ID: " + e.getMessage());
            throw new RuntimeException("Could not fetch last inserted project ID", e);
        }
    }
    @Override
    public UUID addProjectReturnId(Projects project) {
        try {
            ProjectValidator.validateProject(project);
            UUID projectId = projectDAO.addProjectReturnId(project);
            
            // Send notification to project owner about project creation
            notificationClient.sendProjectCreatedNotification(
                project.getOwnerId().toString(),
                project.getOwnerId().toString(),
                "You", // Owner name - could get from context or User service
                projectId.toString(),
                project.getName()
            );
            
            return projectId;
        } catch (Exception e) {
            throw new DatabaseException("Error adding project with return ID: " + e.getMessage());
        }
    }
    @Override
    public Projects getLatestProjectByOwnerId(UUID ownerId) {
        try {
            return projectDAO.findLatestByOwnerId(ownerId);
        } catch (SQLException e) {
            throw new RuntimeException("Failed to fetch latest project", e);
        }
    }

    @Override
    public List<Users> getProjectUsers(UUID projectId) {
        try {
            // Validate the project ID
            ProjectValidator.validateProjectId(projectId);
            
            // Check if the project exists
            Projects project = projectDAO.getProjectById(projectId);
            if (project == null) {
                throw new ResourceNotFoundException("Project not found with ID " + projectId);
            }
            
            // Get users associated with the project
            return projectMemberDAO.getProjectUsers(projectId);
        } catch (SQLException e) {
            throw new DatabaseException("Error retrieving project users: " + e.getMessage());
        }
    }
    
    @Override
    public void updateMemberRole(ProjectMembers memberDTO) {
        try {
            Projects project = projectDAO.getProjectById(memberDTO.getProjectId());
            if (project == null) {
                throw new ResourceNotFoundException("Project not found with ID " + memberDTO.getProjectId());
            }
            
            projectMemberDAO.updateMemberRole(memberDTO.getProjectId(), 
                                            memberDTO.getUserId(), 
                                            memberDTO.getRoleInProject(), 
                                            project.getOwnerId()); // Use project owner as requester
            
            // Send notification about role change
            String ownerName = getUserName(project.getOwnerId());
            
            Map<String, Object> request = new HashMap<>();
            request.put("type", "PROJECT_ROLE_CHANGED");
            request.put("title", "Role changed");
            request.put("message", String.format("Your role in project \"%s\" has been changed to %s", 
                project.getName(), memberDTO.getRoleInProject()));
            request.put("recipientUserId", memberDTO.getUserId().toString());
            request.put("actorUserId", project.getOwnerId().toString());
            request.put("actorUserName", ownerName);
            request.put("projectId", memberDTO.getProjectId().toString());
            request.put("projectName", project.getName());
            request.put("actionUrl", String.format("/project/dashboard?projectId=%s", memberDTO.getProjectId()));
            
            sendNotificationDirect(request);
        } catch (Exception e) {
            throw new DatabaseException("Error updating member role: " + e.getMessage());
        }
    }
    
    @Override
    public String getRoleInProject(UUID projectId, UUID userId) {
        try {
            if (projectId == null || userId == null) {
                throw new IllegalArgumentException("Project ID and User ID must not be null");
            }
            
            Projects project = projectDAO.getProjectById(projectId);
            if (project == null) {
                throw new ResourceNotFoundException("Project not found with ID " + projectId);
            }
            
            return projectMemberDAO.getRoleInProject(projectId, userId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving role in project: " + e.getMessage());
        }
    }

    // Helper methods
    private String getUserName(UUID userId) {
        try {
            // Call User Service to get user name
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String url = "http://localhost:8086/api/users/" + userId;
            org.springframework.http.ResponseEntity<java.util.Map> response = restTemplate.getForEntity(url, java.util.Map.class);
            
            if (response.getBody() != null && response.getBody().get("data") != null) {
                java.util.Map<String, Object> userData = (java.util.Map<String, Object>) response.getBody().get("data");
                return (String) userData.get("name");
            }
            return "Unknown User";
        } catch (Exception e) {
            return "Unknown User";
        }
    }
    
    private void sendNotificationDirect(java.util.Map<String, Object> notificationData) {
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String url = "http://localhost:8089/api/notifications/create";
            
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            
            org.springframework.http.HttpEntity<java.util.Map<String, Object>> request = 
                new org.springframework.http.HttpEntity<>(notificationData, headers);
            
            restTemplate.exchange(url, org.springframework.http.HttpMethod.POST, request, String.class);
        } catch (Exception e) {
            System.err.println("Failed to send notification: " + e.getMessage());
        }
    }
}
