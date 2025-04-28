package com.tmnhat.projectsservice.service.Impl;

import com.tmnhat.common.exception.DatabaseException;
import com.tmnhat.common.exception.ResourceNotFoundException;
import com.tmnhat.projectsservice.model.Projects;
import com.tmnhat.projectsservice.repository.ProjectDAO;
import com.tmnhat.projectsservice.repository.ProjectMemberDAO;
import com.tmnhat.projectsservice.service.ProjectService;
import com.tmnhat.projectsservice.validation.ProjectValidator;

import java.util.List;
import java.util.UUID;

public class ProjectServiceImpl implements ProjectService {

    private final ProjectMemberDAO projectMemberDAO = new ProjectMemberDAO();
    private final ProjectDAO projectDAO = new ProjectDAO();

    @Override
    public void addProject(Projects project) {
        try {
            ProjectValidator.validateProject(project);
            projectDAO.addProject(project);
        } catch (Exception e) {
            throw new DatabaseException("Error adding project: " + e.getMessage());
        }
    }

    @Override
    public void updateProject(UUID id, Projects project) {
        try {
            ProjectValidator.validateProjectId(id);
            ProjectValidator.validateProject(project);
            Projects existingProject = projectDAO.getProjectById(id);
            if (existingProject == null) {
                throw new ResourceNotFoundException("Project not found with ID " + id);
            }
            projectDAO.updateProject(id, project);
        } catch (Exception e) {
            throw new DatabaseException("Error updating project: " + e.getMessage());
        }
    }

    @Override
    public void deleteProject(UUID id) {
        try {
            ProjectValidator.validateProjectId(id);
            Projects existingProject = projectDAO.getProjectById(id);
            if (existingProject == null) {
                throw new ResourceNotFoundException("Project not found with ID " + id);
            }
            projectDAO.deleteProject(id);
        } catch (Exception e) {
            throw new DatabaseException("Error deleting project: " + e.getMessage());
        }
    }

    @Override
    public Projects getProjectById(UUID id) {
        try {
            ProjectValidator.validateProjectId(id);
            Projects project = projectDAO.getProjectById(id);
            if (project == null) {
                throw new ResourceNotFoundException("Project not found with ID " + id);
            }
            return project;
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving project: " + e.getMessage());
        }
    }

    @Override
    public List<Projects> getAllProjects() {
        try {
            return projectDAO.getAllProjects();
        } catch (Exception e) {
            throw new DatabaseException("Error retrieving projects: " + e.getMessage());
        }
    }
    @Override
    public void assignMember(UUID projectId, UUID userId, String roleInProject) {
        try {
            Projects project = projectDAO.getProjectById(projectId);
            if (project == null) {
                throw new ResourceNotFoundException("Project not found with ID " + projectId);
            }
            projectMemberDAO.assignMember(projectId, userId, roleInProject);
        } catch (Exception e) {
            throw new DatabaseException("Error assigning member: " + e.getMessage());
        }
    }

    @Override
    public void removeMember(UUID projectId, UUID userId) {
        try {
            projectMemberDAO.removeMember(projectId, userId);
        } catch (Exception e) {
            throw new DatabaseException("Error removing member: " + e.getMessage());
        }
    }

    @Override
    public void changeProjectOwner(UUID projectId, UUID newOwnerId) {
        try {
            Projects project = projectDAO.getProjectById(projectId);
            if (project == null) {
                throw new ResourceNotFoundException("Project not found with ID " + projectId);
            }
            projectMemberDAO.changeProjectOwner(projectId, newOwnerId);
        } catch (Exception e) {
            throw new DatabaseException("Error changing project owner: " + e.getMessage());
        }
    }

    @Override
    public List<Projects> searchProjects(String keyword) {
        try {
            return projectDAO.searchProjects(keyword);
        } catch (Exception e) {
            throw new DatabaseException("Error searching projects: " + e.getMessage());
        }
    }

    @Override
    public List<Projects> filterProjectsByStatus(String status) {
        try {
            return projectMemberDAO.filterProjectsByStatus(status);
        } catch (Exception e) {
            throw new DatabaseException("Error filtering projects: " + e.getMessage());
        }
    }

    @Override
    public void archiveProject(UUID projectId) {
        try {
            Projects project = projectDAO.getProjectById(projectId);
            if (project == null) {
                throw new ResourceNotFoundException("Project not found with ID " + projectId);
            }
            projectDAO.archiveProject(projectId);
        } catch (Exception e) {
            throw new DatabaseException("Error archiving project: " + e.getMessage());
        }
    }

    @Override
    public List<Projects> paginateProjects(int page, int size) {
        try {
            return projectDAO.paginateProjects(page, size);
        } catch (Exception e) {
            throw new DatabaseException("Error paginating projects: " + e.getMessage());
        }
    }
    
}
