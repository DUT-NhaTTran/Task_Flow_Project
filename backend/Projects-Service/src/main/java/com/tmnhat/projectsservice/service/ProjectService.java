package com.tmnhat.projectsservice.service;

import com.tmnhat.projectsservice.model.Projects;

import java.util.List;
import java.util.UUID;

public interface ProjectService {

    void addProject(Projects project);

    void updateProject(UUID id, Projects project);

    void deleteProject(UUID id);

    Projects getProjectById(UUID id);

    List<Projects> getAllProjects();

    void assignMember(UUID projectId, UUID userId, String roleInProject);

    void removeMember(UUID projectId, UUID userId);

    void changeProjectOwner(UUID projectId, UUID newOwnerId);

    List<Projects> searchProjects(String keyword);

    List<Projects> filterProjectsByType(String projectType);

    void archiveProject(UUID projectId);

    List<Projects> paginateProjects(int page, int size);

    UUID getLastInsertedProjectId();

    UUID addProjectReturnId(Projects project);


}
