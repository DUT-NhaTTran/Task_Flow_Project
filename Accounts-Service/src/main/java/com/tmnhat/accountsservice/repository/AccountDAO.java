package com.tmnhat.accountsservice.repository;

import com.tmnhat.accountsservice.model.Accounts;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public class AccountDAO extends BaseDAO {

    public Accounts addAccount(Accounts account) throws SQLException {
        String sql = """
        INSERT INTO accounts (email, password, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        RETURNING id
    """;

        return executeQuery(sql, stmt -> {
            stmt.setString(1, account.getEmail());
            stmt.setString(2, account.getPassword());
            stmt.setTimestamp(3, Timestamp.valueOf(account.getCreatedAt()));
            stmt.setTimestamp(4, Timestamp.valueOf(account.getUpdatedAt()));

            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return new Accounts.Builder()
                        .id(rs.getObject("id", UUID.class)) // ID được DB tự tạo
                        .email(account.getEmail())
                        .password(account.getPassword())
                        .createdAt(account.getCreatedAt())
                        .updatedAt(account.getUpdatedAt())
                        .build();
            }
            throw new SQLException("Failed to insert account");
        });
    }

    public void updateAccount(UUID id, Accounts account) throws SQLException {
        String sql = "UPDATE accounts SET email = ?, password = ?, user_id = ?, updated_at = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, account.getEmail());
            stmt.setString(2, account.getPassword()); // Đã được hash bởi BCrypt nếu là mật khẩu mới
            stmt.setObject(3, account.getUserId());
            stmt.setTimestamp(4, account.getUpdatedAt() != null ? Timestamp.valueOf(account.getUpdatedAt()) : null);
            stmt.setObject(5, id);
        });
    }

    public void updatePassword(UUID id, String newHashedPassword, LocalDateTime updatedAt) throws SQLException {
        String sql = "UPDATE accounts SET password = ?, updated_at = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, newHashedPassword); // Mật khẩu đã được hash bởi BCrypt
            stmt.setTimestamp(2, updatedAt != null ? Timestamp.valueOf(String.valueOf(updatedAt)) : null);
            stmt.setObject(3, id);
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

    public boolean existsByEmail(String email) throws SQLException {
        String sql = "SELECT COUNT(*) FROM accounts WHERE email = ?";
        return executeQuery(sql, stmt -> {
            stmt.setString(1, email);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return rs.getInt(1) > 0;
            }
            return false;
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

    public void linkUserIdToAccount(UUID accountId, UUID userId) throws SQLException {
        String sql = "UPDATE accounts SET user_id = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, userId);
            stmt.setObject(2, accountId);
        });
    }

}