# System Architecture Overview

Complete architectural documentation for Web Desktop v1.0.

## 🏗️ High-Level Architecture

Web Desktop follows a modern microservices-inspired architecture with clear separation between frontend and backend concerns.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Browser                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │   React App     │  │   Legacy App    │  │   Mobile App    │   │
│  │   (TypeScript)  │  │   (Vanilla JS)  │  │   (Future)      │   │
│  │   Port: 5173    │  │   Port: 5174    │  │                 │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Server                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │   Express API   │  │   WebSocket     │  │   File Server   │   │
│  │   Port: 3001    │  │   Terminal      │  │   Static Files  │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │   Route Modules │  │   Middleware    │  │   Services      │   │
│  │   (18 modules)  │  │   Auth/CORS     │  │   AI/File/AI    │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    System & Data Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │   File System   │  │   SQLite DB     │  │   AI Models     │   │
│  │   Local/Remote  │  │   Metadata      │  │   Ollama/OpenAI │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │   System Info   │  │   Docker API    │  │   Network       │   │
│  │   CPU/Memory    │  │   Containers    │  │   WiFi/IoT      │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Architecture Principles

### Core Principles
1. **Separation of Concerns**: Clear boundaries between UI, business logic, and data
2. **Modularity**: Independent, loosely coupled modules
3. **Scalability**: Designed for horizontal scaling and performance
4. **Security**: Multiple layers of security and validation
5. **Extensibility**: Plugin architecture for future enhancements

### Design Patterns
- **Repository Pattern**: Data access abstraction
- **Observer Pattern**: Event-driven architecture
- **Factory Pattern**: Service and component creation
- **Middleware Pattern**: Request/response processing pipeline
- **Context Pattern**: State management in React

---

## 🔧 Backend Architecture

### Backend Structure
```
backend/
├── src/
│   ├── routes/           # API route handlers (18 modules)
│   │   ├── auth.ts       # Authentication endpoints
│   │   ├── containers.ts # Docker management
│   │   ├── fs.ts         # File system operations
│   │   ├── packages.ts   # Package management
│   │   ├── system.ts     # System monitoring
│   │   ├── notes.ts      # Notes CRUD
│   │   ├── marketplace.ts# App marketplace
│   │   └── ... (12 more modules)
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts       # Authentication middleware
│   │   ├── cors.ts       # CORS configuration
│   │   ├── rateLimit.ts  # Rate limiting
│   │   ├── validate.ts   # Input validation
│   │   └── security.ts   # Security headers
│   ├── services/         # Business logic services
│   │   ├── ai/           # AI integration services
│   │   ├── storage/      # Storage adapters
│   │   ├── monitoring/   # System monitoring
│   │   └── database/     # Database operations
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── server.ts         # Main server entry point
├── dist/                 # Compiled JavaScript
├── data/                 # Database and data files
└── package.json          # Dependencies and scripts
```

### Server Architecture

#### Main Server (server.ts)
```typescript
// Core server setup
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware pipeline
app.use(cors(config.cors));
app.use(helmet()); // Security headers
app.use(rateLimit(config.rateLimit));
app.use(validateInput);
app.use(logging);

// Route modules
app.use('/api/fs', fsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/containers', containerRoutes);
// ... 15 more route modules

// WebSocket handling
wss.on('connection', handleWebSocketConnection);

// Error handling
app.use(errorHandler);
app.use(notFoundHandler);
```

#### Route Module Pattern
Each route module follows consistent structure:

```typescript
// Example: backend/src/routes/fs.ts
import express from 'express';
import { validatePath, sanitizeInput } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { fileService } from '../services/storage';

const router = express.Router();

// Input validation and rate limiting
router.use(validateInput);
router.use(rateLimit({ windowMs: 60000, max: 100 }));

// Route handlers
router.get('/list', async (req, res) => {
  try {
    const path = validatePath(req.query.path as string);
    const files = await fileService.listDirectory(path);
    res.json(files);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

### Service Layer Architecture

#### File System Service
```typescript
// backend/src/services/storage/FileService.ts
export class FileService {
  private adapters: Map<string, StorageAdapter> = new Map();

  constructor() {
    this.adapters.set('local', new LocalStorageAdapter());
    this.adapters.set('ftp', new FTPAdapter());
    this.adapters.set('sftp', new SFTPAdapter());
    this.adapters.set('webdav', new WebDAVAdapter());
  }

  async listDirectory(path: string): Promise<FileItem[]> {
    const adapter = this.getAdapter(path);
    return adapter.list(path);
  }

