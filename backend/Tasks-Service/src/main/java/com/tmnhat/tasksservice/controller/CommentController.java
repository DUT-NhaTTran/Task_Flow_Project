package com.tmnhat.tasksservice.controller;

import com.tmnhat.common.client.NotificationClient;
import com.tmnhat.common.payload.ResponseDataAPI;
import com.tmnhat.tasksservice.model.Comment;
import com.tmnhat.tasksservice.model.Tasks;
import com.tmnhat.tasksservice.service.CommentService;
import com.tmnhat.tasksservice.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comments")
@CrossOrigin(origins = "http://localhost:3000")
public class CommentController {
    
    @Autowired
    private CommentService commentService;
    
    @Autowired
    private TaskService taskService;
    
    @Autowired
    private NotificationClient notificationClient;
    
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
            
            // Send notification about new comment
            sendCommentNotification(request.getTaskId(), request.getUserId(), comment.getId());
            
            return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(comment));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDataAPI.error("Error adding comment: " + e.getMessage()));
        }
    }
    
    // Add reply to comment
    @PostMapping("/{commentId}/replies")
    public ResponseEntity<ResponseDataAPI> addReply(
            @PathVariable Long commentId, 
            @RequestBody AddReplyRequest request) {
        try {
            Comment reply = commentService.addReply(
                commentId,
                request.getUserId(),
                request.getContent()
            );
            
            // Send notification about comment reply
            sendCommentReplyNotification(reply.getTaskId(), request.getUserId(), reply.getId(), commentId);
            
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
    
    // Helper method to send comment notification
    private void sendCommentNotification(String taskId, String commenterId, Long commentId) {
        try {
            // Get task details
            Tasks task = taskService.getTaskById(java.util.UUID.fromString(taskId));
            String projectName = getProjectName(task.getProjectId());
            String commenterName = getUserName(commenterId);
            
            // Send notification to task assignee (if different from commenter)
            if (task.getAssigneeId() != null && !task.getAssigneeId().toString().equals(commenterId)) {
                notificationClient.sendTaskCommentNotification(
                    task.getAssigneeId().toString(),
                    commenterId,
                    commenterName,
                    task.getId().toString(),
                    task.getTitle(),
                    task.getProjectId().toString(),
                    projectName,
                    commentId.toString()
                );
            }
            
            // Also send notification to other project members who are watching this task
            // (You might want to implement a "watchers" feature)
            
        } catch (Exception e) {
            System.err.println("Failed to send comment notification: " + e.getMessage());
        }
    }
    
    // Helper method to send comment reply notification
    private void sendCommentReplyNotification(String taskId, String replierId, Long replyId, Long parentCommentId) {
        try {
            // Get task details
            Tasks task = taskService.getTaskById(java.util.UUID.fromString(taskId));
            String projectName = getProjectName(task.getProjectId());
            String replierName = getUserName(replierId);
            
            // Get parent comment to notify original commenter
            Comment parentComment = commentService.getCommentById(parentCommentId);
            
            if (parentComment != null && !parentComment.getUserId().equals(replierId)) {
                // Send notification to original commenter
                Map<String, Object> request = new java.util.HashMap<>();
                request.put("type", "COMMENT_REPLY");
                request.put("title", "Reply to your comment");
                request.put("message", String.format("%s replied to your comment on task \"%s\"", replierName, task.getTitle()));
                request.put("recipientUserId", parentComment.getUserId());
                request.put("actorUserId", replierId);
                request.put("actorUserName", replierName);
                request.put("projectId", task.getProjectId().toString());
                request.put("projectName", projectName);
                request.put("taskId", task.getId().toString());
                request.put("commentId", replyId.toString());
                request.put("actionUrl", String.format("/project/board?projectId=%s&taskId=%s&comment=%s", 
                    task.getProjectId(), task.getId(), replyId));
                
                // Call notification service directly since we don't have a specific method for comment replies
                sendNotificationDirect(request);
            }
            
        } catch (Exception e) {
            System.err.println("Failed to send comment reply notification: " + e.getMessage());
        }
    }
    
    // Helper methods
    private String getProjectName(java.util.UUID projectId) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "http://localhost:8083/api/projects/" + projectId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getBody() != null && response.getBody().get("data") != null) {
                Map<String, Object> projectData = (Map<String, Object>) response.getBody().get("data");
                return (String) projectData.get("name");
            }
            return "Unknown Project";
        } catch (Exception e) {
            return "Unknown Project";
        }
    }
    
    private String getUserName(String userId) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "http://localhost:8086/api/users/" + userId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getBody() != null && response.getBody().get("data") != null) {
                Map<String, Object> userData = (Map<String, Object>) response.getBody().get("data");
                return (String) userData.get("name");
            }
            return "Unknown User";
        } catch (Exception e) {
            return "Unknown User";
        }
    }
    
    private void sendNotificationDirect(Map<String, Object> notificationData) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "http://localhost:8089/api/notifications/create";
            
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            
            org.springframework.http.HttpEntity<Map<String, Object>> request = 
                new org.springframework.http.HttpEntity<>(notificationData, headers);
            
            restTemplate.exchange(url, org.springframework.http.HttpMethod.POST, request, String.class);
        } catch (Exception e) {
            System.err.println("Failed to send notification: " + e.getMessage());
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