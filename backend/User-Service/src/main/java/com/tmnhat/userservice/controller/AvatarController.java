package com.tmnhat.userservice.controller;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
import java.util.UUID;
import com.tmnhat.userservice.repository.UserDAO;
@RestController
@RequestMapping("/api/users")
public class AvatarController {

    @Autowired
    private Cloudinary cloudinary;

    @Autowired
    private UserDAO userDAO;

    @PostMapping("/{userId}/avatar")
    public ResponseEntity<?> uploadAvatar(@PathVariable UUID userId, @RequestParam("file") MultipartFile file) {
        try {
            Map<String, Object> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                "folder", "avatars",        // Tùy chọn: tạo folder trên Cloudinary
                "public_id", userId.toString()  // Đặt tên file = userId (tránh trùng)
            ));
            String avatarUrl = uploadResult.get("secure_url").toString();

            // Gọi DAO lưu URL vào DB
            userDAO.updateAvatarUrl(userId, avatarUrl);

            return ResponseEntity.ok(Map.of("url", avatarUrl));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Upload failed: " + e.getMessage());
        }
    }
}
