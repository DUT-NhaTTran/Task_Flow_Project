package com.tmnhat.projectsservice.controller;
import com.tmnhat.common.payload.ResponseDataAPI;
import com.tmnhat.projectsservice.model.Projects;
import com.tmnhat.projectsservice.service.ProjectService;
import com.tmnhat.projectsservice.service.Impl.ProjectServiceImpl;
import com.tmnhat.projectsservice.validation.ProjectValidator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController() {
        this.projectService = new ProjectServiceImpl();
    }

    //Thêm project mới
    @PostMapping
    public ResponseEntity<ResponseDataAPI> addProject(@RequestBody Projects projects) {
        ProjectValidator.validateProject(projects);
        projectService.addProject(projects);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Lấy danh sách tất cả project
    @GetMapping
    public ResponseEntity<ResponseDataAPI> getAllProjects() {
        List<Projects> projectList = projectService.getAllProjects();
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(projectList));
    }

    //Lấy thông tin 1 project theo ID
    @GetMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> getProjectById(@PathVariable("id") UUID id) {
        ProjectValidator.validateProjectId(id);
        Projects projects = projectService.getProjectById(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(projects));
    }

    //Cập nhật thông tin project
    @PatchMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> updateProject(@PathVariable("id") UUID id, @RequestBody Projects projects) {
        ProjectValidator.validateProjectId(id);
        ProjectValidator.validateProject(projects);
        projectService.updateProject(id, projects);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    //Xóa project theo ID
    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> deleteProject(@PathVariable("id") UUID id) {
        ProjectValidator.validateProjectId(id);
        projectService.deleteProject(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }
}
