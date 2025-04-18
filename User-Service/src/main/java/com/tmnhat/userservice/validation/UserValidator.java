package com.tmnhat.userservice.validation;

import com.tmnhat.userservice.model.Users;
import com.tmnhat.common.exception.BadRequestException;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public class UserValidator {

    // Các role hợp lệ
    private static final List<String> VALID_ROLES = Arrays.asList("ADMIN", "USER", "LEADER", "VIEWER");

    //Validate User Object
    public static void validateUser(Users user) {
        if (user == null) {
            throw new BadRequestException("User data is required");
        }
        if (user.getName() == null || user.getName().trim().isEmpty()) {
            throw new BadRequestException("User name cannot be empty");
        }
        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            throw new BadRequestException("User email cannot be empty");
        }
        if (!isValidEmail(user.getEmail())) {
            throw new BadRequestException("Invalid email format: " + user.getEmail());
        }
        if (user.getRole() == null || user.getRole().trim().isEmpty()) {
            throw new BadRequestException("User role cannot be empty");
        }
        if (!VALID_ROLES.contains(user.getRole().toUpperCase())) {
            throw new BadRequestException("Invalid user role: " + user.getRole());
        }
    }

    // Validate User ID
    public static void validateUserId(UUID id) {
        if (id == null) {
            throw new BadRequestException("Invalid user ID: ID cannot be null");
        }
    }

    // Validate Role (nếu cần validate role riêng)
    public static void validateRole(String role) {
        if (role == null || role.trim().isEmpty()) {
            throw new BadRequestException("Role cannot be empty");
        }
        if (!VALID_ROLES.contains(role.toUpperCase())) {
            throw new BadRequestException("Invalid role: " + role);
        }
    }

    // Validate Email Format cơ bản
    private static boolean isValidEmail(String email) {
        return email.contains("@") && email.contains(".");
    }
}
