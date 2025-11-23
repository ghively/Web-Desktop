# Web Desktop Feature Roadmap

This document outlines the planned features, improvements, and bug fixes for the Web Desktop project, incorporating research findings and user priorities.

---

## 1. Current Status & Critical Tasks

### 1.1 Critical Bug: Interactive Terminal

*   **Status:** Fixed. The `xterm.js` interactive terminal is now fully functional. The blank display issue was resolved by ensuring `xterm.js` loads before `monaco-editor` (AMD loader conflict) and fixing a backend `node-pty` import issue.
*   **Priority:** High. (Completed)
*   **To-Do Item:** [x] Fix the interactive terminal: The xterm.js terminal is not initializing or connecting correctly, resulting in a blank display.
### 1.1 ✅ FIXED: Interactive Terminal

*   **Status:** ✅ **COMPLETED** (2025-11-23)
*   **Fixes Applied:**
    *   Updated to scoped packages (@xterm/xterm, @xterm/addon-fit)
    *   Added missing CSS import
    *   Fixed WebSocket event handler structure
    *   Removed backend control character sanitization
    *   Terminal now initializes, connects, and accepts input correctly
*   **Files Modified:**
    *   `frontend/package.json`
    *   `frontend/src/components/Terminal.tsx`
    *   `backend/src/server.ts`

### 1.2 Implemented Features & Improvements

*   **Moved "Apps" Button:** The application launcher button has been moved to the top-left of the top bar.
*   **Dynamic Running Apps List:** The top status bar now dynamically displays buttons only for applications that are currently open and running.
*   **Simple Command-Line Terminal (Saved):** A basic command-line interface for the terminal was implemented and its code saved to `frontend-simple/js/simple-terminal.js` for future reference (e.g., for an AI chatbot interface).
*   **App Launcher Display Fix:** Implemented a more robust solution to ensure the app launcher correctly fetches and displays installed applications.
*   **Backend Server Script:** Created `start-backend.sh` in the `backend` directory for reliable server startup.

---

## 2. Feature Roadmap Categories (Prioritized by User)

The following feature categories have been chosen by the user for the roadmap:

*   **Enhanced File Management**
*   **Application & System Management**
*   **Productivity & Services**

---

## 3. Detailed Feature & Improvement Proposals

Below are detailed proposals for features and improvements, including research findings for integration.

### 3.1 Enhanced File Management

#### 3.1.1 NFS and SMB Share Management
*   **Description:** Provide a UI-driven mechanism to configure and manage Network File System (NFS) and Server Message Block (SMB/Samba) shares directly from the web desktop. This includes adding, modifying, deleting shares, and managing user/group permissions.
*   **Recommended Approach:** Build a custom solution by extending the existing Node.js backend API.
    *   **Backend Implementation:** Create new API endpoints that:
        *   Read and parse configuration files (`/etc/exports` for NFS, `/etc/samba/smb.conf` for SMB).
        *   Validate user input for share configurations.
        *   Execute Linux command-line tools (`exportfs`, `smbcontrol`, `net`) to apply changes and manage services.
        *   Handle user and group management relevant to share permissions.
    *   **Frontend Implementation:** Develop React components (within `frontend-simple`) to provide:
        *   A dashboard to view existing NFS and SMB shares.
        *   Forms for creating and editing share configurations.
        *   User/group selection for permissions.
*   **Borrowing Code/Concepts:**
    *   Inspiration can be drawn from existing tools like Webmin or Cockpit regarding their approach to configuration management, but direct integration of their UIs is deemed overly complex for this specific functionality. Focus on wrapping their underlying CLI actions.
*   **Example Code:** None directly created, as it involves extending existing backend/frontend.

#### 3.1.2 Cloud Sync Integration
*   **Description:** Integrate with popular cloud storage services (e.g., Dropbox, Google Drive, Nextcloud) to allow users to synchronize files directly from their web desktop.
*   **Recommended Approach:** Implement API clients for chosen cloud services within the Node.js backend.
    *   **Backend:** Develop modules to authenticate with cloud services and manage file synchronization tasks.
    *   **Frontend:** Create UI components to link cloud accounts, configure sync folders, and display sync status.
