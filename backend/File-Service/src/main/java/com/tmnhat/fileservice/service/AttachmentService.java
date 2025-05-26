package com.tmnhat.fileservice.service;

import com.tmnhat.fileservice.entity.Attachment;
import com.tmnhat.fileservice.repository.AttachmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

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
        
        return attachmentRepository.save(attachment);
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
        
        return attachmentRepository.save(attachment);
    }
} 