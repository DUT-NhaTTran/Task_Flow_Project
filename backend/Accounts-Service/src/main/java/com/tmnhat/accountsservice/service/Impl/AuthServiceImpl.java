package com.tmnhat.accountsservice.service.Impl;

import com.tmnhat.accountsservice.model.Accounts;
import com.tmnhat.accountsservice.payload.enums.Role;
import com.tmnhat.accountsservice.repository.AccountDAO;
import com.tmnhat.accountsservice.security.JwtUtil;
import com.tmnhat.accountsservice.service.AuthService;
import com.tmnhat.common.exception.DatabaseException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private final AccountDAO accountDAO;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    public AuthServiceImpl(AccountDAO accountDAO, JwtUtil jwtUtil) {
        this.accountDAO = accountDAO;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    @Override
    public String register(String email, String password) throws SQLException {
        if (accountDAO.existsByEmail(email)) {
            throw new DatabaseException("Email already exists");
        }

        Accounts account = new Accounts.Builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        // Lấy lại account sau khi insert để có id
        Accounts savedAccount = accountDAO.addAccount(account);

        return "Account created successfully with id: " + savedAccount.getId();
    }

    @Override
    public String login(String email, String password) throws SQLException {
        Accounts account = accountDAO.getAccountByEmail(email);

        if (account == null) {
            throw new DatabaseException("Email not found");
        }

        if (!passwordEncoder.matches(password, account.getPassword())) {
            throw new DatabaseException("Incorrect password");
        }

        return jwtUtil.generateToken(account.getId(), String.valueOf(Role.USER));
    }
}
