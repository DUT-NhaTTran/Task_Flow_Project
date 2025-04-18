package com.tmnhat.accountsservice.service.Impl;

import com.tmnhat.accountsservice.model.Accounts;
import com.tmnhat.accountsservice.repository.AccountDAO;
import com.tmnhat.accountsservice.service.AccountService;
import com.tmnhat.accountsservice.utils.JwtUtil;
import com.tmnhat.common.exception.BadRequestException;
import com.tmnhat.common.exception.DatabaseException;
import org.mindrot.jbcrypt.BCrypt;

import java.util.UUID;

public class AccountServiceImpl implements AccountService {

    private final AccountDAO accountDAO = new AccountDAO();
    private final JwtUtil jwtUtil = new JwtUtil();

    @Override
    public String login(String email, String password) {
        try {
            Accounts account = accountDAO.getAccountByEmail(email);
            if (account == null || !BCrypt.checkpw(password, account.getPassword())) {
                throw new BadRequestException("Invalid email or password");
            }
            return jwtUtil.generateToken(account.getId(), account.getEmail());
        } catch (Exception e) {
            throw new DatabaseException("Error during login: " + e.getMessage());
        }
    }

    @Override
    public Accounts getAccountByEmail(String email) {
        try {
            return accountDAO.getAccountByEmail(email);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving account by email: " + e.getMessage());
        }
    }

    @Override
    public void addAccount(Accounts account) {
        try {
            // Mã hóa mật khẩu trước khi lưu
            String hashedPassword = BCrypt.hashpw(account.getPassword(), BCrypt.gensalt());
            account.setPassword(hashedPassword);
            accountDAO.addAccount(account);
        } catch (Exception e) {
            throw new DatabaseException("Error adding account: " + e.getMessage());
        }
    }

    @Override
    public void updateAccount(UUID id, Accounts account) {
        try {
            // Nếu có mật khẩu mới thì mã hóa lại
            if (account.getPassword() != null && !account.getPassword().startsWith("$2a$")) {
                String hashedPassword = BCrypt.hashpw(account.getPassword(), BCrypt.gensalt());
                account.setPassword(hashedPassword);
            }
            accountDAO.updateAccount(id, account);
        } catch (Exception e) {
            throw new DatabaseException("Error updating account: " + e.getMessage());
        }
    }

    @Override
    public void deleteAccount(UUID id) {
        try {
            accountDAO.deleteAccount(id);
        } catch (Exception e) {
            throw new DatabaseException("Error deleting account: " + e.getMessage());
        }
    }
}
