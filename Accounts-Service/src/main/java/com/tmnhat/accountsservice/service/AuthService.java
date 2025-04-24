package com.tmnhat.accountsservice.service;

public interface AuthService {
    String register(String email, String password) throws Exception;
    String login(String email, String password) throws Exception;
}
