package com.tmnhat.userservice.controller;

import com.tmnhat.common.payload.ResponseDataAPI;
import com.tmnhat.userservice.model.Users;
import com.tmnhat.userservice.service.UserService;
import com.tmnhat.userservice.service.Impl.UserServiceImpl;

import com.tmnhat.userservice.validation.UserValidator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController() {
        this.userService = new UserServiceImpl();
    }

    // Lấy danh sách tất cả người dùng
    @GetMapping
    public ResponseEntity<ResponseDataAPI> getAllUsers() {
        List<Users> users = userService.getAllUsers();
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(users));
    }

    // Lấy thông tin người dùng theo ID (Kiểm tra ID hợp lệ)
    @GetMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> getUserById(@PathVariable("id") UUID id) {
        UserValidator.validateId(id);
        Users user = userService.getUserById(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(user));
    }

    // Thêm người dùng mới (Kiểm tra dữ liệu hợp lệ)
    @PostMapping
    public ResponseEntity<ResponseDataAPI> addUser(@RequestBody Users user) {
        UserValidator.validateUser(user);
        userService.addUser(user);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(user));
    }

    // Cập nhật thông tin người dùng (Kiểm tra ID & dữ liệu hợp lệ)
    @PatchMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> updateUser(@PathVariable("id") UUID id, @RequestBody Users user) {
        UserValidator.validateId(id);
        UserValidator.validateUser(user);
        userService.updateUser(id, user);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

}
