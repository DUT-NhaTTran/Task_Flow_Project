package com.tmnhat.sprintsservice.controller;

import com.tmnhat.common.config.WebConfig;
import com.tmnhat.common.payload.ResponseDataAPI;
import com.tmnhat.sprintsservice.model.Sprints;
import com.tmnhat.sprintsservice.service.Impl.SprintServiceImpl;
import com.tmnhat.sprintsservice.service.SprintService;
import com.tmnhat.sprintsservice.validation.SprintValidator;
import com.tmnhat.sprintsservice.utils.PermissionUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
@Import(WebConfig.class)

@RestController
@RequestMapping("api/sprints")
public class SprintController {

    private final SprintService sprintsService;
    
    @Autowired
    private PermissionUtil permissionUtil;

    public SprintController() {
        this.sprintsService = new SprintServiceImpl();
    }

    @PostMapping
    public ResponseEntity<ResponseDataAPI> addSprint(@RequestBody Sprints sprint, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        SprintValidator.validateSprint(sprint);
        
        // Permission check: User must have CREATE_SPRINT permission (admin only)
        if (userId != null && !userId.trim().isEmpty() && sprint.getProjectId() != null) {
            try {
                UUID userUUID = UUID.fromString(userId);
                if (!permissionUtil.hasSprintPermission(userUUID, sprint.getProjectId(), PermissionUtil.SprintPermission.CREATE_SPRINT)) {
                    return ResponseEntity.status(403).body(ResponseDataAPI.error("Insufficient permissions to create sprint"));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(400).body(ResponseDataAPI.error("Invalid user ID format"));
            }
        }
        
        sprintsService.addSprint(sprint);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    @GetMapping
    public ResponseEntity<ResponseDataAPI> getAllSprints() {
        List<Sprints> sprintList = sprintsService.getAllSprints();
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(sprintList));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> getSprintById(@PathVariable("id") UUID id, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        SprintValidator.validateSprintId(id);
        
        Sprints sprint = sprintsService.getSprintById(id);
        if (sprint == null) {
            return ResponseEntity.status(404).body(ResponseDataAPI.error("Sprint not found"));
        }
        
        // Permission check: User must have VIEW_SPRINT permission (all project members)
        if (userId != null && !userId.trim().isEmpty() && sprint.getProjectId() != null) {
            try {
                UUID userUUID = UUID.fromString(userId);
                if (!permissionUtil.hasSprintPermission(userUUID, sprint.getProjectId(), PermissionUtil.SprintPermission.VIEW_SPRINT)) {
                    return ResponseEntity.status(403).body(ResponseDataAPI.error("Insufficient permissions to view this sprint"));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(400).body(ResponseDataAPI.error("Invalid user ID format"));
            }
        }
        
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(sprint));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> updateSprint(@PathVariable("id") UUID id, @RequestBody Sprints sprint, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        SprintValidator.validateSprintId(id);
        SprintValidator.validateSprint(sprint);
        
        // Get existing sprint to check permissions
        Sprints existingSprint = sprintsService.getSprintById(id);
        if (existingSprint == null) {
            return ResponseEntity.status(404).body(ResponseDataAPI.error("Sprint not found"));
        }
        
        // Permission check: User must have UPDATE_SPRINT permission (admin only)
        if (userId != null && !userId.trim().isEmpty() && existingSprint.getProjectId() != null) {
            try {
                UUID userUUID = UUID.fromString(userId);
                if (!permissionUtil.hasSprintPermission(userUUID, existingSprint.getProjectId(), PermissionUtil.SprintPermission.UPDATE_SPRINT)) {
                    return ResponseEntity.status(403).body(ResponseDataAPI.error("Insufficient permissions to update sprint"));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(400).body(ResponseDataAPI.error("Invalid user ID format"));
            }
        }
        
        sprintsService.updateSprint(id, sprint);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> deleteSprint(@PathVariable("id") UUID id, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        SprintValidator.validateSprintId(id);
        
        // Get existing sprint to check permissions
        Sprints existingSprint = sprintsService.getSprintById(id);
        if (existingSprint == null) {
            return ResponseEntity.status(404).body(ResponseDataAPI.error("Sprint not found"));
        }
        
        // Permission check: User must have DELETE_SPRINT permission (admin only)
        if (userId != null && !userId.trim().isEmpty() && existingSprint.getProjectId() != null) {
            try {
                UUID userUUID = UUID.fromString(userId);
                if (!permissionUtil.hasSprintPermission(userUUID, existingSprint.getProjectId(), PermissionUtil.SprintPermission.DELETE_SPRINT)) {
                    return ResponseEntity.status(403).body(ResponseDataAPI.error("Insufficient permissions to delete sprint"));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(400).body(ResponseDataAPI.error("Invalid user ID format"));
            }
        }
        
        sprintsService.deleteSprint(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }
    
    @PostMapping("/{id}/start")
    public ResponseEntity<ResponseDataAPI> startSprint(@PathVariable("id") UUID id, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        SprintValidator.validateSprintId(id);
        
        // Get existing sprint to check permissions
        Sprints existingSprint = sprintsService.getSprintById(id);
        if (existingSprint == null) {
            return ResponseEntity.status(404).body(ResponseDataAPI.error("Sprint not found"));
        }
        
        // Permission check: User must have START_SPRINT permission (admin only)
        if (userId != null && !userId.trim().isEmpty() && existingSprint.getProjectId() != null) {
            try {
                UUID userUUID = UUID.fromString(userId);
                if (!permissionUtil.hasSprintPermission(userUUID, existingSprint.getProjectId(), PermissionUtil.SprintPermission.START_SPRINT)) {
                    return ResponseEntity.status(403).body(ResponseDataAPI.error("Insufficient permissions to start sprint"));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(400).body(ResponseDataAPI.error("Invalid user ID format"));
            }
        }
        
        sprintsService.startSprint(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }
    
    @PostMapping("/{id}/complete")
    public ResponseEntity<ResponseDataAPI> completeSprint(@PathVariable("id") UUID id, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        SprintValidator.validateSprintId(id);
        
        // Get existing sprint to check permissions
        Sprints existingSprint = sprintsService.getSprintById(id);
        if (existingSprint == null) {
            return ResponseEntity.status(404).body(ResponseDataAPI.error("Sprint not found"));
        }
        
        // Permission check: User must have END_SPRINT permission (admin only)
        if (userId != null && !userId.trim().isEmpty() && existingSprint.getProjectId() != null) {
            try {
                UUID userUUID = UUID.fromString(userId);
                if (!permissionUtil.hasSprintPermission(userUUID, existingSprint.getProjectId(), PermissionUtil.SprintPermission.END_SPRINT)) {
                    return ResponseEntity.status(403).body(ResponseDataAPI.error("Insufficient permissions to complete sprint"));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(400).body(ResponseDataAPI.error("Invalid user ID format"));
            }
        }
        
        sprintsService.completeSprint(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }
    
    @GetMapping("/project/{projectId}/last")
    public ResponseEntity<?> getLastSprintOfProject(@PathVariable UUID projectId, @RequestHeader(value = "X-User-Id", required = false) String userId) throws SQLException {
        // Permission check: User must have VIEW_SPRINT permission
        if (userId != null && !userId.trim().isEmpty()) {
            try {
                UUID userUUID = UUID.fromString(userId);
                if (!permissionUtil.hasSprintPermission(userUUID, projectId, PermissionUtil.SprintPermission.VIEW_SPRINT)) {
                    return ResponseEntity.status(403).body("Insufficient permissions to view sprints");
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(400).body("Invalid user ID format");
            }
        }
        
        Sprints sprint = sprintsService.getLastSprintOfProject(projectId);
        if (sprint == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No sprint found");
        }
        return ResponseEntity.ok(sprint);
    }
    
    @GetMapping("/project/{projectId}/active")
    public ResponseEntity<ResponseDataAPI> getActiveSprintByProject(@PathVariable UUID projectId, @RequestHeader(value = "X-User-Id", required = false) String userId) throws SQLException {
        // Permission check: User must have VIEW_SPRINT permission
        if (userId != null && !userId.trim().isEmpty()) {
            try {
                UUID userUUID = UUID.fromString(userId);
                if (!permissionUtil.hasSprintPermission(userUUID, projectId, PermissionUtil.SprintPermission.VIEW_SPRINT)) {
                    return ResponseEntity.status(403).body(ResponseDataAPI.error("Insufficient permissions to view sprints"));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(400).body(ResponseDataAPI.error("Invalid user ID format"));
            }
        }
        
        Sprints sprint = sprintsService.getActiveSprint(projectId);
        if (sprint == null) {
            return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(null));
        }
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(sprint));
    }
    
    @GetMapping("/project/{projectId}")
    public ResponseEntity<?> getSprintsByProject(@PathVariable UUID projectId, @RequestHeader(value = "X-User-Id", required = false) String userId) throws SQLException {
        // Permission check: User must have VIEW_SPRINT permission
        if (userId != null && !userId.trim().isEmpty()) {
            try {
                UUID userUUID = UUID.fromString(userId);
                if (!permissionUtil.hasSprintPermission(userUUID, projectId, PermissionUtil.SprintPermission.VIEW_SPRINT)) {
                    return ResponseEntity.status(403).body(Map.of("error", "Insufficient permissions to view sprints"));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(400).body(Map.of("error", "Invalid user ID format"));
            }
        }
        
        List<Sprints> list = sprintsService.getSprintsByProject(projectId);
        return ResponseEntity.ok(Map.of("data", list));
    }

    // Calendar Filter Endpoints
    @GetMapping("/project/{projectId}/calendar/filter")
    public ResponseEntity<ResponseDataAPI> getFilteredSprintsForCalendar(
        @PathVariable UUID projectId,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) List<String> assigneeIds,
        @RequestParam(required = false) List<String> statuses,
        @RequestParam(required = false) String startDate,
        @RequestParam(required = false) String endDate,
        @RequestHeader(value = "X-User-Id", required = false) String userId) {
        
        // Permission check: User must have VIEW_SPRINT permission
        if (userId != null && !userId.trim().isEmpty()) {
            try {
                UUID userUUID = UUID.fromString(userId);
                if (!permissionUtil.hasSprintPermission(userUUID, projectId, PermissionUtil.SprintPermission.VIEW_SPRINT)) {
                    return ResponseEntity.status(403).body(ResponseDataAPI.error("Insufficient permissions to view sprints"));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(400).body(ResponseDataAPI.error("Invalid user ID format"));
            }
        }
        
        List<Sprints> filteredSprints = sprintsService.getFilteredSprintsForCalendar(
            projectId, search, assigneeIds, statuses, startDate, endDate);
        
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(filteredSprints));
    }

    @GetMapping("/project/{projectId}/calendar/assignees")
    public ResponseEntity<ResponseDataAPI> getSprintAssigneesForCalendar(@PathVariable UUID projectId, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        // Permission check: User must have VIEW_SPRINT permission
        if (userId != null && !userId.trim().isEmpty()) {
            try {
                UUID userUUID = UUID.fromString(userId);
                if (!permissionUtil.hasSprintPermission(userUUID, projectId, PermissionUtil.SprintPermission.VIEW_SPRINT)) {
                    return ResponseEntity.status(403).body(ResponseDataAPI.error("Insufficient permissions to view sprint assignees"));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(400).body(ResponseDataAPI.error("Invalid user ID format"));
            }
        }
        
        List<Map<String, Object>> assignees = sprintsService.getSprintAssignees(projectId);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(assignees));
    }

    @GetMapping("/project/{projectId}/calendar/statuses")
    public ResponseEntity<ResponseDataAPI> getSprintStatusesForCalendar(@PathVariable UUID projectId, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        // Permission check: User must have VIEW_SPRINT permission
        if (userId != null && !userId.trim().isEmpty()) {
            try {
                UUID userUUID = UUID.fromString(userId);
                if (!permissionUtil.hasSprintPermission(userUUID, projectId, PermissionUtil.SprintPermission.VIEW_SPRINT)) {
                    return ResponseEntity.status(403).body(ResponseDataAPI.error("Insufficient permissions to view sprint statuses"));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(400).body(ResponseDataAPI.error("Invalid user ID format"));
            }
        }
        
        List<String> statuses = sprintsService.getSprintStatuses(projectId);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(statuses));
    }
}
