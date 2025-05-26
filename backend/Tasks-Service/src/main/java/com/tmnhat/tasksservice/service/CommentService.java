package com.tmnhat.tasksservice.service;

import com.tmnhat.tasksservice.model.Comment;
import com.tmnhat.tasksservice.repository.CommentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class CommentService {
    
    @Autowired
    private CommentRepository commentRepository;
    
    // Get all comments for a task
    public List<Comment> getCommentsByTaskId(String taskId) {
        return commentRepository.findByTaskIdAndNotDeleted(taskId);
    }
    
    // Add new comment
    public Comment addComment(String taskId, String userId, String content) {
        Comment comment = new Comment();
        comment.setTaskId(taskId);
        comment.setUserId(userId);
        comment.setContent(content);
        comment.setCreatedAt(LocalDateTime.now());
        comment.setUpdatedAt(LocalDateTime.now());
        comment.setIsDeleted(false);
        
        return commentRepository.save(comment);
    }
    
    // Add reply to a comment
    public Comment addReply(Long parentCommentId, String userId, String content) {
        // Get parent comment to extract taskId
        Optional<Comment> parentComment = commentRepository.findById(parentCommentId);
        if (parentComment.isEmpty()) {
            throw new IllegalArgumentException("Parent comment not found");
        }
        
        Comment reply = new Comment();
        reply.setTaskId(parentComment.get().getTaskId());
        reply.setUserId(userId);
        reply.setContent(content);
        reply.setParentCommentId(parentCommentId);
        reply.setCreatedAt(LocalDateTime.now());
        reply.setUpdatedAt(LocalDateTime.now());
        reply.setIsDeleted(false);
        
        return commentRepository.save(reply);
    }
    
    // Update comment (only by owner)
    public Comment updateComment(Long commentId, String userId, String newContent) {
        Optional<Comment> commentOpt = commentRepository.findById(commentId);
        if (commentOpt.isEmpty()) {
            throw new IllegalArgumentException("Comment not found");
        }
        
        Comment comment = commentOpt.get();
        if (!comment.getUserId().equals(userId)) {
            throw new IllegalArgumentException("You can only edit your own comments");
        }
        
        comment.setContent(newContent);
        return commentRepository.save(comment);
    }
    
    // Delete comment (soft delete)
    public void deleteComment(Long commentId, String userId) {
        Optional<Comment> commentOpt = commentRepository.findById(commentId);
        if (commentOpt.isEmpty()) {
            throw new IllegalArgumentException("Comment not found");
        }
        
        Comment comment = commentOpt.get();
        if (!comment.getUserId().equals(userId)) {
            throw new IllegalArgumentException("You can only delete your own comments");
        }
        
        comment.setIsDeleted(true);
        commentRepository.save(comment);
    }
    
    // Get comment count for a task
    public Long getCommentCount(String taskId) {
        return commentRepository.countByTaskIdAndNotDeleted(taskId);
    }
    
    // Get replies for a comment
    public List<Comment> getReplies(Long commentId) {
        return commentRepository.findByParentCommentIdAndIsDeletedFalse(commentId);
    }
} 