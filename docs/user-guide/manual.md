# Web Desktop User Manual

A comprehensive guide to all features and functionality of Web Desktop v1.0.

## Table of Contents

1. [Desktop Environment](#desktop-environment)
2. [Application Management](#application-management)
3. [File Management](#file-management)
4. [Terminal Usage](#terminal-usage)
5. [System Tools](#system-tools)
6. [Customization](#customization)
7. [Advanced Features](#advanced-features)

---

## 🖥️ Desktop Environment

### Window Management System

Web Desktop features an advanced window management system with both tiling and floating modes.

#### Floating Mode (Default)
- **Drag Windows**: Click and hold title bar to move
- **Resize Windows**: Drag edges or corners
- **Minimize**: Click `_` in title bar or right-click menu
- **Maximize**: Click `□` in title bar
- **Close**: Click `×` in title bar or press `Alt+F4`
- **Always on Top**: Right-click title bar → "Always on Top"

#### Tiling Mode
- **Automatic Layout**: Windows arrange themselves in a grid
- **Smart Resizing**: Windows adjust when others are resized
- **Keyboard Control**: Use arrow keys to navigate between windows
- **Switch Modes**: Toggle between floating and tiling in settings

### Virtual Desktops
- **Multiple Workspaces**: Create up to 10 virtual desktops
- **Switch Desktops**: `Ctrl+Alt+Arrow Keys` or use desktop switcher
- **Move Windows**: Right-click title bar → "Move to Desktop"
- **Desktop Overview**: View all desktops in a grid layout

### Taskbar and System Tray
- **Running Applications**: Shows all open applications
- **Quick Launch**: Pin favorite applications
- **System Tray**: System notifications and quick settings
- **Clock**: Current time and date display

## 🚀 Application Management

### Application Launcher
The application launcher provides quick access to all installed applications.

#### Keyboard Shortcuts
- **Open Launcher**: `Alt+Space`
- **Search**: Type while launcher is open
- **Navigate**: Arrow keys up/down
- **Launch**: `Enter` key
- **Close**: `Escape` key

#### Search Features
- **Fuzzy Search**: Find apps by partial names
- **Category Search**: Type category names (e.g., "system", "media")
- **Running Apps**: Green indicator (▶) shows running applications
- **Recent Apps**: Frequently used apps appear first

### Application Marketplace
Discover, install, and manage third-party applications.

#### Browsing Applications
1. Open Marketplace from app launcher
2. Browse categories:
   - **Productivity**: Office tools, editors, utilities
   - **Development**: Programming tools, IDEs
   - **Media**: Audio, video, image tools
   - **System**: Monitoring, configuration tools
   - **Games**: Entertainment and games

#### Installing Applications
1. Find desired application in marketplace
2. Click "Install" button
3. Wait for download and installation
4. Launch from app launcher

#### Managing Applications
- **Update**: Check for and install updates
- **Uninstall**: Remove applications you no longer need
- **Configure**: Application-specific settings
- **Permissions**: Manage app access and permissions

### Default Applications

#### File Manager
- **Purpose**: Browse and manage files
- **Features**: Upload, download, copy, move, delete files
- **Storage**: Local, FTP, SFTP, WebDAV support

#### Terminal
- **Purpose**: Command-line interface
- **Features**: Full bash shell, tab completion, history
- **Access**: System commands, programming, scripting

#### Notes
- **Purpose**: Text editing and note-taking
- **Features**: Rich text, auto-save, search, export
- **Formats**: Plain text, markdown, rich text

#### System Monitor
- **Purpose**: System resource monitoring
- **Features**: CPU, memory, disk, network usage
- **Processes**: View and manage running processes

## 📁 File Management

### Virtual File System (VFS)
Web Desktop's VFS provides unified access to multiple storage types.

#### Supported Storage Types
- **Local Storage**: Your computer's file system
- **FTP**: File Transfer Protocol servers
- **SFTP**: Secure File Transfer Protocol
- **WebDAV**: Web-based Distributed Authoring and Versioning

#### Connection Management
1. **Add Storage**: File Manager → "+" button → Select type
2. **Configure**: Enter server details and credentials
3. **Connect**: Test connection and save
4. **Access**: Browse connected storages side-by-side

### File Operations

#### Basic Operations
- **Navigate**: Click folders or use breadcrumb navigation
- **Upload**: Drag files or click upload button
- **Download**: Right-click file → "Download"
- **Create Folder**: Right-click → "New Folder"
- **Rename**: Right-click → "Rename" or press `F2`

#### Advanced Operations
- **Copy**: Right-click → "Copy" or `Ctrl+C`
- **Cut**: Right-click → "Cut" or `Ctrl+X`
- **Paste**: Right-click → "Paste" or `Ctrl+V`
- **Delete**: Right-click → "Delete" or `Del` key
- **Properties**: Right-click → "Properties" for file details

#### Batch Operations
- **Multiple Selection**: `Ctrl+Click` for individual files
- **Range Selection**: `Shift+Click` for range
- **Select All**: `Ctrl+A`
- **Batch Actions**: Apply operations to multiple files

### File Preview and Editing

#### Preview Panel
- **Text Files**: Inline preview with syntax highlighting
- **Images**: Thumbnail and full-size preview
- **Documents**: PDF and office document preview
- **Media**: Audio and video file information

#### File Information
- **Size**: File and folder sizes
- **Type**: File format and MIME type
- **Modified**: Last modification date
- **Permissions**: Read/write/execute permissions

### File Search

#### Quick Search
- **Search Bar**: Located at top of file manager
- **Real-time**: Results appear as you type
- **Filters**: Filter by file type, size, date

#### Advanced Search
- **Name Patterns**: Use wildcards (*, ?)
- **Content Search**: Search within text files
- **Metadata Search**: Search by file properties
- **Saved Searches**: Save frequently used searches

## 💻 Terminal Usage

### Terminal Features
Full-featured terminal emulator with advanced capabilities.

#### Shell Environment
- **Bash Shell**: Complete bash environment
- **Command History**: Access previous commands with arrows
- **Tab Completion**: Auto-complete commands and paths
- **Aliases**: Create custom command shortcuts

#### Terminal Operations
- **Copy**: `Ctrl+Shift+C` or right-click → Copy
- **Paste**: `Ctrl+Shift+V` or right-click → Paste
- **Clear**: `Ctrl+L` to clear screen
- **Search**: `Ctrl+R` for reverse command search

#### Multiple Terminals
- **New Tab**: Right-click → "New Terminal"
- **Tab Navigation**: `Ctrl+Tab` to switch tabs
- **Split View**: Divide terminal into multiple panes

### Common Terminal Tasks

#### File Management Commands
```bash
ls -la              # List files with details
cd /path/to/dir     # Change directory
mkdir newfolder     # Create directory
cp source dest      # Copy files
mv old new          # Move/rename files
rm filename         # Delete files
```

#### System Information
```bash
top                 # View running processes
df -h               # Disk usage
free -h             # Memory usage
uname -a            # System information
```

#### Network Commands
```bash
ping google.com     # Test connectivity
curl url            # Download content
ssh user@host       # Remote login
```

## ⚙️ System Tools

### System Monitor
Real-time monitoring of system resources and processes.

#### Resource Monitoring
- **CPU Usage**: Per-core utilization and graphs
- **Memory Usage**: RAM, swap, and cache usage
- **Disk Usage**: Storage space and I/O statistics
- **Network Activity**: Bandwidth usage and connections

#### Process Management
- **Process List**: All running processes with details
- **Sort Options**: By CPU, memory, name, PID
- **Process Actions**: End, prioritize, search processes
- **System Services**: View and manage system services

#### Historical Data
- **Performance Graphs**: Historical usage trends
- **Resource Logs**: Detailed logging and statistics
- **Alerts**: Configurable usage alerts

### Settings and Configuration
Comprehensive settings management for all desktop features.

#### Appearance Settings
- **Themes**: Choose from available themes
- **Colors**: Customize color schemes
- **Fonts**: Configure font sizes and families
- **Icons**: Select icon sets and sizes

#### System Settings
- **Language**: Interface language and locale
- **Time Zone**: Configure time zone and format
- **Power Management**: Sleep and power settings
- **Network**: Network configuration and proxies

#### Application Settings
- **Default Apps**: Set default applications for file types
- **Startup Apps**: Configure launch-on-startup applications
- **App Permissions**: Manage application access rights
- **Notifications**: Configure notification preferences

## 🎨 Customization

### Themes and Appearance

#### Built-in Themes
- **Light Theme**: Clean, bright interface
- **Dark Theme**: Easy-on-the-eyes dark interface
- **Catppuccin Themes**: Professional color schemes
  - Latte (light)
  - Frappé (dark)
  - Macchiato (dark)
  - Mocha (darkest)

#### Custom Theme Creation
1. Open Settings → Appearance → Custom Themes
2. Select "Create New Theme"
3. Customize colors for:
   - Background colors
   - Text colors
   - Accent colors
   - Window decorations
4. Save and apply your theme

### Desktop Customization

#### Wallpaper and Background
- **Image Wallpaper**: Set custom background images
- **Color Background**: Solid or gradient backgrounds
- **Slideshow**: Rotate through multiple images
- **Online Sources**: Fetch from online wallpaper services

#### Desktop Icons and Layout
- **Icon Size**: Small, medium, large icon sizes
- **Grid Layout**: Auto-arrange desktop icons
- **Desktop Widgets**: Add useful widgets to desktop
- **Shortcuts**: Create custom shortcuts and links

### Behavior Settings

#### Window Behavior
- **Focus Mode**: Click-to-focus or focus-follows-mouse
- **Window Snapping**: Auto-snap to screen edges
- **Animations**: Enable/disable window animations
- **Workspaces**: Configure virtual desktop behavior

#### Input Settings
- **Keyboard Shortcuts**: Customize all keyboard shortcuts
- **Mouse Settings**: Pointer speed, buttons, gestures
- **Touchpad**: Configure touchpad behavior and gestures

## 🔧 Advanced Features

### AI Integration
Web Desktop includes powerful AI features for enhanced productivity.

#### AI Assistant
- **Natural Language Commands**: Control desktop with voice/text
- **Smart Search**: AI-powered file and content search
- **Task Automation**: Learn and automate repetitive tasks
- **Recommendations**: Get intelligent suggestions

#### Local AI Models
- **Ollama Integration**: Manage local AI models
- **Model Library**: Browse and install AI models
- **Resource Monitoring**: Track GPU and memory usage
- **Chat Interface**: Direct interaction with AI models

### Storage Pool Management
Advanced storage management for multiple disks and remote storage.

#### Storage Pools
- **Multi-Disk Support**: Combine multiple physical disks
- **RAID Support**: Various RAID levels with redundancy
- **Remote Storage**: Integrate cloud and network storage
- **Hot Swapping**: Add/remove disks without downtime

#### File Deduplication
- **Smart Detection**: AI-powered duplicate file detection
- **Hash Comparison**: SHA-256 based fingerprinting
- **Storage Analysis**: Calculate potential space savings
- **Selective Cleanup**: User-controlled duplicate removal

### Network and Connectivity

#### WiFi Management
- **Network Scanning**: Discover available WiFi networks
- **Connection Management**: Connect and manage network profiles
- **Security Support**: WPA2, WPA3, enterprise authentication
- **Signal Monitoring**: Real-time signal quality tracking

#### File Servers
- **FTP Server**: Built-in FTP server with user management
- **SFTP Server**: Secure file transfer with SSH keys
- **WebDAV Server**: HTTP-based file sharing
- **Port Configuration**: Custom port assignment and monitoring

### Home Assistant Integration
Connect and control your smart home devices.

#### Device Control
- **Real-time Control**: Live IoT device management
- **Automation Management**: Create and manage automations
- **Dashboard Integration**: Embedded HA dashboards
- **Entity Management**: Browse and control all HA entities

#### WebSocket Communication
- **Real-time Updates**: Live state changes and notifications
- **Event Subscription**: Subscribe to specific device events
- **Command Execution**: Send commands to devices and services

---

## 🔍 Keyboard Shortcuts Reference

### System Shortcuts
- `Alt+Space` - Open application launcher
- `Alt+Tab` - Switch between windows
- `Ctrl+Alt+Arrow Keys` - Switch virtual desktops
- `F11` - Toggle fullscreen
- `Esc` - Close dialogs/menus
- `Alt+F4` - Close current window

### File Manager Shortcuts
- `Ctrl+N` - New window
- `Ctrl+T` - New tab
- `Ctrl+W` - Close tab/window
- `Ctrl+A` - Select all
- `Ctrl+C` - Copy
- `Ctrl+X` - Cut
- `Ctrl+V` - Paste
- `Del` - Delete
- `F2` - Rename
- `F5` - Refresh

### Terminal Shortcuts
- `Ctrl+Shift+C` - Copy
- `Ctrl+Shift+V` - Paste
- `Ctrl+L` - Clear screen
- `Ctrl+R` - Search command history
- `Ctrl+C` - Cancel current command
- `Ctrl+D` - Exit shell
- `Tab` - Auto-complete
- `↑/↓` - Command history

## 📚 Additional Resources

### Documentation
- [Getting Started Guide](getting-started.md)
- [Feature Tutorials](../tutorials/)
- [Troubleshooting Guide](../troubleshooting/)
- [FAQ](faq.md)

### Community and Support
- GitHub Issues: Report bugs and request features
- Community Forum: Connect with other users
- Documentation: Comprehensive guides and references

---

**Web Desktop v1.0 User Manual**

This manual covers all features and functionality of Web Desktop. For the most up-to-date information, please check our online documentation.