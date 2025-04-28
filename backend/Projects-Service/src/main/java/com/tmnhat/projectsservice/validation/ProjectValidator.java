package com.tmnhat.projectsservice.validation;

import com.tmnhat.common.exception.BadRequestException;
import com.tmnhat.projectsservice.model.Projects;

import java.util.UUID;

public class ProjectValidator {

    public static void validateProject(Projects project) {
        if (project == null) {
            throw new BadRequestException("Project data is required");
        }
        if (project.getName() == null || project.getName().trim().isEmpty()) {
            throw new BadRequestException("Project name cannot be empty");
        }
        if (project.getDescription() == null || project.getDescription().trim().isEmpty()) {
            throw new BadRequestException("Project description cannot be empty");
        }
        if (project.getOwnerId() == null) {
            throw new BadRequestException("Owner ID cannot be null");
        }
    }

    public static void validateProjectId(UUID id) {
        if (id == null) {
            throw new BadRequestException("Project ID is required");
        }
    }
}
