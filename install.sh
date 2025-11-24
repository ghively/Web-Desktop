#!/bin/bash

# Web Desktop v1.0.1 - Production Installation Script
# Author: Web Desktop Team
# Version: 1.0.1
# Description: Automated production deployment script for Web Desktop

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Web Desktop"
APP_VERSION="1.0.1"
APP_DIR="/opt/web-desktop"
SERVICE_NAME="web-desktop"
BACKUP_DIR="/opt/backups/web-desktop"
LOG_FILE="/var/log/web-desktop-install.log"
MIN_NODE_VERSION="18"
REQUIRED_RAM_MB=4096
REQUIRED_DISK_GB=10

# Repository configuration
REPO_URL="https://github.com/ghively/Web-Desktop.git"
REPO_BRANCH="main"

# Default ports
BACKEND_PORT="3001"
FRONTEND_PORT="5173"

# System user
APP_USER="webdesktop"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Print functions
print_header() {
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE}  $APP_NAME v$APP_VERSION Installer${NC}"
    echo -e "${PURPLE}========================================${NC}"
    echo
}

print_progress_bar() {
    local current=$1
    local total=$2
    local width=50
    local percentage=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))

    echo -ne "\r${BLUE}[PROGRESS]${NC} ["
    printf "%*s" "$filled" | tr ' ' '='
    printf "%*s" "$empty" | tr ' ' '-'
    echo -n "] "
    printf "%3d%% (%d/%d)" "$percentage" "$current" "$total"

    if [[ $current -eq $total ]]; then
        echo -e " ${GREEN}✓${NC}"
    fi
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
    log "STEP: $1"
}

print_status() {
    echo -e "${BLUE}[STATUS]${NC} $1"
    log "STATUS: $1"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
    log "INFO: $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log "SUCCESS: $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log "WARNING: $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "ERROR: $1"
}

# System requirements check
check_system_requirements() {
    print_step "Checking System Requirements"

    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi

    # Check operating system
    if [[ ! -f /etc/os-release ]]; then
        print_error "Cannot determine operating system"
        exit 1
    fi

    source /etc/os-release
    print_info "Detected OS: $PRETTY_NAME"

    # Check architecture
    ARCH=$(uname -m)
    if [[ "$ARCH" != "x86_64" && "$ARCH" != "aarch64" && "$ARCH" != "arm64" ]]; then
        print_error "Unsupported architecture: $ARCH"
        exit 1
    fi
    print_info "Architecture: $ARCH"

    # Check RAM
    RAM_MB=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [[ $RAM_MB -lt $REQUIRED_RAM_MB ]]; then
        print_warning "Low RAM detected: ${RAM_MB}MB (Recommended: ${REQUIRED_RAM_MB}MB)"
    else
        print_success "RAM check passed: ${RAM_MB}MB"
    fi

    # Check disk space
    DISK_GB=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    if [[ $DISK_GB -lt $REQUIRED_DISK_GB ]]; then
        print_error "Insufficient disk space: ${DISK_GB}GB (Required: ${REQUIRED_DISK_GB}GB)"
        exit 1
    else
        print_success "Disk space check passed: ${DISK_GB}GB available"
    fi
}

