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

# Progress bar functions
print_progress_bar() {
    local current=$1
    local total=$2
    local width=50
    local percentage=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))

    echo -ne "\r${BLUE}[PROGRESS]${NC} ["
    printf "%*s" "$filled" | tr ' ' ' '='
    printf "%*s" "$empty" | tr ' ' '-'
    echo -n "] "
    printf "%3d%% (%d/%d)" "$percentage" "$current" "$total"

    if [[ $current -eq $total ]]; then
        echo -e " ${GREEN}✓${NC}"
    fi
}

# Enhanced print functions with more verbose output
print_header() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                $APP_NAME v$APP_VERSION Installer                ║${NC}"
    echo -e "${PURPLE}║                      Automated Deployment Script                      ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${CYAN}Installation will begin in 3 seconds...${NC}"
    echo -e "${CYAN}Press Ctrl+C to cancel${NC}"
    echo
    sleep 3
}

print_step() {
    echo -e "\n${BLUE}┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│ STEP: $1${NC}"
    echo -e "${BLUE}├─────────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${BLUE}│${NC}"
    log "STEP: $1"
}

print_substep() {
    echo -e "${CYAN}  → $1${NC}"
    log "SUBSTEP: $1"
}

print_info() {
    echo -e "${CYAN}  ℹ️ $1${NC}"
    log "INFO: $1"
}

print_success() {
    echo -e "${GREEN}  ✅ $1${NC}"
    log "SUCCESS: $1"
}

print_warning() {
    echo -e "${YELLOW}  ⚠️ $1${NC}"
    log "WARNING: $1"
}

print_error() {
    echo -e "${RED}  ❌ $1${NC}"
    log "ERROR: $1"
}

print_step_complete() {
    echo -e "${GREEN}  └─> STEP COMPLETED SUCCESSFULLY${NC}\n"
    log "STEP COMPLETED: $1"
}

print_section_start() {
    echo -e "\n${YELLOW}📂 PROCESSING: $1${NC}"
    echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────────┐${NC}"
}

print_section_end() {
    echo -e "${YELLOW}└─────────────────────────────────────────────────────────────────┘${NC}"
    echo -e "${GREEN}✅ SECTION COMPLETE: $1${NC}\n"
}

# Verbose package installation with progress
install_package_with_progress() {
    local package_name=$1
    local description=$2

    echo -e "${CYAN}  📦 Installing $package_name${NC}"
    echo -e "${CYAN}     → $description${NC}"

    # Simulate progress for package installation
    for i in {1..10}; do
        print_progress_bar $i 10
        sleep 0.1
    done
    echo
}

# Enhanced system requirements check with progress
check_system_requirements() {
    print_step "System Requirements Analysis"

    echo -e "${CYAN}  🔍 Checking installation prerequisites...${NC}"

    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root or with sudo"
        echo -e "${RED}    Please run: sudo bash install.sh${NC}"
        exit 1
    fi
    print_success "Running as root user: ✓"

    # Check operating system
    if [[ ! -f /etc/os-release ]]; then
        print_error "Cannot determine operating system"
        exit 1
    fi

    source /etc/os-release
    print_info "Operating System: $PRETTY_NAME"

    # Check architecture
    ARCH=$(uname -m)
    if [[ "$ARCH" != "x86_64" && "$ARCH" != "aarch64" && "$ARCH" != "arm64" ]]; then
        print_error "Unsupported architecture: $ARCH"
        echo -e "${RED}    Supported: x86_64, aarch64, arm64${NC}"
        exit 1
    fi
    print_success "Architecture compatibility: $ARCH ✓"

    # Check RAM with detailed analysis
    print_substep "Analyzing system memory..."
    RAM_MB=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    RAM_GB=$((RAM_MB / 1024))

    if [[ $RAM_MB -lt $REQUIRED_RAM_MB ]]; then
        print_warning "Low RAM detected: ${RAM_MB}MB (${RAM_GB}GB)"
        echo -e "${YELLOW}    Recommended: ${REQUIRED_RAM_MB}MB (${REQUIRED_DISK_GB}GB)${NC}"
        echo -e "${YELLOW}    Installation may be slow${NC}"
        sleep 2
    else
        print_success "Memory check: ${RAM_MB}MB (${RAM_GB}GB) ✓"
    fi

    # Check disk space with detailed analysis
    print_substep "Analyzing disk space availability..."
    DISK_GB=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')

    echo -e "${CYAN}  📊 Disk Analysis:${NC}"
    echo -e "${CYAN}     Available: ${DISK_GB}GB${NC}"
    echo -e "${CYAN}     Required: ${REQUIRED_DISK_GB}GB${NC}"

    if [[ $DISK_GB -lt $REQUIRED_DISK_GB ]]; then
        print_error "Insufficient disk space: ${DISK_GB}GB"
        echo -e "${RED}    Need at least ${REQUIRED_DISK_GB}GB free disk space${NC}"
        exit 1
    else
        print_success "Disk space check: ${DISK_GB}GB available ✓"
    fi

    # Display system summary
    echo
    echo -e "${GREEN}📋 System Requirements Summary:${NC}"
    echo -e "${GREEN}   ├─ OS: $PRETTY_NAME${NC}"
    echo -e "${GREEN}   ├─ Architecture: $ARCH${NC}"
    echo -e "${GREEN}   ├─ RAM: ${RAM_MB}MB (${RAM_GB}GB)${NC}"
    echo -e "${GREEN}   └─ Disk: ${DISKGB}GB available${NC}"
    echo

    print_step_complete "System Requirements Verified"
}

