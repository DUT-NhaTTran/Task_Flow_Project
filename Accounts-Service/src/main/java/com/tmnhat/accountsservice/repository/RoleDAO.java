package com.tmnhat.accountsservice.repository;

import com.tmnhat.accountsservice.model.Role;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

@Repository
public class RoleDAO extends BaseDAO {

    public void addRole(Role role) throws SQLException {
        String sql = "INSERT INTO roles (name) VALUES (?)";
        executeUpdate(sql, stmt -> stmt.setString(1, role.getName()));
    }

    public void updateRole(int id, Role role) throws SQLException {
        String sql = "UPDATE roles SET name = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, role.getName());
            stmt.setInt(2, id);
        });
    }

    public Role getRoleById(int id) throws SQLException {
        String sql = "SELECT * FROM roles WHERE id = ?";
        return executeQuery(sql, stmt -> {
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToRole(rs);
            }
            return null;
        });
    }

    public Role getRoleByName(String name) throws SQLException {
        String sql = "SELECT * FROM roles WHERE name = ?";
        return executeQuery(sql, stmt -> {
            stmt.setString(1, name);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToRole(rs);
            }
            return null;
        });
    }

    public List<Role> getAllRoles() throws SQLException {
        String sql = "SELECT * FROM roles";
        return executeQuery(sql, stmt -> {
            ResultSet rs = stmt.executeQuery();
            List<Role> roles = new ArrayList<>();
            while (rs.next()) {
                roles.add(mapResultSetToRole(rs));
            }
            return roles;
        });
    }

    public void deleteRole(int id) throws SQLException {
        String sql = "DELETE FROM roles WHERE id = ?";
        executeUpdate(sql, stmt -> stmt.setInt(1, id));
    }

    public boolean existsByName(String name) throws SQLException {
        String sql = "SELECT COUNT(*) FROM roles WHERE name = ?";
        return executeQuery(sql, stmt -> {
            stmt.setString(1, name);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return rs.getInt(1) > 0;
            }
            return false;
        });
    }

    private Role mapResultSetToRole(ResultSet rs) throws SQLException {
        Role role = new Role();
        role.setId(rs.getInt("id"));
        role.setName(rs.getString("name"));
        return role;
    }
}
