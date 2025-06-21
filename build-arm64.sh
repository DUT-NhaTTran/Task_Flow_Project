#!/bin/bash

echo "🔨 Building ARM64 Docker images for TaskFlow services..."

# Common Service
echo "Building Common Service..."
cd backend/common
docker build --platform linux/arm64 -t tranminnhatdut/taskflow-backend:common-arm64 .
cd ../..

# Accounts Service  
echo "Building Accounts Service..."
cd backend/Accounts-Service
docker build --platform linux/arm64 -t tranminnhatdut/taskflow-backend:accounts-arm64 .
cd ../..

# Projects Service
echo "Building Projects Service..."
cd backend/Projects-Service
docker build --platform linux/arm64 -t tranminnhatdut/taskflow-backend:projects-arm64 .
cd ../..

# User Service
echo "Building User Service..."
cd backend/User-Service
docker build --platform linux/arm64 -t tranminnhatdut/taskflow-backend:user-arm64 .
cd ../..

# Tasks Service
echo "Building Tasks Service..."
cd backend/Tasks-Service
docker build --platform linux/arm64 -t tranminnhatdut/taskflow-backend:tasks-arm64 .
cd ../..

# Sprints Service
echo "Building Sprints Service..."
cd backend/Sprints-Service
docker build --platform linux/arm64 -t tranminnhatdut/taskflow-backend:sprints-arm64 .
cd ../..

# Notification Service
echo "Building Notification Service..."
cd backend/Notification-Service
docker build --platform linux/arm64 -t tranminnhatdut/taskflow-backend:notification-arm64 .
cd ../..

# File Service
echo "Building File Service..."
cd backend/File-Service
docker build --platform linux/arm64 -t tranminnhatdut/taskflow-backend:file-arm64 .
cd ../..

echo "✅ All ARM64 images built successfully!"
echo "🐳 Available images:"
docker images | grep "tranminnhatdut/taskflow-backend" 