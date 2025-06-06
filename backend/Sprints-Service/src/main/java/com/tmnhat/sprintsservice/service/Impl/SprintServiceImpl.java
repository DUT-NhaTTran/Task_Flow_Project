package com.tmnhat.sprintsservice.service.Impl;
import com.tmnhat.common.client.NotificationClient;
import com.tmnhat.common.exception.DatabaseException;
import com.tmnhat.common.exception.ResourceNotFoundException;
import com.tmnhat.sprintsservice.model.Sprints;
import com.tmnhat.sprintsservice.payload.enums.SprintStatus;
import com.tmnhat.sprintsservice.repository.SprintDAO;
import com.tmnhat.sprintsservice.service.SprintService;
import com.tmnhat.sprintsservice.validation.SprintValidator;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.HashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SprintServiceImpl implements SprintService {

    private final SprintDAO sprintsDAO = new SprintDAO();
    
    @Autowired
    private NotificationClient notificationClient;

    @Override
    public void addSprint(Sprints sprint) {
        try {
            SprintValidator.validateSprint(sprint);
            sprintsDAO.addSprint(sprint);
            
            // Send notification to project members about new sprint
            List<String> projectMemberIds = getProjectMemberIds(sprint.getProjectId());
            String projectName = getProjectName(sprint.getProjectId());
            
            for (String memberId : projectMemberIds) {
                notificationClient.sendSprintCreatedNotification(
                    memberId,
                    "SYSTEM", // Or get from context
                    "System",
                    sprint.getId() != null ? sprint.getId().toString() : "new-sprint",
                    sprint.getName(),
                    sprint.getProjectId().toString(),
                    projectName
                );
            }
        } catch (Exception e) {
            throw new DatabaseException("Error adding sprint: " + e.getMessage());
        }
    }

    @Override
    public void updateSprint(UUID id, Sprints sprint) {
        try {
            SprintValidator.validateSprintId(id);
            SprintValidator.validateSprint(sprint);
            Sprints existingSprint = sprintsDAO.getSprintById(id);
            if (existingSprint == null) {
                throw new ResourceNotFoundException("Sprint not found with ID " + id);
            }
            
            sprintsDAO.updateSprint(id, sprint);
            
            // Send notification about sprint update
            List<String> projectMemberIds = getProjectMemberIds(sprint.getProjectId());
            String projectName = getProjectName(sprint.getProjectId());
            
            for (String memberId : projectMemberIds) {
                Map<String, Object> request = new HashMap<>();
                request.put("type", "SPRINT_UPDATED");
                request.put("title", "Sprint updated");
                request.put("message", String.format("Sprint \"%s\" has been updated", sprint.getName()));
                request.put("recipientUserId", memberId);
                request.put("actorUserId", "SYSTEM");
                request.put("actorUserName", "System");
                request.put("projectId", sprint.getProjectId().toString());
                request.put("projectName", projectName);
                request.put("sprintId", id.toString());
                request.put("actionUrl", String.format("/project/sprints?projectId=%s&sprintId=%s", 
                    sprint.getProjectId(), id));
                
                sendNotificationDirect(request);
            }
        } catch (Exception e) {
            throw new DatabaseException("Error updating sprint: " + e.getMessage());
        }
    }

    @Override
    public void deleteSprint(UUID id) {
        try {
            SprintValidator.validateSprintId(id);
            Sprints existingSprint = sprintsDAO.getSprintById(id);
            if (existingSprint == null) {
                throw new ResourceNotFoundException("Sprint not found with ID " + id);
            }
            sprintsDAO.deleteSprint(id);
        } catch (Exception e) {
            throw new DatabaseException("Error deleting sprint: " + e.getMessage());
        }
    }

    @Override
    public Sprints getSprintById(UUID id) {
        try {
            SprintValidator.validateSprintId(id);
            return sprintsDAO.getSprintById(id);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving sprint: " + e.getMessage());
        }
    }

    @Override
    public List<Sprints> getAllSprints() {
        try {
            return sprintsDAO.getAllSprints();
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving sprints: " + e.getMessage());
        }
    }
    @Override
    public void startSprint(UUID sprintId) {
        try {
            Sprints sprint = getSprintById(sprintId);
            if (sprint.getStatus() != SprintStatus.NOT_STARTED) {
                throw new DatabaseException("Sprint is already started or completed");
            }
            sprint.setStatus(SprintStatus.ACTIVE);
            sprint.setStartDate(java.time.LocalDate.now());
            sprintsDAO.updateSprintStatusAndDates(sprintId, sprint.getStatus(), sprint.getStartDate(), null);
            
            // Send notification about sprint start
            List<String> projectMemberIds = getProjectMemberIds(sprint.getProjectId());
            String projectName = getProjectName(sprint.getProjectId());
            
            for (String memberId : projectMemberIds) {
                notificationClient.sendSprintStartedNotification(
                    memberId,
                    "SYSTEM", // Or get from context
                    "System",
                    sprintId.toString(),
                    sprint.getName(),
                    sprint.getProjectId().toString(),
                    projectName
                );
            }
        } catch (Exception e) {
            throw new DatabaseException("Error starting sprint: " + e.getMessage());
        }
    }

    @Override
    public void completeSprint(UUID sprintId) {
        try {
            Sprints sprint = getSprintById(sprintId);
            if (sprint.getStatus() != SprintStatus.ACTIVE) {
                throw new DatabaseException("Sprint is not active");
            }
            sprint.setStatus(SprintStatus.COMPLETED);
            sprint.setEndDate(java.time.LocalDate.now());
            sprintsDAO.updateSprintStatusAndDates(sprintId, sprint.getStatus(), null, sprint.getEndDate());
            
            // Send notification about sprint completion
            List<String> projectMemberIds = getProjectMemberIds(sprint.getProjectId());
            String projectName = getProjectName(sprint.getProjectId());
            
            for (String memberId : projectMemberIds) {
                notificationClient.sendSprintCompletedNotification(
                    memberId,
                    "SYSTEM", // Or get from context
                    "System",
                    sprintId.toString(),
                    sprint.getName(),
                    sprint.getProjectId().toString(),
                    projectName
                );
            }
        } catch (Exception e) {
            throw new DatabaseException("Error completing sprint: " + e.getMessage());
        }
    }

    @Override
    public void archiveSprint(UUID sprintId) {
        try {
            Sprints sprint = getSprintById(sprintId);
            if (sprint.getStatus() != SprintStatus.COMPLETED) {
                throw new DatabaseException("Only completed sprints can be archived");
            }
            sprint.setStatus(SprintStatus.ARCHIVED);
            sprintsDAO.updateSprintStatus(sprintId, sprint.getStatus());
        } catch (Exception e) {
            throw new DatabaseException("Error archiving sprint: " + e.getMessage());
        }
    }

    @Override
    public List<Sprints> getSprintsByProject(UUID projectId) {
        try {
            return sprintsDAO.getSprintsByProject(projectId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving sprints by project: " + e.getMessage());
        }
    }

    @Override
    public Sprints getActiveSprint(UUID projectId) {
        try {
            return sprintsDAO.getActiveSprintByProject(projectId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving active sprint: " + e.getMessage());
        }
    }

    @Override
    public void moveIncompleteTasks(UUID fromSprintId, UUID toSprintId) {
        try {
            sprintsDAO.moveIncompleteTasks(fromSprintId, toSprintId);
        } catch (Exception e) {
            throw new DatabaseException("Error moving incomplete tasks: " + e.getMessage());
        }
    }

    @Override
    public Sprints getLastSprintOfProject(UUID projectId) {
        try {
            return sprintsDAO.getLastSprintByProject(projectId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving last sprint: " + e.getMessage());
        }
    }
    @Override
    public List<Sprints> getAllSprintsByProject(UUID projectId){
        try {
            return sprintsDAO.getSprintsByProject(projectId);
        } catch (Exception e) {
            throw new DatabaseException("Error getting sprints for project " + projectId + ": " + e.getMessage());
        }
    }

    // Calendar Filter Methods Implementation
    @Override
    public List<Sprints> getFilteredSprintsForCalendar(UUID projectId, String search, 
                                                      List<String> assigneeIds, List<String> statuses, 
                                                      String startDate, String endDate) {
        try {
            return sprintsDAO.getFilteredSprintsForCalendar(projectId, search, assigneeIds, 
                                                           statuses, startDate, endDate);
        } catch (Exception e) {
            throw new DatabaseException("Error filtering sprints for calendar: " + e.getMessage());
        }
    }

    @Override
    public List<Map<String, Object>> getSprintAssignees(UUID projectId) {
        try {
            return sprintsDAO.getSprintAssignees(projectId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving sprint assignees: " + e.getMessage());
        }
    }

    @Override
    public List<String> getSprintStatuses(UUID projectId) {
        try {
            return sprintsDAO.getSprintStatuses(projectId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving sprint statuses: " + e.getMessage());
        }
    }

    // Helper methods
    private List<String> getProjectMemberIds(UUID projectId) {
        try {
            // Call Projects Service to get project members
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String url = "http://localhost:8083/api/projects/" + projectId + "/users";
            org.springframework.http.ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            java.util.List<String> memberIds = new java.util.ArrayList<>();
            if (response.getBody() != null && response.getBody().get("data") != null) {
                java.util.List<Map<String, Object>> members = (java.util.List<Map<String, Object>>) response.getBody().get("data");
                for (Map<String, Object> member : members) {
                    memberIds.add(member.get("id").toString());
                }
            }
            return memberIds;
        } catch (Exception e) {
            return new java.util.ArrayList<>();
        }
    }
    
    private String getProjectName(UUID projectId) {
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String url = "http://localhost:8083/api/projects/" + projectId;
            org.springframework.http.ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getBody() != null && response.getBody().get("data") != null) {
                Map<String, Object> projectData = (Map<String, Object>) response.getBody().get("data");
                return (String) projectData.get("name");
            }
            return "Unknown Project";
        } catch (Exception e) {
            return "Unknown Project";
        }
    }
    
    private void sendNotificationDirect(Map<String, Object> notificationData) {
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String url = "http://localhost:8089/api/notifications/create";
            
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            
            org.springframework.http.HttpEntity<Map<String, Object>> request = 
                new org.springframework.http.HttpEntity<>(notificationData, headers);
            
            restTemplate.exchange(url, org.springframework.http.HttpMethod.POST, request, String.class);
        } catch (Exception e) {
            System.err.println("Failed to send notification: " + e.getMessage());
        }
    }

}
