package com.tmnhat.notificationsservice.controller;

import com.tmnhat.common.payload.ResponseDataAPI;

import com.tmnhat.notificationsservice.model.Notifications;
import com.tmnhat.notificationsservice.service.Impl.NotificationServiceImpl;
import com.tmnhat.notificationsservice.service.NotificationService;
import com.tmnhat.notificationsservice.validation.NotificationValidator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController() {
        this.notificationService = new NotificationServiceImpl();
    }

    // Gửi notification mới
    @PostMapping
    public ResponseEntity<ResponseDataAPI> createNotification(@RequestBody Notifications notification) {
        NotificationValidator.validateNotification(notification);
        notificationService.createNotification(notification);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Lấy danh sách notification của user
    @GetMapping
    public ResponseEntity<ResponseDataAPI> getNotificationsByUserId(@RequestParam UUID userId) {
        List<Notifications> notifications = notificationService.getNotificationsByUserId(userId);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(notifications));
    }

    // Đánh dấu notification đã đọc
    @PatchMapping("/{id}/read")
    public ResponseEntity<ResponseDataAPI> markAsRead(@PathVariable UUID id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    // Xóa notification
    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> deleteNotification(@PathVariable UUID id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }
}
