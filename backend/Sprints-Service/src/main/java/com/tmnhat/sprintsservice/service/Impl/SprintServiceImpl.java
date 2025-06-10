package com.tmnhat.sprintsservice.service.Impl;
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

import org.springframework.stereotype.Service;

@Service
public class SprintServiceImpl implements SprintService {

    private final SprintDAO sprintsDAO = new SprintDAO();

    @Override
    public void addSprint(Sprints sprint) {
        try {
            SprintValidator.validateSprint(sprint);
            sprintsDAO.addSprint(sprint);
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
        } catch (Exception e) {
            throw new DatabaseException("Error updating sprint: " + e.getMessage());
        }
    }

    @Override
    public void deleteSprint(UUID sprintId) {
        try {
            Sprints sprintToDelete = getSprintById(sprintId);
            if (sprintToDelete == null) {
                throw new ResourceNotFoundException("Sprint not found with ID " + sprintId);
            }
            
            sprintsDAO.deleteSprint(sprintId);
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
}
