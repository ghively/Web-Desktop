# Frequently Asked Questions

Find answers to common questions about Web Desktop v1.0.

## 🚀 Getting Started

### Q: What are the minimum system requirements for Web Desktop?
**A:** Minimum requirements include:
- **OS**: Linux (Ubuntu 18.04+, Debian 10+, CentOS 8+)
- **Node.js**: Version 18.0 or higher
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 10GB free space
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Q: Can I run Web Desktop on Windows or macOS?
**A:** Currently, Web Desktop is designed for Linux servers. However, you can access the web interface from any operating system using a modern web browser.

### Q: Is Web Desktop free to use?
**A:** Yes, Web Desktop is open source and released under the MIT License. You can use, modify, and distribute it freely.

### Q: Do I need to install Docker to use Web Desktop?
**A:** No, Docker is optional. Web Desktop can be installed directly using Node.js and npm. Docker is available for easier deployment and containerization.

## 🔧 Installation and Setup

### Q: How do I install Web Desktop?
**A:** Quick installation:
```bash
git clone https://github.com/your-username/web-desktop.git
cd web-desktop
npm install
./start-stack.sh
```
For detailed instructions, see the [Getting Started Guide](getting-started.md).

### Q: The installation failed. What should I do?
**A:** Common solutions:
1. **Check Node.js version**: Ensure you have Node.js 18+
2. **Clear npm cache**: `npm cache clean --force`
3. **Delete node_modules**: `rm -rf node_modules package-lock.json`
4. **Reinstall**: `npm install`
5. **Check permissions**: Ensure you have write permissions

### Q: How do I update Web Desktop to the latest version?
**A:** To update:
```bash
git pull origin main
npm update
./start-stack.sh
```

### Q: Can I run Web Desktop on a different port?
**A:** Yes, you can configure ports in:
- Backend: `backend/src/server.ts` (default: 3001)
- Frontend: `frontend/vite.config.ts` (default: 5173)

## 🖥️ Desktop Environment

### Q: How do I switch between floating and tiling window modes?
**A:**
1. Open Settings from the app launcher
2. Navigate to "Window Management"
3. Toggle between "Floating" and "Tiling" modes
4. Changes apply immediately

### Q: How do I create virtual desktops?
**A:**
1. Right-click on the desktop or taskbar
2. Select "Add Virtual Desktop"
3. Use `Ctrl+Alt+Arrow Keys` to switch between desktops
4. Right-click window title bars to move windows between desktops

### Q: Can I customize the desktop wallpaper?
**A:** Yes:
1. Open Settings → Appearance
2. Click on "Wallpaper"
3. Choose an image or color
4. You can also set slideshows or online wallpapers

### Q: How do I change the theme?
**A:**
1. Open Settings → Appearance → Themes
2. Choose from built-in themes (Light, Dark, Catppuccin variants)
3. Or create a custom theme with your preferred colors

## 📁 File Management

### Q: How do I connect to external storage (FTP, SFTP, WebDAV)?
**A:**
1. Open File Manager
2. Click the "+" button to add storage
3. Select storage type (FTP, SFTP, WebDAV)
4. Enter connection details and credentials
5. Click "Connect" to add the storage

### Q: Why can't I access certain system directories?
**A:** For security reasons, Web Desktop restricts file access to:
- Home directory (`~`)
- `/tmp`
- `/var/tmp`
- `/mnt`
This prevents unauthorized system access.

### Q: How do I upload large files?
**A:**
1. Use the File Manager drag-and-drop feature
2. Or click the upload button
3. Multiple files can be uploaded simultaneously
4. Maximum file size: 100MB per file (configurable)

### Q: Can I preview files without downloading them?
**A:** Yes, Web Desktop provides inline previews for:
- **Text files**: Source code, documents, logs
- **Images**: JPG, PNG, GIF, WebP, SVG
- **Documents**: PDF files (if viewer is installed)

### Q: How does file deduplication work?
**A:** Web Desktop uses:
- **SHA-256 hashing** to identify identical files
- **AI similarity detection** for near-duplicate images/videos
- **Smart grouping** to organize potential duplicates
- **User control** to select which files to keep or remove

