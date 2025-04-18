package com.tmnhat.accountsservice.repository;
import com.tmnhat.accountsservice.model.Accounts;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class AccountDAO extends BaseDAO {

    public void addAccount(Accounts account) throws SQLException {
        String sql = "INSERT INTO accounts (id, email, password, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, account.getId());
            stmt.setString(2, account.getEmail());
            stmt.setString(3, account.getPassword());
            stmt.setObject(4, account.getUserId());
            stmt.setTimestamp(5, account.getCreatedAt() != null ? Timestamp.valueOf(account.getCreatedAt()) : null);
            stmt.setTimestamp(6, account.getUpdatedAt() != null ? Timestamp.valueOf(account.getUpdatedAt()) : null);
        });
    }

    public void updateAccount(UUID id, Accounts account) throws SQLException {
        String sql = "UPDATE accounts SET email = ?, password = ?, user_id = ?, updated_at = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, account.getEmail());
            stmt.setString(2, account.getPassword());
            stmt.setObject(3, account.getUserId());
            stmt.setTimestamp(4, account.getUpdatedAt() != null ? Timestamp.valueOf(account.getUpdatedAt()) : null);
            stmt.setObject(5, id);
        });
    }

    public Accounts getAccountById(UUID id) throws SQLException {
        String sql = "SELECT * FROM accounts WHERE id = ?";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, id);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToAccount(rs);
            }
            return null;
        });
    }

    public Accounts getAccountByEmail(String email) throws SQLException {
        String sql = "SELECT * FROM accounts WHERE email = ?";
        return executeQuery(sql, stmt -> {
            stmt.setString(1, email);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToAccount(rs);
            }
            return null;
        });
    }

    public void deleteAccount(UUID id) throws SQLException {
        String sql = "DELETE FROM accounts WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, id);
        });
    }

    private Accounts mapResultSetToAccount(ResultSet rs) throws SQLException {
        return new Accounts.Builder()
                .id(rs.getObject("id", UUID.class))
                .email(rs.getString("email"))
                .password(rs.getString("password"))
                .userId(rs.getObject("user_id", UUID.class))
                .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                .updatedAt(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                .build();
    }
}