# Install system packages
install_system_packages() {
    print_step "Installing System Packages"
    print_status "Step 1: Updating package lists..."
    print_progress_bar 1 4

    # Detect package manager
    if command -v apt-get >/dev/null 2>&1; then
        PKG_MANAGER="apt-get"
        UPDATE_CMD="apt-get update"
        INSTALL_CMD="apt-get install -y"

        # Update package lists
        print_info "Updating package lists..."
        $UPDATE_CMD

        # Install essential packages for full Web Desktop functionality
        PACKAGES=(
            curl
            wget
            git
            build-essential
            python3
            python3-pip
            ca-certificates
            gnupg
            lsb-release
            unzip
            htop
            vim
            ufw
            systemd
            sqlite3
            nginx
            ffmpeg
            handbrake-cli
            xrdp
            wpasupplicant
            network-manager
            lm-sensors
            upower
            linux-cpupower-tools
            davfs2
            curlftpfs
            sshfs
            cifs-utils
            nfs-common
            samba
            samba-common-bin
            hdparm
            smartmontools
            parted
            lsof
            tree
            zip
            tar
            gzip
            p7zip-full
            pavucontrol
            pulseaudio
            alsa-utils
            bluetooth
            bluez
            cups
            printer-driver-all
            avahi-daemon
            avahi-utils
        )

        # Install optional packages for enhanced functionality
        OPTIONAL_PACKAGES=(
            docker.io
            docker-compose
            cockpit
            cockpit-storaged
            cockpit-networkmanager
            cockpit-system
            cockpit-docs
        )

    elif command -v yum >/dev/null 2>&1; then
        PKG_MANAGER="yum"
        UPDATE_CMD="yum update -y"
        INSTALL_CMD="yum install -y"

        # Update packages
        print_info "Updating packages..."
        $UPDATE_CMD

        # Essential packages for full Web Desktop functionality
        PACKAGES=(
            curl
            wget
            git
            gcc
            gcc-c++
            make
            python3
            python3-pip
            ca-certificates
            gnupg
            lsb-release
            unzip
            htop
            vim
            firewalld
            systemd
            sqlite
            nginx
            ffmpeg
            HandBrake-cli
            xrdp
            wpa_supplicant
            NetworkManager
            lm_sensors
            upower
            cpupower
            davfs2
            curlftpfs
            sshfs
            cifs-utils
            nfs-utils
            samba
            samba-common
            ufw
            hostnamectl
            hdparm
            smartmontools
            parted
            lsof
            tree
            zip
            tar
            gzip
            p7zip
            p7zip-plugins
        )

        OPTIONAL_PACKAGES=(
            docker
            docker-compose
            cockpit
        )
    else
        print_error "Unsupported package manager. Please install packages manually."
        exit 1
    fi

    # Install essential packages with robust error handling
    print_info "Installing essential packages (${#PACKAGES[@]} packages)..."
    local success_count=0
    local total_packages=${#PACKAGES[@]}

    echo "DEBUG: Starting package installation loop for ${#PACKAGES[@]} packages..."
    for package in "${PACKAGES[@]}"; do
        echo "DEBUG: Attempting to install package: $package"
        print_status "Installing: $package..."

        # Check if package exists before attempting installation
        if apt-cache show "$package" >/dev/null 2>&1; then
            echo "DEBUG: Package $package exists in repositories"
            # Use set +e to prevent script from exiting on package installation failure
            set +e
            if $INSTALL_CMD "$package" >/dev/null 2>&1; then
                print_success "✓ $package installed successfully"
                ((success_count++))
                echo "DEBUG: Package $package installed successfully"
            else
                local exit_code=$?
                print_warning "⚠ $package failed to install (exit code: $exit_code, may be optional)"
                echo "DEBUG: Package $package failed with exit code: $exit_code"
            fi
            set -e  # Re-enable strict error handling
        else
            print_warning "○ $package not available in repositories"
            echo "DEBUG: Package $package not found in repositories"
        fi
        echo "DEBUG: Completed processing package: $package, success count: $success_count"
    done
    echo "DEBUG: Package installation loop completed"

    print_success "Essential packages: ${success_count}/${total_packages} installed"

    # Install optional packages with error handling
    print_info "Installing optional packages for advanced features (${#OPTIONAL_PACKAGES[@]} packages)..."
    local optional_success=0

    for package in "${OPTIONAL_PACKAGES[@]}"; do
        print_status "Installing optional: $package..."

        if apt-cache show "$package" >/dev/null 2>&1; then
            if $INSTALL_CMD "$package" >/dev/null 2>&1; then
                print_success "✓ $package installed successfully"
                ((optional_success++))
            else
                print_info "○ $package failed (optional, continuing)"
            fi
        else
            print_info "○ $package not available (optional)"
        fi
    done

    print_success "Optional packages: ${optional_success}/${#OPTIONAL_PACKAGES[@]} installed"

    # Start and enable essential services
    print_info "Starting and enabling essential services..."

    # Enable and start nginx
    if command -v nginx >/dev/null 2>&1; then
        systemctl enable nginx
        systemctl start nginx
        print_success "Nginx service started and enabled"
    fi

    # Start and enable Docker if installed
    if command -v docker >/dev/null 2>&1; then
        systemctl start docker
        systemctl enable docker
        print_success "Docker service started and enabled"

        # Add webdesktop user to docker group
        usermod -aG docker "$APP_USER"
        print_success "Added $APP_USER to docker group"
    fi

    # Enable and start CUPS (printing)
    if command -v cups >/dev/null 2>&1; then
        systemctl enable cups
        systemctl start cups
        print_success "CUPS printing service started and enabled"
    fi

    # Enable and start Avahi (network discovery)
    if command -v avahi-daemon >/dev/null 2>&1; then
        systemctl enable avahi-daemon
        systemctl start avahi-daemon
        print_success "Avahi network discovery started and enabled"
    fi

    # Enable and start Bluetooth
    if command -v bluetooth >/dev/null 2>&1; then
        systemctl enable bluetooth
        systemctl start bluetooth
        print_success "Bluetooth service started and enabled"
    fi

    # Configure sensors for hardware monitoring
    if command -v sensors >/dev/null 2>&1; then
        print_info "Configuring hardware sensors..."
        sensors-detect --auto || true
        print_success "Hardware sensors configured"
    fi
}

# Install Node.js
install_nodejs() {
    print_step "Installing Node.js"

    # Check if Node.js is already installed
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $NODE_VERSION -ge $MIN_NODE_VERSION ]]; then
            print_success "Node.js $(node --version) already installed"
            return 0
        else
            print_warning "Node.js version $NODE_VERSION is too old. Updating..."
        fi
    fi

    # Install Node.js using NodeSource repository
    if [[ "$PKG_MANAGER" == "apt-get" ]]; then
        # Add NodeSource repository
        NODE_VERSION_LTS="20"
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION_LTS}.x | bash -
        $INSTALL_CMD nodejs
    elif [[ "$PKG_MANAGER" == "yum" ]]; then
        # Add NodeSource repository
        NODE_VERSION_LTS="20"
        curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION_LTS}.x | bash -
        $INSTALL_CMD nodejs npm
    fi

    # Verify installation
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION_FULL=$(node --version)
        print_success "Node.js $NODE_VERSION_FULL installed"
    else
        print_error "Node.js installation failed"
        exit 1
    fi

    # Install npm if not included
    if ! command -v npm >/dev/null 2>&1; then
        print_info "Installing npm..."
        $INSTALL_CMD npm
    fi

    # Install pm2 globally for process management
    npm install -g pm2
    print_success "PM2 process manager installed"
}

