package com.tmnhat.sprintsservice.repository;

import com.tmnhat.sprintsservice.model.Sprints;
import com.tmnhat.sprintsservice.payload.enums.SprintStatus;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class SprintDAO extends BaseDAO {

    public void addSprint(Sprints sprint) throws SQLException {
        String sql = "INSERT INTO sprints (project_id, name, start_date, end_date, goal, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, sprint.getProjectId());
            stmt.setString(2, sprint.getName());
            stmt.setTimestamp(3, sprint.getStartDate() != null ? Timestamp.valueOf(sprint.getStartDate().atStartOfDay()) : null);
            stmt.setTimestamp(4, sprint.getEndDate() != null ? Timestamp.valueOf(sprint.getEndDate().atStartOfDay()) : null);
            stmt.setString(5, sprint.getGoal());
            stmt.setString(6, sprint.getStatus() != null ? sprint.getStatus().name() : SprintStatus.NOT_STARTED.name());
            stmt.setTimestamp(7, sprint.getCreatedAt() != null ? Timestamp.valueOf(sprint.getCreatedAt()) : Timestamp.valueOf(java.time.LocalDateTime.now()));
            stmt.setTimestamp(8, sprint.getUpdatedAt() != null ? Timestamp.valueOf(sprint.getUpdatedAt()) : Timestamp.valueOf(java.time.LocalDateTime.now()));
        });
    }

    public void updateSprint(UUID id, Sprints sprint) throws SQLException {
        String sql = "UPDATE sprints SET name = ?, start_date = ?, end_date = ?, goal = ?, updated_at = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, sprint.getName());
            stmt.setTimestamp(2, sprint.getStartDate() != null ? Timestamp.valueOf(sprint.getStartDate().atStartOfDay()) : null);
            stmt.setTimestamp(3, sprint.getEndDate() != null ? Timestamp.valueOf(sprint.getEndDate().atStartOfDay()) : null);
            stmt.setString(4, sprint.getGoal());
            stmt.setTimestamp(5, Timestamp.valueOf(java.time.LocalDateTime.now()));
            stmt.setObject(6, id);
        });
    }

    public void deleteSprint(UUID id) throws SQLException {
        String sql = "DELETE FROM sprints WHERE id = ?";
        executeUpdate(sql, stmt -> stmt.setObject(1, id));
    }

    public Sprints getSprintById(UUID id) throws SQLException {
        String sql = "SELECT * FROM sprints WHERE id = ?";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, id);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToSprint(rs);
            }
            return null;
        });
    }

    public List<Sprints> getAllSprints() throws SQLException {
        String sql = "SELECT * FROM sprints";
        return executeQuery(sql, stmt -> {
            List<Sprints> sprintList = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                sprintList.add(mapResultSetToSprint(rs));
            }
            return sprintList;
        });
    }

    // Bổ sung: Update Status + Start/End Date
    public void updateSprintStatusAndDates(UUID sprintId, SprintStatus status, LocalDate startDate, LocalDate endDate) throws SQLException {
        String sql = "UPDATE sprints SET status = ?, start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date), updated_at = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, status.name());
            stmt.setTimestamp(2, startDate != null ? Timestamp.valueOf(startDate.atStartOfDay()) : null);
            stmt.setTimestamp(3, endDate != null ? Timestamp.valueOf(endDate.atStartOfDay()) : null);
            stmt.setTimestamp(4, Timestamp.valueOf(java.time.LocalDateTime.now()));
            stmt.setObject(5, sprintId);
        });
    }

    // Bổ sung: Chỉ Update Status
    public void updateSprintStatus(UUID sprintId, SprintStatus status) throws SQLException {
        String sql = "UPDATE sprints SET status = ?, updated_at = ? WHERE id = ?";
        executeUpdate(sql, stmt -> {
            stmt.setString(1, status.name());
            stmt.setTimestamp(2, Timestamp.valueOf(java.time.LocalDateTime.now()));
            stmt.setObject(3, sprintId);
        });
    }

    //Bổ sung: Lấy Sprint đang active của Project
    public Sprints getActiveSprintByProject(UUID projectId) throws SQLException {
        String sql = "SELECT * FROM sprints WHERE project_id = ? AND status = ?";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, projectId);
            stmt.setString(2, SprintStatus.ACTIVE.name());
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToSprint(rs);
            }
            return null;
        });
    }

    //Bổ sung: Chuyển task chưa xong sang sprint mới (future)
    public void moveIncompleteTasks(UUID fromSprintId, UUID toSprintId) throws SQLException {
        String sql = "UPDATE tasks SET sprint_id = ? WHERE sprint_id = ? AND status != 'DONE'";
        executeUpdate(sql, stmt -> {
            stmt.setObject(1, toSprintId);
            stmt.setObject(2, fromSprintId);
        });
    }

    //Cập nhật mapResultSetToSprint để hỗ trợ status, createdAt, updatedAt
    private Sprints mapResultSetToSprint(ResultSet rs) throws SQLException {
        return new Sprints.Builder()
                .id(rs.getObject("id", UUID.class))
                .projectId(rs.getObject("project_id", UUID.class))
                .name(rs.getString("name"))
                .startDate(rs.getTimestamp("start_date") != null ? rs.getTimestamp("start_date").toLocalDateTime().toLocalDate() : null)
                .endDate(rs.getTimestamp("end_date") != null ? rs.getTimestamp("end_date").toLocalDateTime().toLocalDate() : null)
                .goal(rs.getString("goal"))
                .status(SprintStatus.valueOf(rs.getString("status")))
                .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                .updatedAt(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                .build();
    }
    public Sprints getLastSprintByProject(UUID projectId) throws SQLException {
        String sql = "SELECT * FROM sprints WHERE project_id = ? ORDER BY end_date DESC LIMIT 1";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, projectId);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToSprint(rs);
            }
            return null;
        });
    }


    public List<Sprints> getSprintsByProject(UUID projectId) throws SQLException {
        String sql = "SELECT * FROM sprints WHERE project_id = ?";
        return executeQuery(sql, stmt -> {
            stmt.setObject(1, projectId);
            List<Sprints> list = new ArrayList<>();
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                list.add(mapResultSetToSprint(rs));
            }
            return list;
        });
    }

}
