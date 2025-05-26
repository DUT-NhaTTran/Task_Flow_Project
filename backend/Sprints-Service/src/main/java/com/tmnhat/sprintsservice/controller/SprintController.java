package com.tmnhat.sprintsservice.controller;

import com.tmnhat.common.config.WebConfig;
import com.tmnhat.common.payload.ResponseDataAPI;
import com.tmnhat.sprintsservice.model.Sprints;
import com.tmnhat.sprintsservice.service.Impl.SprintServiceImpl;
import com.tmnhat.sprintsservice.service.SprintService;
import com.tmnhat.sprintsservice.validation.SprintValidator;
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

    public SprintController() {
        this.sprintsService = new SprintServiceImpl();
    }

    @PostMapping
    public ResponseEntity<ResponseDataAPI> addSprint(@RequestBody Sprints sprint) {
        SprintValidator.validateSprint(sprint);
        sprintsService.addSprint(sprint);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    @GetMapping
    public ResponseEntity<ResponseDataAPI> getAllSprints() {
        List<Sprints> sprintList = sprintsService.getAllSprints();
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(sprintList));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> getSprintById(@PathVariable("id") UUID id) {
        SprintValidator.validateSprintId(id);
        Sprints sprint = sprintsService.getSprintById(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(sprint));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> updateSprint(@PathVariable("id") UUID id, @RequestBody Sprints sprint) {
        SprintValidator.validateSprintId(id);
        SprintValidator.validateSprint(sprint);
        sprintsService.updateSprint(id, sprint);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> deleteSprint(@PathVariable("id") UUID id) {
        SprintValidator.validateSprintId(id);
        sprintsService.deleteSprint(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }
    
    @PostMapping("/{id}/start")
    public ResponseEntity<ResponseDataAPI> startSprint(@PathVariable("id") UUID id) {
        SprintValidator.validateSprintId(id);
        sprintsService.startSprint(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }
    
    @PostMapping("/{id}/complete")
    public ResponseEntity<ResponseDataAPI> completeSprint(@PathVariable("id") UUID id) {
        SprintValidator.validateSprintId(id);
        sprintsService.completeSprint(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }
    
    @GetMapping("/project/{projectId}/last")
    public ResponseEntity<?> getLastSprintOfProject(@PathVariable UUID projectId) throws SQLException {
        Sprints sprint = sprintsService.getLastSprintOfProject(projectId);
        if (sprint == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No sprint found");
        }
        return ResponseEntity.ok(sprint);
    }
    
    @GetMapping("/project/{projectId}/active")
    public ResponseEntity<?> getActiveSprintByProject(@PathVariable UUID projectId) throws SQLException {
        Sprints sprint = sprintsService.getActiveSprint(projectId);
        if (sprint == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No active sprint found");
        }
        return ResponseEntity.ok(sprint);
    }
    
    @GetMapping("/project/{projectId}")
    public ResponseEntity<?> getSprintsByProject(@PathVariable UUID projectId) throws SQLException {
        List<Sprints> list = sprintsService.getSprintsByProject(projectId);
        return ResponseEntity.ok(Map.of("data", list));
    }
}