*   **Open Source Projects:** Many Node.js libraries exist for interacting with various cloud storage APIs.

#### 3.1.3 General File Manager Improvements
*   **Description:** Enhance the existing file manager with features such as drag-and-drop, more robust file operations (copy, move, rename, delete), file previews, and improved navigation.
*   **Recommended Approach:** Iterative improvements to the `fileManager.js` and associated frontend components.
*   **Status:** In Progress / Partially Implemented. Added `create_folder`, `delete`, `rename`, `copy`, `move` operations with context menu and clipboard support.
#### 3.1.3 ✅ IMPLEMENTED: General File Manager Improvements
*   **Status:** ✅ **COMPLETED** (2025-11-23)
*   **Features Implemented (Both React & Legacy Frontends):**
    *   ✅ Drag-and-drop file upload
    *   ✅ File upload button with multi-file support
    *   ✅ Copy file operation with clipboard
    *   ✅ Cut/Move file operation
    *   ✅ Rename file operation with modal dialog
    *   ✅ Delete file/directory operation with confirmation
    *   ✅ File preview (text files, images)
    *   ✅ Context menu (right-click) with all operations
*   **Backend Endpoints Created:**
    *   `POST /api/fs/upload` - Upload files (100MB limit, rate limited)
    *   `POST /api/fs/copy` - Copy files/directories
    *   `POST /api/fs/move` - Move/rename files/directories
    *   `POST /api/fs/rename` - Rename convenience endpoint
    *   `DELETE /api/fs/delete` - Delete files/directories
    *   `GET /api/fs/read` - Read file content for preview
*   **Security:** All endpoints include validation, sanitization, timeouts, and rate limiting
*   **Files Modified:**
    *   `backend/src/routes/fs.ts` (+383 lines)
    *   `frontend/src/components/FileManager.tsx` (610 lines total)
    *   `frontend-simple/js/fileManager.js` (465 lines total)

### 3.2 Application & System Management

#### 3.2.1 VNC/X11 Forwarding Logic
*   **Description:** Implement functionality to launch and interact with graphical applications (GUI apps) remotely, potentially using VNC or X11 forwarding, integrated seamlessly into the web desktop. This goes beyond the current terminal functionality to enable full GUI app usage.
*   **Identified in Codebase:** `TODO: Implement VNC/X11 forwarding logic here.` in `backend/src/routes/apps.ts`.
*   **Recommended Approach:** This is a complex feature requiring:
    *   **Backend:** Integration with a VNC/X11 server on the host machine and a streaming solution (e.g., `noVNC`, `x11vnc` / `Xpra`) to send desktop frames to the browser.
    *   **Frontend:** A client to display the VNC/X11 stream and relay input events.
*   **Open Source Projects:** `noVNC` for client-side VNC, `Xpra` for application forwarding, `TigerVNC` for VNC server.

#### 3.2.2 Control Panel Implementation
*   **Description:** Develop a centralized control panel for managing system settings, user accounts, network configurations, and other administrative tasks.
*   **Identified in Codebase:** "Control Panel" `Feature coming soon` placeholder in `frontend-simple/js/desktop.js`.
*   **Recommended Approach:** Extend the existing backend for system-level API calls (similar to `systemRoutes`) and build dedicated frontend UI components.
*   **Borrowing Code/Concepts:** Can draw inspiration from existing Linux control panels (e.g., GNOME Settings, KDE System Settings) or web-based server management tools (e.g., Webmin, Cockpit).

