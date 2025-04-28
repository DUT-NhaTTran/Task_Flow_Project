package com.tmnhat.notificationsservice.validation;

import com.tmnhat.common.exception.BadRequestException;
import com.tmnhat.notificationsservice.model.Notifications;

import javax.management.Notification;
import java.util.UUID;

public class NotificationValidator {

    public static void validateNotification(Notifications notification) {
        if (notification == null) {
            throw new BadRequestException("Notification data is required");
        }
        if (notification.getTitle() == null || notification.getTitle().trim().isEmpty()) {
            throw new BadRequestException("Notification title cannot be empty");
        }
        if (notification.getMessage() == null || notification.getMessage().trim().isEmpty()) {
            throw new BadRequestException("Notification message cannot be empty");
        }
    }

    public static void validateNotificationId(UUID id) {
        if (id == null) {
            throw new BadRequestException("Notification ID is required");
        }
    }
}
