package com.tmnhat.userservice.service;

import com.tmnhat.userservice.model.Users;

import java.util.List;
import java.util.UUID;

public interface UserService {

    // CRUD cơ bản
    void addUser(Users user);

    void updateUser(UUID id, Users user);

    List<Users> getAllUsers();

    Users getUserById(UUID id);

    List<Users> searchUsers(String keyword);

    List<Users> getUsersByProject(UUID projectId);

    void assignUserToProject(UUID projectId, UUID userId, String roleInProject);

    void removeUserFromProject(UUID projectId, UUID userId);

    String getUserRoleInProject(UUID projectId, UUID userId);

    void deactivateUser(UUID id);

    void activateUser(UUID id);

    List<Users> getActiveUsers();

    void updateUserRole(UUID id, String newRole);
}
