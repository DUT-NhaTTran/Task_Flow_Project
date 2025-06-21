# Multi-stage build for Java Spring Boot with Common dependency
FROM eclipse-temurin:21-jdk AS common-build

# Install Maven
RUN apt-get update && \
    apt-get install -y maven && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy common service files
COPY common ./common/

# Build common module first
WORKDIR /app/common
RUN mvn clean install -DskipTests

# Main build stage for Sprints Service
FROM eclipse-temurin:21-jdk AS build

# Install Maven
RUN apt-get update && \
    apt-get install -y maven && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy common artifact from previous stage
COPY --from=common-build /root/.m2 /root/.m2

# Copy sprints service files
COPY Sprints-Service/pom.xml ./
COPY Sprints-Service/src ./src/
COPY Sprints-Service/mvnw ./
COPY Sprints-Service/.mvn ./.mvn/

# Build the application
RUN ./mvnw clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy built jar from build stage
COPY --from=build /app/target/*.jar app.jar

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