package com.tmnhat.tasksservice.repository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import com.tmnhat.tasksservice.model.Comment;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class CommentRepository {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    // Row mapper for Comment
    private final RowMapper<Comment> commentRowMapper = new RowMapper<Comment>() {
        @Override
        public Comment mapRow(ResultSet rs, int rowNum) throws SQLException {
            Comment comment = new Comment();
            comment.setId(rs.getLong("id"));
            comment.setTaskId(rs.getString("task_id"));
            comment.setUserId(rs.getString("user_id"));
            comment.setContent(rs.getString("content"));
            
            Timestamp createdAt = rs.getTimestamp("created_at");
            if (createdAt != null) {
                comment.setCreatedAt(createdAt.toLocalDateTime());
            }
            
            Timestamp updatedAt = rs.getTimestamp("updated_at");
            if (updatedAt != null) {
                comment.setUpdatedAt(updatedAt.toLocalDateTime());
            }
            
            comment.setParentCommentId(rs.getObject("parent_comment_id", Long.class));
            comment.setIsDeleted(rs.getBoolean("is_deleted"));
            
            return comment;
        }
    };
    
    // Find all comments for a specific task (not deleted)
    public List<Comment> findByTaskIdAndNotDeleted(String taskId) {
        String sql = "SELECT * FROM comments WHERE task_id = ? AND is_deleted = false ORDER BY created_at ASC";
        return jdbcTemplate.query(sql, commentRowMapper, taskId);
    }
    
    // Find all comments by user
    public List<Comment> findByUserId(String userId) {
        String sql = "SELECT * FROM comments WHERE user_id = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, commentRowMapper, userId);
    }
    
    // Find replies to a specific comment
    public List<Comment> findByParentCommentIdAndIsDeletedFalse(Long parentCommentId) {
        String sql = "SELECT * FROM comments WHERE parent_comment_id = ? AND is_deleted = false ORDER BY created_at ASC";
        return jdbcTemplate.query(sql, commentRowMapper, parentCommentId);
    }
    
    // Count comments for a task
    public Long countByTaskIdAndNotDeleted(String taskId) {
        String sql = "SELECT COUNT(*) FROM comments WHERE task_id = ? AND is_deleted = false";
        return jdbcTemplate.queryForObject(sql, Long.class, taskId);
    }
    
    // Save comment (insert or update)
    public Comment save(Comment comment) {
        if (comment.getId() == null) {
            return insert(comment);
        } else {
            return update(comment);
        }
    }
    
    // Insert new comment
    private Comment insert(Comment comment) {
        String sql = "INSERT INTO comments (task_id, user_id, content, created_at, updated_at, parent_comment_id, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, comment.getTaskId());
            ps.setString(2, comment.getUserId());
            ps.setString(3, comment.getContent());
            ps.setTimestamp(4, Timestamp.valueOf(comment.getCreatedAt() != null ? comment.getCreatedAt() : LocalDateTime.now()));
            ps.setTimestamp(5, Timestamp.valueOf(comment.getUpdatedAt() != null ? comment.getUpdatedAt() : LocalDateTime.now()));
            
            if (comment.getParentCommentId() != null) {
                ps.setLong(6, comment.getParentCommentId());
            } else {
                ps.setNull(6, java.sql.Types.BIGINT);
            }
            
            ps.setBoolean(7, comment.getIsDeleted() != null ? comment.getIsDeleted() : false);
            return ps;
        }, keyHolder);
        
        // Fix: Handle multiple keys returned from database
        if (keyHolder.getKeys() != null && !keyHolder.getKeys().isEmpty()) {
            Object idValue = keyHolder.getKeys().get("id");
            if (idValue != null) {
                comment.setId(((Number) idValue).longValue());
            }
        }
        
        return comment;
    }
    
    // Update existing comment
    private Comment update(Comment comment) {
        String sql = "UPDATE comments SET task_id = ?, user_id = ?, content = ?, updated_at = ?, parent_comment_id = ?, is_deleted = ? WHERE id = ?";
        
        jdbcTemplate.update(sql,
            comment.getTaskId(),
            comment.getUserId(),
            comment.getContent(),
            Timestamp.valueOf(LocalDateTime.now()),
            comment.getParentCommentId(),
            comment.getIsDeleted(),
            comment.getId()
        );
        
        comment.setUpdatedAt(LocalDateTime.now());
        return comment;
    }
    
    // Find by ID
    public Optional<Comment> findById(Long id) {
        String sql = "SELECT * FROM comments WHERE id = ?";
        List<Comment> comments = jdbcTemplate.query(sql, commentRowMapper, id);
        return comments.isEmpty() ? Optional.empty() : Optional.of(comments.get(0));
    }
} 