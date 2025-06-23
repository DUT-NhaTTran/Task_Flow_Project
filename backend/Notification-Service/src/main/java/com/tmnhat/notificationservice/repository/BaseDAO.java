package com.tmnhat.notificationservice.repository;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public abstract class BaseDAO {
    protected Connection getConnection() throws SQLException {
        // Use environment variables or hardcoded values for now
        String url = System.getProperty("spring.datasource.url", "jdbc:postgresql://postgres:5432/postgres");
        String username = System.getProperty("spring.datasource.username", "postgre");
        String password = System.getProperty("spring.datasource.password", "Nhatvn123");
        return DriverManager.getConnection(url, username, password);
    }

    protected void executeUpdate(String query, SQLConsumer<PreparedStatement> consumer) throws SQLException {
        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(query)) {
            consumer.accept(stmt);
            stmt.executeUpdate();
        }
    }

    protected <T> T executeQuery(String query, SQLFunction<PreparedStatement, T> function) throws SQLException {
        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(query)) {
            return function.apply(stmt);
        }
    }

    @FunctionalInterface
    public interface SQLConsumer<T> {
        void accept(T t) throws SQLException;
    }
    
    @FunctionalInterface
    public interface SQLFunction<T, R> {
        R apply(T t) throws SQLException;
    }
}