  async readFile(path: string): Promise<Buffer> {
    const adapter = this.getAdapter(path);
    return adapter.read(path);
  }

  async writeFile(path: string, content: Buffer): Promise<void> {
    const adapter = this.getAdapter(path);
    await adapter.write(path, content);
  }
}
```

#### AI Service Architecture
```typescript
// backend/src/services/ai/AIService.ts
export class AIService {
  private models: Map<string, AIModel> = new Map();
  private router: TaskRouter;

  constructor() {
    this.initializeModels();
    this.router = new TaskRouter(this.models);
  }

  async processTask(task: AITask): Promise<AIResponse> {
    const model = this.router.selectModel(task.type);
    return model.execute(task);
  }
}
```

---

## 🎨 Frontend Architecture

### Frontend Structure
```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── WindowManager.tsx # Window management
│   │   ├── File Manager.tsx  # File operations
│   │   ├── Terminal.tsx      # Terminal emulator
│   │   ├── Notes.tsx         # Notes application
│   │   ├── Settings.tsx      # Settings panel
│   │   ├── AIIntegration.tsx # AI features
│   │   └── ... (25+ components)
│   ├── context/          # React Context providers
│   │   ├── WindowManager.tsx # Window state management
│   │   ├── Settings.tsx      # Application settings
│   │   ├── Auth.tsx          # Authentication state
│   │   └── AI.tsx            # AI model state
│   ├── hooks/            # Custom React hooks
│   │   ├── useWebSocket.ts   # WebSocket connection
│   │   ├── useFileSystem.ts  # File operations
│   │   ├── useTerminal.ts    # Terminal management
│   │   └── useAI.ts          # AI integration
│   ├── services/         # API and external services
│   │   ├── api.ts            # API client
│   │   ├── websocket.ts      # WebSocket client
│   │   ├── storage.ts        # Storage abstraction
│   │   └── ai.ts             # AI service client
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── styles/           # Global styles and Tailwind
│   └── App.tsx           # Main application component
├── public/              # Static assets
└── package.json         # Dependencies and build scripts
```

### Component Architecture

#### Component Hierarchy
```
App
├── WindowManagerProvider
│   ├── Desktop
│   │   ├── Taskbar
│   │   ├── WindowManager
│   │   │   ├── Window
│   │   │   │   ├── FileManager
│   │   │   │   ├── Terminal
│   │   │   │   ├── Notes
│   │   │   │   └── Settings
│   │   │   └── AppLauncher
│   │   └── NotificationSystem
│   └── SettingsProvider
└── ErrorBoundary
```

#### State Management Architecture
Web Desktop uses React Context for state management:

```typescript
// frontend/src/context/WindowManager.tsx
interface WindowState {
  windows: Window[];
  activeWindow: string | null;
  layout: 'tiling' | 'floating';
  virtualDesktops: VirtualDesktop[];
}

const WindowManagerContext = createContext<WindowState | null>(null);

export const WindowManagerProvider: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer(windowReducer, initialState);

  return (
    <WindowManagerContext.Provider value={{ ...state, dispatch }}>
      {children}
    </WindowManagerContext.Provider>
  );
};
```

#### Custom Hooks Pattern
```typescript
// frontend/src/hooks/useFileSystem.ts
export const useFileSystem = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listFiles = async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/fs/list', { params: { path } });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { listFiles, loading, error };
};
```

---

## 🗄️ Data Architecture

### Database Architecture

#### SQLite Database Schema
```sql
-- File metadata
CREATE TABLE file_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  size INTEGER,
  mime_type TEXT,
  created_at DATETIME,
  modified_at DATETIME,
  hash TEXT,
  metadata TEXT -- JSON for extended metadata
);

-- Application registry
CREATE TABLE applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  version TEXT,
  description TEXT,
  icon TEXT,
  manifest TEXT, -- JSON manifest
  installed_at DATETIME,
  updated_at DATETIME
);

-- User settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  category TEXT,
  updated_at DATETIME
);

