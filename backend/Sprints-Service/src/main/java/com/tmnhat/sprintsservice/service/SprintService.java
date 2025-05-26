package com.tmnhat.sprintsservice.service;


import com.tmnhat.sprintsservice.model.Sprints;

import java.util.List;
import java.util.UUID;

public interface SprintService {
    void addSprint(Sprints sprint);
    void updateSprint(UUID id, Sprints sprint);
    void deleteSprint(UUID id);
    Sprints getSprintById(UUID id);
    List<Sprints> getAllSprints();
    Sprints getLastSprintOfProject(UUID projectId);
    List<Sprints> getAllSprintsByProject(UUID projectId);
    void startSprint(UUID sprintId);
    void completeSprint(UUID sprintId);
    void archiveSprint(UUID sprintId);
    List<Sprints> getSprintsByProject(UUID projectId);
    Sprints getActiveSprint(UUID projectId);
    void moveIncompleteTasks(UUID fromSprintId, UUID toSprintId);
}

