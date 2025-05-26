package com.tmnhat.projectsservice.service;

import com.tmnhat.projectsservice.model.Projects;
import com.tmnhat.projectsservice.model.Users;
import com.tmnhat.projectsservice.model.ProjectMembers;
import java.util.List;
import java.util.UUID;

public interface ProjectService {

    void addProject(Projects project);

    void updateProject(UUID id, Projects project);

    void deleteProject(UUID id);

    Projects getProjectById(UUID id);

    List<Projects> getAllProjects();

    void assignMember(UUID projectId, UUID userId, String roleInProject);
    
    void assignMember(ProjectMembers memberDTO);

    void removeMember(UUID projectId, UUID userId);

    void changeProjectOwner(UUID projectId, UUID newOwnerId);

    List<Projects> searchProjects(String keyword);

    List<Projects> filterProjectsByType(String projectType);

    void archiveProject(UUID projectId);

    List<Projects> paginateProjects(int page, int size);

    UUID getLastInsertedProjectId();

    UUID addProjectReturnId(Projects project);

    Projects getLatestProjectByOwnerId(UUID ownerId);
    
    List<Users> getProjectUsers(UUID projectId);
    
    void updateMemberRole(ProjectMembers memberDTO);
    
    String getRoleInProject(UUID projectId, UUID userId);

}
