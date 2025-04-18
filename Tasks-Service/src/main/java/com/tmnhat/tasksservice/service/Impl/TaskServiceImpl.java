package com.tmnhat.tasksservice.service.Impl;


import com.tmnhat.common.exception.DatabaseException;
import com.tmnhat.common.exception.ResourceNotFoundException;
import com.tmnhat.tasksservice.model.Tasks;
import com.tmnhat.tasksservice.repository.TasksDAO;
import com.tmnhat.tasksservice.service.TaskService;
import com.tmnhat.tasksservice.validation.TaskValidator;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public class TaskServiceImpl implements TaskService {

    private final TasksDAO tasksDAO = new TasksDAO();

    @Override
    public void addTask(Tasks task) {
        try {
            TaskValidator.validateTask(task);
            tasksDAO.addTask(task);
        } catch (Exception e) {
            throw new DatabaseException("Error adding task: " + e.getMessage());
        }
    }

    @Override
    public void updateTask(UUID id, Tasks task) {
        try {
            TaskValidator.validateTaskId(id);
            TaskValidator.validateTask(task);
            Tasks existingTask = tasksDAO.getTaskById(id);
            if (existingTask == null) {
                throw new ResourceNotFoundException("Task not found with ID " + id);
            }
            tasksDAO.updateTask(id, task);
        } catch (Exception e) {
            throw new DatabaseException("Error updating task: " + e.getMessage());
        }
    }

    @Override
    public void deleteTask(UUID id) {
        try {
            TaskValidator.validateTaskId(id);
            Tasks existingTask = tasksDAO.getTaskById(id);
            if (existingTask == null) {
                throw new ResourceNotFoundException("Task not found with ID " + id);
            }
            tasksDAO.deleteTask(id);
        } catch (Exception e) {
            throw new DatabaseException("Error deleting task: " + e.getMessage());
        }
    }

    @Override
    public Tasks getTaskById(UUID id) {
        try {
            TaskValidator.validateTaskId(id);
            Tasks task = tasksDAO.getTaskById(id);
            if (task == null) {
                throw new ResourceNotFoundException("Task not found with ID " + id);
            }
            return task;
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving task: " + e.getMessage());
        }
    }

    @Override
    public List<Tasks> getAllTasks() {
        try {
            return tasksDAO.getAllTasks();
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving tasks: " + e.getMessage());
        }
    }
    @Override
    public void assignTask(UUID taskId, UUID userId) {
        try {
            Tasks task = tasksDAO.getTaskById(taskId);
            if (task == null) {
                throw new ResourceNotFoundException("Task not found with ID " + taskId);
            }
            tasksDAO.assignTask(taskId, userId);
        } catch (Exception e) {
            throw new DatabaseException("Error assigning task: " + e.getMessage());
        }
    }

    @Override
    public void changeTaskStatus(UUID taskId, String status) {
        try {
            Tasks task = tasksDAO.getTaskById(taskId);
            if (task == null) {
                throw new ResourceNotFoundException("Task not found with ID " + taskId);
            }
            tasksDAO.changeTaskStatus(taskId, status);
        } catch (Exception e) {
            throw new DatabaseException("Error changing task status: " + e.getMessage());
        }
    }

    @Override
    public void updateStoryPoint(UUID taskId, int storyPoint) {
        try {
            Tasks task = tasksDAO.getTaskById(taskId);
            if (task == null) {
                throw new ResourceNotFoundException("Task not found with ID " + taskId);
            }
            tasksDAO.updateStoryPoint(taskId, storyPoint);
        } catch (Exception e) {
            throw new DatabaseException("Error updating story point: " + e.getMessage());
        }
    }

    @Override
    public void addSubtask(UUID parentTaskId, Tasks subtask) {
        try {
            Tasks parentTask = tasksDAO.getTaskById(parentTaskId);
            if (parentTask == null) {
                throw new ResourceNotFoundException("Parent Task not found with ID " + parentTaskId);
            }
            subtask.setParentTaskId(parentTaskId);
            tasksDAO.addTask(subtask);
        } catch (Exception e) {
            throw new DatabaseException("Error adding subtask: " + e.getMessage());
        }
    }

    @Override
    public void linkTasks(UUID taskId, UUID relatedTaskId) {
        try {
            // Nếu  có bảng task_relations
            tasksDAO.linkTasks(taskId, relatedTaskId);
        } catch (Exception e) {
            throw new DatabaseException("Error linking tasks: " + e.getMessage());
        }
    }

    @Override
    public List<Tasks> filterTasks(String status, UUID assigneeId) {
        try {
            return tasksDAO.filterTasks(status, assigneeId);
        } catch (Exception e) {
            throw new DatabaseException("Error filtering tasks: " + e.getMessage());
        }
    }

    @Override
    public List<Tasks> searchTasks(String keyword) {
        try {
            return tasksDAO.searchTasks(keyword);
        } catch (Exception e) {
            throw new DatabaseException("Error searching tasks: " + e.getMessage());
        }
    }

    @Override
    public List<Tasks> getTasksBySprintId(UUID sprintId) {
        try {
            return tasksDAO.getTasksBySprintId(sprintId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving tasks by sprint: " + e.getMessage());
        }
    }

    @Override
    public List<Tasks> paginateTasks(int page, int size) {
        try {
            return tasksDAO.paginateTasks(page, size);
        } catch (Exception e) {
            throw new DatabaseException("Error paginating tasks: " + e.getMessage());
        }
    }

    @Override
    public void commentOnTask(UUID taskId, String comment) {
        try {
            // (Future) cần có bảng task_comments để lưu comment
            tasksDAO.addCommentToTask(taskId, comment);
        } catch (Exception e) {
            throw new DatabaseException("Error commenting on task: " + e.getMessage());
        }
    }

    @Override
    public void attachFileToTask(UUID taskId, MultipartFile file) {
        try {
            // (Future) cần có bảng task_attachments
            tasksDAO.attachFileToTask(taskId, file);
        } catch (Exception e) {
            throw new DatabaseException("Error attaching file to task: " + e.getMessage());
        }
    }
    // --- Member Functions ---

    @Override
    public void addMemberToTask(UUID taskId, UUID userId) {
        try {
            tasksDAO.addMemberToTask(taskId, userId);
        } catch (Exception e) {
            throw new DatabaseException("Error adding member to task: " + e.getMessage());
        }
    }

    @Override
    public void removeMemberFromTask(UUID taskId, UUID userId) {
        try {
            tasksDAO.removeMemberFromTask(taskId, userId);
        } catch (Exception e) {
            throw new DatabaseException("Error removing member from task: " + e.getMessage());
        }
    }

    @Override
    public List<UUID> getTaskMembers(UUID taskId) {
        try {
            return tasksDAO.getTaskMembers(taskId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving task members: " + e.getMessage());
        }
    }
}

