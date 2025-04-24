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
    public void assignMember(UUID projectId, UUID userId, String roleInProject) throws SQLException {
        String sql = "INSERT INTO project_members (id, project_id, user_id, role_in_project) VALUES (?, ?, ?, ?)";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, UUID.randomUUID());
            stmt.setObject(2, projectId);
            stmt.setObject(3, userId);
            stmt.setString(4, roleInProject);
        });
    }

    public void removeMember(UUID projectId, UUID userId) throws SQLException {
        String sql = "DELETE FROM project_members WHERE project_id = ? AND user_id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, projectId);
            stmt.setObject(2, userId);
        });
    }

    public void changeProjectOwner(UUID projectId, UUID newOwnerId) throws SQLException {
        String sql = "UPDATE projects SET owner_id = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, newOwnerId);
            stmt.setObject(2, projectId);
        });
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

    public List<Projects> filterProjectsByStatus(String status) throws SQLException {
        boolean isArchived = "archived".equalsIgnoreCase(status);
        String sql = "SELECT * FROM projects WHERE is_archived = ?";
        return executeQuery(sql, stmt -> {
            stmt.setBoolean(1, isArchived);
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

    public void favoriteProject(UUID projectId, UUID userId) throws SQLException {
        String sql = "INSERT INTO project_favorites (id, project_id, user_id) VALUES (?, ?, ?)";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, UUID.randomUUID());
            stmt.setObject(2, projectId);
            stmt.setObject(3, userId);
        });
    }
    public boolean isProjectLead(UUID projectId, UUID userId) throws SQLException {
        String sql = "SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? AND role_in_project = 'PROJECT_LEAD'";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, projectId);
            stmt.setObject(2, userId);
            ResultSet rs = stmt.executeQuery();
            return rs.next(); // Nếu có dòng nào => đúng là LEAD
        });
    }
    public void updateMemberRole(UUID projectId, UUID userId, String newRole, UUID requesterId) throws SQLException {
        if (!isProjectLead(projectId, requesterId)) {
            throw new SecurityException("Only project leader can update roles");
        }

        String sql = "UPDATE project_members SET role_in_project = ? WHERE project_id = ? AND user_id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, newRole);
            stmt.setObject(2, projectId);
            stmt.setObject(3, userId);
        });
    }

}
