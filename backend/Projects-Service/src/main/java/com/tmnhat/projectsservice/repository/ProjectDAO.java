package com.tmnhat.projectsservice.repository;

import com.tmnhat.projectsservice.model.Projects;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;
import java.time.LocalDate;


public class ProjectDAO extends BaseDAO {

    public void addProject(Projects project) throws SQLException {
        String sql = "INSERT INTO projects (id, name, description, owner_id, deadline, created_at) VALUES (?, ?, ?, ?, ?, ?)";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, project.getId());
            stmt.setString(2, project.getName());
            stmt.setString(3, project.getDescription());
            stmt.setObject(4, project.getOwnerId());
            LocalDateTime now = LocalDateTime.now();
            stmt.setTimestamp(5, project.getDeadline() != null ? Timestamp.valueOf(project.getDeadline().atStartOfDay()) : Timestamp.valueOf(now));
            stmt.setTimestamp(6, project.getCreatedAt() != null ? Timestamp.valueOf(project.getCreatedAt()) :Timestamp.valueOf(now));
        });
    }

    public void updateProject(UUID id, Projects project) throws SQLException {
        String sql = "UPDATE projects SET name = ?, description = ?, owner_id = ?, deadline = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, project.getName());
            stmt.setString(2, project.getDescription());
            stmt.setObject(3, project.getOwnerId());
            LocalDateTime now = LocalDateTime.now();
            stmt.setTimestamp(4, project.getDeadline() != null ? Timestamp.valueOf(project.getDeadline().atStartOfDay()) : Timestamp.valueOf(now));
            stmt.setObject(5, id);
        });
    }

    public void deleteProject(UUID id) throws SQLException {
        String sql = "DELETE FROM projects WHERE id = ?";
        executeUpdate(sql, stmt -> stmt.setObject(1, id));
    }

    public Projects getProjectById(UUID id) throws SQLException {
        String sql = "SELECT * FROM projects WHERE id = ?";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, id);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToProject(rs);
            }
            return null;
        });
    }

    public List<Projects> getAllProjects() throws SQLException {
        String sql = "SELECT * FROM projects";
        return executeQuery(sql, stmt -> {
            List<Projects> projects = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                projects.add(mapResultSetToProject(rs));
            }
            return projects;
        });
    }

    private Projects mapResultSetToProject(ResultSet rs) throws SQLException {
        return new Projects.Builder()
                .id(rs.getObject("id", UUID.class))
                .name(rs.getString("name"))
                .description(rs.getString("description"))
                .ownerId(rs.getObject("owner_id", UUID.class))
                .deadline(rs.getTimestamp("deadline") != null ? rs.getTimestamp("deadline").toLocalDateTime().toLocalDate() : null) // ✅ FIX
                .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                .build();
    }
    public List<Projects> searchProjects(String keyword) throws SQLException {
        String sql = "SELECT * FROM projects WHERE name ILIKE ?";
        return executeQuery(sql, stmt -> {
            stmt.setString(1, "%" + keyword + "%");
            List<Projects> projects = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                projects.add(mapResultSetToProject(rs));
            }
            return projects;
        });
    }
    public void archiveProject(UUID projectId) throws SQLException {
        String sql = "UPDATE projects SET is_archived = TRUE WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, projectId);
        });
    }
    public List<Projects> paginateProjects(int page, int size) throws SQLException {
        int offset = (page - 1) * size;
        String sql = "SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?";
        return executeQuery(sql, stmt -> {
            stmt.setInt(1, size);
            stmt.setInt(2, offset);
            List<Projects> projects = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                projects.add(mapResultSetToProject(rs));
            }
            return projects;
        });
    }
}
