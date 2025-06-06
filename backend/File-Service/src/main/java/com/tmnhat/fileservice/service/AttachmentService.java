package com.tmnhat.fileservice.service;

import com.tmnhat.fileservice.model.Attachment;
import com.tmnhat.fileservice.repository.AttachmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;

@Service
public class AttachmentService {

    @Value("${file.upload.directory}")
    private String uploadDir;

    @Autowired
    private AttachmentRepository attachmentRepository;

    public List<Attachment> getAttachmentsByTaskId(UUID taskId) {
        return attachmentRepository.findByTaskId(taskId);
    }
    
    public Optional<Attachment> findById(Long id) {
        return attachmentRepository.findById(id);
    }

    public Attachment saveAttachment(MultipartFile file, UUID taskId) throws IOException {
        // Create directory if it doesn't exist
        File directory = new File(uploadDir);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String fileExtension = "";
        
        if (originalFilename != null && originalFilename.contains(".")) {
            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        
        String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
        Path filePath = Paths.get(uploadDir, uniqueFilename);
        
        // Save file to disk
        Files.copy(file.getInputStream(), filePath);
        
        // Create and save attachment record
        Attachment attachment = new Attachment();
        attachment.setTaskId(taskId);
        attachment.setFileName(originalFilename != null ? originalFilename : uniqueFilename);
        attachment.setFileUrl(filePath.toString());
        attachment.setFileType(file.getContentType());
        
        Attachment savedAttachment = attachmentRepository.save(attachment);
        
        // Send notification about file attachment
        sendFileAttachmentNotification(taskId, originalFilename != null ? originalFilename : uniqueFilename);
        
        return savedAttachment;
    }

    public void deleteAttachment(Long attachmentId) throws IOException {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        
        // Delete file from disk
        Path filePath = Paths.get(attachment.getFileUrl());
        Files.deleteIfExists(filePath);
        
        // Delete record from database
        attachmentRepository.delete(attachment);
    }

    public Attachment createAttachmentRecord(String fileName, String fileUrl, String fileType, UUID taskId) {
        // Create attachment record without uploading file (file already exists)
        Attachment attachment = new Attachment();
        attachment.setTaskId(taskId);
        attachment.setFileName(fileName);
        attachment.setFileUrl(fileUrl);
        attachment.setFileType(fileType);
        
        Attachment savedAttachment = attachmentRepository.save(attachment);
        
        // Send notification about file attachment
        sendFileAttachmentNotification(taskId, fileName);
        
        return savedAttachment;
    }
    
    private void sendFileAttachmentNotification(UUID taskId, String fileName) {
        try {
            // Get task details
            Map<String, Object> taskDetails = getTaskDetails(taskId);
            if (taskDetails == null) {
                return;
            }
            
            String taskTitle = (String) taskDetails.get("title");
            String projectId = (String) taskDetails.get("projectId");
            String assigneeId = (String) taskDetails.get("assigneeId");
            
            if (assigneeId == null) {
                return; // No one to notify
            }
            
            // Get project details
            String projectName = getProjectName(UUID.fromString(projectId));
            
            // Send notification
            Map<String, Object> notificationRequest = new HashMap<>();
            notificationRequest.put("type", "FILE_ATTACHED");
            notificationRequest.put("title", "File attached");
            notificationRequest.put("message", String.format("File \"%s\" has been attached to task \"%s\"", fileName, taskTitle));
            notificationRequest.put("recipientUserId", assigneeId);
            notificationRequest.put("actorUserId", "SYSTEM");
            notificationRequest.put("actorUserName", "System");
            notificationRequest.put("projectId", projectId);
            notificationRequest.put("projectName", projectName);
            notificationRequest.put("taskId", taskId.toString());
            notificationRequest.put("actionUrl", String.format("/project/board?projectId=%s&taskId=%s", projectId, taskId));
            
            sendNotificationDirect(notificationRequest);
            
        } catch (Exception e) {
            System.err.println("Failed to send file attachment notification: " + e.getMessage());
        }
    }
    
    private Map<String, Object> getTaskDetails(UUID taskId) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "http://localhost:8085/api/tasks/get-by-id/" + taskId;
            org.springframework.http.ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getBody() != null && response.getBody().get("data") != null) {
                Map<String, Object> taskData = (Map<String, Object>) response.getBody().get("data");
                Map<String, Object> result = new HashMap<>();
                result.put("title", taskData.get("title"));
                result.put("projectId", taskData.get("projectId"));
                result.put("assigneeId", taskData.get("assigneeId"));
                return result;
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
    
    private String getProjectName(UUID projectId) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "http://localhost:8083/api/projects/" + projectId;
            org.springframework.http.ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getBody() != null && response.getBody().get("data") != null) {
                Map<String, Object> projectData = (Map<String, Object>) response.getBody().get("data");
                return (String) projectData.get("name");
            }
            return "Unknown Project";
        } catch (Exception e) {
            return "Unknown Project";
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
} 