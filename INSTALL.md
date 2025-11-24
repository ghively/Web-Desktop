# Web Desktop Installation Guide

## Quick Start

The easiest way to install Web Desktop is using the automated installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/ghively/Web-Desktop/main/install.sh | sudo bash
```

Or download and run manually:

```bash
wget https://raw.githubusercontent.com/ghively/Web-Desktop/main/install.sh
chmod +x install.sh
sudo ./install.sh
```

## System Requirements

### Minimum Requirements
- **Operating System**: Linux (Ubuntu 20.04+, CentOS 8+, RHEL 8+, Debian 11+)
- **Architecture**: x86_64, aarch64, arm64
- **RAM**: 4GB (8GB recommended)
- **Storage**: 10GB free space (20GB recommended)
- **Network**: Internet connection for dependencies

### Software Dependencies
- **Node.js**: v18+ (automatically installed)
- **npm**: v8+ (automatically installed)
- **git**: For repository cloning
- **systemd**: For service management
- **SQLite**: For database storage

### Core Dependencies (REQUIRED for full functionality)
- **nginx**: Reverse proxy and web server
- **FFmpeg**: Media transcoding and video processing
- **HandBrake**: Advanced video encoding and conversion
- **Docker**: Container management and orchestration
- **xrdp**: Remote desktop server for Windows/Linux connections
- **Storage Drivers**: davfs2, curlftpfs, sshfs, cifs-utils, nfs-common
- **System Tools**: lm-sensors, upower, cpufrequtils, hardware monitoring
- **Network Tools**: wpa_supplicant, network-manager, bluetooth
- **File Management**: samba, 7zip, archive tools
- **Printing**: CUPS printer service
- **Services**: cockpit, avahi-daemon (network discovery)

## Installation Options

### Standard Installation
```bash
sudo ./install.sh
```
Installs all system packages, Node.js, and configures the complete application.

### Skip System Packages
```bash
sudo ./install.sh --skip-deps
```
Useful if you already have Node.js and other dependencies installed.

### Development Mode
```bash
sudo ./install.sh --dev
```
Installs with development configurations and tools.

## Directory Structure

After installation, Web Desktop will be installed in the following locations:

```
/opt/web-desktop/                 # Main application directory
├── backend/                      # Backend server (Node.js)
│   ├── dist/                     # Compiled JavaScript
│   ├── src/                      # TypeScript source code
│   └── .env                      # Environment configuration
├── frontend/                     # Frontend application
│   ├── dist/                     # Built React application
│   └── src/                      # React source code
├── frontend-simple/              # Legacy frontend (vanilla JS)
│   ├── js/                       # JavaScript files
│   └── css/                      # Stylesheets
└── scripts/                      # Maintenance scripts
    ├── backup.sh                 # Backup automation
    └── update.sh                 # Update automation

/var/lib/web-desktop/             # Application data
/var/log/web-desktop/             # Application logs
/etc/web-desktop/                 # Configuration files
/opt/backups/web-desktop/         # Backup storage
```

## Service Configuration

### Systemd Service
The application is managed by systemd as `web-desktop.service`.

**Common Commands:**
```bash
# Check service status
sudo systemctl status web-desktop

# Start service
sudo systemctl start web-desktop

# Stop service
sudo systemctl stop web-desktop

# Restart service
sudo systemctl restart web-desktop

# Enable auto-start on boot
sudo systemctl enable web-desktop

# View real-time logs
sudo journalctl -u web-desktop -f
```

### Environment Configuration
Configuration is stored in `/opt/web-desktop/backend/.env`:

```bash
# Basic Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# File System
DATA_DIR=/var/lib/web-desktop
UPLOAD_LIMIT=104857600

# Database
DATABASE_PATH=/var/lib/web-desktop/database.sqlite
```

## Network Configuration

### Default Ports
- **Backend API**: 3001
- **Frontend**: 5173
- **WebSocket**: 3001 (same as backend)

### Firewall Configuration
The installer automatically configures the firewall to allow:

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 3001/tcp    # Backend API
sudo ufw allow 5173/tcp    # Frontend
sudo ufw allow 80/tcp      # HTTP (if using nginx)
sudo ufw allow 443/tcp     # HTTPS (if using nginx)

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --reload
```

## Reverse Proxy Configuration (Optional)

### Nginx Configuration
Create `/etc/nginx/sites-available/web-desktop`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Terminal
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:5173/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/web-desktop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate (Recommended)

