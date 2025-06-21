# TaskFlow Backend Testing Guide

## 🧪 Cách Test Deployment

Sau khi deploy, bạn cần verify xem hệ thống đã hoạt động đúng chưa. Có nhiều cách để test:

## 🚀 Quick Test (Nhanh nhất)

### 1. Chạy Test Script Tự động
```bash
# Test toàn bộ hệ thống (recommended)
./test-deployment.sh

# Quick health check (nhanh nhất)
./test-deployment.sh quick

# Chỉ test health endpoints
./test-deployment.sh health
```

### 2. Manual Quick Check
```bash
# Kiểm tra container status
docker-compose -f docker-compose.production.yml ps

# Xem service URLs
./test-deployment.sh urls
```

## 🔍 Chi Tiết Các Cách Test

### 1. Container Status Test
```bash
# Kiểm tra containers đang chạy
docker-compose -f docker-compose.production.yml ps

# Kiểm tra logs nếu có container lỗi
docker-compose -f docker-compose.production.yml logs [service-name]

# Ví dụ:
docker-compose -f docker-compose.production.yml logs common-service
```

### 2. Health Endpoints Test
Tất cả service đều có health endpoints:

**Spring Boot Services (Java):**
```bash
curl http://localhost:8081/actuator/health  # Common Service
curl http://localhost:8080/actuator/health  # Accounts Service
curl http://localhost:8086/actuator/health  # User Service
curl http://localhost:8083/actuator/health  # Projects Service
curl http://localhost:8085/actuator/health  # Tasks Service
curl http://localhost:8084/actuator/health  # Sprints Service
curl http://localhost:8089/actuator/health  # Notification Service
curl http://localhost:8087/actuator/health  # File Service
```

**AI Service (Python/FastAPI):**
```bash
curl http://localhost:8000/health           # AI Service
curl http://localhost:8000/docs             # API Documentation
```

### 3. Database & Infrastructure Test
```bash
# Test PostgreSQL
docker-compose -f docker-compose.production.yml exec postgres pg_isready -U postgre

# Connect to database
docker-compose -f docker-compose.production.yml exec postgres psql -U postgre -d postgres

# Test Redis
docker-compose -f docker-compose.production.yml exec redis redis-cli -a redis123 ping
```

### 4. API Endpoints Test
```bash
# Test Common Service info
curl http://localhost:8081/actuator/info

# Test AI Service root
curl http://localhost:8000/

# Test Accounts Service info
curl http://localhost:8080/actuator/info
```

### 5. Resource Usage Test
```bash
# Kiểm tra memory và CPU usage
docker stats

# Kiểm tra disk usage
df -h

# Kiểm tra network
docker network ls
```

## 📊 Test Results Interpretation

### ✅ Success Indicators
- All containers status = "Up"
- Health endpoints return 200 OK
- Database connections working
- No critical errors in logs
- Memory usage < 80%

### ❌ Failure Indicators
- Containers showing "Exited" or "Restarting"
- Health endpoints timeout or 500 error
- Database connection refused
- High error count in logs
- Memory usage > 90%

## 🛠️ Troubleshooting Commands

### Container Issues
```bash
# Restart specific service
docker-compose -f docker-compose.production.yml restart [service-name]

# Rebuild and restart
docker-compose -f docker-compose.production.yml up -d --force-recreate [service-name]

# Check container logs
docker-compose -f docker-compose.production.yml logs --tail=100 [service-name]
```

### Database Issues
```bash
# Check PostgreSQL logs
docker-compose -f docker-compose.production.yml logs postgres

# Access database directly
docker-compose -f docker-compose.production.yml exec postgres psql -U postgre -d postgres

# Check database tables
\dt

# Check connections
SELECT * FROM pg_stat_activity;
```

### Network Issues
```bash
# Test internal connectivity
docker-compose -f docker-compose.production.yml exec common-service curl http://postgres:5432

# Check network configuration
docker network inspect task_flow_project_taskflow_network

# Test external access
curl -I http://your-vps-ip:8081/actuator/health
```

## 📈 Performance Testing

### Load Testing (Optional)
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test single endpoint
ab -n 100 -c 10 http://localhost:8081/actuator/health

# Test with authentication (if needed)
ab -n 100 -c 10 -H "Authorization: Bearer your-token" http://localhost:8080/api/endpoint
```

### Memory Stress Test
```bash
# Monitor memory during load
watch -n 1 'docker stats --no-stream'

# Check for memory leaks
docker-compose -f docker-compose.production.yml exec [service-name] ps aux
```

## 🔧 Specific Test Cases

### Test Database Migration
```bash
# Check if tables were created
docker-compose -f docker-compose.production.yml exec postgres psql -U postgre -d postgres -c "\dt"

# Verify data integrity
docker-compose -f docker-compose.production.yml exec postgres psql -U postgre -d postgres -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### Test File Upload Service
```bash
# Test file upload endpoint (if available)
curl -X POST -F "file=@test.txt" http://localhost:8087/api/upload

# Check upload directory
docker-compose -f docker-compose.production.yml exec file-service ls -la /app/uploads
```

### Test AI Service
```bash
# Test AI service API
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"input": "test data"}'
```

## 📝 Test Automation Script Usage

### Available Commands:
```bash
./test-deployment.sh all         # Full test suite
./test-deployment.sh quick       # Quick health check
./test-deployment.sh containers  # Container status only
./test-deployment.sh health      # Health endpoints only
./test-deployment.sh api         # API endpoints test
./test-deployment.sh infra       # Database & Redis test
./test-deployment.sh logs        # Check logs for errors
./test-deployment.sh network     # Network connectivity
./test-deployment.sh volumes     # Volumes and permissions
./test-deployment.sh urls        # Show all service URLs
```

### Example Output:
```
========================================
 Test Summary Report
========================================
Total Tests: 25
Passed: 25
Failed: 0
Success Rate: 100%
🎉 All tests passed! Deployment is successful!
```

## 🚨 Common Issues & Solutions

### Issue 1: Service Won't Start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs [service-name]

# Common fixes:
# - Check environment variables
# - Verify database connection
# - Check memory limits
# - Restart dependencies first
```

### Issue 2: Database Connection Failed
```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.production.yml ps postgres

# Verify credentials in env.production
# Check network connectivity
docker-compose -f docker-compose.production.yml exec common-service ping postgres
```

### Issue 3: High Memory Usage
```bash
# Check memory stats
docker stats

# Reduce memory limits in docker-compose.production.yml
# Tune JVM settings in env.production
```

### Issue 4: Port Conflicts
```bash
# Check what's using the ports
sudo netstat -tulpn | grep :8080

# Kill conflicting processes or change ports
```

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ All 9 services are running
- ✅ PostgreSQL and Redis are healthy
- ✅ All health endpoints return 200 OK
- ✅ No critical errors in logs
- ✅ Memory usage is reasonable
- ✅ API endpoints respond correctly
- ✅ Database connections work
- ✅ File uploads work (if applicable)

## 📞 Getting Help

If tests fail, check:
1. Service logs: `docker-compose -f docker-compose.production.yml logs [service]`
2. Resource usage: `docker stats`
3. Network connectivity: `docker network ls`
4. Database status: `./test-deployment.sh infra`

Run `./test-deployment.sh all` để có full report về tình trạng deployment! 