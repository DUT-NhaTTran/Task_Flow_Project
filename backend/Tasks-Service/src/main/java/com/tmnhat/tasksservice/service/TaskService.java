package com.tmnhat.tasksservice.service;


import com.tmnhat.tasksservice.model.Tasks;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface TaskService {
    void addTask(Tasks task);
    void updateTask(UUID id, Tasks task);
    void deleteTask(UUID id);
    Tasks getTaskById(UUID id);
    List<Tasks> getAllTasks();
    void assignTask(UUID taskId, UUID userId);
    void changeTaskStatus(UUID taskId, String status);
    void updateStoryPoint(UUID taskId, int storyPoint);
    void addSubtask(UUID parentTaskId, Tasks subtask);
    void linkTasks(UUID taskId, UUID relatedTaskId);
    List<Tasks> filterTasks(String status, UUID assigneeId);
    List<Tasks> searchTasks(String keyword) ;
    List<Tasks> paginateTasks(int page, int size);
    void commentOnTask(UUID taskId, String comment);
    void attachFileToTask(UUID taskId, MultipartFile file);
    List<Tasks> getTasksBySprintId(UUID sprintId);
    List<Tasks> getTasksByProjectId(UUID projectId);
    List<Tasks> getTasksByStatusAndProjectAndSprint(String status, UUID projectId, UUID sprintId);

    //Members
    void addMemberToTask(UUID taskId, UUID userId);
    void removeMemberFromTask(UUID taskId, UUID userId);
    List<UUID> getTaskMembers(UUID taskId);
    }