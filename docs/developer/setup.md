# Development Setup Guide

Complete guide for setting up a Web Desktop development environment.

## 🎯 Prerequisites

Before starting, ensure you have:

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- **Node.js**: Version 18.0 or higher (LTS recommended)
- **npm**: Version 8.0 or higher
- **Git**: Version 2.25 or higher
- **RAM**: 8GB+ recommended
- **Storage**: 20GB+ free space

### Required Software
- **Code Editor**: VS Code, WebStorm, or similar
- **Browser**: Chrome/Firefox with developer tools
- **Terminal**: Modern terminal with UTF-8 support

### Optional Tools
- **Docker**: For containerized development
- **Postman**: For API testing
- **Database Tools**: SQLite browser for database inspection

---

## 🚀 Quick Start Setup

### Step 1: Clone Repository
```bash
# Clone the repository
git clone https://github.com/your-username/web-desktop.git
cd web-desktop

# Verify repository structure
ls -la
# Expected: backend/, frontend/, docs/, etc.
```

### Step 2: Install Dependencies
```bash
# Install all dependencies (root level)
npm install

# Or install separately
cd backend && npm install
cd ../frontend && npm install
```

### Step 3: Start Development Servers
```bash
# Use convenience script (recommended)
./start-stack.sh

# Or start manually
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Step 4: Verify Installation
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health

---

## 🔧 Detailed Development Setup

### Backend Development Environment

#### Backend Dependencies
```bash
cd backend
npm install
```

Key backend dependencies:
- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **Socket.io**: WebSocket support
- **node-pty**: Terminal emulation
- **SQLite**: Database
- **systeminformation**: System monitoring

#### Backend Development Commands
```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production build
npm start

# Type checking only
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

#### Backend Environment Configuration
Create `backend/.env.development`:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=./data/webdesktop.db

# Security
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-development-secret

# WebSocket
WS_PORT=3001
WS_HEARTBEAT_INTERVAL=30000

# File System
ALLOWED_PATHS=/home,/tmp,/var/tmp,/mnt
MAX_FILE_SIZE=104857600

# AI Features
OLLAMA_HOST=http://localhost:11434
OPENROUTER_API_KEY=your-openrouter-key
```

### Frontend Development Environment

#### Frontend Dependencies
```bash
cd frontend
npm install
```

Key frontend dependencies:
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **react-rnd**: Window resizing
- **xterm.js**: Terminal emulator

#### Frontend Development Commands
```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type checking
npm run type-check
```

#### Frontend Environment Configuration
Create `frontend/.env.development`:
```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Feature Flags
VITE_ENABLE_AI=true
VITE_ENABLE_MONITORING=true
VITE_ENABLE_MARKETPLACE=true

# Development Settings
VITE_DEV_TOOLS=true
VITE_LOG_LEVEL=debug
```

---

## 🛠️ Development Tools Setup

### VS Code Configuration

#### Recommended Extensions
Install these VS Code extensions:
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.vscode-docker",
    "humao.rest-client",
    "ms-vscode.vscode-sqlite"
  ]
}
```

#### VS Code Settings
Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

#### VS Code Tasks
Create `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Backend",
      "type": "shell",
      "command": "npm run dev",
      "options": {
        "cwd": "${workspaceFolder}/backend"
      },
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      }
    },
    {
      "label": "Start Frontend",
      "type": "shell",
      "command": "npm run dev",
      "options": {
        "cwd": "${workspaceFolder}/frontend"
      },
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      }
    },
    {
      "label": "Start Development",
      "dependsOrder": "parallel",
      "dependsOn": ["Start Backend", "Start Frontend"]
    }
  ]
}
```

### Git Configuration

#### Git Hooks Setup
```bash
# Install husky for git hooks
npm install --save-dev husky

# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run type-check"

# Add pre-push hook
npx husky add .husky/pre-push "npm test"
```

#### Git Ignore Configuration
Ensure `.gitignore` includes:
```
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Database files
*.db
*.sqlite
*.sqlite3

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/
```

---

## 🧪 Testing Setup

### Backend Testing Setup

#### Test Framework
```bash
# Install testing dependencies
cd backend
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

#### Jest Configuration
Create `backend/jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
```

#### Test Commands
```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx jest path/to/test.test.ts
```

### Frontend Testing Setup

#### Test Framework
```bash
# Install testing dependencies
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

#### Vitest Configuration
Update `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

#### Test Setup
Create `frontend/src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

