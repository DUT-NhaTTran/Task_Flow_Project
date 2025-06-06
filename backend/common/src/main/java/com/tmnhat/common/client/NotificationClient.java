package com.tmnhat.common.client;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Component
public class NotificationClient {
    
    private final RestTemplate restTemplate;
    private static final String NOTIFICATION_SERVICE_URL = "http://localhost:8089/api/notifications";
    
    public NotificationClient() {
        this.restTemplate = new RestTemplate();
    }
    
    public void sendTaskCreatedNotification(String recipientUserId, String actorUserId, 
                                          String actorUserName, String taskId, String taskTitle, 
                                          String projectId, String projectName) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("type", "TASK_CREATED");
            request.put("title", "New task created");
            request.put("message", String.format("New task \"%s\" has been created", taskTitle));
            request.put("recipientUserId", recipientUserId);
            request.put("actorUserId", actorUserId);
            request.put("actorUserName", actorUserName);
            request.put("projectId", projectId);
            request.put("projectName", projectName);
            request.put("taskId", taskId);
            request.put("actionUrl", String.format("/project/board?projectId=%s&taskId=%s", projectId, taskId));
            
            sendNotification(request);
        } catch (Exception e) {
            System.err.println("Failed to send task created notification: " + e.getMessage());
        }
    }
    
    public void sendTaskAssignedNotification(String recipientUserId, String actorUserId, 
                                           String actorUserName, String taskId, String taskTitle, 
                                           String projectId, String projectName) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("type", "TASK_ASSIGNED");
            request.put("title", "Task assigned to you");
            request.put("message", String.format("You have been assigned to task \"%s\"", taskTitle));
            request.put("recipientUserId", recipientUserId);
            request.put("actorUserId", actorUserId);
            request.put("actorUserName", actorUserName);
            request.put("projectId", projectId);
            request.put("projectName", projectName);
            request.put("taskId", taskId);
            request.put("actionUrl", String.format("/project/board?projectId=%s&taskId=%s", projectId, taskId));
            
            sendNotification(request);
        } catch (Exception e) {
            System.err.println("Failed to send task assigned notification: " + e.getMessage());
        }
    }
    
    public void sendTaskUpdatedNotification(String recipientUserId, String actorUserId, 
                                          String actorUserName, String taskId, String taskTitle, 
                                          String projectId, String projectName, String updateField, String newValue) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("type", "TASK_UPDATED");
            request.put("title", "Task updated");
            request.put("message", String.format("Task \"%s\" %s has been changed to %s", taskTitle, updateField, newValue));
            request.put("recipientUserId", recipientUserId);
            request.put("actorUserId", actorUserId);
            request.put("actorUserName", actorUserName);
            request.put("projectId", projectId);
            request.put("projectName", projectName);
            request.put("taskId", taskId);
            request.put("actionUrl", String.format("/project/board?projectId=%s&taskId=%s", projectId, taskId));
            
            sendNotification(request);
        } catch (Exception e) {
            System.err.println("Failed to send task updated notification: " + e.getMessage());
        }
    }
    
    public void sendTaskStatusChangedNotification(String recipientUserId, String actorUserId, 
                                                String actorUserName, String taskId, String taskTitle, 
                                                String projectId, String projectName, String newStatus) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("type", "TASK_STATUS_CHANGED");
            request.put("title", "Task status changed");
            request.put("message", String.format("Task \"%s\" status changed to %s", taskTitle, newStatus));
            request.put("recipientUserId", recipientUserId);
            request.put("actorUserId", actorUserId);
            request.put("actorUserName", actorUserName);
            request.put("projectId", projectId);
            request.put("projectName", projectName);
            request.put("taskId", taskId);
            request.put("actionUrl", String.format("/project/board?projectId=%s&taskId=%s", projectId, taskId));
            
            sendNotification(request);
        } catch (Exception e) {
            System.err.println("Failed to send task status changed notification: " + e.getMessage());
        }
    }
    
    public void sendTaskCommentNotification(String recipientUserId, String actorUserId, 
                                          String actorUserName, String taskId, String taskTitle, 
                                          String projectId, String projectName, String commentId) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("taskId", taskId);
            request.put("taskTitle", taskTitle);
            request.put("taskAssigneeId", recipientUserId);
            request.put("commentAuthorId", actorUserId);
            request.put("commentAuthorName", actorUserName);
            request.put("commentId", commentId);
            request.put("projectId", projectId);
            request.put("projectName", projectName);
            
            sendTaskCommentNotificationDirect(request);
        } catch (Exception e) {
            System.err.println("Failed to send task comment notification: " + e.getMessage());
        }
    }
    
    public void sendFileAttachedNotification(String recipientUserId, String actorUserId, 
                                           String actorUserName, String taskId, String taskTitle, 
                                           String projectId, String projectName, String fileName) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("type", "FILE_ATTACHED");
            request.put("title", "File attached");
            request.put("message", String.format("%s attached file \"%s\" to task \"%s\"", actorUserName, fileName, taskTitle));
            request.put("recipientUserId", recipientUserId);
            request.put("actorUserId", actorUserId);
            request.put("actorUserName", actorUserName);
            request.put("projectId", projectId);
            request.put("projectName", projectName);
            request.put("taskId", taskId);
            request.put("actionUrl", String.format("/project/board?projectId=%s&taskId=%s", projectId, taskId));
            
            sendNotification(request);
        } catch (Exception e) {
            System.err.println("Failed to send file attached notification: " + e.getMessage());
        }
    }
    
    public void sendProjectCreatedNotification(String recipientUserId, String actorUserId, 
                                             String actorUserName, String projectId, String projectName) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("type", "PROJECT_CREATED");
            request.put("title", "New project created");
            request.put("message", String.format("Project \"%s\" has been created", projectName));
            request.put("recipientUserId", recipientUserId);
            request.put("actorUserId", actorUserId);
            request.put("actorUserName", actorUserName);
            request.put("projectId", projectId);
            request.put("projectName", projectName);
            request.put("actionUrl", String.format("/project/dashboard?projectId=%s", projectId));
            
            sendNotification(request);
        } catch (Exception e) {
            System.err.println("Failed to send project created notification: " + e.getMessage());
        }
    }
    
    public void sendProjectInviteNotification(String recipientUserId, String actorUserId, 
                                            String actorUserName, String projectId, String projectName, String role) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("type", "PROJECT_INVITE");
            request.put("title", "Project invitation");
            request.put("message", String.format("%s invited you to join project \"%s\" as %s", actorUserName, projectName, role));
            request.put("recipientUserId", recipientUserId);
            request.put("actorUserId", actorUserId);
            request.put("actorUserName", actorUserName);
            request.put("projectId", projectId);
            request.put("projectName", projectName);
            request.put("actionUrl", String.format("/project/dashboard?projectId=%s", projectId));
            
            sendNotification(request);
        } catch (Exception e) {
            System.err.println("Failed to send project invite notification: " + e.getMessage());
        }
    }
    
    public void sendSprintCreatedNotification(String recipientUserId, String actorUserId, 
                                            String actorUserName, String sprintId, String sprintName, 
                                            String projectId, String projectName) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("type", "SPRINT_CREATED");
            request.put("title", "New sprint created");
            request.put("message", String.format("Sprint \"%s\" has been created in project \"%s\"", sprintName, projectName));
            request.put("recipientUserId", recipientUserId);
            request.put("actorUserId", actorUserId);
            request.put("actorUserName", actorUserName);
            request.put("projectId", projectId);
            request.put("projectName", projectName);
            request.put("sprintId", sprintId);
            request.put("actionUrl", String.format("/project/sprints?projectId=%s&sprintId=%s", projectId, sprintId));
            
            sendNotification(request);
        } catch (Exception e) {
            System.err.println("Failed to send sprint created notification: " + e.getMessage());
        }
    }
    
    public void sendSprintStartedNotification(String recipientUserId, String actorUserId, 
                                            String actorUserName, String sprintId, String sprintName, 
                                            String projectId, String projectName) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("type", "SPRINT_STARTED");
            request.put("title", "Sprint started");
            request.put("message", String.format("Sprint \"%s\" has been started", sprintName));
            request.put("recipientUserId", recipientUserId);
            request.put("actorUserId", actorUserId);
            request.put("actorUserName", actorUserName);
            request.put("projectId", projectId);
            request.put("projectName", projectName);
            request.put("sprintId", sprintId);
            request.put("actionUrl", String.format("/project/sprints?projectId=%s&sprintId=%s", projectId, sprintId));
            
            sendNotification(request);
        } catch (Exception e) {
            System.err.println("Failed to send sprint started notification: " + e.getMessage());
        }
    }
    
    public void sendSprintCompletedNotification(String recipientUserId, String actorUserId, 
                                              String actorUserName, String sprintId, String sprintName, 
                                              String projectId, String projectName) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("type", "SPRINT_COMPLETED");
            request.put("title", "Sprint completed");
            request.put("message", String.format("Sprint \"%s\" has been completed", sprintName));
            request.put("recipientUserId", recipientUserId);
            request.put("actorUserId", actorUserId);
            request.put("actorUserName", actorUserName);
            request.put("projectId", projectId);
            request.put("projectName", projectName);
            request.put("sprintId", sprintId);
            request.put("actionUrl", String.format("/project/sprints?projectId=%s&sprintId=%s", projectId, sprintId));
            
            sendNotification(request);
        } catch (Exception e) {
            System.err.println("Failed to send sprint completed notification: " + e.getMessage());
        }
    }
    
    private void sendNotification(Map<String, Object> notificationData) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(notificationData, headers);
            
            Map response = restTemplate.postForObject(
                NOTIFICATION_SERVICE_URL + "/create", 
                request, 
                Map.class
            );
            
            if (response != null) {
                System.out.println("✅ Notification sent successfully: " + response);
            }
        } catch (Exception e) {
            System.err.println("❌ Failed to send notification: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    private void sendTaskCommentNotificationDirect(Map<String, Object> notificationData) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(notificationData, headers);
            
            Map response = restTemplate.postForObject(
                NOTIFICATION_SERVICE_URL + "/task-comment", 
                request, 
                Map.class
            );
            
            if (response != null && Boolean.TRUE.equals(response.get("success"))) {
                System.out.println("✅ Task comment notification sent successfully: " + response.get("message"));
            } else {
                System.err.println("⚠️ Task comment notification response: " + response);
            }
        } catch (Exception e) {
            System.err.println("❌ Failed to send task comment notification: " + e.getMessage());
            e.printStackTrace();
            
            try {
                System.out.println("🔄 Attempting fallback to old notification method...");
                Map<String, Object> fallbackRequest = new HashMap<>();
                fallbackRequest.put("type", "TASK_COMMENT");
                fallbackRequest.put("title", "New comment");
                fallbackRequest.put("message", String.format("New comment on task"));
                fallbackRequest.put("recipientUserId", notificationData.get("taskAssigneeId"));
                fallbackRequest.put("actorUserId", notificationData.get("commentAuthorId"));
                fallbackRequest.put("actorUserName", notificationData.get("commentAuthorName"));
                fallbackRequest.put("projectId", notificationData.get("projectId"));
                fallbackRequest.put("projectName", notificationData.get("projectName"));
                fallbackRequest.put("taskId", notificationData.get("taskId"));
                fallbackRequest.put("commentId", notificationData.get("commentId"));
                fallbackRequest.put("actionUrl", String.format("/project/board?projectId=%s&taskId=%s", 
                    notificationData.get("projectId"), notificationData.get("taskId")));
                
                sendNotification(fallbackRequest);
            } catch (Exception fallbackException) {
                System.err.println("❌ Fallback notification also failed: " + fallbackException.getMessage());
            }
        }
    }
} 