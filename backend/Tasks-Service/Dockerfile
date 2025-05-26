# Multi-stage build for Java Spring Boot
FROM maven:3.9.4-openjdk-17-slim AS build

# Set working directory
WORKDIR /app

# Copy parent pom and wrapper files
COPY ../pom.xml ./
COPY ../mvnw ./
COPY ../.mvn ./.mvn/

# Copy common modules if they exist
COPY ../common ./common/

# Copy Tasks Service source
COPY . ./Tasks-Service/

# Build the application
RUN ./mvnw clean install -DskipTests -pl Tasks-Service -am

# Runtime stage
FROM openjdk:17-jre-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy built jar from build stage
COPY --from=build /app/Tasks-Service/target/*.jar app.jar

# Create non-root user
RUN addgroup --system spring && adduser --system spring --ingroup spring
USER spring:spring

# Expose port
EXPOSE 8084

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8084/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "/app/app.jar"] 