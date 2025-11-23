# Production Deployment Guide

Complete guide for deploying Web Desktop v1.0 in production environments.

## 🎯 Overview

This guide covers deploying Web Desktop in production environments, including system requirements, security configurations, performance optimization, and monitoring setup.

### Deployment Options
1. **Direct Node.js Deployment** - Traditional server deployment
2. **Docker Deployment** - Container-based deployment
3. **Kubernetes Deployment** - Container orchestration
4. **Cloud Platform Deployment** - AWS, GCP, Azure

---

## 📋 Production Requirements

### System Requirements

#### Minimum Requirements
- **CPU**: 4 cores (8 cores recommended)
- **RAM**: 8GB (16GB recommended for AI features)
- **Storage**: 50GB SSD (100GB recommended)
- **Network**: 1 Gbps connection
- **OS**: Ubuntu 20.04+, CentOS 8+, RHEL 8+

#### Recommended Requirements
- **CPU**: 8+ cores with hardware virtualization
- **RAM**: 32GB+ for heavy usage and AI features
- **Storage**: 200GB+ NVMe SSD for optimal performance
- **Network**: 10 Gbps for high-throughput file operations
- **Load Balancer**: Nginx, HAProxy, or cloud load balancer

#### Software Dependencies
- **Node.js**: 18.x LTS
- **npm**: 8.x or higher
- **Database**: SQLite 3.x (included)
- **Reverse Proxy**: Nginx 1.18+ (recommended)
- **SSL Certificate**: Valid TLS certificate

### Network Requirements

#### Ports Required
- **HTTP (80)**: For HTTP traffic (redirect to HTTPS)
- **HTTPS (443)**: For secure HTTPS traffic
- **SSH (22)**: For server management
- **Custom**: Additional ports for file servers (FTP/SFTP/WebDAV)

#### Firewall Configuration
```bash
# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 🚀 Direct Node.js Deployment

### Step 1: Server Preparation

#### Update System
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### Install Node.js
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be 8.x.x
```

#### Create Application User
```bash
# Create dedicated user
sudo useradd -m -s /bin/bash webdesktop
sudo usermod -aG sudo webdesktop

# Switch to application user
sudo su - webdesktop
```

### Step 2: Application Setup

#### Clone Repository
```bash
# Clone the repository
git clone https://github.com/your-username/web-desktop.git
cd web-desktop

# Set correct permissions
chmod +x startdev.sh
```

#### Install Dependencies
```bash
# Install production dependencies
npm ci --production

# Install backend dependencies
cd backend && npm ci --production
cd ..

# Install frontend dependencies and build
cd frontend
npm ci
npm run build
cd ..
```

#### Environment Configuration
Create production environment files:

**Backend Environment** (`backend/.env.production`):
```env
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Security
CORS_ORIGIN=https://your-domain.com
JWT_SECRET=your-super-secret-jwt-key-change-this
SESSION_SECRET=your-super-secret-session-key-change-this

# Database
DATABASE_PATH=/var/lib/webdesktop/database.db

# File System
ALLOWED_PATHS=/home/webdesktop,/tmp,/var/tmp,/mnt
MAX_FILE_SIZE=104857600  # 100MB

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/webdesktop/app.log

# Rate Limiting
RATE_LIMIT_WINDOW=60000  # 1 minute
RATE_LIMIT_MAX=100

# SSL
SSL_CERT_PATH=/etc/ssl/certs/webdesktop.crt
SSL_KEY_PATH=/etc/ssl/private/webdesktop.key
```

**Frontend Environment** (`frontend/.env.production`):
```env
# API Configuration
VITE_API_URL=https://your-domain.com/api
VITE_WS_URL=wss://your-domain.com

# Feature Flags
VITE_ENABLE_AI=true
VITE_ENABLE_MONITORING=true
VITE_ENABLE_MARKETPLACE=true

# Production Settings
VITE_LOG_LEVEL=error
```

### Step 3: System Services Setup

#### Create Systemd Service for Backend
Create `/etc/systemd/system/webdesktop-backend.service`:
```ini
[Unit]
Description=Web Desktop Backend
After=network.target

[Service]
Type=simple
User=webdesktop
Group=webdesktop
WorkingDirectory=/home/webdesktop/web-desktop/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=webdesktop-backend

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/webdesktop /var/log/webdesktop

[Install]
WantedBy=multi-user.target
```

