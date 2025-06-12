package com.tmnhat.userservice.controller;

import com.tmnhat.common.config.WebConfig;
import com.tmnhat.common.payload.ResponseDataAPI;
import com.tmnhat.userservice.model.Users;
import com.tmnhat.userservice.service.UserService;
import com.tmnhat.userservice.service.impl.UserServiceImpl;
import com.tmnhat.userservice.validation.UserValidator;
import com.tmnhat.common.exception.BadRequestException;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import java.util.List;
import java.util.UUID;

@Import(WebConfig.class)
@RestController
@RequestMapping("api/users")
public class UsersController {

    private final UserService userService;

    public UsersController() {
        this.userService = new UserServiceImpl();
    }

    // Create user
    @PostMapping
    public ResponseEntity<ResponseDataAPI> createUser(@RequestBody Users user) {
        UserValidator.validateUser(user);
        userService.createUser(user);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Update user
    @PutMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> updateUser(@PathVariable UUID id, @RequestBody Users user) {
        UserValidator.validateUserId(id);
        UserValidator.validateUser(user);
        userService.updateUser(id, user);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Delete user
    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> deleteUser(@PathVariable UUID id) {
        UserValidator.validateUserId(id);
        userService.deleteUser(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Get user by ID
    @GetMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> getUserById(@PathVariable UUID id) {
        UserValidator.validateUserId(id);
        Users user = userService.getUserById(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(user));
    }

    // Get all users
    @GetMapping
    public ResponseEntity<ResponseDataAPI> getAllUsers() {
        List<Users> users = userService.getAllUsers();
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(users));
    }

    // Get users by role
    @GetMapping("/role/{role}")
    public ResponseEntity<ResponseDataAPI> getUsersByRole(@PathVariable String role) {
        UserValidator.validateRole(role);
        List<Users> users = userService.getUsersByRole(role);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(users));
    }

    // Get user by username
    @GetMapping("/username/{username}")
    public ResponseEntity<ResponseDataAPI> getUserByUsername(@PathVariable String username) {
        if (username == null || username.isBlank()) {
            throw new BadRequestException("Username cannot be empty");
        }
        Users user = userService.getUserByUsername(username);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(user));
    }

    // Get user by email
    @GetMapping("/email/{email}")
    public ResponseEntity<ResponseDataAPI> getUserByEmail(@PathVariable String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email cannot be empty");
        }
        Users user = userService.getUserByEmail(email);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(user));
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<ResponseDataAPI> changeUserRole(@PathVariable UUID userId, @RequestParam String role) {
        UserValidator.validateUserId(userId);
        UserValidator.validateRole(role);  // Ensure role validation is here
        userService.changeUserRole(userId, role);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }
    
    @GetMapping("/search")
    public ResponseEntity<ResponseDataAPI> searchUsers(@RequestParam String keyword) {
        if (keyword == null || keyword.isBlank()) {
            throw new BadRequestException("Keyword cannot be empty");
        }
        List<Users> users = userService.searchUsers(keyword);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(users));
    }

    // Update avatar
    @PatchMapping("/{userId}/avatar")
    public ResponseEntity<ResponseDataAPI> updateAvatar(@PathVariable UUID userId, @RequestParam MultipartFile avatar) {
        UserValidator.validateUserId(userId);
        if (avatar == null || avatar.isEmpty()) {
            throw new BadRequestException("Avatar file cannot be empty");
        }
        userService.updateAvatar(userId, avatar);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }
    // Get users by project ID
    @GetMapping("/project/{projectId}")
    public ResponseEntity<ResponseDataAPI> getUsersByProjectId(@PathVariable UUID projectId) {
        UserValidator.validateProjectId(projectId);
        List<Users> users = userService.getUsersByProjectId(projectId);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(users));
    }

    // ✅ NEW: Get username by user ID (lightweight for notification service)
    @GetMapping("/{id}/username")
    public ResponseEntity<ResponseDataAPI> getUsernameById(@PathVariable UUID id) {
        UserValidator.validateUserId(id);
        String username = userService.getUsernameById(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(username));
    }
} 