## 💻 Terminal Usage

### Q: Why is my terminal not working?
**A:** Common solutions:
1. **Check backend connection**: Ensure backend server is running
2. **WebSocket error**: Check browser console for WebSocket errors
3. **Permission issues**: Ensure user has terminal access permissions
4. **Browser compatibility**: Try a different browser if issues persist

### Q: Can I run GUI applications in the terminal?
**A:** Currently, Web Desktop supports command-line applications only. GUI application support via VNC/X11 forwarding is planned for a future release.

### Q: How do I copy and paste in the terminal?
**A:**
- **Copy**: `Ctrl+Shift+C` or right-click → Copy
- **Paste**: `Ctrl+Shift+V` or right-click → Paste
- Standard `Ctrl+C/V` are reserved for terminal signals

### Q: Can I open multiple terminal tabs?
**A:** Yes:
1. Right-click in the terminal
2. Select "New Terminal" or "New Tab"
3. Use `Ctrl+Tab` to switch between tabs
4. Tabs can be dragged to rearrange

## 🤖 AI and Smart Features

### Q: Do I need a powerful GPU for AI features?
**A:** Not necessarily. Web Desktop's AI features work with:
- **CPU-only**: Basic AI functionality works on CPU
- **GPU acceleration**: Recommended for better performance with large models
- **Cloud models**: Can use cloud-based AI models if local hardware is limited

### Q: How do I install AI models?
**A:**
1. Open AI Model Manager from app launcher
2. Browse the model library
3. Click "Install" on desired models
4. Models download and install automatically
5. Monitor download progress in the interface

### Q: What AI models are supported?
**A:** Web Desktop supports:
- **Ollama models**: Local LLM models (Llama, Mistral, etc.)
- **OpenRouter models**: Cloud-based models
- **Custom models**: User-provided models (advanced)

### Q: Is my data private when using AI features?
**A:** Data privacy depends on the model used:
- **Local models**: All processing happens on your machine
- **Cloud models**: Data is sent to cloud providers (check their privacy policies)
- **Hybrid approach**: Use local models for sensitive data

## 🔌 Integrations and Connections

### Q: How do I connect to Home Assistant?
**A:**
1. Open Home Assistant Integration from app launcher
2. Enter your Home Assistant URL
3. Generate a Long-Lived Access Token in HA
4. Enter the token in Web Desktop
5. Test connection and save settings

### Q: Can Web Desktop control my smart home devices?
**A:** Yes, through Home Assistant integration:
- Control all HA-compatible devices
- Automations and scene control
- Real-time device state updates
- Custom device dashboards

### Q: What media servers are supported?
**A:** Currently supported:
- **Jellyfin**: Full integration and control
- **Emby**: Compatible with Emby servers
- **Plex**: Basic integration planned
- **Sonarr/Radarr**: Download management

### Q: How do I set up the built-in FTP server?
**A:**
1. Open File Servers from app launcher
2. Select FTP Server
3. Configure:
   - Port number
   - User accounts
   - Directory permissions
4. Click "Start Server"

## 🔒 Security and Privacy

### Q: Is Web Desktop secure?
**A:** Web Desktop includes multiple security features:
- Input validation and sanitization
- Path traversal protection
- Rate limiting on APIs
- WebSocket origin validation
- Secure file access controls

### Q: Should I run Web Desktop on the public internet?
**A:** For production use:
- Use HTTPS/TLS encryption
- Implement proper authentication
- Use firewall rules
- Consider VPN access
- Regular security updates

### Q: How are user credentials stored?
**A:** Storage methods:
- **Local connections**: Credentials stored in encrypted local database
- **External connections**: Encrypted transmission using HTTPS/WSS
- **Passwords**: Hashed and salted when stored

### Q: Can I restrict access to Web Desktop?
**A:** Yes, you can:
- Use firewall rules to restrict IP access
- Implement reverse proxy with authentication
- Use VPN for remote access
- Configure network-level restrictions

## ⚡ Performance and Optimization