-- AI model registry
CREATE TABLE ai_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT,
  size INTEGER,
  status TEXT,
  config TEXT -- JSON configuration
);
```

#### Data Access Layer
```typescript
// backend/src/services/database/DatabaseService.ts
export class DatabaseService {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
    this.initializeTables();
  }

  async saveFileMetadata(metadata: FileMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO file_metadata
        (path, name, size, mime_type, created_at, modified_at, hash, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        metadata.path,
        metadata.name,
        metadata.size,
        metadata.mimeType,
        metadata.createdAt,
        metadata.modifiedAt,
        metadata.hash,
        JSON.stringify(metadata.metadata)
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
```

### File System Architecture

#### Virtual File System (VFS)
```typescript
// backend/src/services/storage/StorageAdapter.ts
export interface StorageAdapter {
  list(path: string): Promise<FileItem[]>;
  read(path: string): Promise<Buffer>;
  write(path: string, content: Buffer): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getMetadata(path: string): Promise<FileMetadata>;
}

// Local storage implementation
export class LocalStorageAdapter implements StorageAdapter {
  async list(path: string): Promise<FileItem[]> {
    const entries = await fs.readdir(path, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      path: join(path, entry.name),
      isDirectory: entry.isDirectory(),
      size: entry.isDirectory() ? 0 : (await fs.stat(join(path, entry.name))).size
    }));
  }
}
```

---

## 🔌 Integration Architecture

### WebSocket Architecture

#### Terminal WebSocket Handler
```typescript
// backend/src/services/terminal/TerminalService.ts
export class TerminalService {
  private connections: Map<string, TerminalConnection> = new Map();

  handleConnection(ws: WebSocket, req: Request) {
    const connectionId = generateId();
    const connection = new TerminalConnection(ws);

    // Handle terminal commands
    ws.on('message', async (data) => {
      const command = JSON.parse(data.toString());

      switch (command.type) {
        case 'resize':
          connection.resize(command.cols, command.rows);
          break;
        case 'input':
          connection.write(command.data);
          break;
        case 'start':
          await connection.start(command.shell, command.args);
          break;
      }
    });

    this.connections.set(connectionId, connection);
  }
}
```

#### Frontend WebSocket Client
```typescript
// frontend/src/hooks/useWebSocket.ts
export const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      setSocket(ws);
    };

    ws.onclose = () => {
      setConnected(false);
      setSocket(null);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const send = useCallback((data: any) => {
    if (socket && connected) {
      socket.send(JSON.stringify(data));
    }
  }, [socket, connected]);

  return { send, connected };
};
```

### AI Integration Architecture

#### Ollama Integration
```typescript
// backend/src/services/ai/OllamaService.ts
export class OllamaService implements AIProvider {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async listModels(): Promise<AIModel[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    const data = await response.json();
    return data.models.map(this.transformModel);
  }

