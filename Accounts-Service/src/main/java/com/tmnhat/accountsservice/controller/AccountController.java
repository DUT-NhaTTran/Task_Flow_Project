package com.tmnhat.accountsservice.controller;

import com.tmnhat.accountsservice.model.LoginRequest;
import com.tmnhat.accountsservice.service.AccountService;
import com.tmnhat.accountsservice.service.Impl.AccountServiceImpl;
import com.tmnhat.accountsservice.validation.AccountValidator;
import com.tmnhat.common.payload.ResponseDataAPI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController() {
        this.accountService = new AccountServiceImpl();
    }

    // API login
    @PostMapping("/login")
    public ResponseEntity<ResponseDataAPI> login(@RequestBody LoginRequest loginRequest) {
        AccountValidator.validateLoginRequest(loginRequest); // Validate input
        String token = accountService.login(loginRequest.getEmail(), loginRequest.getPassword()); // Login and get JWT
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(token));
    }

    // API thêm account (optional, dùng để đăng ký nếu cần)
    @PostMapping
    public ResponseEntity<ResponseDataAPI> addAccount(@RequestBody com.tmnhat.accountsservice.model.Accounts account) {
        accountService.addAccount(account);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // (Bạn có thể thêm updateAccount, deleteAccount, getAccountById... nếu muốn mở rộng)
}
