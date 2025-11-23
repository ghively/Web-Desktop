# Web-Based Desktop Environment

A web-based desktop environment that provides a native-like UI experience in the browser, enabling the management of applications, Docker containers, and system resources.

## Features

- **File Manager**: Browse and navigate through the file system with a modern UI
- **Container Management**: View, start, stop, and manage Docker containers with real-time feedback
- **Notes App**: Simple markdown-based note-taking with live preview
- **Text Editor**: Monaco-powered code editor with syntax highlighting
- **System Monitor**: Real-time CPU and memory usage tracking
- **App Launcher**: Keyboard-driven application launcher (Alt+Space)
- **Window Management**: Draggable, resizable windows with tiling mode support

## Architecture

- **Frontend**: Vanilla JavaScript with CSS variables for theming
- **Backend**: Node.js with Express and TypeScript
- **APIs**: RESTful endpoints for file system, containers, and system info

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Docker (optional, for container management)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/web-desktop.git
cd web-desktop
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Start the backend server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3001`

## Project Structure

```
web-desktop/
├── backend/               # Node.js backend server
│   ├── src/
│   │   ├── server.ts     # Main server file
│   │   └── routes/       # API route handlers
│   ├── package.json
│   └── tsconfig.json
├── frontend-simple/       # Frontend application
│   ├── js/               # JavaScript components
│   ├── css/              # Stylesheets
│   └── index.html        # Main HTML file
└── APP_INSTALLATION.md   # Application installation guide
```

## API Endpoints

- `GET /api/fs?path=<path>` - List directory contents
- `GET /api/containers` - List Docker containers
- `POST /api/containers/:id/start` - Start a container
- `POST /api/containers/:id/stop` - Stop a container
- `POST /api/containers/:id/restart` - Restart a container
- `GET /api/containers/:id/logs` - Get container logs
- `GET /api/system` - Get system statistics

## Development

### Backend Development

```bash
cd backend
npm run dev
```

The backend runs on port 3001 by default.

### Features Under Development

- [ ] Cross-platform file system support (Windows/Linux)
- [ ] Control Panel for system settings
- [ ] Real-time container status updates
- [ ] File upload/download functionality

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