  async generateCompletion(prompt: string, model: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      })
    });

    const data = await response.json();
    return data.response;
  }
}
```

#### OpenRouter Integration
```typescript
// backend/src/services/ai/OpenRouterService.ts
export class OpenRouterService implements AIProvider {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateCompletion(prompt: string, model: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

---

## 🔐 Security Architecture

### Multi-Layer Security

#### 1. Input Validation Layer
```typescript
// backend/src/middleware/validate.ts
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Path traversal prevention
  if (req.path.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  // Input sanitization
  req.query = sanitizeObject(req.query);
  req.body = sanitizeObject(req.body);

  next();
};

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sanitized = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        sanitized[key] = DOMPurify.sanitize(value);
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
  }
  return sanitized;
}
```

#### 2. Authentication & Authorization
```typescript
// backend/src/middleware/auth.ts
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions || [];
    const hasPermission = permissions.some(p => userPermissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

#### 3. Rate Limiting
```typescript
// backend/src/middleware/rateLimit.ts
export const createRateLimit = (options: RateLimitOptions) => {
  const requests = new Map();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip + req.path;
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Clean old requests
    for (const [ip, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter((t: number) => t > windowStart);
      if (validTimestamps.length === 0) {
        requests.delete(ip);
      } else {
        requests.set(ip, validTimestamps);
      }
    }

    // Check current request count
    const userRequests = requests.get(key) || [];
    if (userRequests.length >= options.max) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    // Add current request
    userRequests.push(now);
    requests.set(key, userRequests);

    next();
  };
};
```

---

## 📊 Performance Architecture

### Caching Strategy

#### Multi-Level Caching
```typescript
// backend/src/services/cache/CacheService.ts
export class CacheService {
  private memoryCache: Map<string, CacheItem> = new Map();
  private redis: Redis; // Optional Redis for distributed caching

  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memItem = this.memoryCache.get(key);
    if (memItem && memItem.expires > Date.now()) {
      return memItem.value;
    }

    // Try Redis cache
    if (this.redis) {
      const redisValue = await this.redis.get(key);
      if (redisValue) {
        const parsed = JSON.parse(redisValue);
        this.memoryCache.set(key, parsed);
        return parsed.value;
      }
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number = 300000): Promise<void> {
    const item: CacheItem = {
      value,
      expires: Date.now() + ttl
    };

    // Set in memory cache
    this.memoryCache.set(key, item);

    // Set in Redis cache
    if (this.redis) {
      await this.redis.setex(key, ttl / 1000, JSON.stringify(item));
    }
  }
}
```

### Database Optimization

#### Connection Pooling
```typescript
// backend/src/services/database/ConnectionPool.ts
export class ConnectionPool {
  private pool: sqlite3.Database[] = [];
  private maxConnections = 10;

  constructor(private dbPath: string) {
    this.initializePool();
  }

  private initializePool(): void {
    for (let i = 0; i < this.maxConnections; i++) {
      const db = new sqlite3.Database(this.dbPath);
      this.pool.push(db);
    }
  }

  getConnection(): Promise<sqlite3.Database> {
    return new Promise((resolve) => {
      const checkConnection = () => {
        const db = this.pool.find(d => !d.readonly);
        if (db) {
          resolve(db);
        } else {
          setTimeout(checkConnection, 10);
        }
      };
      checkConnection();
    });
  }
}
```

---

## 🚀 Scalability Architecture

### Horizontal Scaling Considerations

#### 1. Stateless Design
- **Session management**: External session store (Redis)
- **File storage**: Distributed file system
- **AI models**: Separate AI service nodes
- **Database**: Read replicas for scaling

#### 2. Load Balancing
```typescript
// Example Nginx configuration
upstream webdesktop_backend {
    server 10.0.1.10:3001;
    server 10.0.1.11:3001;
    server 10.0.1.12:3001;
}

server {
    listen 80;
    server_name webdesktop.example.com;

    location /api/ {
        proxy_pass http://webdesktop_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://webdesktop_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### 3. Microservices Migration Path
- **Containerization**: Docker packaging
- **Service discovery**: Consul/etcd
- **API Gateway**: Kong/Traefik
- **Message Queue**: Redis/RabbitMQ for async tasks

---

## 🔍 Monitoring & Observability

### Logging Architecture
```typescript
// backend/src/services/logging/Logger.ts
export class Logger {
  private winston: Winston.Logger;

  constructor() {
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }

  error(message: string, error?: Error): void {
    this.winston.error(message, { error: error?.stack });
  }
}
```

### Metrics Collection
```typescript
// backend/src/services/metrics/MetricsService.ts
export class MetricsService {
  private metrics: Map<string, Metric> = new Map();

  recordApiCall(endpoint: string, duration: number, statusCode: number): void {
    const key = `api.${endpoint}`;
    const metric = this.metrics.get(key) || { count: 0, totalDuration: 0, errors: 0 };

    metric.count++;
    metric.totalDuration += duration;
    if (statusCode >= 400) metric.errors++;

    this.metrics.set(key, metric);
  }

  getMetrics(): MetricsReport {
    const report: MetricsReport = {};

    for (const [key, metric] of this.metrics.entries()) {
      report[key] = {
        count: metric.count,
        avgDuration: metric.totalDuration / metric.count,
        errorRate: metric.errors / metric.count
      };
    }

    return report;
  }
}
```

---

## 🎯 Architecture Decision Records (ADRs)

### ADR-001: Choice of React + TypeScript
**Status**: Accepted
**Decision**: Use React 18 with TypeScript for frontend development
**Rationale**:
- Strong typing for large codebase
- Rich ecosystem and community
- Component reusability
- Excellent developer experience

### ADR-002: WebSocket for Terminal
**Status**: Accepted
**Decision**: Use WebSocket instead of HTTP for terminal communication
**Rationale**:
- Real-time bidirectional communication
- Lower latency than HTTP polling
- Natural fit for terminal I/O streams
- Established pattern for web terminals

### ADR-003: SQLite for Metadata
**Status**: Accepted
**Decision**: Use SQLite for file metadata and application registry
**Rationale**:
- Zero configuration required
- Excellent performance for read operations
- ACID compliance
- Portable and self-contained

### ADR-004: Virtual File System
**Status**: Accepted
**Decision**: Implement VFS abstraction for multiple storage types
**Rationale**:
- Unified interface for different storage backends
- Easy addition of new storage types
- Consistent user experience
- Backend-agnostic file operations

---

This architecture documentation provides a comprehensive view of Web Desktop's system design. For implementation details, see the specific module documentation and code comments.