#### 3.2.3 App Launcher (Raycast/Rofi-like experience)
*   **Description:** Enhance the application launcher with a fast, fuzzy-searching interface, dynamic listing of installed and running applications, and quick access actions.
*   **Recommended Approach:**
    *   **Frontend:** Integrate a JavaScript fuzzy search library.
        *   **Recommended Libraries:** `Fuse.js` or `Fuzzysort` (due to their balance of features, performance, and customizability).
        *   **Implementation:** Modify `desktop.js` and related launcher rendering logic to use the chosen library for filtering the `installedApps` list based on user input.
    *   **Backend:** Ensure the `/api/packages/installed` endpoint provides comprehensive application data efficiently.
*   **Borrowing Code/Concepts:** Inspiration from Raycast, Rofi, or Alfred for UI/UX patterns.
*   **Status:** Implemented. `Fuse.js` integrated into `desktop.js` for fuzzy searching apps.
#### 3.2.3 ✅ IMPLEMENTED: App Launcher (Raycast/Rofi-like experience)
*   **Status:** ✅ **COMPLETED** (2025-11-23)
*   **Features Implemented (Both React & Legacy Frontends):**
    *   ✅ Fuse.js fuzzy search integration
    *   ✅ Fast, intelligent search with weighted keys (name: 2, description: 1, categories: 0.5)
    *   ✅ Dynamic detection of running vs available apps
    *   ✅ Visual separation (Running Apps section, Available Apps section)
    *   ✅ Green play indicator (▶) for running apps
    *   ✅ Alt+Space keyboard shortcut
    *   ✅ Full keyboard navigation (arrows, enter, escape)
    *   ✅ Auto-focus on search input
*   **Backend Enhancement:**
    *   Enhanced `/api/packages/installed` to parse .desktop files
    *   Returns comprehensive metadata (name, description, icon, categories, exec, path)
*   **Libraries Added:**
    *   React: `fuse.js@7.1.0` via npm
    *   Legacy: Fuse.js via CDN
*   **Files Modified:**
    *   `backend/src/routes/packages.ts` (enhanced desktop file parsing)
    *   `frontend/src/components/AppLauncher.tsx` (247 lines changed)
    *   `frontend-simple/js/desktop.js` (124 lines changed)
    *   `frontend-simple/index.html` (added Fuse.js CDN)

#### 3.2.4 Automated Backups
*   **Description:** Implement a system for scheduling and managing automated backups of user data and system configurations to local storage or remote destinations.
*   **Recommended Approach:**
    *   **Backend:** Utilize existing Linux backup tools (e.g., `rsync`, `borgbackup`, `duplicity`) wrapped in API endpoints.
    *   **Frontend:** Provide a UI for configuring backup jobs, schedules, and restore options.
*   **Open Source Projects:** `rsync` is a strong candidate for file synchronization.

#### 3.2.5 Operational Improvements (Internal)
*   **Description:** Address underlying code quality and deployment readiness.
    *   **`sudo` Note:** Investigate better ways to handle privileged operations for package management (e.g., PolicyKit, more granular sudoers configuration, or a separate privileged helper service) instead of relying on a blanket `sudo`.
    *   **Verbose `console.log`s:** Replace or manage excessive `console.log` statements in `backend/src/server.ts` and `backend/src/routes/apps.ts` with a proper logging framework (e.g., Winston, Pino) for better production diagnostics.
*   **Priority:** Medium (for `sudo` note), Low (for `console.log` cleanup).

### 3.3 Productivity & Services

#### 3.3.1 Nginx Proxy Manager (NPM) Integration
*   **Description:** Integrate a UI for managing Nginx Proxy Manager, allowing users to configure proxy hosts, SSL certificates, and redirects for services running on the server, especially Docker containers.
*   **Recommended Approach:** Integrate with an external Nginx Proxy Manager instance via its **REST API**.
    *   **Backend Implementation:** Extend the Node.js backend to act as an intermediary, calling the NPM REST API. This would handle authentication with NPM and proxy management requests from the frontend.
    *   **Frontend Implementation:** Develop dedicated React components to build a UI for managing NPM entities (proxy hosts, redirections, certificates).
