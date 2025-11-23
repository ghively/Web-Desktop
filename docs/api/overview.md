# API Documentation Overview

Complete REST API reference for Web Desktop v1.0.

## 📡 API Introduction

Web Desktop provides a comprehensive REST API for all backend functionality, including file management, system monitoring, terminal operations, AI integration, and more.

### Base URL
- **Development**: `http://localhost:3001/api`
- **Production**: `https://your-domain.com/api`

### Authentication
Currently, Web Desktop runs in development mode without authentication. Production deployments should implement proper authentication (see [Security Guide](../deployment/security.md)).

### Content Types
- **Requests**: `application/json`, `multipart/form-data`
- **Responses**: `application/json`
- **File Upload**: `multipart/form-data`

### Rate Limiting
API endpoints are rate-limited to prevent abuse:
- **Default**: 100 requests per minute per IP
- **File Upload**: 10 uploads per minute per IP
- **WebSocket Commands**: 10 commands per second per connection

---

## 🗂️ API Categories

### Core APIs
- **[File System](./endpoints/files.md)** - File and directory operations
- **[System Monitor](./endpoints/system.md)** - System information and metrics
- **[Terminal](./endpoints/terminal.md)** - Terminal session management
- **[Applications](./endpoints/applications.md)** - Application management
- **[Packages](./endpoints/packages.md)** - Package management

### Advanced APIs
- **[AI Integration](./endpoints/ai.md)** - AI model management and inference
- **[Marketplace](./endpoints/marketplace.md)** - Application marketplace
- **[Notes](./endpoints/notes.md)** - Notes management
- **[Containers](./endpoints/containers.md)** - Docker container management
- **[Storage](./endpoints/storage.md)** - Storage pool management

### Configuration APIs
- **[Settings](./endpoints/settings.md)** - Application settings
- **[Themes](./endpoints/themes.md)** - Theme management
- **[Users](./endpoints/users.md)** - User management (future)
- **[Network](./endpoints/network.md)** - Network configuration

---