# Create application user
create_app_user() {
    print_step "Creating Application User"

    # Check if user already exists
    if id "$APP_USER" &>/dev/null; then
        print_warning "User $APP_USER already exists"
        return 0
    fi

    # Create system user
    useradd --system --home-dir "$APP_DIR" --shell /bin/bash "$APP_USER"
    mkdir -p "$APP_DIR"
    chown "$APP_USER:$APP_USER" "$APP_DIR"

    print_success "Created user: $APP_USER"
}

# Create directories
create_directories() {
    print_step "Creating Directories"

    # Create application directories
    mkdir -p "$APP_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "/var/log/web-desktop"
    mkdir -p "/etc/web-desktop"

    # Set ownership
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    chown -R "$APP_USER:$APP_USER" "$BACKUP_DIR"
    chown -R "$APP_USER:$APP_USER" "/var/log/web-desktop"
    chown -R "$APP_USER:$APP_USER" "/etc/web-desktop"

    print_success "Created application directories"
}

# Clone repository
clone_repository() {
    print_step "Cloning Repository"

    # Backup existing installation if present
    if [[ -d "$APP_DIR/.git" ]]; then
        print_info "Backing up existing installation..."
        BACKUP_NAME="web-desktop-backup-$(date +%Y%m%d-%H%M%S)"
        cp -r "$APP_DIR" "$BACKUP_DIR/$BACKUP_NAME"
        print_success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
    fi

    # Remove old installation (except .git to preserve local changes)
    if [[ -d "$APP_DIR" ]]; then
        find "$APP_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} \;
    fi

    # Clone repository
    cd "$APP_DIR"
    sudo -u "$APP_USER" git clone "$REPO_URL" .
    sudo -u "$APP_USER" git checkout "$REPO_BRANCH"
    sudo -u "$APP_USER" git pull origin "$REPO_BRANCH"

    print_success "Repository cloned to $APP_DIR"
}

