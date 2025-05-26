package com.tmnhat.tasksservice.controller;

import com.tmnhat.common.config.WebConfig;
import com.tmnhat.common.payload.ResponseDataAPI;
import com.tmnhat.tasksservice.model.Tasks;
import com.tmnhat.tasksservice.service.TaskService;
import com.tmnhat.tasksservice.service.Impl.TaskServiceImpl;
import com.tmnhat.tasksservice.validation.TaskValidator;
import com.tmnhat.common.exception.BadRequestException;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
@Import(WebConfig.class)

@RestController
@RequestMapping("api/tasks")
public class TasksController {

    private final TaskService taskService;

    public TasksController() {
        this.taskService = new TaskServiceImpl();
    }

    // Add task
    @PostMapping
    public ResponseEntity<ResponseDataAPI> addTask(@RequestBody Tasks task) {
        TaskValidator.validateTask(task);
        taskService.addTask(task);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Update task
    @PutMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> updateTask(@PathVariable UUID id, @RequestBody Tasks task) {
        TaskValidator.validateTaskId(id);
        TaskValidator.validateTask(task);
        taskService.updateTask(id, task);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Delete task
    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> deleteTask(@PathVariable UUID id) {
        TaskValidator.validateTaskId(id);
        taskService.deleteTask(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    @GetMapping("/get-by-id/{id}")
    public ResponseEntity<ResponseDataAPI> getTaskById(@PathVariable UUID id) {
        TaskValidator.validateTaskId(id);
        Tasks task = taskService.getTaskById(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(task));
    }
    @GetMapping("/filter_details")
    public ResponseEntity<ResponseDataAPI> getTasksByStatusProjectSprint(
            @RequestParam String status,
            @RequestParam UUID projectId,
            @RequestParam UUID sprintId) {
            List<Tasks> tasks = taskService.getTasksByStatusAndProjectAndSprint(status, projectId, sprintId);
            return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(tasks));
    }
    // Get all tasks
    @GetMapping
    public ResponseEntity<ResponseDataAPI> getAllTasks() {
        List<Tasks> tasks = taskService.getAllTasks();
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(tasks));
    }

    // Assign task
    @PatchMapping("/{taskId}/assign")
    public ResponseEntity<ResponseDataAPI> assignTask(@PathVariable UUID taskId, @RequestParam UUID userId) {
        TaskValidator.validateTaskId(taskId);
        TaskValidator.validateUserId(userId);
        taskService.assignTask(taskId, userId);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Change task status
    @PatchMapping("/{taskId}/status")
    public ResponseEntity<ResponseDataAPI> changeTaskStatus(@PathVariable UUID taskId, @RequestParam String status) {
        TaskValidator.validateTaskId(taskId);
        if (status == null || status.isBlank()) {
            throw new BadRequestException("Status cannot be empty");
        }
        taskService.changeTaskStatus(taskId, status);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Update story point
    @PatchMapping("/{taskId}/story-point")
    public ResponseEntity<ResponseDataAPI> updateStoryPoint(@PathVariable UUID taskId, @RequestParam int storyPoint) {
        TaskValidator.validateTaskId(taskId);
        taskService.updateStoryPoint(taskId, storyPoint);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Add subtask
    @PostMapping("/{parentTaskId}/subtasks")
    public ResponseEntity<ResponseDataAPI> addSubtask(@PathVariable UUID parentTaskId, @RequestBody Tasks subtask) {
        TaskValidator.validateTaskId(parentTaskId);
        TaskValidator.validateTask(subtask);
        taskService.addSubtask(parentTaskId, subtask);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Link tasks
    @PostMapping("/{taskId}/link/{relatedTaskId}")
    public ResponseEntity<ResponseDataAPI> linkTasks(@PathVariable UUID taskId, @PathVariable UUID relatedTaskId) {
        TaskValidator.validateTaskId(taskId);
        TaskValidator.validateTaskId(relatedTaskId);
        taskService.linkTasks(taskId, relatedTaskId);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Filter tasks
    @GetMapping("/filter")
    public ResponseEntity<ResponseDataAPI> filterTasks(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID assigneeId) {
        List<Tasks> tasks = taskService.filterTasks(status, assigneeId);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(tasks));
    }

    // Search tasks
    @GetMapping("/search")
    public ResponseEntity<ResponseDataAPI> searchTasks(@RequestParam String keyword) {
        if (keyword == null || keyword.isBlank()) {
            throw new BadRequestException("Keyword cannot be empty");
        }
        List<Tasks> tasks = taskService.searchTasks(keyword);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(tasks));
    }

    // Get tasks by sprint ID
    @GetMapping("/sprint/{sprintId}")
    public ResponseEntity<ResponseDataAPI> getTasksBySprint(@PathVariable UUID sprintId) {
        TaskValidator.validateSprintId(sprintId);
        List<Tasks> tasks = taskService.getTasksBySprintId(sprintId);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(tasks));
    }

    // Paginate tasks
    @GetMapping("/paginate")
    public ResponseEntity<ResponseDataAPI> paginateTasks(
            @RequestParam int page,
            @RequestParam int size) {
        List<Tasks> tasks = taskService.paginateTasks(page, size);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(tasks));
    }

    // Comment on task
    @PostMapping("/{taskId}/comment")
    public ResponseEntity<ResponseDataAPI> commentOnTask(@PathVariable UUID taskId, @RequestParam String comment) {
        TaskValidator.validateTaskId(taskId);
        if (comment == null || comment.isBlank()) {
            throw new BadRequestException("Comment cannot be empty");
        }
        taskService.commentOnTask(taskId, comment);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Attach file to task
    @PostMapping("/{taskId}/attachment")
    public ResponseEntity<ResponseDataAPI> attachFileToTask(
            @PathVariable UUID taskId,
            @RequestParam MultipartFile file) {
        TaskValidator.validateTaskId(taskId);
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File cannot be empty");
        }
        taskService.attachFileToTask(taskId, file);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Add member to task
    @PostMapping("/{taskId}/members")
    public ResponseEntity<ResponseDataAPI> addMemberToTask(
            @PathVariable UUID taskId,
            @RequestParam UUID userId) {
        TaskValidator.validateTaskId(taskId);
        TaskValidator.validateUserId(userId);
        taskService.addMemberToTask(taskId, userId);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    //  Remove member from task
    @DeleteMapping("/{taskId}/members/{userId}")
    public ResponseEntity<ResponseDataAPI> removeMemberFromTask(
            @PathVariable UUID taskId,
            @PathVariable UUID userId) {
        TaskValidator.validateTaskId(taskId);
        TaskValidator.validateUserId(userId);
        taskService.removeMemberFromTask(taskId, userId);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Get task members
    @GetMapping("/{taskId}/members")
    public ResponseEntity<ResponseDataAPI> getTaskMembers(@PathVariable UUID taskId) {
        TaskValidator.validateTaskId(taskId);
        List<UUID> members = taskService.getTaskMembers(taskId);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(members));
    }
    @GetMapping("/project/{projectId}")
    public List<Tasks> getTasksByProjectId(@PathVariable UUID projectId) {
        return taskService.getTasksByProjectId(projectId);
    }
}
