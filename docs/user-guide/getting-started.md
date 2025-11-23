# Getting Started Guide

Welcome to Web Desktop v1.0! This guide will help you install, configure, and start using your web-based desktop environment.

## 🎯 What is Web Desktop?

Web Desktop is a professional, feature-rich web-based desktop environment that provides a complete desktop experience in your browser. It combines the best features from systems like Synology DiskStation, ArozOS, and OS.js with modern web technologies.

### Key Features
- **Advanced Window Management**: Virtual desktops, tiling, and floating windows
- **File Management**: Virtual file system with multiple storage adapters
- **Terminal Access**: Full-featured terminal with WebSocket support
- **AI Integration**: Local AI model management and smart features
- **System Monitoring**: Real-time system resource monitoring
- **Application Marketplace**: Install and manage web applications

## 📋 System Requirements

### Minimum Requirements
- **Operating System**: Linux (Ubuntu 18.04+, Debian 10+, CentOS 8+)
- **Node.js**: Version 18.0 or higher (LTS recommended)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB free space
- **Network**: Modern web browser with internet access

### Supported Browsers
- **Chrome**: Version 90+
- **Firefox**: Version 88+
- **Safari**: Version 14+
- **Edge**: Version 90+

### Recommended Hardware
- **CPU**: 2+ cores for optimal performance
- **RAM**: 8GB+ for heavy usage and AI features
- **Storage**: SSD for better performance
- **Network**: Stable internet connection for cloud features

## 🚀 Installation

### Method 1: Quick Install (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/web-desktop.git
cd web-desktop

# Install all dependencies (both frontend and backend)
npm install

# Start development servers
./startdev.sh
```

### Method 2: Manual Install

#### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/web-desktop.git
cd web-desktop
```

#### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

#### Step 3: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

#### Step 4: Start Development Servers

**Start Backend:**
```bash
cd backend
npm run dev
```

**Start Frontend (in new terminal):**
```bash
cd frontend
npm run dev
```

### Production Installation

For production deployment, see the [Production Deployment Guide](../../deployment/production.md).

## 🔧 First Time Setup

### Access Your Web Desktop

Once the servers are running, open your web browser and navigate to:

- **Main Application**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Legacy Frontend**: http://localhost:5174 (for development/testing)

### Initial Configuration

#### 1. Desktop Environment
Your Web Desktop will open with a clean desktop environment:

```
┌─────────────────────────────────────────┐
│ 🏠 Apps  🗂️ Files  💻 Terminal  📝 Notes │
├─────────────────────────────────────────┤
│                                         │
│           Desktop Area                  │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

#### 2. Basic Features

**Application Launcher (Alt+Space):**
- Press `Alt+Space` to open the app launcher
- Type to search for applications
- Use arrow keys to navigate, Enter to launch

**Window Management:**
- **Drag** windows by their title bars
- **Resize** windows from edges and corners
- **Right-click** title bar for window options
- **Use taskbar** to minimize/restore windows

**File Manager:**
- Double-click the Files icon or open from app launcher
- Navigate your local file system
- Drag files to upload
- Right-click for file operations

## 🎓 Basic Usage Tutorial

### 1. Launching Applications

1. **Using App Launcher**:
   - Press `Alt+Space`
   - Type the application name (e.g., "terminal", "files")
   - Press `Enter` to launch

2. **Using Desktop Icons**:
   - Double-click desktop icons
   - Available apps: Files, Terminal, Notes, System Monitor

### 2. File Management

1. **Open File Manager**:
   - Launch from app launcher or desktop
   - Navigate through directories
   - Use breadcrumb navigation

2. **File Operations**:
   - **Upload**: Drag files into the window or click upload button
   - **Create Folder**: Right-click → New Folder
   - **Copy/Cut/Paste**: Right-click files or use keyboard shortcuts
   - **Delete**: Right-click → Delete (with confirmation)

3. **File Preview**:
   - Click on text files to preview
   - Image files show thumbnails
   - Use the preview panel for quick viewing

### 3. Terminal Usage

1. **Open Terminal**:
   - Launch from app launcher (type "terminal")
   - Full bash shell with common commands

2. **Terminal Features**:
   - Tab completion
   - Command history
   - Copy/paste support
   - Resize as needed

### 4. Window Management

1. **Basic Operations**:
   - **Minimize**: Click `_` in title bar
   - **Maximize**: Click `□` in title bar
   - **Close**: Click `×` in title bar

2. **Advanced Features**:
   - **Tiling Mode**: Automatic window arrangement
   - **Virtual Desktops**: Multiple workspaces
   - **Window Snapping**: Drag to screen edges

## 🔍 Exploring Features

### System Monitor
- **CPU Usage**: Real-time CPU utilization
- **Memory Usage**: RAM and swap usage
- **Disk Usage**: Storage space and I/O
- **Network Activity**: Bandwidth monitoring

### Notes Application
- **Rich Text Editor**: Format your notes
- **Auto-save**: Notes saved automatically
- **Search**: Find notes quickly
- **Export**: Save notes as files

### Application Marketplace
- **Browse Apps**: Discover new applications
- **Install Apps**: One-click installation
- **Manage Apps**: Update and remove applications

## ⚙️ Personalization

### Theme Customization
1. Open Settings from app launcher
2. Navigate to "Appearance" or "Themes"
3. Choose from available themes:
   - **Light**: Clean, bright interface
   - **Dark**: Easy on the eyes
   - **Catppuccin**: Professional color schemes

### Desktop Configuration
1. **Wallpaper**: Set custom background images
2. **Window Behavior**: Configure window management preferences
3. **Shortcuts**: Customize keyboard shortcuts
4. **Startup Apps**: Choose applications to launch on start

## 🔧 Common Tasks

### Upload Files
1. Open File Manager
2. Navigate to desired folder
3. Drag files from your computer
4. Or click the upload button

### Create Text Document
1. Open Notes application
2. Start typing
3. Use formatting tools as needed
4. Notes save automatically

### System Information
1. Launch System Monitor
2. View real-time system metrics
3. Check process list
4. Monitor resource usage

### Install Applications
1. Open Marketplace from app launcher
2. Browse available applications
3. Click "Install" on desired apps
4. Launch from app launcher

## 🆘 Getting Help

### Documentation Resources
- **[User Manual](manual.md)**: Complete feature documentation
- **[Tutorials](../tutorials/)**: Step-by-step guides
- **[FAQ](faq.md)**: Frequently asked questions
- **[Troubleshooting](../troubleshooting/)**: Common issues and solutions

### Keyboard Shortcuts
- **Alt+Space**: Open app launcher
- **Alt+Tab**: Switch between windows
- **Ctrl+C/V**: Copy/paste in terminal
- **F11**: Toggle fullscreen
- **Esc**: Close dialogs/menus

### Support Channels
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Browse detailed guides
- **Community**: Join discussions

## 🎉 Next Steps

Congratulations! You've successfully set up Web Desktop. Here are some suggestions for what to do next:

1. **Explore Features**: Try out all the built-in applications
2. **Customize**: Personalize your desktop environment
3. **Install Apps**: Browse the marketplace for new applications
4. **Advanced Features**: Explore terminal, file management, and system monitoring
5. **Learn More**: Read through our comprehensive documentation

### Recommended Reading
- [Complete User Manual](manual.md)
- [Feature Tutorials](../tutorials/)
- [Advanced Configuration Guide](manual.md#advanced-configuration)
- [Security Best Practices](../deployment/security.md)

---

**Welcome to Web Desktop!** 🎉

Your web-based desktop environment is ready to use. If you need any assistance, our comprehensive documentation is here to help you make the most of your new desktop environment.