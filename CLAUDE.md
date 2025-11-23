# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web-based desktop environment with dual frontend implementations:
- **frontend/** - Modern React/Vite implementation with Tailwind CSS (primary, under active development)
- **frontend-simple/** - Legacy vanilla JavaScript implementation (served as static files from backend)

The backend provides WebSocket terminal support via node-pty and RESTful APIs for file system, Docker containers, system monitoring, and app management.

## Development Commands

### Starting Development Environment

Use the convenience script to start both servers:
```bash
./startdev.sh
```

Or start individually:

**Backend (port 3001):**
```bash
cd backend
npm run dev      # Development with ts-node hot reload
npm run build    # Compile TypeScript to dist/
npm run start    # Run production build from dist/
```

**Frontend (port 5173):**
```bash
cd frontend
npm run dev      # Vite dev server with hot reload
npm run build    # TypeScript compilation + production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

No tests are currently configured for either backend or frontend.

## Architecture

### Backend Structure

- **server.ts** - Express server setup with HTTP server and WebSocket server (wss)
- **Routes** (`backend/src/routes/`) - Modular API endpoints:
  - `fs.ts` - File system operations with path validation
  - `containers.ts` - Docker container management
  - `system.ts` - System information (CPU, memory via systeminformation)
  - `apps.ts` - Application management
  - `packages.ts` - Package management
  - `notes.ts` - Notes CRUD operations
- **WebSocket Terminal** - Spawns pty processes (bash/powershell) for interactive terminal sessions with rate limiting and origin validation
- **Security** - Path validation, input sanitization, CORS restrictions, rate limiting on WebSocket commands

### Frontend Architecture (React)

**Window Management System:**
- Context-based architecture with `WindowManagerProvider` (frontend/src/context/WindowManager.tsx)
- Supports two layout modes:
  - **Tiling** - Automatic window layout with binary splitting algorithm
  - **Floating** - Manual draggable/resizable windows (via react-rnd)
- Window state includes position (x, y), size (width, height), z-index, minimized/maximized state

**Component Structure:**
- `App.tsx` - Root component wrapping WindowManagerProvider
- `Desktop.tsx` - Main desktop container with taskbar and app launcher
- `AppLauncher.tsx` - Keyboard-driven launcher (Alt+Space)
- `Window.tsx` - Reusable window wrapper with dragging, resizing, minimize, maximize, close
- Application components (FileManager, Terminal, Notes, ContainerManager) are rendered as window content

**Key Patterns:**
- All components are functional with hooks
- Window components are registered and opened via `openWindow(title, component)`
- Terminal uses xterm.js with WebSocket connection to backend pty
- Styling via Tailwind CSS with Catppuccin color palette
- Icons from lucide-react

### API Communication

Frontend communicates with backend via:
- REST APIs at `http://localhost:3001/api/*` (CORS-enabled for localhost:5173/5174)
- WebSocket at `ws://localhost:3001` for terminal I/O

## Code Style (from AGENTS.md)

### TypeScript/JavaScript
- Strict TypeScript (backend: commonjs, frontend: esm)
- Import order: external libs → internal modules → relative imports
- ES6+ syntax, arrow functions, async/await for async operations
- Error handling with try/catch and proper HTTP status codes
- No comments unless explicitly requested

### React Components
- Functional components with TypeScript interfaces for props
- Tailwind CSS for styling with Catppuccin palette
- Lucide React for icons

### Backend API
- Express.js with TypeScript
- Route handlers in separate files under /routes
- Input validation and sanitization (especially for paths and commands)

### General Conventions
- camelCase for variables/functions
- PascalCase for React components
- Semantic HTML5 elements
- Maintain existing file structure

## Important Implementation Details

### Window Manager Tiling Algorithm
The tiling layout uses a simple grid-based approach (not a binary tree):
- 1 window: full screen
- 2 windows: vertical split
- 3+ windows: grid layout with `cols = ceil(sqrt(count))`, `rows = ceil(count/cols)`
- Re-tiles on window open/close/minimize and browser resize
- 8px gaps between windows, 40px top bar offset

### WebSocket Terminal Security
- Origin validation against allowed localhost origins
- Rate limiting: max 10 commands per second
- Input sanitization: control character removal, 1000 char limit
- Cleanup intervals for stale connections
- PTY process cleanup on disconnect

### File System Security
- Path validation in `routes/fs.ts` via `validatePath()`
- Only allows access within home directory, /tmp, /var/tmp, /mnt
- Blocks path traversal (../) and null bytes
- All paths resolved to absolute before checking bounds
