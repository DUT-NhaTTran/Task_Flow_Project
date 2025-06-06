package com.taskflow.notification.repository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Optional;

public abstract class BaseDAO {
    
    @Autowired
    protected JdbcTemplate jdbcTemplate;

    protected void executeUpdate(String query, Object... params) {
        jdbcTemplate.update(query, params);
    }

    protected <T> Optional<T> queryForObject(String query, RowMapper<T> rowMapper, Object... params) {
        try {
            T result = jdbcTemplate.queryForObject(query, rowMapper, params);
            return Optional.ofNullable(result);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    protected <T> List<T> queryForList(String query, RowMapper<T> rowMapper, Object... params) {
        return jdbcTemplate.query(query, rowMapper, params);
    }

    protected Long queryForLong(String query, Object... params) {
        Long result = jdbcTemplate.queryForObject(query, Long.class, params);
        return result != null ? result : 0L;
    }

    protected Integer queryForInt(String query, Object... params) {
        Integer result = jdbcTemplate.queryForObject(query, Integer.class, params);
        return result != null ? result : 0;
    }

    protected boolean exists(String query, Object... params) {
        Integer count = jdbcTemplate.queryForObject(query, Integer.class, params);
        return count != null && count > 0;
    }
} 