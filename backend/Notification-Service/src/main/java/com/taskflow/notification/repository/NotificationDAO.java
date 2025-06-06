package com.taskflow.notification.repository;

import com.taskflow.notification.model.Notification;
import com.taskflow.notification.payload.enums.NotificationType;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class NotificationDAO extends BaseDAO {

    private static final String INSERT_SQL = """
        INSERT INTO notifications (type, title, message, recipient_user_id, actor_user_id, 
                                 actor_user_name, actor_user_avatar, project_id, project_name, 
                                 task_id, sprint_id, comment_id, action_url, is_read, created_at, read_at)
        VALUES (?::notification_type, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
        """;

    private static final String UPDATE_SQL = """
        UPDATE notifications SET type = ?::notification_type, title = ?, message = ?, 
                               recipient_user_id = ?, actor_user_id = ?, actor_user_name = ?, 
                               actor_user_avatar = ?, project_id = ?, project_name = ?, 
                               task_id = ?, sprint_id = ?, comment_id = ?, 
                               action_url = ?, is_read = ?, read_at = ? 
        WHERE id = ?
        """;

    private static final String SELECT_ALL_SQL = """
        SELECT id, type, title, message, recipient_user_id, actor_user_id, actor_user_name, 
               actor_user_avatar, project_id, project_name, task_id, sprint_id, 
               comment_id, action_url, is_read, created_at, read_at 
        FROM notifications
        """;

    private final RowMapper<Notification> notificationRowMapper = new NotificationRowMapper();

    public Notification save(Notification notification) {
        notification.setCreationTime();
        
        if (notification.getId() != null && existsById(notification.getId())) {
            // Update existing notification
            executeUpdate(UPDATE_SQL,
                notification.getType().name(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getRecipientUserId(),
                notification.getActorUserId(),
                notification.getActorUserName(),
                notification.getActorUserAvatar(),
                notification.getProjectId(),
                notification.getProjectName(),
                notification.getTaskId(),
                notification.getSprintId(),
                notification.getCommentId(),
                notification.getActionUrl(),
                notification.getIsRead(),
                notification.getReadAt(),
                notification.getId()
            );
        } else {
            // Insert new notification and get generated ID
            Long generatedId = jdbcTemplate.queryForObject(INSERT_SQL, Long.class,
                notification.getType().name(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getRecipientUserId(),
                notification.getActorUserId(),
                notification.getActorUserName(),
                notification.getActorUserAvatar(),
                notification.getProjectId(),
                notification.getProjectName(),
                notification.getTaskId(),
                notification.getSprintId(),
                notification.getCommentId(),
                notification.getActionUrl(),
                notification.getIsRead(),
                notification.getCreatedAt(),
                notification.getReadAt()
            );
            notification.setId(generatedId);
        }
        return notification;
    }

    public Optional<Notification> findById(Long id) {
        String sql = SELECT_ALL_SQL + " WHERE id = ?";
        return queryForObject(sql, notificationRowMapper, id);
    }

    public List<Notification> findAll() {
        return queryForList(SELECT_ALL_SQL + " ORDER BY created_at DESC", notificationRowMapper);
    }

    public void deleteById(Long id) {
        executeUpdate("DELETE FROM notifications WHERE id = ?", id);
    }

    public boolean existsById(Long id) {
        return exists("SELECT COUNT(*) FROM notifications WHERE id = ?", id);
    }

    public List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(String recipientUserId) {
        String sql = """
            SELECT * FROM notifications 
            WHERE recipient_user_id = ? 
            ORDER BY created_at DESC, id DESC
            """;
        
        System.out.println("DAO: Executing query for user: " + recipientUserId);
        List<Notification> results = queryForList(sql, notificationRowMapper, recipientUserId);
        System.out.println("DAO: Query returned " + results.size() + " results");
        
        return results;
    }

    public List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(String recipientUserId, int limit, int offset) {
        String sql = """
            SELECT * FROM notifications 
            WHERE recipient_user_id = ? 
            ORDER BY id DESC, created_at DESC 
            LIMIT ? OFFSET ?
            """;
        return queryForList(sql, notificationRowMapper, recipientUserId, limit, offset);
    }

    public List<Notification> findByRecipientUserIdAndIsReadFalseOrderByCreatedAtDesc(String recipientUserId) {
        String sql = """
            SELECT * FROM notifications 
            WHERE recipient_user_id = ? 
            AND is_read = false 
            ORDER BY id DESC, created_at DESC
            """;
        return queryForList(sql, notificationRowMapper, recipientUserId);
    }

    public long countByRecipientUserIdAndIsReadFalse(String recipientUserId) {
        return queryForLong("SELECT COUNT(*) FROM notifications WHERE recipient_user_id = ? AND is_read = false", recipientUserId);
    }

    public List<Notification> findByProjectIdOrderByCreatedAtDesc(String projectId) {
        String sql = SELECT_ALL_SQL + " WHERE project_id = ? ORDER BY created_at DESC";
        return queryForList(sql, notificationRowMapper, projectId);
    }

    public List<Notification> findByTaskIdOrderByCreatedAtDesc(String taskId) {
        String sql = SELECT_ALL_SQL + " WHERE task_id = ? ORDER BY created_at DESC";
        return queryForList(sql, notificationRowMapper, taskId);
    }

    public int markAllAsReadByUserId(String userId, LocalDateTime readAt) {
        return queryForInt("UPDATE notifications SET is_read = true, read_at = ? WHERE recipient_user_id = ? AND is_read = false",
            readAt, userId);
    }

    public int deleteOldReadNotifications(LocalDateTime cutoffDate) {
        return queryForInt("DELETE FROM notifications WHERE is_read = true AND created_at < ?", cutoffDate);
    }

    public List<Notification> findByCriteria(String userId, Boolean isRead, String projectId, int limit, int offset) {
        StringBuilder sql = new StringBuilder(SELECT_ALL_SQL + " WHERE recipient_user_id = ?");
        
        if (isRead != null) {
            sql.append(" AND is_read = ").append(isRead);
        }
        if (projectId != null && !projectId.isEmpty()) {
            sql.append(" AND project_id = '").append(projectId).append("'");
        }
        
        sql.append(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
        
        return queryForList(sql.toString(), notificationRowMapper, userId, limit, offset);
    }

    public List<Notification> findRecentNotifications(String userId, LocalDateTime since) {
        String sql = SELECT_ALL_SQL + " WHERE recipient_user_id = ? AND created_at >= ? ORDER BY created_at DESC";
        return queryForList(sql, notificationRowMapper, userId, since);
    }

    public boolean existsSimilarNotification(String userId, String actorUserId, 
                                           NotificationType type, String taskId, LocalDateTime since) {
        String sql = """
            SELECT COUNT(*) FROM notifications 
            WHERE recipient_user_id = ? AND actor_user_id = ? AND type = ?::notification_type 
            AND task_id = ? AND created_at > ?
            """;
        
        return exists(sql, userId, actorUserId, type.name(), taskId, since);
    }

    // RowMapper implementation
    private static class NotificationRowMapper implements RowMapper<Notification> {
        @Override
        public Notification mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new Notification.Builder()
                .id(rs.getLong("id"))
                .type(NotificationType.valueOf(rs.getString("type")))
                .title(rs.getString("title"))
                .message(rs.getString("message"))
                .recipientUserId(rs.getString("recipient_user_id"))
                .actorUserId(rs.getString("actor_user_id"))
                .actorUserName(rs.getString("actor_user_name"))
                .actorUserAvatar(rs.getString("actor_user_avatar"))
                .projectId(rs.getString("project_id"))
                .projectName(rs.getString("project_name"))
                .taskId(rs.getString("task_id"))
                .sprintId(rs.getString("sprint_id"))
                .commentId(rs.getString("comment_id"))
                .actionUrl(rs.getString("action_url"))
                .isRead(rs.getBoolean("is_read"))
                .createdAt(getLocalDateTime(rs, "created_at"))
                .readAt(getLocalDateTime(rs, "read_at"))
                .build();
        }

        private LocalDateTime getLocalDateTime(ResultSet rs, String columnName) throws SQLException {
            Timestamp timestamp = rs.getTimestamp(columnName);
            return timestamp != null ? timestamp.toLocalDateTime() : null;
        }
    }
} 