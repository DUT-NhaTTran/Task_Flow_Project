package com.tmnhat.fileservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import java.io.File;

@SpringBootApplication
public class FileServiceApplication {

    public static void main(String[] args) {
        // Create upload directory if it doesn't exist
        new File("uploads").mkdirs();
        
        SpringApplication.run(FileServiceApplication.class, args);
    }
} 