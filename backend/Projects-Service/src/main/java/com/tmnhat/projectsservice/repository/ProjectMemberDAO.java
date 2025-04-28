package com.tmnhat.projectsservice.repository;

import com.tmnhat.projectsservice.mapper.ProjectMapper;
import com.tmnhat.projectsservice.model.Projects;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ProjectMemberDAO extends BaseDAO{
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



    public List<Projects> filterProjectsByStatus(String status) throws SQLException {
        boolean isArchived = "archived".equalsIgnoreCase(status);
        String sql = "SELECT * FROM projects WHERE is_archived = ?";
        return executeQuery(sql, stmt -> {
            stmt.setBoolean(1, isArchived);
            List<Projects> projects = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                projects.add(ProjectMapper.mapResultSetToProject(rs));  // Dùng mapper riêng
            }
            return projects;
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
    public String getRoleInProject(UUID projectId, UUID userId) throws SQLException {
        String sql = "SELECT role_in_project FROM project_members WHERE project_id = ? AND user_id = ?";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, projectId);
            stmt.setObject(2, userId);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return rs.getString("role_in_project");
            }
            return null;
        });
    }
}
