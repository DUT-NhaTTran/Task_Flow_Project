# TaskFlow Deployment trên Render

## 🚀 Hướng dẫn Deploy lên Render

### Cấu trúc Repository
```
TaskFlow/
├── backend/
│   ├── AI-Service/          # Python FastAPI
│   ├── User-Service/        # Java Spring Boot
│   ├── Tasks-Service/       # Java Spring Boot
│   ├── Projects-Service/    # Java Spring Boot
│   ├── [Other-Services]/    # Các service khác
│   ├── pom.xml             # Parent POM
│   └── mvnw                # Maven wrapper
└── frontend/               # React application
```

### Bước 1: Chuẩn bị Repository
1. **Push code lên GitHub:**
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Bước 2: Tạo Account Render
1. Truy cập [render.com](https://render.com)
2. Đăng ký/Đăng nhập bằng GitHub account
3. Connect repository của bạn

### Bước 3: Deploy Database (PostgreSQL)
1. **Tạo PostgreSQL database:**
   - Dashboard → "New" → "PostgreSQL"
   - Name: `taskflow-database`
   - Plan: Free
   - Click "Create Database"

2. **Lưu connection string** để sử dụng cho các services

### Bước 4: Deploy AI Service (Python FastAPI)
1. **Tạo Web Service:**
   - Dashboard → "New" → "Web Service"
   - Connect repository
   - Name: `taskflow-ai-service`
   - Environment: `Python 3`
   - Build Command: `cd backend/AI-Service && pip install -r requirements.txt`
   - Start Command: `cd backend/AI-Service && uvicorn main:app --host 0.0.0.0 --port $PORT`

2. **Environment Variables:**
   ```
   DATABASE_URL=<Copy "External Database URL" từ Render Dashboard>
   OPENAI_API_KEY=<your-openai-key>
   PYTHON_VERSION=3.11.0
   ENVIRONMENT=production
   ```

   **Lưu ý:** Sử dụng **External Database URL** từ database dashboard, có dạng:
   ```
   postgresql://taskflow_user:password@hostname:5432/database_name
   ```

### Bước 5: Deploy Java Services (Sử dụng Docker)
**Vì Render không có Java environment, chúng ta sử dụng Docker cho Java services:**

**Cho mỗi service (User, Tasks, Projects):**

1. **Tạo Web Service mới**
2. **Cấu hình:**
   - Name: `taskflow-[service-name]-service`
   - Environment: `Docker`
   - Dockerfile Path: `backend/[Service-Name]/Dockerfile`
   - Auto-Deploy: `Yes`

**Ví dụ cho User Service:**
   - Environment: `Docker`
   - Dockerfile Path: `backend/User-Service/Dockerfile`

**Ví dụ cho Tasks Service:**
   - Environment: `Docker`
   - Dockerfile Path: `backend/Tasks-Service/Dockerfile`

**Ví dụ cho Projects Service:**
   - Environment: `Docker`
   - Dockerfile Path: `backend/Projects-Service/Dockerfile`

3. **Environment Variables:**
   ```
   DATABASE_URL=<Copy "External Database URL" từ Render Dashboard>
   SPRING_PROFILES_ACTIVE=render
   ```

   **Quan trọng:** Luôn sử dụng **External Database URL** cho tất cả services!

### Docker Build Process
Mỗi Java service sẽ được build với:
- **Stage 1:** Maven build với OpenJDK 17
- **Stage 2:** Runtime với OpenJDK 17 JRE (optimized)
- **Health checks:** Tự động kiểm tra service health
- **Security:** Non-root user execution

### Bước 6: Deploy Frontend (React)
1. **Tạo Web Service:**
   - Name: `taskflow-frontend`
   - Environment: `Node`
   - Build Command: `cd frontend && npm install && npm run build`
   - Start Command: `cd frontend && npm start`

2. **Environment Variables:**
   ```
   REACT_APP_AI_SERVICE_URL=https://taskflow-ai-service.onrender.com
   REACT_APP_USER_SERVICE_URL=https://taskflow-user-service.onrender.com
   REACT_APP_TASKS_SERVICE_URL=https://taskflow-tasks-service.onrender.com
   REACT_APP_PROJECTS_SERVICE_URL=https://taskflow-projects-service.onrender.com
   ```

## 🔧 Cấu hình Database

### Cấu trúc Backend Multi-Module
Cấu trúc backend sử dụng Maven multi-module với parent POM trong thư mục `backend/`:

```xml
<!-- backend/pom.xml -->
<packaging>pom</packaging>
<modules>
    <module>User-Service</module>
    <module>Tasks-Service</module>
    <module>Projects-Service</module>
    <!-- Các module khác -->
</modules>
```

### Cập nhật Spring Boot Configuration
Tạo file `application-render.yml` trong mỗi Java service (`backend/[Service]/src/main/resources/`):

```yaml
spring:
  datasource:
    url: ${DATABASE_URL}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
  
server:
  port: ${PORT:8080}
```

### Cập nhật AI Service Configuration
AI Service đã được cấu hình trong `backend/AI-Service/app/core/config.py`:

```python
import os

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://localhost/taskflow")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    PORT: int = int(os.getenv("PORT", 8088))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

settings = Settings()
```

## 🌐 Custom Domains (Optional)

### Cấu hình Domain cho Frontend
1. **Mua domain** (VD: taskflow.com)
2. **Render Dashboard:**
   - Chọn frontend service
   - Settings → Custom Domains
   - Add domain: `taskflow.com`
3. **Cấu hình DNS:**
   ```
   Type: CNAME
   Name: @
   Value: taskflow-frontend.onrender.com
   ```

## 📊 Monitoring & Logs

### Xem Logs
```bash
# Render Dashboard → Service → Logs tab
# Hoặc sử dụng Render CLI
render logs taskflow-ai-service --tail
```

### Health Checks
Render tự động thực hiện health checks. Đảm bảo services có endpoint `/health`:

```python
# AI Service
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}
```

```java
// Java Services
@RestController
public class HealthController {
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "healthy");
        return ResponseEntity.ok(status);
    }
}
```

## 🔒 Security & Environment Variables

### Secure Environment Variables
1. **Database passwords:** Tự động generate bởi Render
2. **API Keys:** Thêm qua Dashboard, không commit vào code
3. **JWT Secrets:** Generate strong secrets

### CORS Configuration
Cập nhật CORS cho production:

```java
// Java Services
@CrossOrigin(origins = {"https://taskflow-frontend.onrender.com"})
```

```python
# AI Service
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://taskflow-frontend.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures:**
   ```bash
   # Kiểm tra build logs
   # Đảm bảo dependencies trong requirements.txt/pom.xml
   ```

2. **Database Connection:**
   ```bash
   # Kiểm tra DATABASE_URL format
   # postgresql://user:password@host:port/database
   ```

3. **Service Not Starting:**
   ```bash
   # Kiểm tra PORT environment variable
   # Render tự động set PORT, không hardcode
   ```

4. **Frontend API Calls Failing:**
   ```bash
   # Kiểm tra CORS configuration
   # Đảm bảo API URLs trong environment variables
   ```

## 💰 Cost Optimization

### Free Tier Limits
- **Web Services:** 750 hours/month
- **PostgreSQL:** 1GB storage
- **Bandwidth:** 100GB/month

### Upgrade Plans
- **Starter:** $7/month per service
- **Standard:** $25/month per service
- **Pro:** $85/month per service

### Tips để tối ưu cost:
1. Sử dụng 1 database cho tất cả services
2. Implement caching để giảm database calls
3. Optimize build times
4. Sử dụng CDN cho static assets

## 📞 Support

### Render Support
- [Render Documentation](https://render.com/docs)
- [Community Forum](https://community.render.com)
- [Status Page](https://status.render.com)

### TaskFlow Support
- Kiểm tra logs: Render Dashboard → Service → Logs
- Database issues: Kiểm tra connection string
- Build issues: Xem build logs trong Deploy tab

## 🎯 Production Checklist

- [ ] All services deployed successfully
- [ ] Database connected and tables created
- [ ] Environment variables configured
- [ ] CORS settings updated for production
- [ ] Health checks working
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic)
- [ ] Monitoring setup
- [ ] Backup strategy planned

## 🔄 CI/CD with GitHub

Render tự động deploy khi push code lên GitHub:

1. **Auto-deploy:** Enabled by default
2. **Branch:** Chọn `main` branch
3. **Build:** Tự động trigger khi có commit mới

### Deploy Strategy
```bash
# Development workflow
git checkout -b feature/new-feature
# ... make changes ...
git commit -m "Add new feature"
git push origin feature/new-feature

# Create PR and merge to main
# Render sẽ tự động deploy
```

---

**🎉 Chúc mừng! TaskFlow của bạn đã được deploy thành công trên Render!**

Frontend URL: `https://taskflow-frontend.onrender.com`
API Documentation: `https://taskflow-ai-service.onrender.com/docs` 