*   **Example Code Provided:** `nginx_proxy_manager_api_example.js` demonstrates programmatic interaction with the NPM API.
*   **Open Source Projects:** Nginx Proxy Manager itself (`jc21/nginx-proxy-manager`).

#### 3.3.2 Home Assistant Integration
*   **Description:** Provide a dashboard or components to interact with a Home Assistant instance, allowing users to monitor and control smart home devices directly from their web desktop.
*   **Recommended Approach:** Integrate directly with Home Assistant using its **WebSocket API**.
    *   **Frontend Implementation:** Develop React components (`HomeAssistantIntegration.tsx` example provided) to:
        *   Establish and manage WebSocket connections.
        *   Handle authentication (using Long-Lived Access Tokens).
        *   Subscribe to and display real-time state changes of HA entities.
        *   Send commands to HA services (e.g., `turn_on`, `turn_off`).
*   **Example Code Provided:** `frontend/src/components/HomeAssistantIntegration.tsx` (a React component) and configuration instructions in `frontend/.env.development`.
*   **Open Source Projects:** Home Assistant.

---

## 4. ✅ Recently Completed Features (2025-11-23)

### 4.1 React Frontend Rendering Fixes
*   **Issues Fixed:**
    *   Removed conflicting App.css styles (max-width, margin, padding)
    *   Fixed tiling algorithm double-subtraction of top bar height
    *   Fixed maximized windows overlapping top bar
    *   Made TopBar explicitly fixed positioned
    *   Adjusted window container to use absolute positioning
    *   Updated loading state styles in index.html
*   **Result:** All off-center rendering issues resolved
*   **Files Modified:**
    *   `frontend/src/App.css` (gutted template styles)
    *   `frontend/src/context/WindowManager.tsx` (fixed tiling calculations)
    *   `frontend/src/components/Window.tsx` (fixed maximize positioning)
    *   `frontend/src/components/Desktop.tsx` (fixed TopBar positioning)
    *   `frontend/index.html` (improved loading state)

### 4.2 Build Status
*   ✅ **Frontend Build:** Passing (626.15KB bundle, +28KB from DOMPurify + Fuse.js)
*   ✅ **Backend Build:** Passing (TypeScript compiled successfully)
*   ✅ **All TypeScript Errors:** Resolved
*   ✅ **Security:** Enterprise-grade with all critical gaps addressed

---

## 5. Next Priority Features

**Recommended next implementations:**

### High Priority:
1. **Control Panel Implementation** (Section 3.2.2) - System settings, user accounts, network config
2. **VNC/X11 Forwarding** (Section 3.2.1) - Launch GUI apps remotely
3. **Nginx Proxy Manager Integration** (Section 3.3.1) - Manage reverse proxies

### Medium Priority:
4. **Home Assistant Integration** (Section 3.3.2) - Smart home dashboard
5. **NFS/SMB Share Management** (Section 3.1.1) - Network file sharing
6. **Automated Backups** (Section 3.2.4) - Backup scheduling and management

### Future Enhancements:
7. **Cloud Sync Integration** (Section 3.1.2) - Dropbox, Google Drive, Nextcloud
8. **Operational Improvements** (Section 3.2.5) - Logging framework, sudo improvements

---

## 6. Implementation Summary

| Feature | Status | Date | Frontend | Backend | Security |
|---------|--------|------|----------|---------|----------|
| Interactive Terminal | ✅ Complete | 2025-11-23 | React | Fixed | ✅ |
| File Manager | ✅ Complete | 2025-11-23 | Both | 6 endpoints | ✅ Rate limited |
| App Launcher | ✅ Complete | 2025-11-23 | Both | Enhanced | ✅ |
| Rendering Fixes | ✅ Complete | 2025-11-23 | React | N/A | N/A |
| Control Panel | 📋 Planned | TBD | TBD | TBD | TBD |
| VNC/X11 | 📋 Planned | TBD | TBD | TBD | TBD |