#### Create Systemd Service for Frontend
Create `/etc/systemd/system/webdesktop-frontend.service`:
```ini
[Unit]
Description=Web Desktop Frontend
After=network.target

[Service]
Type=simple
User=webdesktop
Group=webdesktop
WorkingDirectory=/home/webdesktop/web-desktop
Environment=NODE_ENV=production
ExecStart=/usr/bin/npx serve -s frontend/dist -l 5173
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=webdesktop-frontend

[Install]
WantedBy=multi-user.target
```

#### Enable and Start Services
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable webdesktop-backend
sudo systemctl enable webdesktop-frontend

# Start services
sudo systemctl start webdesktop-backend
sudo systemctl start webdesktop-frontend

# Check status
sudo systemctl status webdesktop-backend
sudo systemctl status webdesktop-frontend
```

### Step 4: Reverse Proxy Configuration

#### Install Nginx
```bash
# Ubuntu/Debian
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y
```

#### Configure Nginx
Create `/etc/nginx/sites-available/webdesktop`:
```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/webdesktop.crt;
    ssl_certificate_key /etc/ssl/private/webdesktop.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # API specific settings
        client_max_body_size 100M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security
    location ~ /\. {
        deny all;
    }
}
```

#### Enable Site and Configure SSL
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/webdesktop /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx
sudo systemctl enable nginx
```

---

## 🐳 Docker Deployment

### Step 1: Create Dockerfile

#### Backend Dockerfile
Create `backend/Dockerfile.prod`:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime

# Security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S webdesktop -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=builder --chown=webdesktop:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=webdesktop:nodejs . .

# Build application
RUN npm run build

# Create necessary directories
RUN mkdir -p /app/data /app/logs
RUN chown -R webdesktop:nodejs /app/data /app/logs

USER webdesktop

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

#### Frontend Dockerfile
Create `frontend/Dockerfile.prod`:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Step 2: Docker Compose Configuration

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_PATH: /app/data/database.db
    volumes:
      - webdesktop_data:/app/data
      - webdesktop_logs:/app/logs
      - /home:/home:ro
      - /tmp:/tmp:rw
      - /var/tmp:/var/tmp:rw
    networks:
      - webdesktop_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: unless-stopped
    depends_on:
      - backend
    networks:
      - webdesktop_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/ssl:ro
      - webdesktop_logs:/var/log/nginx
    depends_on:
      - backend
      - frontend
    networks:
      - webdesktop_network

volumes:
  webdesktop_data:
    driver: local
  webdesktop_logs:
    driver: local

networks:
  webdesktop_network:
    driver: bridge
```

### Step 3: Deploy with Docker

```bash
# Build and start containers
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Update deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## ☸️ Kubernetes Deployment

### Step 1: Create Kubernetes Manifests

#### Namespace
Create `k8s/namespace.yaml`:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: webdesktop
```

#### ConfigMap
Create `k8s/configmap.yaml`:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: webdesktop-config
  namespace: webdesktop
data:
  NODE_ENV: "production"
  PORT: "3001"
  LOG_LEVEL: "info"
```

#### Backend Deployment
Create `k8s/backend-deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webdesktop-backend
  namespace: webdesktop
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webdesktop-backend
  template:
    metadata:
      labels:
        app: webdesktop-backend
    spec:
      containers:
      - name: backend
        image: webdesktop/backend:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: webdesktop-config
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: data-volume
          mountPath: /app/data
        - name: logs-volume
          mountPath: /app/logs
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: webdesktop-data-pvc
      - name: logs-volume
        persistentVolumeClaim:
          claimName: webdesktop-logs-pvc
```

#### Service
Create `k8s/backend-service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: webdesktop-backend-service
  namespace: webdesktop
spec:
  selector:
    app: webdesktop-backend
  ports:
  - protocol: TCP
    port: 3001
    targetPort: 3001
  type: ClusterIP
```

#### Ingress
Create `k8s/ingress.yaml`:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webdesktop-ingress
  namespace: webdesktop
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: webdesktop-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: webdesktop-backend-service
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webdesktop-frontend-service
            port:
              number: 80
```

### Step 2: Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get all -n webdesktop

# View logs
kubectl logs -f deployment/webdesktop-backend -n webdesktop

# Scale deployment
kubectl scale deployment webdesktop-backend --replicas=5 -n webdesktop
```

---

## 🔧 SSL/TLS Configuration

### Obtain SSL Certificate

