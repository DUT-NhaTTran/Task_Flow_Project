package com.tmnhat.accountsservice.service;

import java.sql.SQLException;
import java.util.UUID;

public interface AuthService {
    String register(String email, String password) throws Exception;
    String login(String email, String password) throws Exception;
    UUID getUserIdByEmail(String email) throws SQLException;
}
