package com.tmnhat.tasksservice.repository;

import com.tmnhat.tasksservice.model.Tasks;
import com.tmnhat.tasksservice.payload.enums.TaskStatus;
import org.springframework.web.multipart.MultipartFile;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class TasksDAO extends BaseDAO {

    // --- CRUD cơ bản ---
    public void addTask(Tasks task) throws SQLException {
        String sql = "INSERT INTO tasks (id, sprint_id, title, description, status, story_point, assignee_id, due_date, created_at, completed_at, parent_task_id) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, task.getId());
            stmt.setObject(2, task.getSprintId());
            stmt.setString(3, task.getTitle());
            stmt.setString(4, task.getDescription());
            stmt.setString(1, task.getStatus().name());
            stmt.setInt(6, task.getStoryPoint());
            stmt.setObject(7, task.getAssigneeId());
            stmt.setTimestamp(8, task.getDueDate() != null ? Timestamp.valueOf(task.getDueDate().atStartOfDay()) : null);
            stmt.setTimestamp(9, task.getCreatedAt() != null ? Timestamp.valueOf(task.getCreatedAt()) : null);
            stmt.setTimestamp(10, task.getCompletedAt() != null ? Timestamp.valueOf(task.getCompletedAt()) : null);
            stmt.setObject(11, task.getParentTaskId());
        });
    }

    public void updateTask(UUID id, Tasks task) throws SQLException {
        String sql = "UPDATE tasks SET title = ?, description = ?, status = ?, story_point = ?, assignee_id = ?, due_date = ?, completed_at = ?, parent_task_id = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, task.getTitle());
            stmt.setString(2, task.getDescription());
            stmt.setString(1, task.getStatus().name());
            stmt.setInt(4, task.getStoryPoint());
            stmt.setObject(5, task.getAssigneeId());
            stmt.setTimestamp(6, task.getDueDate() != null ? Timestamp.valueOf(task.getDueDate().atStartOfDay()) : null);
            stmt.setTimestamp(7, task.getCompletedAt() != null ? Timestamp.valueOf(task.getCompletedAt()) : null);
            stmt.setObject(8, task.getParentTaskId());
            stmt.setObject(9, id);
        });
    }

    public void deleteTask(UUID id) throws SQLException {
        String sql = "DELETE FROM tasks WHERE id = ?";
        executeUpdate(sql, stmt -> stmt.setObject(1, id));
    }

    public Tasks getTaskById(UUID id) throws SQLException {
        String sql = "SELECT * FROM tasks WHERE id = ?";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, id);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToTask(rs);
            }
            return null;
        });
    }

    public List<Tasks> getAllTasks() throws SQLException {
        String sql = "SELECT * FROM tasks";
        return executeQuery(sql, stmt -> {
            List<Tasks> tasks = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                tasks.add(mapResultSetToTask(rs));
            }
            return tasks;
        });
    }

    // --- Các hàm khác ---

    public void assignTask(UUID taskId, UUID userId) throws SQLException {
        String sql = "UPDATE tasks SET assignee_id = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, userId);
            stmt.setObject(2, taskId);
        });
    }

    public void changeTaskStatus(UUID taskId, String status) throws SQLException {
        String sql = "UPDATE tasks SET status = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, status);
            stmt.setObject(2, taskId);
        });
    }

    public void updateStoryPoint(UUID taskId, int storyPoint) throws SQLException {
        String sql = "UPDATE tasks SET story_point = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setInt(1, storyPoint);
            stmt.setObject(2, taskId);
        });
    }

    public void linkTasks(UUID taskId, UUID relatedTaskId) throws SQLException {
        // Giả sử bạn có bảng task_links (task_id, related_task_id)
        String sql = "INSERT INTO task_links (task_id, related_task_id) VALUES (?, ?)";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, taskId);
            stmt.setObject(2, relatedTaskId);
        });
    }

    public List<Tasks> filterTasks(String status, UUID assigneeId) throws SQLException {
        String sql = "SELECT * FROM tasks WHERE status = ? AND assignee_id = ?";
        return executeQuery(sql, stmt -> {
            stmt.setString(1, status);
            stmt.setObject(2, assigneeId);
            List<Tasks> tasks = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                tasks.add(mapResultSetToTask(rs));
            }
            return tasks;
        });
    }

    public List<Tasks> searchTasks(String keyword) throws SQLException {
        String sql = "SELECT * FROM tasks WHERE title ILIKE ?";
        return executeQuery(sql, stmt -> {
            stmt.setString(1, "%" + keyword + "%");
            List<Tasks> tasks = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                tasks.add(mapResultSetToTask(rs));
            }
            return tasks;
        });
    }

    public List<Tasks> getTasksBySprintId(UUID sprintId) throws SQLException {
        String sql = "SELECT * FROM tasks WHERE sprint_id = ?";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, sprintId);
            List<Tasks> tasks = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                tasks.add(mapResultSetToTask(rs));
            }
            return tasks;
        });
    }

    public List<Tasks> paginateTasks(int page, int size) throws SQLException {
        int offset = (page - 1) * size;
        String sql = "SELECT * FROM tasks ORDER BY created_at DESC LIMIT ? OFFSET ?";
        return executeQuery(sql, stmt -> {
            stmt.setInt(1, size);
            stmt.setInt(2, offset);
            List<Tasks> tasks = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                tasks.add(mapResultSetToTask(rs));
            }
            return tasks;
        });
    }

    public void addCommentToTask(UUID taskId, String comment) throws SQLException {
        // (Future) Cần bảng task_comments (id, task_id, content, created_at)
        String sql = "INSERT INTO task_comments (id, task_id, content, created_at) VALUES (?, ?, ?, now())";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, UUID.randomUUID());
            stmt.setObject(2, taskId);
            stmt.setString(3, comment);
        });
    }

    public void attachFileToTask(UUID taskId, MultipartFile file) throws SQLException {
        // (Future) Cần bảng task_attachments (id, task_id, filename, file_data, uploaded_at)
        String sql = "INSERT INTO task_attachments (id, task_id, filename, uploaded_at) VALUES (?, ?, ?, now())";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, UUID.randomUUID());
            stmt.setObject(2, taskId);
            stmt.setString(3, file.getOriginalFilename());
            // file_data có thể upload vào S3 hoặc file server khác
        });
    }
    // --- Task Members ---

    public void addMemberToTask(UUID taskId, UUID userId) throws SQLException {
        String sql = "INSERT INTO task_members (id, task_id, user_id, role_in_task, created_at) VALUES (?, ?, ?, ?, now())";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, UUID.randomUUID());
            stmt.setObject(2, taskId);
            stmt.setObject(3, userId);
            stmt.setString(4, "member"); // default role
        });
    }

    public void removeMemberFromTask(UUID taskId, UUID userId) throws SQLException {
        String sql = "DELETE FROM task_members WHERE task_id = ? AND user_id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, taskId);
            stmt.setObject(2, userId);
        });
    }

    public List<UUID> getTaskMembers(UUID taskId) throws SQLException {
        String sql = "SELECT user_id FROM task_members WHERE task_id = ?";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, taskId);
            List<UUID> members = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                members.add(rs.getObject("user_id", UUID.class));
            }
            return members;
        });
    }
    // --- Helper: mapping ResultSet -> Tasks object ---
    private Tasks mapResultSetToTask(ResultSet rs) throws SQLException {
        return new Tasks.Builder()
                .id(rs.getObject("id", UUID.class))
                .sprintId(rs.getObject("sprint_id", UUID.class))
                .projectId(rs.getObject("project_id", UUID.class))  // (Nếu có project_id)
                .title(rs.getString("title"))
                .description(rs.getString("description"))
                .status(TaskStatus.valueOf(rs.getString("status")))  //Fix chỗ này
                .storyPoint(rs.getInt("story_point"))
                .assigneeId(rs.getObject("assignee_id", UUID.class))
                .dueDate(rs.getTimestamp("due_date") != null ? rs.getTimestamp("due_date").toLocalDateTime().toLocalDate() : null)
                .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                .completedAt(rs.getTimestamp("completed_at") != null ? rs.getTimestamp("completed_at").toLocalDateTime() : null)
                .parentTaskId(rs.getObject("parent_task_id", UUID.class))
                .tags(null)
                .build();
    }

}
