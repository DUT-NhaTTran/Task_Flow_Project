package com.tmnhat.notificationsservice.repository;

import com.tmnhat.notificationsservice.model.Notifications;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class NotificationDAO extends BaseDAO {

    // ✅ Thêm mới notification
    public void addNotification(Notifications notification) throws SQLException {
        String sql = "INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, notification.getId());
            stmt.setObject(2, notification.getUserId());
            stmt.setString(3, notification.getTitle());
            stmt.setString(4, notification.getMessage());
            stmt.setString(5, notification.getType());
            stmt.setBoolean(6, notification.getIsRead());
            stmt.setTimestamp(7, notification.getCreatedAt() != null ? Timestamp.valueOf(notification.getCreatedAt()) : null);
        });
    }

    // ✅ Lấy tất cả notification theo userId
    public List<Notifications> getNotificationsByUserId(UUID userId) throws SQLException {
        String sql = "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, userId);
            List<Notifications> list = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                list.add(mapResultSetToNotification(rs));
            }
            return list;
        });
    }

    // ✅ Lấy tất cả notification CHƯA ĐỌC theo userId
    public List<Notifications> getUnreadNotificationsByUserId(UUID userId) throws SQLException {
        String sql = "SELECT * FROM notifications WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, userId);
            List<Notifications> list = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                list.add(mapResultSetToNotification(rs));
            }
            return list;
        });
    }

    // Đánh dấu 1 notification đã đọc
    public void markAsRead(UUID id) throws SQLException {
        String sql = "UPDATE notifications SET is_read = TRUE WHERE id = ?";
        executeUpdate(sql, stmt -> stmt.setObject(1, id));
    }

    //Đánh dấu tất cả notification đã đọc theo userId
    public void markAllAsRead(UUID userId) throws SQLException {
        String sql = "UPDATE notifications SET is_read = TRUE WHERE user_id = ?";
        executeUpdate(sql, stmt -> stmt.setObject(1, userId));
    }

    // Xóa 1 notification
    public void deleteNotification(UUID id) throws SQLException {
        String sql = "DELETE FROM notifications WHERE id = ?";
        executeUpdate(sql, stmt -> stmt.setObject(1, id));
    }

    // Xóa tất cả notification theo userId
    public void deleteAllNotificationsByUserId(UUID userId) throws SQLException {
        String sql = "DELETE FROM notifications WHERE user_id = ?";
        executeUpdate(sql, stmt -> stmt.setObject(1, userId));
    }

    //Helper: Map ResultSet thành Notification Object
    private Notifications mapResultSetToNotification(ResultSet rs) throws SQLException {
        return new Notifications.Builder()
                .id(rs.getObject("id", UUID.class))
                .userId(rs.getObject("user_id", UUID.class))
                .title(rs.getString("title"))
                .message(rs.getString("message"))
                .type(rs.getString("type"))
                .isRead(rs.getBoolean("is_read"))
                .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                .build();
    }
}
