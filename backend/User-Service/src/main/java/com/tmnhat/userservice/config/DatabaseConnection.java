package com.tmnhat.userservice.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnection {
    private static final String URL = "jdbc:postgresql://localhost:5432/postgres";
    private static final String USER = "postgre";
    private static final String PASSWORD = "Nhatvn123";

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }
    
    private DatabaseConnection() {
        // Private constructor to prevent instantiation
    }
    
    public static void main(String[] args) {
        try (Connection conn = getConnection()) {
            if (conn != null) {
                System.out.println("Connected to PostgreSQL successfully!");
            } else {
                System.out.println("Connection failed!");
            }
        } catch (SQLException e) {
            System.err.println("PostgreSQL connection error: " + e.getMessage());
        }
    }
} 