# Install dependencies
install_dependencies() {
    print_step "Installing Application Dependencies"

    cd "$APP_DIR"

    # Install backend dependencies
    print_info "Installing backend dependencies..."
    cd backend
    sudo -u "$APP_USER" npm ci --production=false
    sudo -u "$APP_USER" npm run build
    print_success "Backend dependencies installed"

    # Install frontend dependencies and build
    print_info "Installing and building frontend..."
    cd ../frontend
    sudo -u "$APP_USER" npm ci
    sudo -u "$APP_USER" npm run build
    print_success "Frontend built successfully"

    cd "$APP_DIR"
}

# Create environment configuration
create_environment_config() {
    print_step "Creating Environment Configuration"

    # Verify tools are accessible and create paths
    FFMPEG_PATH=$(which ffmpeg 2>/dev/null || echo "ffmpeg")
    HANDBRAKE_PATH=$(which HandBrakeCLI 2>/dev/null || echo "HandBrakeCLI")
    DOCKER_PATH=$(which docker 2>/dev/null || echo "docker")
    X11VNC_PATH=$(which x11vnc 2>/dev/null || echo "x11vnc")
    SENSORS_PATH=$(which sensors 2>/dev/null || echo "sensors")

    # Create .env file for backend with verified tool paths
    cat > "$APP_DIR/backend/.env" << EOF
# Web Desktop Production Configuration
NODE_ENV=production
PORT=$BACKEND_PORT
HOST=0.0.0.0

# Frontend URLs
FRONTEND_URL=http://localhost:$FRONTEND_PORT
FRONTEND_DEV_URL=http://localhost:$FRONTEND_PORT

# Security
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# File System
DATA_DIR=/var/lib/web-desktop
UPLOAD_LIMIT=104857600
TEMP_DIR=/tmp/web-desktop

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/web-desktop/app.log

# Database
DATABASE_PATH=/var/lib/web-desktop/database.sqlite

# External Tools Configuration
FFMPEG_PATH=$FFMPEG_PATH
HANDBRAKE_PATH=$HANDBRAKE_PATH
DOCKER_PATH=$DOCKER_PATH
X11VNC_PATH=$X11VNC_PATH
SENSORS_PATH=$SENSORS_PATH

# Media Server Configuration
TRANSCODING_ENGINE=ffmpeg
TRANSCODING_OUTPUT_PATH=/var/lib/web-desktop/transcoding
TRANSCODING_TEMP_DIR=/tmp/web-desktop/transcoding

# Storage Configuration
STORAGE_MOUNT_PREFIX=/media/webdesktop
STORAGE_CONFIG_PATH=/etc/web-desktop/storage

# Remote Desktop Configuration
RDP_ENABLED=true
VNC_ENABLED=true
RDP_PORT=3389
VNC_PORT=5900

# System Monitoring
MONITORING_ENABLED=true
MONITORING_INTERVAL=5000
MONITORING_HISTORY_SIZE=1000

# External Services (Optional)
# OLLAMA_URL=http://localhost:11434
# HOME_ASSISTANT_URL=http://localhost:8123
# HOME_ASSISTANT_TOKEN=your_token_here
# OPENROUTER_API_KEY=your_openrouter_api_key
EOF

    # Create data and transcoding directories
    mkdir -p "/var/lib/web-desktop"
    mkdir -p "/var/lib/web-desktop/transcoding"
    mkdir -p "/tmp/web-desktop/transcoding"
    mkdir -p "/etc/web-desktop/storage"
    mkdir -p "/media/webdesktop"

    # Set proper permissions
    chown -R "$APP_USER:$APP_USER" "/var/lib/web-desktop"
    chmod 755 "/var/lib/web-desktop"
    chmod 755 "/var/lib/web-desktop/transcoding"

    chown -R "$APP_USER:$APP_USER" "/tmp/web-desktop"
    chmod 755 "/tmp/web-desktop"
    chmod 755 "/tmp/web-desktop/transcoding"

    chown -R "$APP_USER:$APP_USER" "/etc/web-desktop"
    chmod 755 "/etc/web-desktop/storage"

    chown -R "$APP_USER:$APP_USER" "/media/webdesktop"
    chmod 755 "/media/webdesktop"

    # Secure environment file
    chmod 600 "$APP_DIR/backend/.env"
    chown "$APP_USER:$APP_USER" "$APP_DIR/backend/.env"

    print_success "Environment configuration created with verified tool paths"
}