### Using Let's Encrypt
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx  # Ubuntu/Debian
sudo yum install certbot python3-certbot-nginx  # CentOS/RHEL

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## External Service Configuration

### Home Assistant Integration
Add to `/opt/web-desktop/backend/.env`:
```bash
HOME_ASSISTANT_URL=http://localhost:8123
HOME_ASSISTANT_TOKEN=your_long_lived_access_token
```

### Ollama AI Integration
Add to `/opt/web-desktop/backend/.env`:
```bash
OLLAMA_URL=http://localhost:11434
```

### OpenRouter Integration
Add to `/opt/web-desktop/backend/.env`:
```bash
OPENROUTER_API_KEY=your_openrouter_api_key
```

## Maintenance

### Automated Backup
Backups are created automatically daily at 2 AM and stored in `/opt/backups/web-desktop/`.

**Manual Backup:**
```bash
sudo -u webdesktop /opt/web-desktop/scripts/backup.sh
```

### Updates
**Automatic Update:**
```bash
sudo -u webdesktop /opt/web-desktop/scripts/update.sh
```

**Manual Update:**
```bash
cd /opt/web-desktop
sudo -u webdesktop git pull origin main
cd backend && sudo -u webdesktop npm ci && sudo -u webdesktop npm run build
cd ../frontend && sudo -u webdesktop npm ci && sudo -u webdesktop npm run build
sudo systemctl restart web-desktop
```

### Log Management
**View Application Logs:**
```bash
# Real-time logs
sudo journalctl -u web-desktop -f

# Recent logs
sudo journalctl -u web-desktop --since "1 hour ago"

# Log file location
tail -f /var/log/web-desktop/app.log
```

## Troubleshooting

### Common Issues

**Service Won't Start:**
```bash
# Check status
sudo systemctl status web-desktop

# Check logs
sudo journalctl -u web-desktop -n 50

# Check configuration
sudo -u webdesktop node /opt/web-desktop/backend/dist/server.js
```

**Permission Errors:**
```bash
# Fix ownership
sudo chown -R webdesktop:webdesktop /opt/web-desktop
sudo chown -R webdesktop:webdesktop /var/lib/web-desktop
sudo chown -R webdesktop:webdesktop /var/log/web-desktop
```

**Port Conflicts:**
```bash
# Check what's using ports
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :5173

# Kill processes if needed
sudo kill -9 <PID>
```

**Dependency Issues:**
```bash
# Reinstall dependencies
cd /opt/web-desktop/backend && sudo -u webdesktop npm ci
cd /opt/web-desktop/frontend && sudo -u webdesktop npm ci
```

### Performance Optimization

**Enable PM2 Clustering:**
```bash
# Install PM2 ecosystem file
cat > /opt/web-desktop/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'web-desktop',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

# Update service to use PM2
sudo systemctl edit web-desktop
# Add:
# [Service]
# ExecStart=
# ExecStart=/usr/bin/pm2 start /opt/web-desktop/ecosystem.config.js --env production
# ExecStop=/usr/bin/pm2 stop web-desktop
# ExecReload=/usr/bin/pm2 reload web-desktop
```

## Security Considerations

### Production Hardening
1. **Change default passwords and secrets** in `.env`
2. **Enable firewall** and restrict access to required ports only
3. **Use SSL certificates** for HTTPS
4. **Regular updates**: Keep system and dependencies updated
5. **Monitor logs** for suspicious activity
6. **Backup regularly** and test restore procedures

### User Permissions
The application runs under the `webdesktop` system user with restricted permissions. Avoid running as root.

### Data Protection
- Sensitive data is stored in `/var/lib/web-desktop`
- Database files should be backed up regularly
- Environment configuration contains secrets - protect accordingly

## Support

### Documentation
- **User Guide**: See the application's built-in documentation
- **API Reference**: Available at `/api/docs` when running
- **Developer Docs**: Available in the repository

### Getting Help
- **GitHub Issues**: Report bugs at https://github.com/ghively/Web-Desktop/issues
- **Community**: Join discussions in the repository

### Version Information
- **Current Version**: 1.0.1
- **Release Notes**: See CHANGELOG.md
- **Feature Status**: See VERSION_1.0_FEATURE_LOCK.md

---

**Web Desktop v1.0.1** - Enterprise-grade web-based desktop environment
Production-ready with 100% dual frontend parity and comprehensive feature set.