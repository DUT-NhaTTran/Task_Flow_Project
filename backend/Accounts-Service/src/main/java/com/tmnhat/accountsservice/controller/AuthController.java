package com.tmnhat.accountsservice.controller;
import com.tmnhat.accountsservice.model.Accounts;
import com.tmnhat.accountsservice.model.LoginRequest;
import com.tmnhat.accountsservice.service.AuthService;
import com.tmnhat.accountsservice.validation.AccountValidator;
import com.tmnhat.common.config.WebConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.SQLException;
import java.util.Map;
import java.util.UUID;

@Import(WebConfig.class)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @Autowired
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        try {
            String email = payload.get("email");
            String password = payload.get("password");

            // Validate thủ công
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email cannot be empty"));
            }
            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password cannot be empty"));
            }

            String result = authService.register(email, password);
            return ResponseEntity.ok(Map.of("message", result, "success", true));
        } catch (SQLException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "System error: " + e.getMessage()));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            AccountValidator.validateLoginRequest(loginRequest);
    
            String token = authService.login(loginRequest.getEmail(), loginRequest.getPassword());
            
            UUID userId;
            try {
                // Lấy user_id từ accounts.user_id
                userId = authService.getUserIdByEmail(loginRequest.getEmail());
            } catch (Exception e) {
                // Nếu chưa có user_id, tự động tạo mới và link vào account
                userId = UUID.randomUUID();
                var account = authService.getAccountByEmail(loginRequest.getEmail());
                if (account != null) {
                    authService.linkUserIdToAccount(account.getId(), userId);
                } else {
                    return ResponseEntity.status(400).body(Map.of("error", "Account not found"));
                }
            }
    
            if (userId == null) {
                return ResponseEntity.status(400).body(Map.of("error", "User ID not found"));
            }
    
            return ResponseEntity.ok(Map.of("token", token, "userId", userId.toString()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/{accountId}/user-id")
    public ResponseEntity<Map<String, Object>> getUserIdByAccountId(@PathVariable UUID accountId) {
        try {
            UUID userId = authService.getUserIdByAccountId(accountId);
            return ResponseEntity.ok(Map.of("userId", userId.toString()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ TEMPORARY: Check account existence endpoint
    @GetMapping("/check-account/{email}")
    public ResponseEntity<Map<String, Object>> checkAccount(@PathVariable String email) {
        try {
            boolean exists = authService.getAccountByEmail(email) != null;
            return ResponseEntity.ok(Map.of(
                "email", email,
                "exists", exists,
                "message", exists ? "Account found" : "Account not found"
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "email", email,
                "exists", false,
                "error", e.getMessage()
            ));
        }
    }

    // ✅ TEMPORARY: Test BCrypt endpoint
    @PostMapping("/test-bcrypt")
    public ResponseEntity<Map<String, Object>> testBCrypt(@RequestBody Map<String, String> payload) {
        try {
            String plainPassword = payload.get("password");
            String storedHash = "$2a$10$hKtpBooPBuWup5rS5a19zuvtk3ZJl//FBtMb78qljZCyaQZZx.Hti";
            
            org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = 
                new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
            
            boolean matches = encoder.matches(plainPassword, storedHash);
            
            return ResponseEntity.ok(Map.of(
                "password", plainPassword,
                "storedHash", storedHash, 
                "matches", matches,
                "hashLength", storedHash.length(),
                "passwordLength", plainPassword.length()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ NEW: Change password endpoint
    @PutMapping("/change-password/{userId}")
    public ResponseEntity<Map<String, Object>> changePassword(@PathVariable UUID userId, @RequestBody Map<String, String> payload) {
        try {
            String currentPassword = payload.get("currentPassword");
            String newPassword = payload.get("newPassword");

            // Validate input
            if (currentPassword == null || currentPassword.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Current password is required"));
            }
            if (newPassword == null || newPassword.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "New password is required"));
            }

            authService.changePasswordByUserId(userId, currentPassword, newPassword);
            return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Password changed successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

}
