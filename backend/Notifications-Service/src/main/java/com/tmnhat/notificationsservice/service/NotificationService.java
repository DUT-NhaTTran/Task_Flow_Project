package com.tmnhat.notificationsservice.service;

import com.tmnhat.notificationsservice.model.Notifications;

import java.util.List;
import java.util.UUID;

public interface NotificationService {

    void createNotification(Notifications notification);

    List<Notifications> getNotificationsByUserId(UUID userId);

    List<Notifications> getUnreadNotificationsByUserId(UUID userId);

    void markAsRead(UUID id);

    void markAllAsRead(UUID userId);

    void deleteNotification(UUID id);

    void deleteAllNotificationsByUserId(UUID userId);
}
