package com.tmnhat.notificationsservice.service.Impl;

import com.tmnhat.common.exception.DatabaseException;
import com.tmnhat.notificationsservice.model.Notifications;
import com.tmnhat.notificationsservice.repository.NotificationDAO;
import com.tmnhat.notificationsservice.service.NotificationService;
import com.tmnhat.notificationsservice.validation.NotificationValidator;

import java.util.List;
import java.util.UUID;

public class NotificationServiceImpl implements NotificationService {

    private final NotificationDAO notificationDAO = new NotificationDAO();

    @Override
    public void createNotification(Notifications notification) {
        try {
            NotificationValidator.validateNotification(notification);
            notificationDAO.addNotification(notification);
        } catch (Exception e) {
            throw new DatabaseException("Error creating notification: " + e.getMessage());
        }
    }

    @Override
    public List<Notifications> getNotificationsByUserId(UUID userId) {
        try {
            return notificationDAO.getNotificationsByUserId(userId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving notifications: " + e.getMessage());
        }
    }

    @Override
    public List<Notifications> getUnreadNotificationsByUserId(UUID userId) {
        try {
            return notificationDAO.getUnreadNotificationsByUserId(userId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving unread notifications: " + e.getMessage());
        }
    }

    @Override
    public void markAsRead(UUID id) {
        try {
            notificationDAO.markAsRead(id);
        } catch (Exception e) {
            throw new DatabaseException("Error marking notification as read: " + e.getMessage());
        }
    }

    @Override
    public void markAllAsRead(UUID userId) {
        try {
            notificationDAO.markAllAsRead(userId);
        } catch (Exception e) {
            throw new DatabaseException("Error marking all notifications as read: " + e.getMessage());
        }
    }

    @Override
    public void deleteNotification(UUID id) {
        try {
            notificationDAO.deleteNotification(id);
        } catch (Exception e) {
            throw new DatabaseException("Error deleting notification: " + e.getMessage());
        }
    }

    @Override
    public void deleteAllNotificationsByUserId(UUID userId) {
        try {
            notificationDAO.deleteAllNotificationsByUserId(userId);
        } catch (Exception e) {
            throw new DatabaseException("Error deleting all notifications: " + e.getMessage());
        }
    }
}