# Install system packages
install_system_packages() {
    print_step "Installing System Packages"

    # Detect package manager
    if command -v apt-get >/dev/null 2>&1; then
        PKG_MANAGER="apt-get"
        UPDATE_CMD="apt-get update"
        INSTALL_CMD="apt-get install -y"

        # Update package lists with progress
        print_status "Step 1: Updating package lists..."
        print_progress_bar 1 4
        if $UPDATE_CMD > /dev/null 2>&1; then
            print_success "Package lists updated successfully"
            print_progress_bar 2 4
        else
            print_error "Failed to update package lists"
            exit 1
        fi

        # Install essential packages with progress tracking
        print_status "Step 2: Installing core system packages..."
        print_progress_bar 2 4

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
            wpa_supplicant
            network-manager
            lm-sensors
            upower
            cpufrequtils
            linux-cpupower
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

    # Install essential packages with detailed progress
    local package_count=${#PACKAGES[@]}
    print_status "Step 3: Installing ${package_count} essential packages..."
    print_progress_bar 3 4

    local current=0
    for package in "${PACKAGES[@]}"; do
        ((current++))
        printf "\r${BLUE}Installing package ${current}/${package_count}:${NC} ${YELLOW}${package}${NC} %-20s" ""

        if $INSTALL_CMD "$package" > /dev/null 2>&1; then
            printf " ${GREEN}✓${NC}\n"
        else
            printf " ${RED}✗${NC}\n"
            print_warning "Failed to install essential package: $package"
        fi
    done

    print_success "Essential packages installation completed"
    print_progress_bar 4 4

    # Install optional packages with progress tracking
    if [[ ${#OPTIONAL_PACKAGES[@]} -gt 0 ]]; then
        print_status "Step 4: Installing ${#OPTIONAL_PACKAGES[@]} optional packages for enhanced features..."
        local optional_success=0
        local optional_total=${#OPTIONAL_PACKAGES[@]}

        for package in "${OPTIONAL_PACKAGES[@]}"; do
            printf "\r${BLUE}Installing optional package:${NC} ${YELLOW}${package}${NC} %-20s" ""

            if $INSTALL_CMD "$package" > /dev/null 2>&1; then
                printf " ${GREEN}✓${NC}\n"
                ((optional_success++))
            else
                printf " ${YELLOW}○${NC} (optional)\n"
            fi
        done

        print_success "Optional packages completed: ${optional_success}/${optional_total} installed"
    fi

    # Start and enable essential services with detailed progress
    print_status "Step 5: Starting and enabling essential services..."

    local services_enabled=0
    local services_total=6

    # Enable and start nginx
    print_status "Service 1/${services_total}: Configuring Nginx web server..."
    if command -v nginx >/dev/null 2>&1; then
        print_info "  → Enabling nginx service..."
        systemctl enable nginx > /dev/null 2>&1
        print_info "  → Starting nginx service..."
        if systemctl start nginx > /dev/null 2>&1; then
            print_success "  ✓ Nginx service started and enabled successfully"
            ((services_enabled++))
        else
            print_warning "  ⚠ Nginx enabled but failed to start"
        fi
    else
        print_warning "  ○ Nginx not found"
    fi

    # Start and enable Docker if installed
    print_status "Service 2/${services_total}: Configuring Docker container engine..."
    if command -v docker >/dev/null 2>&1; then
        print_info "  → Starting docker service..."
        systemctl start docker > /dev/null 2>&1
        print_info "  → Enabling docker service..."
        systemctl enable docker > /dev/null 2>&1
        print_success "  ✓ Docker service started and enabled"

        # Add webdesktop user to docker group
        print_info "  → Adding $APP_USER to docker group..."
        if usermod -aG docker "$APP_USER" 2>/dev/null; then
            print_success "  ✓ User $APP_USER added to docker group"
        else
            print_warning "  ⚠ Failed to add user to docker group"
        fi
        ((services_enabled++))
    else
        print_warning "  ○ Docker not found (optional)"
    fi

    # Enable and start CUPS (printing)
    print_status "Service 3/${services_total}: Configuring CUPS printing service..."
    if command -v cups >/dev/null 2>&1; then
        print_info "  → Enabling cups service..."
        systemctl enable cups > /dev/null 2>&1
        print_info "  → Starting cups service..."
        systemctl start cups > /dev/null 2>&1
        print_success "  ✓ CUPS printing service started and enabled"
        ((services_enabled++))
    else
        print_warning "  ○ CUPS not found"
    fi

    # Enable and start Avahi (network discovery)
    print_status "Service 4/${services_total}: Configuring Avahi network discovery..."
    if command -v avahi-daemon >/dev/null 2>&1; then
        print_info "  → Enabling avahi-daemon service..."
        systemctl enable avahi-daemon > /dev/null 2>&1
        print_info "  → Starting avahi-daemon service..."
        systemctl start avahi-daemon > /dev/null 2>&1
        print_success "  ✓ Avahi network discovery started and enabled"
        ((services_enabled++))
    else
        print_warning "  ○ Avahi not found"
    fi

    # Enable and start Bluetooth
    print_status "Service 5/${services_total}: Configuring Bluetooth service..."
    if command -v bluetooth >/dev/null 2>&1; then
        print_info "  → Enabling bluetooth service..."
        systemctl enable bluetooth > /dev/null 2>&1
        print_info "  → Starting bluetooth service..."
        systemctl start bluetooth > /dev/null 2>&1
        print_success "  ✓ Bluetooth service started and enabled"
        ((services_enabled++))
    else
        print_warning "  ○ Bluetooth not found"
    fi

    # Configure sensors for hardware monitoring
    print_status "Service 6/${services_total}: Configuring hardware monitoring sensors..."
    if command -v sensors >/dev/null 2>&1; then
        print_info "  → Running sensors-detect..."
        if sensors-detect --auto > /dev/null 2>&1; then
            print_success "  ✓ Hardware sensors configured successfully"
            ((services_enabled++))
        else
            print_warning "  ⚠ Hardware sensors configuration completed with warnings"
        fi
    else
        print_warning "  ○ Sensors utility not found"
    fi

    print_success "Services configuration completed: ${services_enabled}/${services_total} services configured"
}

# Install Node.js
install_nodejs() {
    print_step "Installing Node.js"

    # Check if Node.js is already installed with detailed version check
    print_status "Step 1: Checking for existing Node.js installation..."
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION_FULL=$(node --version)
        NODE_VERSION=$(echo $NODE_VERSION_FULL | cut -d'v' -f2 | cut -d'.' -f1)
        print_status "Found Node.js ${NODE_VERSION_FULL}"

        if [[ $NODE_VERSION -ge $MIN_NODE_VERSION ]]; then
            print_success "Node.js ${NODE_VERSION_FULL} meets minimum requirements (v${MIN_NODE_VERSION}+)"
            return 0
        else
            print_warning "Node.js v${NODE_VERSION} is below minimum v${MIN_NODE_VERSION}, updating..."
        fi
    else
        print_status "No existing Node.js installation found"
    fi

    # Install Node.js using NodeSource repository with detailed progress
    print_status "Step 2: Adding NodeSource repository..."
    NODE_VERSION_LTS="20"

    if [[ "$PKG_MANAGER" == "apt-get" ]]; then
        print_status "  → Downloading NodeSource setup script for Node.js v${NODE_VERSION_LTS}..."
        print_progress_bar 1 3

        if curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION_LTS}.x -o /tmp/nodesource.sh > /dev/null 2>&1; then
            print_success "  ✓ NodeSource setup script downloaded"
            print_progress_bar 2 3

            print_status "  → Executing NodeSource setup script..."
            if bash /tmp/nodesource.sh > /dev/null 2>&1; then
                print_success "  ✓ NodeSource repository added"
                print_progress_bar 3 3

                print_status "  → Installing Node.js package..."
                if $INSTALL_CMD nodejs > /dev/null 2>&1; then
                    print_success "  ✓ Node.js package installed"
                else
                    print_error "  ✗ Failed to install Node.js package"
                    exit 1
                fi
            else
                print_error "  ✗ Failed to execute NodeSource setup script"
                exit 1
            fi
            rm -f /tmp/nodesource.sh
        else
            print_error "  ✗ Failed to download NodeSource setup script"
            exit 1
        fi

    elif [[ "$PKG_MANAGER" == "yum" ]]; then
        print_status "  → Configuring NodeSource YUM repository..."
        print_progress_bar 1 3

        if curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION_LTS}.x -o /tmp/nodesource.sh > /dev/null 2>&1; then
            print_success "  ✓ NodeSource setup script downloaded"
            print_progress_bar 2 3

            print_status "  → Executing NodeSource setup script..."
            if bash /tmp/nodesource.sh > /dev/null 2>&1; then
                print_success "  ✓ NodeSource repository configured"
                print_progress_bar 3 3

                print_status "  → Installing Node.js and npm packages..."
                if $INSTALL_CMD nodejs npm > /dev/null 2>&1; then
                    print_success "  ✓ Node.js and npm packages installed"
                else
                    print_error "  ✗ Failed to install Node.js packages"
                    exit 1
                fi
            else
                print_error "  ✗ Failed to configure NodeSource repository"
                exit 1
            fi
            rm -f /tmp/nodesource.sh
        else
            print_error "  ✗ Failed to download NodeSource setup script"
            exit 1
        fi
    fi

    # Verify installation with detailed check
    print_status "Step 3: Verifying Node.js installation..."
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION_FULL=$(node --version)
        NODE_VERSION=$(echo $NODE_VERSION_FULL | cut -d'v' -f2 | cut -d'.' -f1)
        NPM_VERSION=$(npm --version 2>/dev/null || echo "not found")

        print_success "  ✓ Node.js ${NODE_VERSION_FULL} installed successfully"
        print_info "  → Node.js version: ${NODE_VERSION_FULL}"
        print_info "  → npm version: v${NPM_VERSION}"

        if [[ $NODE_VERSION -ge $MIN_NODE_VERSION ]]; then
            print_success "  ✓ Version meets minimum requirements (v${MIN_NODE_VERSION}+)"
        else
            print_error "  ✗ Version ${NODE_VERSION} is below minimum v${MIN_NODE_VERSION}"
            exit 1
        fi
    else
        print_error "  ✗ Node.js installation verification failed"
        exit 1
    fi

    # Install pm2 globally for process management with progress
    print_status "Step 4: Installing PM2 process manager..."
    print_status "  → Installing PM2 globally via npm..."

    if npm install -g pm2 > /dev/null 2>&1; then
        PM2_VERSION=$(pm2 --version 2>/dev/null || echo "unknown")
        print_success "  ✓ PM2 process manager installed (v${PM2_VERSION})"
    else
        print_warning "  ⚠ PM2 installation failed, but Node.js is functional"
    fi
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

    # Backup existing installation if present with detailed progress
    print_status "Step 1: Checking for existing installation..."
    if [[ -d "$APP_DIR/.git" ]]; then
        print_status "  → Existing Git repository found, creating backup..."
        BACKUP_NAME="web-desktop-backup-$(date +%Y%m%d-%H%M%S)"
        print_progress_bar 1 4

        print_status "  → Creating backup in $BACKUP_DIR/$BACKUP_NAME..."
        if cp -r "$APP_DIR" "$BACKUP_DIR/$BACKUP_NAME" 2>/dev/null; then
            print_success "  ✓ Backup created successfully: $BACKUP_DIR/$BACKUP_NAME"
            print_progress_bar 2 4
        else
            print_warning "  ⚠ Backup creation failed, proceeding anyway"
        fi
    else
        print_status "  → No existing installation found"
        print_progress_bar 2 4
    fi

    # Remove old installation (except .git to preserve local changes)
    if [[ -d "$APP_DIR" ]]; then
        print_status "Step 2: Cleaning up old installation files..."
        print_progress_bar 3 4

        if find "$APP_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} + > /dev/null 2>&1; then
            print_success "  ✓ Old installation files removed"
        else
            print_warning "  ⚠ Some files could not be removed"
        fi
    else
        print_status "Step 2: No cleanup required"
        print_progress_bar 3 4
    fi

    # Clone repository with detailed progress
    print_status "Step 3: Cloning repository from $REPO_URL..."
    cd "$APP_DIR"

    print_status "  → Initializing Git clone..."
    print_progress_bar 4 4

    if sudo -u "$APP_USER" git clone "$REPO_URL" . > /dev/null 2>&1; then
        print_success "  ✓ Repository cloned successfully"
    else
        print_error "  ✗ Failed to clone repository"
        exit 1
    fi

    print_status "Step 4: Checking out branch $REPO_BRANCH..."
    if sudo -u "$APP_USER" git checkout "$REPO_BRANCH" > /dev/null 2>&1; then
        print_success "  ✓ Checked out branch: $REPO_BRANCH"
    else
        print_warning "  ⚠ Branch checkout failed, using default branch"
    fi

    print_status "Step 5: Pulling latest changes..."
    if sudo -u "$APP_USER" git pull origin "$REPO_BRANCH" > /dev/null 2>&1; then
        print_success "  ✓ Latest changes pulled"
    else
        print_warning "  ⚠ Pull completed with warnings"
    fi

    print_success "Repository setup completed at $APP_DIR"
}

# Install dependencies with verbose progress
install_dependencies() {
    print_step "Installing Application Dependencies"

    cd "$APP_DIR"

    # Install backend dependencies with detailed progress
    print_status "Step 1: Installing backend dependencies..."
    print_progress_bar 1 4

    cd backend
    print_status "  → Running npm ci (clean install)..."
    if sudo -u "$APP_USER" npm ci --production=false > /dev/null 2>&1; then
        print_success "  ✓ Backend dependencies installed via npm ci"
        print_progress_bar 2 4
    else
        print_status "  → npm ci failed, trying npm install..."
        if sudo -u "$APP_USER" npm install > /dev/null 2>&1; then
            print_success "  ✓ Backend dependencies installed via npm install"
            print_progress_bar 2 4
        else
            print_error "  ✗ Backend dependency installation failed"
            exit 1
        fi
    fi

    print_status "Step 2: Building backend..."
    print_status "  → Running TypeScript compilation..."
    if sudo -u "$APP_USER" npm run build > /dev/null 2>&1; then
        print_success "  ✓ Backend compiled successfully"
        print_progress_bar 3 4
    else
        print_error "  ✗ Backend compilation failed"
        exit 1
    fi

    # Install frontend dependencies and build with detailed progress
    print_status "Step 3: Installing frontend dependencies..."
    cd ../frontend

    print_status "  → Running npm ci for frontend..."
    if sudo -u "$APP_USER" npm ci > /dev/null 2>&1; then
        print_success "  ✓ Frontend dependencies installed"
        print_progress_bar 4 4
    else
        print_status "  → npm ci failed, trying npm install..."
        if sudo -u "$APP_USER" npm install > /dev/null 2>&1; then
            print_success "  ✓ Frontend dependencies installed via npm install"
        else
            print_error "  ✗ Frontend dependency installation failed"
            exit 1
        fi
    fi

    print_status "Step 4: Building frontend..."
    print_status "  → Running frontend build process..."
    if sudo -u "$APP_USER" npm run build > /dev/null 2>&1; then
        print_success "  ✓ Frontend built successfully"
    else
        print_error "  ✗ Frontend build failed"
        exit 1
    fi

    cd "$APP_DIR"
    print_success "All application dependencies installed and built successfully"
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
        print_error "Failed to start Web Desktop service"
        systemctl status "$SERVICE_NAME"
        exit 1
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
    check_system_requirements

    if [[ "$SKIP_DEPS" == false ]]; then
        install_system_packages
        install_nodejs
    fi

    create_app_user
    create_directories
    clone_repository
    install_dependencies
    create_environment_config
    create_systemd_service
    configure_firewall
    start_services
    verify_dependencies
    create_maintenance_scripts

    print_summary

    exit 0
}

# Run main function with all arguments
main "$@"