package com.tmnhat.accountsservice.service;
import com.tmnhat.accountsservice.model.Accounts;

import java.util.UUID;

public interface AccountService {

    String login(String email, String password);

    Accounts getAccountByEmail(String email);

    void addAccount(Accounts account);

    void updateAccount(UUID id, Accounts account);

    void deleteAccount(UUID id);
}
