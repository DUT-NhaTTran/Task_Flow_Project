# TaskFlow Backend Deployment Guide

## Tổng quan
Hướng dẫn deploy 9 microservices của TaskFlow Backend lên VPS Vietnix với PostgreSQL database và Redis cache.

## Kiến trúc hệ thống

### Services (9 services):
1. **Common Service** (Port 8081) - Shared utilities
2. **AI Service** (Port 8000) - Python/FastAPI
3. **Accounts Service** (Port 8080) - Authentication & Authorization
4. **User Service** (Port 8086) - User management
5. **Projects Service** (Port 8083) - Project management
6. **Tasks Service** (Port 8085) - Task management
7. **Sprints Service** (Port 8084) - Sprint management
8. **Notification Service** (Port 8089) - Notifications
9. **File Service** (Port 8087) - File upload/download

### Infrastructure:
- **PostgreSQL 15** - Database
- **Redis 7** - Cache & Session storage
- **Nginx** - Reverse proxy
- **Watchtower** - Auto-update containers

## Yêu cầu hệ thống VPS

### Minimum Requirements:
- **CPU**: 4 cores
- **RAM**: 8GB
- **Disk**: 50GB SSD
- **OS**: Ubuntu 20.04 LTS hoặc CentOS 8
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

### Recommended:
- **CPU**: 8 cores
- **RAM**: 16GB
- **Disk**: 100GB SSD

## Cài đặt Docker trên VPS

### Ubuntu/Debian:
```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### CentOS/RHEL:
```bash
# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Deployment Steps

### 1. Chuẩn bị trên máy local

```bash
# Clone repository
git clone <your-repo-url>
cd Task_Flow_Project

# Build và push images lên DockerHub
chmod +x deploy.sh
./deploy.sh build
./deploy.sh push
```

### 2. Cấu hình trên VPS

```bash
# Tạo thư mục project
sudo mkdir -p /opt/taskflow
cd /opt/taskflow

# Copy files cần thiết
scp docker-compose.production.yml user@your-vps:/opt/taskflow/
scp env.production user@your-vps:/opt/taskflow/
scp deploy.sh user@your-vps:/opt/taskflow/
scp -r nginx/ user@your-vps:/opt/taskflow/

# Set permissions
chmod +x deploy.sh
```

### 3. Cấu hình Nginx (tuỳ chọn)

Tạo file `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server accounts-service:8080;
    }
    
    upstream ai {
        server ai-service:8000;
    }
    
    server {
        listen 80;
        server_name your-domain.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl;
        server_name your-domain.com;
        
        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # API Gateway
        location /api/accounts/ {
            proxy_pass http://accounts-service:8080/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        location /api/ai/ {
            proxy_pass http://ai-service:8000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        # Add other services...
    }
}
```

### 4. Deploy

```bash
# Deploy tất cả services
./deploy.sh deploy

# Hoặc full deployment (build + push + deploy)
./deploy.sh full
```

### 5. Kiểm tra deployment

```bash
# Check service status
./deploy.sh status

# Health check
./deploy.sh health

# View logs
./deploy.sh logs
```

## Quản lý hệ thống

### Monitoring
```bash
# Real-time logs
docker-compose -f docker-compose.production.yml logs -f

# Resource usage
docker stats

# Service status
docker-compose -f docker-compose.production.yml ps
```

### Backup Database
```bash
# Manual backup
./deploy.sh backup

# Scheduled backup (add to crontab)
0 2 * * * cd /opt/taskflow && ./deploy.sh backup
```

### Update Services
```bash
# Watchtower sẽ tự động update khi có image mới
# Hoặc manual update:
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

## Security

### Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# Firewalld (CentOS)
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### SSL Certificate (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/taskflow/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/taskflow/nginx/ssl/key.pem
```

## Troubleshooting

### Common Issues

1. **Service không start**
   ```bash
   # Check logs
   docker-compose -f docker-compose.production.yml logs [service-name]
   
   # Restart service
   docker-compose -f docker-compose.production.yml restart [service-name]
   ```

2. **Database connection issues**
   ```bash
   # Check database logs
   docker-compose -f docker-compose.production.yml logs postgres
   
   # Connect to database
   docker-compose -f docker-compose.production.yml exec postgres psql -U postgre -d postgres
   ```

3. **Memory issues**
   ```bash
   # Check resource usage
   docker stats
   
   # Cleanup unused resources
   ./deploy.sh cleanup
   ```

### Performance Tuning

1. **Database optimization**
   - Tăng `shared_buffers` trong PostgreSQL
   - Setup connection pooling
   - Configure appropriate work_mem

2. **Java services optimization**
   - Điều chỉnh JAVA_OPTS trong env.production
   - Monitor GC performance
   - Tune heap sizes based on available memory

3. **Redis optimization**
   - Configure appropriate maxmemory
   - Set eviction policy
   - Monitor memory usage

## URLs & Endpoints

Sau khi deploy thành công, các service sẽ available tại:

- **Accounts API**: `http://your-vps-ip:8080`
- **AI API**: `http://your-vps-ip:8000`
- **User API**: `http://your-vps-ip:8086`
- **Projects API**: `http://your-vps-ip:8083`
- **Tasks API**: `http://your-vps-ip:8085`
- **Sprints API**: `http://your-vps-ip:8084`
- **Notifications API**: `http://your-vps-ip:8089`
- **File API**: `http://your-vps-ip:8087`
- **Common API**: `http://your-vps-ip:8081`

## Contact & Support

Nếu gặp vấn đề trong quá trình deployment, vui lòng tạo issue hoặc liên hệ team development.

---

**Note**: Đảm bảo thay đổi passwords và credentials trong file `env.production` trước khi deploy production! 