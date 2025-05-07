package com.tmnhat.projectsservice.controller;

import com.tmnhat.common.config.WebConfig;
import com.tmnhat.common.payload.ResponseDataAPI;
import com.tmnhat.projectsservice.model.Projects;
import com.tmnhat.projectsservice.service.ProjectService;
import com.tmnhat.projectsservice.service.Impl.ProjectServiceImpl;
import com.tmnhat.projectsservice.validation.ProjectValidator;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Import(WebConfig.class)
@RestController
@RequestMapping("api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController() {
        this.projectService = new ProjectServiceImpl();
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchProjects(@RequestParam String keyword) {
        List<Projects> results = projectService.searchProjects(keyword);
        return ResponseEntity.ok(Map.of("data", results));
    }

    @GetMapping("/filter")
    public ResponseEntity<?> filterProjectsByType(@RequestParam String projectType) {
        List<Projects> results = projectService.filterProjectsByType(projectType);
        return ResponseEntity.ok(Map.of("data", results));
    }

    @GetMapping("/paginate")
    public ResponseEntity<?> paginateProjects(@RequestParam int page, @RequestParam int size) {
        List<Projects> results = projectService.paginateProjects(page, size);
        return ResponseEntity.ok(Map.of("data", results));
    }

    @PostMapping
    public ResponseEntity<ResponseDataAPI> addProject(@RequestBody Projects projects) {
        ProjectValidator.validateProject(projects);
        UUID projectId = projectService.addProjectReturnId(projects);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(Collections.singletonMap("id", projectId)));
    }



    @GetMapping
    public ResponseEntity<ResponseDataAPI> getAllProjects() {
        List<Projects> projectList = projectService.getAllProjects();
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(projectList));
    }

    @GetMapping("/last-inserted-id")
    public ResponseEntity<ResponseDataAPI> getLastInsertedProjectId() {
        try {
            UUID lastId = projectService.getLastInsertedProjectId();
            return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(lastId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDataAPI.error(e.getMessage()));
        }
    }



    @GetMapping("/{id:[0-9a-fA-F\\-]{36}}")
    public ResponseEntity<ResponseDataAPI> getProjectById(@PathVariable UUID id) {
        ProjectValidator.validateProjectId(id);
        Projects projects = projectService.getProjectById(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(projects));
    }

    @PatchMapping("/{id:[0-9a-fA-F\\-]{36}}")
    public ResponseEntity<ResponseDataAPI> updateProject(@PathVariable UUID id, @RequestBody Projects projects) {
        ProjectValidator.validateProjectId(id);
        ProjectValidator.validateProject(projects);
        projectService.updateProject(id, projects);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    @DeleteMapping("/{id:[0-9a-fA-F\\-]{36}}")
    public ResponseEntity<ResponseDataAPI> deleteProject(@PathVariable UUID id) {
        ProjectValidator.validateProjectId(id);
        projectService.deleteProject(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    @PatchMapping("/{id:[0-9a-fA-F\\-]{36}}/archive")
    public ResponseEntity<ResponseDataAPI> archiveProject(@PathVariable UUID id) {
        projectService.archiveProject(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }
}