### Q: Why is Web Desktop running slowly?
**A:** Common performance issues and solutions:
1. **High memory usage**: Close unused applications
2. **Slow file operations**: Check disk I/O and network speed
3. **Browser performance**: Try a different browser or clear cache
4. **System resources**: Monitor CPU and memory usage

### Q: How can I improve performance?
**A:** Optimization tips:
- **Use modern browser**: Chrome, Firefox, or Edge
- **Close unused tabs/applications**
- **Disable animations**: Settings → Appearance → Disable animations
- **Clear browser cache**: Periodic cache clearing
- **Update regularly**: Keep Web Desktop and browser updated

### Q: What are the recommended system specifications for optimal performance?
**A:** For best performance:
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB for AI features)
- **Storage**: SSD for better I/O performance
- **Network**: Stable broadband connection

### Q: Can Web Desktop handle multiple users simultaneously?
**A:** Yes, Web Desktop supports:
- Multiple concurrent users
- Isolated user sessions
- Configurable user limits
- Resource usage monitoring

## 🐛 Troubleshooting

### Q: Web Desktop is not loading. What should I check?
**A:** Check these items in order:
1. **Backend server**: `cd backend && npm run dev`
2. **Frontend server**: `cd frontend && npm run dev`
3. **Port availability**: Ensure ports 3001 and 5173 are free
4. **Network connectivity**: Check firewall and network settings
5. **Browser console**: Check for JavaScript errors

### Q: I'm getting "WebSocket connection failed" errors.
**A:** Solutions:
1. **Check backend port**: Ensure backend is running on port 3001
2. **Firewall rules**: Allow WebSocket connections
3. **Proxy settings**: Configure proxy if using one
4. **Browser extensions**: Disable ad blockers or security extensions

### Q: Files are not uploading. What's wrong?
**A:** Check:
1. **File size**: Ensure files are under 100MB limit
2. **Disk space**: Verify sufficient disk space
3. **Permissions**: Check write permissions for target directory
4. **Network**: Stable internet connection for uploads

### Q: Applications are not launching.
**A:** Troubleshooting steps:
1. **Check app installation**: Verify app is properly installed
2. **Review logs**: Check backend and frontend logs for errors
3. **Clear cache**: Clear browser cache and restart
4. **Reinstall app**: Remove and reinstall the problematic app

## 📞 Support and Community

### Q: Where can I get help?
**A:** Support options:
- **Documentation**: [Comprehensive guides](../README.md)
- **GitHub Issues**: Report bugs and request features
- **Community Forum**: Connect with other users
- **Troubleshooting Guide**: [Detailed troubleshooting](../troubleshooting/)

### Q: How do I report a bug?
**A:** To report bugs:
1. **Check existing issues**: Search for similar reports
2. **Provide details**: Include steps to reproduce, system info
3. **Include logs**: Share relevant error messages
4. **Use templates**: Follow GitHub issue templates

### Q: Can I contribute to Web Desktop?
**A:** Yes! Contributions are welcome:
- **Code contributions**: See [Developer Guide](../developer/contributing.md)
- **Documentation**: Help improve documentation
- **Bug reports**: Report issues you encounter
- **Feature requests**: Suggest new features
- **Translations**: Help translate to other languages

### Q: Where can I find the latest updates?
**A:** Stay updated:
- **GitHub Repository**: Latest code and releases
- **Changelog**: [Version history](../../CHANGELOG.md)
- **Roadmap**: [Future plans](../../ROADMAP.md)
- **Documentation**: Always up-to-date guides

---

## 🏷️ Tags

For quick navigation, questions are tagged with:
- **Getting Started**: Basic installation and setup
- **Desktop Environment**: Window management, themes, virtual desktops
- **File Management**: File operations, storage, previews
- **Terminal**: Command-line usage and troubleshooting
- **AI Features**: Artificial intelligence and machine learning
- **Integrations**: Home Assistant, media servers, external services
- **Security**: Privacy, authentication, access control
- **Performance**: Optimization and troubleshooting
- **Support**: Getting help and contributing

---

**Still have questions?** Check our [complete documentation](../README.md) or [contact support](../../README.md#support).