#### Option 1: Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Option 2: Self-Signed Certificate
```bash
# Generate private key
sudo openssl genrsa -out /etc/ssl/private/webdesktop.key 2048

# Generate certificate
sudo openssl req -new -x509 -key /etc/ssl/private/webdesktop.key \
  -out /etc/ssl/certs/webdesktop.crt -days 365
```

### SSL Configuration

#### Nginx SSL Settings
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

---

## 📊 Monitoring and Logging

### Application Monitoring

#### Health Check Endpoint
```javascript
// backend/src/routes/health.ts
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: await checkDatabase(),
    services: {
      ai: await checkAIService(),
      storage: await checkStorageService()
    }
  };

  const isHealthy = health.status === 'ok' &&
                   health.database &&
                   health.services.ai &&
                   health.services.storage;

  res.status(isHealthy ? 200 : 503).json(health);
});
```

#### Logging Configuration
```javascript
// backend/src/services/Logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: '/var/log/webdesktop/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: '/var/log/webdesktop/combined.log'
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### System Monitoring

#### Prometheus Metrics
```bash
# Install Prometheus
sudo apt install prometheus -y

# Configure Prometheus
sudo nano /etc/prometheus/prometheus.yml
```

#### Grafana Dashboard
```bash
# Install Grafana
sudo apt install grafana -y

# Start services
sudo systemctl enable prometheus grafana
sudo systemctl start prometheus grafana
```

### Log Rotation
Create `/etc/logrotate.d/webdesktop`:
```
/var/log/webdesktop/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 webdesktop webdesktop
    postrotate
        systemctl reload webdesktop-backend
    endscript
}
```

---

## 🔒 Security Hardening

### System Security

#### Firewall Configuration
```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

#### Application Security
```bash
# Set file permissions
sudo chown -R webdesktop:webdesktop /home/webdesktop/web-desktop
sudo chmod 750 /home/webdesktop/web-desktop
sudo chmod 600 /home/webdesktop/web-desktop/.env*

# Secure database
sudo chmod 600 /var/lib/webdesktop/database.db
sudo chown webdesktop:webdesktop /var/lib/webdesktop/database.db
```

### Security Headers
```nginx
# Add to Nginx configuration
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
```

---

## 🚀 Performance Optimization

### System Optimization

#### Node.js Performance
```bash
# Set Node.js options
export NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"

# Process management
npm install -g pm2

# PM2 configuration
pm2 start ecosystem.config.js --env production
```

#### Database Optimization
```sql
-- SQLite optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;
```

### Caching Configuration

#### Redis Cache (Optional)
```bash
# Install Redis
sudo apt install redis-server -y

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

# Start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

---

## 🔄 Backup and Recovery

### Database Backup
```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/var/backups/webdesktop"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp /var/lib/webdesktop/database.db $BACKUP_DIR/database_$DATE.db

# Backup configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
  /home/webdesktop/web-desktop/.env* \
  /etc/nginx/sites-available/webdesktop

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### Automated Backup
```bash
# Add to crontab
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /home/webdesktop/backup.sh
```

---

## 🎯 Deployment Checklist

### Pre-Deployment Checklist
- [ ] System requirements met
- [ ] SSL certificate obtained
- [ ] Domain DNS configured
- [ ] Firewall rules configured
- [ ] Database initialized
- [ ] Environment variables set
- [ ] Backup strategy planned
- [ ] Monitoring configured

### Post-Deployment Checklist
- [ ] Services running correctly
- [ ] HTTPS working properly
- [ ] Health checks passing
- [ ] Logs being collected
- [ ] Performance baseline established
- [ ] Security scan completed
- [ ] Backup tested
- [ ] Documentation updated

---

## 🔍 Troubleshooting

### Common Issues

#### Service Not Starting
```bash
# Check service status
sudo systemctl status webdesktop-backend
sudo journalctl -u webdesktop-backend -f

# Check logs
sudo tail -f /var/log/webdesktop/app.log
```

#### Database Issues
```bash
# Check database file
ls -la /var/lib/webdesktop/database.db

# Test database access
sqlite3 /var/lib/webdesktop/database.db ".tables"
```

#### Performance Issues
```bash
# Check system resources
htop
iostat -x 1
free -h

# Check application metrics
curl http://localhost:3001/api/health
```

---

This production deployment guide provides comprehensive instructions for deploying Web Desktop in production environments. For additional security considerations, see the [Security Guide](./security.md).