## 📋 Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid file path",
    "details": {
      "field": "path",
      "value": "../../../etc/passwd"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 245,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 🔧 Common Parameters

### Query Parameters

#### `path`
- **Type**: String
- **Required**: Yes (for file operations)
- **Description**: File or directory path
- **Validation**: Must be within allowed directories

#### `recursive`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Include subdirectories in listings

#### `limit`
- **Type**: Integer
- **Default**: `50`
- **Description**: Maximum number of items to return

#### `offset`
- **Type**: Integer
- **Default**: `0`
- **Description**: Number of items to skip

#### `sort`
- **Type**: String
- **Default**: `name`
- **Options**: `name`, `size`, `modified`, `created`, `type`
- **Description**: Sort field for listings

#### `order`
- **Type**: String
- **Default**: `asc`
- **Options**: `asc`, `desc`
- **Description**: Sort order

### Request Headers

#### `Content-Type`
- **Required**: For POST/PUT requests
- **Values**: `application/json`, `multipart/form-data`

#### `Authorization`
- **Future**: Bearer token for authenticated requests
- **Format**: `Bearer <token>`

#### `X-Requested-With`
- **Optional**: `XMLHttpRequest`
- **Purpose**: Identify AJAX requests

---

## 🚀 Quick Start Examples

### List Files
```bash
# List directory contents
curl http://localhost:3001/api/fs/list?path=/home/user

# With pagination and sorting
curl "http://localhost:3001/api/fs/list?path=/home/user&limit=20&sort=modified&order=desc"
```

### File Upload
```bash
# Upload a file
curl -X POST \
  -F "file=@/path/to/local/file.txt" \
  -F "path=/home/user/uploads" \
  http://localhost:3001/api/fs/upload
```

### System Information
```bash
# Get system overview
curl http://localhost:3001/api/system/info

# Get real-time metrics
curl http://localhost:3001/api/system/metrics
```

### Terminal Operations
```bash
# Start terminal session
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"shell": "/bin/bash", "args": []}' \
  http://localhost:3001/api/terminal/start

# Send command to terminal
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123", "data": "ls -la\n"}' \
  http://localhost:3001/api/terminal/input
```

---

## 🔄 WebSocket API

### Connection
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3001');

// Handle messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Message Format
```json
{
  "type": "terminal.output",
  "sessionId": "abc123",
  "data": "Hello, World!",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### WebSocket Events
- **`terminal.output`**: Terminal output data
- **`system.metrics`**: Real-time system metrics
- **`file.progress`**: File operation progress
- **`ai.response`**: AI model responses
- **`notification`**: System notifications

---

## 📊 API Status Codes

### HTTP Status Codes

#### Success Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content returned

#### Client Error Codes
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `413 Payload Too Large` - Request too large
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded

#### Server Error Codes
- `500 Internal Server Error` - Server error
- `502 Bad Gateway` - Upstream service error
- `503 Service Unavailable` - Service temporarily unavailable

### API Error Codes

#### File System Errors
- `FS_INVALID_PATH` - Invalid file path
- `FS_NOT_FOUND` - File or directory not found
- `FS_PERMISSION_DENIED` - Permission denied
- `FS_ALREADY_EXISTS` - File already exists

#### System Errors
- `SYS_COMMAND_FAILED` - System command failed
- `SYS_INSUFFICIENT_RESOURCES` - Insufficient system resources
- `SYS_OPERATION_NOT_SUPPORTED` - Operation not supported

#### Terminal Errors
- `TERM_SESSION_NOT_FOUND` - Terminal session not found
- `TERM_COMMAND_FAILED` - Terminal command failed
- `TERM_SESSION_LIMIT_REACHED` - Too many terminal sessions

---

## 🔒 Security Considerations

### Input Validation
All inputs are validated and sanitized:
- **Path validation**: Prevents directory traversal
- **Command sanitization**: Removes control characters
- **Size limits**: Prevents resource exhaustion
- **Type checking**: Ensures valid data types

### Rate Limiting
- **IP-based**: Limits per IP address
- **Endpoint-specific**: Different limits per endpoint
- **WebSocket**: Command rate limiting
- **File operations**: Upload/download limits

### CORS Configuration
```javascript
{
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

---

## 📈 Performance Considerations

### Caching Strategy
- **File metadata**: Cached in memory with TTL
- **System metrics**: Cached for short periods
- **API responses**: Conditional caching with ETags
- **Static assets**: Served with cache headers

### Pagination
Large datasets support pagination:
- **Default limit**: 50 items per page
- **Maximum limit**: 1000 items per page
- **Cursor-based**: For consistent pagination
- **Metadata**: Includes pagination information

### Compression
- **Response compression**: gzip for JSON responses
- **File compression**: Optional for downloads
- **WebSocket compression**: Per-message compression

---

## 🧪 Testing the API

### Using curl
```bash
# Health check
curl http://localhost:3001/api/health

# List files with authentication (future)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/fs/list?path=/
```

### Using Postman
Import the Web Desktop API collection:
```json
{
  "info": {
    "name": "Web Desktop API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001/api"
    }
  ]
}
```

### Using JavaScript
```javascript
const API_BASE = 'http://localhost:3001/api';

class WebDesktopAPI {
  async listFiles(path) {
    const response = await fetch(`${API_BASE}/fs/list?path=${encodeURIComponent(path)}`);
    return response.json();
  }

  async uploadFile(file, targetPath) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', targetPath);

    const response = await fetch(`${API_BASE}/fs/upload`, {
      method: 'POST',
      body: formData
    });

    return response.json();
  }

  async getSystemInfo() {
    const response = await fetch(`${API_BASE}/system/info`);
    return response.json();
  }
}
```

---

## 📚 API Endpoint Index

### File Management
- `GET /fs/list` - List directory contents
- `GET /fs/read` - Read file content
- `POST /fs/write` - Write file content
- `POST /fs/upload` - Upload files
- `POST /fs/copy` - Copy files/directories
- `POST /fs/move` - Move/rename files
- `DELETE /fs/delete` - Delete files/directories
- `GET /fs/metadata` - Get file metadata
- `POST /fs/search` - Search files

### System Monitoring
- `GET /system/info` - System information
- `GET /system/metrics` - Real-time metrics
- `GET /system/processes` - Running processes
- `GET /system/resources` - Resource usage
- `GET /system/performance` - Performance data

### Terminal Management
- `POST /terminal/start` - Start terminal session
- `POST /terminal/input` - Send input to terminal
- `POST /terminal/resize` - Resize terminal
- `DELETE /terminal/session` - Close terminal session
- `GET /terminal/sessions` - List active sessions

### AI Integration
- `GET /ai/models` - List available AI models
- `POST /ai/completion` - Generate text completion
- `POST /ai/chat` - Chat with AI model
- `GET /ai/status` - AI service status
- `POST /ai/upload-model` - Upload custom model

### Application Management
- `GET /apps/installed` - List installed applications
- `GET /apps/available` - List available applications
- `POST /apps/install` - Install application
- `DELETE /apps/uninstall` - Uninstall application
- `GET /apps/:id/manifest` - Get app manifest

### Settings and Configuration
- `GET /settings` - Get all settings
- `GET /settings/:category` - Get settings category
- `PUT /settings/:category` - Update settings category
- `GET /themes` - List available themes
- `POST /themes/custom` - Create custom theme

---

For detailed documentation of each endpoint, see the specific endpoint documentation in the [endpoints](./endpoints/) directory.