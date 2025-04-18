package com.tmnhat.userservice.repository;

import com.tmnhat.userservice.model.Users;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class UserDAO extends BaseDAO {

    // --- CRUD cơ bản ---

    public void addUser(Users user) throws SQLException {
        String sql = "INSERT INTO users (id, name, email, role, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?)";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, user.getId());
            stmt.setString(2, user.getName());
            stmt.setString(3, user.getEmail());
            stmt.setString(4, user.getRole());
            stmt.setTimestamp(5, user.getCreatedAt() != null ? Timestamp.valueOf(user.getCreatedAt()) : null);
            stmt.setBoolean(6, true); // Mặc định thêm user là active
        });
    }

    public void updateUser(UUID id, Users user) throws SQLException {
        String sql = "UPDATE users SET name = ?, email = ?, role = ?, created_at = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, user.getName());
            stmt.setString(2, user.getEmail());
            stmt.setString(3, user.getRole());
            stmt.setTimestamp(4, user.getCreatedAt() != null ? Timestamp.valueOf(user.getCreatedAt()) : null);
            stmt.setObject(5, id);
        });
    }

    public List<Users> getAllUsers() throws SQLException {
        String sql = "SELECT * FROM users";
        return executeQuery(sql, stmt -> {
            List<Users> usersList = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                usersList.add(mapResultSetToUser(rs));
            }
            return usersList;
        });
    }

    public Users getUserById(UUID id) throws SQLException {
        String sql = "SELECT * FROM users WHERE id = ?";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, id);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToUser(rs);
            }
            return null;
        });
    }

    // --- Các chức năng mở rộng ---

    public List<Users> searchUsers(String keyword) throws SQLException {
        String sql = "SELECT * FROM users WHERE name ILIKE ? OR email ILIKE ?";
        return executeQuery(sql, stmt -> {
            String likePattern = "%" + keyword + "%";
            stmt.setString(1, likePattern);
            stmt.setString(2, likePattern);
            List<Users> users = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                users.add(mapResultSetToUser(rs));
            }
            return users;
        });
    }

    public List<Users> getUsersByProject(UUID projectId) throws SQLException {
        String sql = "SELECT u.* FROM users u " +
                "JOIN project_members pm ON u.id = pm.user_id " +
                "WHERE pm.project_id = ?";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, projectId);
            List<Users> users = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                users.add(mapResultSetToUser(rs));
            }
            return users;
        });
    }

    public void assignUserToProject(UUID projectId, UUID userId, String roleInProject) throws SQLException {
        String sql = "INSERT INTO project_members (id, project_id, user_id, role_in_project) VALUES (?, ?, ?, ?)";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, UUID.randomUUID());
            stmt.setObject(2, projectId);
            stmt.setObject(3, userId);
            stmt.setString(4, roleInProject);
        });
    }

    public void removeUserFromProject(UUID projectId, UUID userId) throws SQLException {
        String sql = "DELETE FROM project_members WHERE project_id = ? AND user_id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, projectId);
            stmt.setObject(2, userId);
        });
    }

    public String getUserRoleInProject(UUID projectId, UUID userId) throws SQLException {
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

    public void deactivateUser(UUID id) throws SQLException {
        String sql = "UPDATE users SET is_active = FALSE WHERE id = ?";
        executeUpdate(sql, stmt -> stmt.setObject(1, id));
    }

    public void activateUser(UUID id) throws SQLException {
        String sql = "UPDATE users SET is_active = TRUE WHERE id = ?";
        executeUpdate(sql, stmt -> stmt.setObject(1, id));
    }

    public List<Users> getActiveUsers() throws SQLException {
        String sql = "SELECT * FROM users WHERE is_active = TRUE";
        return executeQuery(sql, stmt -> {
            List<Users> activeUsers = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                activeUsers.add(mapResultSetToUser(rs));
            }
            return activeUsers;
        });
    }

    public void updateUserRole(UUID id, String newRole) throws SQLException {
        String sql = "UPDATE users SET role = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, newRole);
            stmt.setObject(2, id);
        });
    }
    private Users mapResultSetToUser(ResultSet rs) throws SQLException {
        return new Users.Builder()
                .id(rs.getObject("id", UUID.class))
                .name(rs.getString("name"))
                .email(rs.getString("email"))
                .role(rs.getString("role"))
                .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                .build();
    }
}
