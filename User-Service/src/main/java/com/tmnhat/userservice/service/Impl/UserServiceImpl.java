package com.tmnhat.userservice.service.Impl;

import com.tmnhat.common.exception.DatabaseException;
import com.tmnhat.common.exception.ResourceNotFoundException;
import com.tmnhat.userservice.model.Users;
import com.tmnhat.userservice.repository.UserDAO;
import com.tmnhat.userservice.service.UserService;
import com.tmnhat.userservice.validation.UserValidator;

import java.util.List;
import java.util.UUID;

public class UserServiceImpl implements UserService {

    private final UserDAO userDAO = new UserDAO();

    @Override
    public void addUser(Users user) {
        try {
            UserValidator.validateUser(user);
            userDAO.addUser(user);
        } catch (Exception e) {
            throw new DatabaseException("Error adding user: " + e.getMessage());
        }
    }

    @Override
    public void updateUser(UUID id, Users user) {
        try {
            UserValidator.validateUserId(id);
            UserValidator.validateUser(user);
            Users existingUser = userDAO.getUserById(id);
            if (existingUser == null) {
                throw new ResourceNotFoundException("User not found with ID: " + id);
            }
            userDAO.updateUser(id, user);
        } catch (Exception e) {
            throw new DatabaseException("Error updating user: " + e.getMessage());
        }
    }

    @Override
    public List<Users> getAllUsers() {
        try {
            return userDAO.getAllUsers();
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving users: " + e.getMessage());
        }
    }

    @Override
    public Users getUserById(UUID id) {
        try {
            UserValidator.validateUserId(id);
            return userDAO.getUserById(id);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving user: " + e.getMessage());
        }
    }

    @Override
    public List<Users> searchUsers(String keyword) {
        try {
            return userDAO.searchUsers(keyword);
        } catch (Exception e) {
            throw new DatabaseException("Error searching users: " + e.getMessage());
        }
    }

    @Override
    public List<Users> getUsersByProject(UUID projectId) {
        try {
            return userDAO.getUsersByProject(projectId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving users by project: " + e.getMessage());
        }
    }

    @Override
    public void assignUserToProject(UUID projectId, UUID userId, String roleInProject) {
        try {
            UserValidator.validateUserId(userId);
            userDAO.assignUserToProject(projectId, userId, roleInProject);
        } catch (Exception e) {
            throw new DatabaseException("Error assigning user to project: " + e.getMessage());
        }
    }

    @Override
    public void removeUserFromProject(UUID projectId, UUID userId) {
        try {
            UserValidator.validateUserId(userId);
            userDAO.removeUserFromProject(projectId, userId);
        } catch (Exception e) {
            throw new DatabaseException("Error removing user from project: " + e.getMessage());
        }
    }

    @Override
    public String getUserRoleInProject(UUID projectId, UUID userId) {
        try {
            UserValidator.validateUserId(userId);
            return userDAO.getUserRoleInProject(projectId, userId);
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving user role in project: " + e.getMessage());
        }
    }

    @Override
    public void deactivateUser(UUID id) {
        try {
            UserValidator.validateUserId(id);
            userDAO.deactivateUser(id);
        } catch (Exception e) {
            throw new DatabaseException("Error deactivating user: " + e.getMessage());
        }
    }

    @Override
    public void activateUser(UUID id) {
        try {
            UserValidator.validateUserId(id);
            userDAO.activateUser(id);
        } catch (Exception e) {
            throw new DatabaseException("Error activating user: " + e.getMessage());
        }
    }

    @Override
    public List<Users> getActiveUsers() {
        try {
            return userDAO.getActiveUsers();
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving active users: " + e.getMessage());
        }
    }

    @Override
    public void updateUserRole(UUID id, String newRole) {
        try {
            UserValidator.validateUserId(id);
            userDAO.updateUserRole(id, newRole);
        } catch (Exception e) {
            throw new DatabaseException("Error updating user role: " + e.getMessage());
        }
    }
}