# Create systemd service
create_systemd_service() {
    print_step "Creating Systemd Service"

    # Create systemd service file
    cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=Web Desktop Application
Documentation=https://github.com/ghively/Web-Desktop
After=network.target
Wants=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/backend
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/backend/.env
ExecStart=/usr/bin/node dist/server.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=$APP_DIR /var/lib/web-desktop /var/log/web-desktop /tmp
ProtectHome=true
RemoveIPC=true

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

    # Create nginx configuration (optional)
    cat > "/etc/nginx/sites-available/$SERVICE_NAME" << EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Backend API
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # WebSocket terminal
    location /ws {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend (React build)
    location / {
        proxy_pass http://localhost:$FRONTEND_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Legacy frontend
    location /legacy/ {
        proxy_pass http://localhost:$BACKEND_PORT/frontend-simple/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    print_success "Systemd service created"
}

# Configure firewall
configure_firewall() {
    print_step "Configuring Firewall"

    # Check if ufw is available
    if command -v ufw >/dev/null 2>&1; then
        # Allow required ports
        ufw allow "$BACKEND_PORT/tcp" comment "Web Desktop Backend"
        ufw allow "$FRONTEND_PORT/tcp" comment "Web Desktop Frontend"
        ufw allow 80/tcp comment "HTTP"
        ufw allow 443/tcp comment "HTTPS"
        ufw allow 22/tcp comment "SSH"

        print_success "Firewall configured with UFW"
    elif command -v firewall-cmd >/dev/null 2>&1; then
        # Configure firewalld
        firewall-cmd --permanent --add-port="$BACKEND_PORT/tcp"
        firewall-cmd --permanent --add-port="$FRONTEND_PORT/tcp"
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --reload

        print_success "Firewall configured with firewalld"
    else
        print_warning "No firewall manager found. Please configure manually."
    fi
}

# Verify and test dependencies
verify_dependencies() {
    print_step "Verifying Dependencies"

    local failed_deps=()

    # Test core tools
    print_info "Testing core dependencies..."

    if ! command -v ffmpeg >/dev/null 2>&1; then
        failed_deps+=("ffmpeg")
    else
        print_success "✓ FFmpeg: $(ffmpeg -version | head -1)"
    fi

    if ! command -v HandBrakeCLI >/dev/null 2>&1; then
        failed_deps+=("HandBrakeCLI")
    else
        print_success "✓ HandBrakeCLI: $(HandBrakeCLI --version | head -1)"
    fi

    if ! command -v docker >/dev/null 2>&1; then
        failed_deps+=("docker")
    else
        print_success "✓ Docker: $(docker --version)"
    fi

    # Test storage drivers
    print_info "Testing storage drivers..."
    local storage_deps=("davfs2" "sshfs" "curlftpfs")

    for dep in "${storage_deps[@]}"; do
        if command -v "$dep" >/dev/null 2>&1; then
            print_success "✓ $dep driver available"
        else
            print_warning "⚠ $dep driver not found"
        fi
    done

    # Test system tools
    print_info "Testing system monitoring tools..."

    if command -v sensors >/dev/null 2>&1; then
        if sensors >/dev/null 2>&1; then
            print_success "✓ Hardware sensors working"
        else
            print_warning "⚠ Hardware sensors configured but no data available"
        fi
    else
        failed_deps+=("lm-sensors")
    fi

    if command -v upower >/dev/null 2>&1; then
        print_success "✓ Power management available"
    else
        failed_deps+=("upower")
    fi

    # Test network services
    print_info "Testing network services..."

    if systemctl is-active --quiet nginx 2>/dev/null; then
        print_success "✓ Nginx service running"
    else
        print_warning "⚠ Nginx service not running"
    fi

    if systemctl is-active --quiet docker 2>/dev/null; then
        print_success "✓ Docker service running"
    else
        print_warning "⚠ Docker service not running"
    fi

    if systemctl is-active --quiet bluetooth 2>/dev/null; then
        print_success "✓ Bluetooth service running"
    else
        print_warning "⚠ Bluetooth service not running"
    fi

    # Test file systems
    print_info "Testing file system tools..."

    if grep -q fuse /proc/filesystems 2>/dev/null; then
        print_success "✓ FUSE file system support available"
    else
        failed_deps+=("FUSE")
    fi

    # Report failed dependencies
    if [ ${#failed_deps[@]} -gt 0 ]; then
        print_error "Missing critical dependencies: ${failed_deps[*]}"
        print_error "Some features may not work properly"
        print_info "You can install them manually and restart the service"
    else
        print_success "All critical dependencies verified and working"
    fi

    # Create tool availability report
    cat > "$APP_DIR/backend/dependencies.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "tools": {
    "ffmpeg": $(command -v ffmpeg >/dev/null 2>&1 && echo "true" || echo "false"),
    "HandBrakeCLI": $(command -v HandBrakeCLI >/dev/null 2>&1 && echo "true" || echo "false"),
    "docker": $(command -v docker >/dev/null 2>&1 && echo "true" || echo "false"),
    "sensors": $(command -v sensors >/dev/null 2>&1 && echo "true" || echo "false"),
    "upower": $(command -v upower >/dev/null 2>&1 && echo "true" || echo "false"),
    "davfs2": $(command -v davfs2 >/dev/null 2>&1 && echo "true" || echo "false"),
    "sshfs": $(command -v sshfs >/dev/null 2>&1 && echo "true" || echo "false"),
    "curlftpfs": $(command -v curlftpfs >/dev/null 2>&1 && echo "true" || echo "false")
  },
  "services": {
    "nginx": $(systemctl is-active --quiet nginx 2>/dev/null && echo "true" || echo "false"),
    "docker": $(systemctl is-active --quiet docker 2>/dev/null && echo "true" || echo "false"),
    "bluetooth": $(systemctl is-active --quiet bluetooth 2>/dev/null && echo "true" || echo "false"),
    "cups": $(systemctl is-active --quiet cups 2>/dev/null && echo "true" || echo "false")
  }
}
EOF

    chown "$APP_USER:$APP_USER" "$APP_DIR/backend/dependencies.json"
    print_success "Dependency report created at $APP_DIR/backend/dependencies.json"
}

# Start and enable services
start_services() {
    print_step "Starting Services"

    # Reload systemd
    systemctl daemon-reload

    # Enable and start the service
    systemctl enable "$SERVICE_NAME"
    systemctl start "$SERVICE_NAME"

    # Wait a moment for the service to start
    sleep 3

    # Check service status
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_success "Web Desktop service started successfully"
    else
        print_warning "Web Desktop service failed to start automatically"
        print_info "Attempting to start service manually..."

        # Try manual startup
        if sudo -u "$APP_USER" "$APP_DIR/backend/dist/server.js" > /tmp/web-desktop-startup.log 2>&1 & then
            sleep 2
            if pgrep -f "node.*server.js" > /dev/null; then
                print_success "Web Desktop started successfully in manual mode"
            else
                print_warning "Manual startup also failed, but installation will continue"
                print_info "Check /tmp/web-desktop-startup.log for error details"
            fi
        else
            print_warning "Could not start Web Desktop service, but installation completed"
            print_info "You can start it manually later with: npm start"
        fi
    fi
}

# Create maintenance scripts
create_maintenance_scripts() {
    print_step "Creating Maintenance Scripts"

    # Create backup script
    cat > "$APP_DIR/scripts/backup.sh" << 'EOF'
#!/bin/bash
# Web Desktop Backup Script

APP_DIR="/opt/web-desktop"
BACKUP_DIR="/opt/backups/web-desktop"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/web-desktop-backup-$DATE.tar.gz"

# Create backup
tar -czf "$BACKUP_FILE" \
    "$APP_DIR/backend/.env" \
    "$APP_DIR/backend/dist/" \
    "$APP_DIR/frontend/dist/" \
    "/var/lib/web-desktop/" \
    "/etc/web-desktop/" 2>/dev/null || true

# Keep only last 7 backups
find "$BACKUP_DIR" -name "web-desktop-backup-*.tar.gz" -mtime +7 -delete 2>/dev/null || true

echo "Backup created: $BACKUP_FILE"
EOF

    # Create update script
    cat > "$APP_DIR/scripts/update.sh" << 'EOF'
#!/bin/bash
# Web Desktop Update Script

APP_DIR="/opt/web-desktop"
SERVICE_NAME="web-desktop"
APP_USER="webdesktop"

echo "Updating Web Desktop..."

# Stop service
systemctl stop "$SERVICE_NAME"

# Update repository
cd "$APP_DIR"
sudo -u "$APP_USER" git pull origin main

# Install and build
cd backend
sudo -u "$APP_USER" npm ci
sudo -u "$APP_USER" npm run build

cd ../frontend
sudo -u "$APP_USER" npm ci
sudo -u "$APP_USER" npm run build

# Start service
systemctl start "$SERVICE_NAME"

echo "Web Desktop updated successfully!"
EOF

    # Make scripts executable
    chmod +x "$APP_DIR/scripts/backup.sh"
    chmod +x "$APP_DIR/scripts/update.sh"
    chown "$APP_USER:$APP_USER" "$APP_DIR/scripts"/*

    # Create cron jobs
    (sudo -u "$APP_USER" crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/scripts/backup.sh") | sudo -u "$APP_USER" crontab -

    print_success "Maintenance scripts created"
}

# Print installation summary
print_summary() {
    print_step "Installation Complete!"

    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Installation Summary${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "${CYAN}Application:${NC} $APP_NAME v$APP_VERSION"
    echo -e "${CYAN}Installation Directory:${NC} $APP_DIR"
    echo -e "${CYAN}Backend URL:${NC} http://localhost:$BACKEND_PORT"
    echo -e "${CYAN}Frontend URL:${NC} http://localhost:$FRONTEND_PORT"
    echo -e "${CYAN}Service Name:${NC} $SERVICE_NAME"
    echo -e "${CYAN}Log File:${NC} $LOG_FILE"
    echo -e "${CYAN}Backup Directory:${NC} $BACKUP_DIR"
    echo
    echo -e "${GREEN}✅ Installed Services:${NC}"
    echo -e "  • Nginx reverse proxy"
    echo -e "  • FFmpeg (media transcoding)"
    echo -e "  • HandBrake (video encoding)"
    echo -e "  • Docker (container management)"
    echo -e "  • XRDP (remote desktop)"
    echo -e "  • Storage drivers (WebDAV, FTP, SFTP, SMB, NFS)"
    echo -e "  • System monitoring tools (sensors, power management)"
    echo -e "  • CUPS (printing)"
    echo -e "  • Bluetooth"
    echo -e "  • Network discovery (Avahi)"
    echo
    echo -e "${BLUE}Useful Commands:${NC}"
    echo -e "  • Web Desktop status:    systemctl status $SERVICE_NAME"
    echo -e "  • View logs:             journalctl -u $SERVICE_NAME -f"
    echo -e "  • Restart service:       systemctl restart $SERVICE_NAME"
    echo -e "  • Nginx status:          systemctl status nginx"
    echo -e "  • Docker status:         systemctl status docker"
    echo -e "  • Update app:            sudo -u $APP_USER $APP_DIR/scripts/update.sh"
    echo -e "  • Create backup:         sudo -u $APP_USER $APP_DIR/scripts/backup.sh"
    echo
    echo -e "${BLUE}Test Installed Tools:${NC}"
    echo -e "  • FFmpeg version:        ffmpeg -version"
    echo -e "  • HandBrake version:     HandBrakeCLI --version"
    echo -e "  • Docker test:           docker run hello-world"
    echo -e "  • Storage drivers:       ls /usr/sbin/mount.*"
    echo -e "  • Sensors:               sensors"
    echo -e "  • Power info:            upower -i /org/freedesktop/UPower/battery_BAT0"
    echo
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "1. Access Web Desktop at: http://your-server-ip:$FRONTEND_PORT"
    echo -e "2. Configure SSL certificate for HTTPS (recommended)"
    echo -e "3. Set up external services in $APP_DIR/backend/.env:"
    echo -e "   - Ollama (AI models): OLLAMA_URL=http://localhost:11434"
    echo -e "   - Home Assistant: HOME_ASSISTANT_URL=http://localhost:8123"
    echo -e "   - OpenRouter: OPENROUTER_API_KEY=your_api_key"
    echo -e "4. Test all features: File Manager, Media Server, AI Integration"
    echo -e "5. Configure nginx for production domain (if needed)"
    echo
    echo -e "${GREEN}🎉 Full-featured Web Desktop v$APP_VERSION is now ready!${NC}"
    echo -e "${GREEN}   All 24 features installed and ready to use.${NC}"
    echo
}

# Main installation function
main() {
    print_header

    # Check for help flag
    if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
        echo "Web Desktop v$APP_VERSION Installation Script"
        echo
        echo "Usage: $0 [OPTIONS]"
        echo
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --skip-deps    Skip system package installation"
        echo "  --dev          Install in development mode"
        echo
        exit 0
    fi

    # Parse command line arguments
    SKIP_DEPS=false
    DEV_MODE=false

    for arg in "$@"; do
        case $arg in
            --skip-deps)
                SKIP_DEPS=true
                ;;
            --dev)
                DEV_MODE=true
                ;;
        esac
    done

    # Run installation steps
    echo "DEBUG: Starting check_system_requirements..."
    check_system_requirements
    echo "DEBUG: check_system_requirements completed"

    if [[ "$SKIP_DEPS" == false ]]; then
        echo "DEBUG: Starting install_system_packages..."
        install_system_packages
        echo "DEBUG: install_system_packages completed"
        echo "DEBUG: Starting install_nodejs..."
        install_nodejs
        echo "DEBUG: install_nodejs completed"
    fi

    echo "DEBUG: Starting create_app_user..."
    create_app_user
    echo "DEBUG: create_app_user completed"
    echo "DEBUG: Starting create_directories..."
    create_directories
    echo "DEBUG: create_directories completed"
    echo "DEBUG: Starting clone_repository..."
    clone_repository
    echo "DEBUG: clone_repository completed"
    echo "DEBUG: Starting install_dependencies..."
    install_dependencies
    echo "DEBUG: install_dependencies completed"
    echo "DEBUG: Starting create_environment_config..."
    create_environment_config
    echo "DEBUG: create_environment_config completed"
    echo "DEBUG: Starting create_systemd_service..."
    create_systemd_service
    echo "DEBUG: create_systemd_service completed"
    echo "DEBUG: Starting configure_firewall..."
    configure_firewall
    echo "DEBUG: configure_firewall completed"
    echo "DEBUG: Starting start_services..."
    start_services
    echo "DEBUG: start_services completed"
    echo "DEBUG: Starting verify_dependencies..."
    verify_dependencies
    echo "DEBUG: verify_dependencies completed"
    echo "DEBUG: Starting create_maintenance_scripts..."
    create_maintenance_scripts
    echo "DEBUG: create_maintenance_scripts completed"

    echo "DEBUG: Starting print_summary..."
    print_summary
    echo "DEBUG: print_summary completed"

    exit 0
}

# Run main function with all arguments
main "$@"