#### Test Commands
```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests UI
npm run test:ui
```

---

## 🐳 Docker Development Setup

### Development Dockerfile

#### Backend Dockerfile
Create `backend/Dockerfile.dev`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start development server
CMD ["npm", "run", "dev"]
```

#### Frontend Dockerfile
Create `frontend/Dockerfile.dev`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### Docker Compose for Development
Create `docker-compose.dev.yml`:
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - CORS_ORIGIN=http://localhost:5173

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:3001
    depends_on:
      - backend
```

#### Docker Development Commands
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# Stop development environment
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

---

## 📊 Development Workflow

### Daily Development Workflow

#### 1. Start Development
```bash
# Pull latest changes
git pull origin main

# Install updated dependencies
npm install

# Start development servers
./start-stack.sh
```

#### 2. Make Changes
- **Backend changes**: Edit TypeScript files in `backend/src/`
- **Frontend changes**: Edit React components in `frontend/src/`
- **Hot reload**: Changes automatically reload

#### 3. Test Changes
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Manual testing in browser
```

#### 4. Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Formatting
npm run format
```

#### 5. Commit Changes
```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add new feature description"

# Push changes
git push origin feature-branch
```

### Branch Strategy

#### Main Branches
- `main`: Production-ready code
- `develop`: Integration branch for features

#### Feature Branches
```bash
# Create feature branch
git checkout -b feature/new-feature

# Work on feature
# ... make changes ...

# Push feature branch
git push origin feature/new-feature

# Create pull request to develop
```

#### Release Branches
```bash
# Create release branch
git checkout -b release/v1.1.0

# Prepare release
# ... version bump, changelog ...

# Merge to main
git checkout main
git merge release/v1.1.0

# Tag release
git tag v1.1.0
git push origin v1.1.0
```

---

## 🔍 Debugging Setup

### Backend Debugging

#### VS Code Debug Configuration
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/server.ts",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

#### Debugging Features
- **Breakpoints**: Set breakpoints in TypeScript files
- **Variable inspection**: View variables during execution
- **Call stack**: Trace function calls
- **Watch expressions**: Monitor expressions

### Frontend Debugging

#### Browser Developer Tools
- **React DevTools**: React component inspection
- **Console**: JavaScript debugging
- **Network**: API request monitoring
- **Elements**: DOM inspection and styling

#### VS Code Debug Configuration
Add to `.vscode/launch.json`:
```json
{
  "name": "Debug Frontend",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:5173",
  "webRoot": "${workspaceFolder}/frontend/src"
}
```

---

## 📈 Performance Monitoring

### Development Performance Tools

#### Backend Monitoring
```bash
# Install performance monitoring
npm install --save-dev clinic

# Profile Node.js performance
npx clinic doctor -- node dist/server.js

# Memory profiling
npx clinic heapprofiler -- node dist/server.js

# Flame graphs
npx clinic flame -- node dist/server.js
```

#### Frontend Performance
- **Lighthouse**: Built-in Chrome performance audit
- **React DevTools Profiler**: Component performance profiling
- **Bundle analysis**: `npm run build:analyze`

#### Performance Monitoring Setup
```typescript
// backend/src/middleware/performance.ts
import { Request, Response, NextFunction } from 'express';

export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
}
```

---

## 🤝 Collaboration Setup

### Code Review Process

#### Pull Request Template
Create `.github/pull_request_template.md`:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

#### Code Review Guidelines
- **Review checklist**: Functionality, performance, security, style
- **Automated checks**: CI/CD pipeline validation
- **Manual review**: Code logic and architecture

### Team Communication

#### Development Channels
- **GitHub Issues**: Bug reports and feature requests
- **Pull Requests**: Code review and discussion
- **Discussions**: General questions and ideas
- **Documentation**: Shared knowledge base

---

## 🚀 Next Steps

After setting up your development environment:

1. **Explore the codebase**: Read through the [architecture overview](architecture.md)
2. **Run tests**: Ensure all tests pass
3. **Make a small change**: Fix a bug or add a minor feature
4. **Contribute**: Submit your first pull request
5. **Join community**: Participate in discussions and issues

### Recommended Reading
- [Architecture Overview](architecture.md)
- [Contributing Guidelines](contributing.md)
- [Code Style Guide](style-guide.md)
- [API Documentation](../api/overview.md)

---

**Happy coding!** 🎉

Welcome to the Web Desktop development team. We're excited to have you contribute to our project!