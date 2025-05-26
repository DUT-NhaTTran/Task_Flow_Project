package com.tmnhat.tasksservice.controller;

import com.tmnhat.common.payload.ResponseDataAPI;
import com.tmnhat.tasksservice.model.Comment;
import com.tmnhat.tasksservice.service.CommentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comments")
@CrossOrigin(origins = "http://localhost:3000")
public class CommentController {
    
    @Autowired
    private CommentService commentService;
    
    // Get all comments for a task
    @GetMapping("/task/{taskId}")
    public ResponseEntity<ResponseDataAPI> getCommentsByTask(@PathVariable String taskId) {
        try {
            List<Comment> comments = commentService.getCommentsByTaskId(taskId);
            return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(comments));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDataAPI.error("Error fetching comments: " + e.getMessage()));
        }
    }
    
    // Add new comment
    @PostMapping
    public ResponseEntity<ResponseDataAPI> addComment(@RequestBody AddCommentRequest request) {
        try {
            Comment comment = commentService.addComment(
                request.getTaskId(),
                request.getUserId(),
                request.getContent()
            );
            return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(comment));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDataAPI.error("Error adding comment: " + e.getMessage()));
        }
    }
    
    // Add reply to comment
    @PostMapping("/{commentId}/reply")
    public ResponseEntity<ResponseDataAPI> addReply(
            @PathVariable Long commentId,
            @RequestBody AddReplyRequest request) {
        try {
            Comment reply = commentService.addReply(
                commentId,
                request.getUserId(),
                request.getContent()
            );
            return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(reply));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDataAPI.error("Error adding reply: " + e.getMessage()));
        }
    }
    
    // Update comment
    @PutMapping("/{commentId}")
    public ResponseEntity<ResponseDataAPI> updateComment(
            @PathVariable Long commentId,
            @RequestBody UpdateCommentRequest request) {
        try {
            Comment updatedComment = commentService.updateComment(
                commentId,
                request.getUserId(),
                request.getContent()
            );
            return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(updatedComment));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDataAPI.error("Error updating comment: " + e.getMessage()));
        }
    }
    
    // Delete comment
    @DeleteMapping("/{commentId}")
    public ResponseEntity<ResponseDataAPI> deleteComment(
            @PathVariable Long commentId,
            @RequestParam String userId) {
        try {
            commentService.deleteComment(commentId, userId);
            return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDataAPI.error("Error deleting comment: " + e.getMessage()));
        }
    }
    
    // Get comment count for task
    @GetMapping("/task/{taskId}/count")
    public ResponseEntity<ResponseDataAPI> getCommentCount(@PathVariable String taskId) {
        try {
            Long count = commentService.getCommentCount(taskId);
            return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(count));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDataAPI.error("Error getting comment count: " + e.getMessage()));
        }
    }
    
    // DTOs
    public static class AddCommentRequest {
        private String taskId;
        private String userId;
        private String content;
        
        // Getters and setters
        public String getTaskId() { return taskId; }
        public void setTaskId(String taskId) { this.taskId = taskId; }
        
        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }
        
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
    
    public static class AddReplyRequest {
        private String userId;
        private String content;
        
        // Getters and setters
        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }
        
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
    
    public static class UpdateCommentRequest {
        private String userId;
        private String content;
        
        // Getters and setters
        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }
        
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
} 