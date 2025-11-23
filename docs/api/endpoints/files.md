# File System API

Complete API reference for file system operations in Web Desktop.

## Base URL
```
https://your-domain.com/api/fs
```

## Overview

The File System API provides comprehensive file and directory operations, including listing, reading, writing, uploading, and managing files across multiple storage adapters (local, FTP, SFTP, WebDAV).

## Authentication
Currently in development mode. Production deployments should implement authentication (see [Security Guide](../../deployment/security.md)).

## Rate Limiting
- **Default**: 100 requests per minute per IP
- **File Upload**: 10 uploads per minute per IP
- **Large Operations**: 50 requests per minute per IP

---

## Endpoints

### List Directory

**GET** `/fs/list`

Lists the contents of a directory.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | Directory path to list |
| recursive | boolean | No | Include subdirectories (default: false) |
| limit | integer | No | Maximum items to return (default: 50, max: 1000) |
| offset | integer | No | Number of items to skip (default: 0) |
| sort | string | No | Sort field (name, size, modified, type) |
| order | string | No | Sort order (asc, desc) |

#### Request Example
```bash
curl "https://your-domain.com/api/fs/list?path=/home/user&limit=20&sort=modified&order=desc"
```

#### Response Example
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "name": "documents",
        "path": "/home/user/documents",
        "type": "directory",
        "size": 4096,
        "modified": "2024-01-15T10:30:00.000Z",
        "created": "2024-01-01T09:00:00.000Z",
        "permissions": "rwxr-xr-x"
      },
      {
        "name": "report.pdf",
        "path": "/home/user/report.pdf",
        "type": "file",
        "size": 1048576,
        "mimeType": "application/pdf",
        "modified": "2024-01-14T15:45:00.000Z",
        "created": "2024-01-10T11:20:00.000Z",
        "permissions": "rw-r--r--"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Errors
- `400 Bad Request`: Invalid path parameter
- `404 Not Found`: Directory does not exist
- `403 Forbidden`: Access denied
- `422 Unprocessable Entity`: Path validation failed

---

### Read File

**GET** `/fs/read`

Reads the contents of a file.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | File path to read |
| encoding | string | No | File encoding (default: utf8) |
| range | string | No | Byte range (e.g., "bytes=0-1023") |

#### Request Example
```bash
curl "https://your-domain.com/api/fs/read?path=/home/user/notes.txt&encoding=utf8"
```

#### Response Example
```json
{
  "success": true,
  "data": {
    "content": "Hello, World!\nThis is a test file.",
    "size": 35,
    "encoding": "utf8",
    "mimeType": "text/plain"
  }
}
```

#### Binary File Response
For binary files, returns the raw file content with appropriate `Content-Type` header.

#### Errors
- `400 Bad Request`: Invalid path parameter
- `404 Not Found`: File does not exist
- `403 Forbidden`: Access denied
- `416 Range Not Satisfiable`: Invalid range parameter

---

### Write File

**POST** `/fs/write`

Writes content to a file.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | Yes | File path to write |
| content | string/buffer | Yes | File content |
| encoding | string | No | Content encoding (default: utf8) |
| createPath | boolean | No | Create directories if they don't exist (default: true) |
| overwrite | boolean | No | Overwrite existing file (default: true) |

#### Request Example
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/home/user/test.txt",
    "content": "Hello, World!",
    "encoding": "utf8"
  }' \
  https://your-domain.com/api/fs/write
```

#### Response Example
```json
{
  "success": true,
  "data": {
    "path": "/home/user/test.txt",
    "size": 13,
    "bytesWritten": 13,
    "created": false,
    "modified": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Errors
- `400 Bad Request`: Invalid request body or path
- `403 Forbidden`: Access denied
- `409 Conflict`: File exists and overwrite is false
- `413 Payload Too Large`: Content too large
- `422 Unprocessable Entity`: Path validation failed

---

### Upload File

**POST** `/fs/upload`

Uploads one or more files.

#### Request Body
`multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| files | File[] | Yes | Files to upload (multiple supported) |
| path | string | Yes | Target directory path |
| overwrite | boolean | No | Overwrite existing files (default: false) |
| generateUniqueNames | boolean | No | Generate unique names if conflict (default: false) |

#### Request Example
```bash
curl -X POST \
  -F "files=@/path/to/local/file.txt" \
  -F "files=@/path/to/local/image.jpg" \
  -F "path=/home/user/uploads" \
  -F "overwrite=true" \
  https://your-domain.com/api/fs/upload
```

#### Response Example
```json
{
  "success": true,
  "data": {
    "uploaded": [
      {
        "originalName": "file.txt",
        "savedPath": "/home/user/uploads/file.txt",
        "size": 1024,
        "mimeType": "text/plain"
      },
      {
        "originalName": "image.jpg",
        "savedPath": "/home/user/uploads/image.jpg",
        "size": 2048576,
        "mimeType": "image/jpeg"
      }
    ],
    "skipped": [],
    "errors": []
  }
}
```

#### Upload Progress
For large uploads, use the `X-Upload-ID` header to track progress:
```bash
curl -X GET "https://your-domain.com/api/fs/upload/progress/{uploadId}"
```

#### Errors
- `400 Bad Request`: Invalid request or missing files
- `403 Forbidden`: Access denied
- `409 Conflict`: File exists and overwrite is false
- `413 Payload Too Large`: File(s) too large
- `422 Unprocessable Entity`: Path validation failed

---

### Copy Files

**POST** `/fs/copy`

Copies files or directories.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| source | string | Yes | Source path |
| destination | string | Yes | Destination path |
| recursive | boolean | No | Copy directories recursively (default: true) |
| overwrite | boolean | No | Overwrite existing files (default: false) |

#### Request Example
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "source": "/home/user/documents",
    "destination": "/home/user/backup/documents",
    "recursive": true
  }' \
  https://your-domain.com/api/fs/copy
```

#### Response Example
```json
{
  "success": true,
  "data": {
    "source": "/home/user/documents",
    "destination": "/home/user/backup/documents",
    "itemsCopied": 25,
    "bytesCopied": 10485760,
    "duration": 2500
  }
}
```

#### Errors
- `400 Bad Request`: Invalid request body
- `403 Forbidden`: Access denied
- `404 Not Found`: Source does not exist
- `409 Conflict`: Destination exists and overwrite is false
- `422 Unprocessable Entity`: Path validation failed

---

### Move/Rename Files

**POST** `/fs/move`

Moves or renames files or directories.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| source | string | Yes | Source path |
| destination | string | Yes | Destination path |
| overwrite | boolean | No | Overwrite existing files (default: false) |

#### Request Example
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "source": "/home/user/old_name.txt",
    "destination": "/home/user/new_name.txt"
  }' \
  https://your-domain.com/api/fs/move
```

#### Response Example
```json
{
  "success": true,
  "data": {
    "source": "/home/user/old_name.txt",
    "destination": "/home/user/new_name.txt",
    "moved": true
  }
}
```

#### Errors
- `400 Bad Request`: Invalid request body
- `403 Forbidden`: Access denied
- `404 Not Found`: Source does not exist
- `409 Conflict`: Destination exists and overwrite is false
- `422 Unprocessable Entity`: Path validation failed

---

### Delete Files

**DELETE** `/fs/delete`

Deletes files or directories.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | Path to delete |
| recursive | boolean | No | Delete directories recursively (default: false) |
| force | boolean | No | Force deletion without confirmation (default: false) |

#### Request Example
```bash
curl -X DELETE \
  "https://your-domain.com/api/fs/delete?path=/home/user/temp&recursive=true"
```

#### Response Example
```json
{
  "success": true,
  "data": {
    "path": "/home/user/temp",
    "deleted": true,
    "itemsDeleted": 15,
    "bytesFreed": 104857600
  }
}
```

#### Errors
- `400 Bad Request`: Invalid path parameter
- `403 Forbidden`: Access denied
- `404 Not Found`: Path does not exist
- `409 Conflict`: Directory not empty and recursive is false
- `422 Unprocessable Entity`: Path validation failed

---

### Get File Metadata

**GET** `/fs/metadata`

Retrieves detailed metadata for a file or directory.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | Path to get metadata for |
| extended | boolean | No | Include extended metadata (default: false) |

#### Request Example
```bash
curl "https://your-domain.com/api/fs/metadata?path=/home/user/photo.jpg&extended=true"
```

#### Response Example
```json
{
  "success": true,
  "data": {
    "name": "photo.jpg",
    "path": "/home/user/photo.jpg",
    "type": "file",
    "size": 2048576,
    "mimeType": "image/jpeg",
    "created": "2024-01-10T11:20:00.000Z",
    "modified": "2024-01-14T15:45:00.000Z",
    "accessed": "2024-01-15T09:30:00.000Z",
    "permissions": "rw-r--r--",
    "owner": "user",
    "group": "user",
    "hash": "sha256:a1b2c3d4e5f6...",
    "extended": {
      "width": 1920,
      "height": 1080,
      "format": "JPEG",
      "colorSpace": "RGB",
      "exif": {
        "make": "Canon",
        "model": "EOS 5D",
        "dateTime": "2024:01:10 11:20:00",
        "gps": {
          "latitude": 37.7749,
          "longitude": -122.4194
        }
      }
    }
  }
}
```

#### Errors
- `400 Bad Request`: Invalid path parameter
- `404 Not Found`: Path does not exist
- `403 Forbidden`: Access denied
- `422 Unprocessable Entity`: Path validation failed

---

### Search Files

**POST** `/fs/search`

Searches for files and directories based on various criteria.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | No | Search query (name pattern) |
| path | string | No | Search path (default: root) |
| recursive | boolean | No | Search recursively (default: true) |
| fileTypes | string[] | No | Filter by file types (image, document, video, etc.) |
| sizeMin | integer | No | Minimum file size in bytes |
| sizeMax | integer | No | Maximum file size in bytes |
| modifiedAfter | string | No | Modified after date (ISO 8601) |
| modifiedBefore | string | No | Modified before date (ISO 8601) |
| content | string | No | Search within file contents |
| limit | integer | No | Maximum results (default: 50, max: 1000) |
| offset | integer | No | Number of results to skip |

#### Request Example
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "query": "report",
    "path": "/home/user",
    "fileTypes": ["document", "pdf"],
    "modifiedAfter": "2024-01-01T00:00:00.000Z",
    "limit": 20
  }' \
  https://your-domain.com/api/fs/search
```

#### Response Example
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "name": "annual_report.pdf",
        "path": "/home/user/documents/annual_report.pdf",
        "type": "file",
        "size": 1048576,
        "modified": "2024-01-12T14:30:00.000Z",
        "matchScore": 0.95,
        "matchContext": "annual_report.pdf"
      },
      {
        "name": "expense_report.xlsx",
        "path": "/home/user/documents/expense_report.xlsx",
        "type": "file",
        "size": 524288,
        "modified": "2024-01-08T16:45:00.000Z",
        "matchScore": 0.88,
        "matchContext": "expense_report.xlsx"
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 2,
      "hasNext": false,
      "hasPrev": false
    },
    "searchTime": 45
  }
}
```

#### Errors
- `400 Bad Request`: Invalid search parameters
- `403 Forbidden`: Access denied
- `422 Unprocessable Entity`: Path validation failed

---

## Storage Adapter Operations

### List Storage Adapters

**GET** `/fs/adapters`

Lists all available storage adapters.

#### Response Example
```json
{
  "success": true,
  "data": {
    "adapters": [
      {
        "name": "local",
        "type": "Local Storage",
        "status": "connected",
        "path": "/home/user"
      },
      {
        "name": "ftp-server",
        "type": "FTP",
        "status": "connected",
        "host": "ftp.example.com",
        "path": "/remote/files"
      },
      {
        "name": "cloud-storage",
        "type": "WebDAV",
        "status": "disconnected",
        "host": "cloud.example.com"
      }
    ]
  }
}
```

### Add Storage Adapter

**POST** `/fs/adapters`

Adds a new storage adapter configuration.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Unique adapter name |
| type | string | Yes | Adapter type (local, ftp, sftp, webdav) |
| config | object | Yes | Adapter-specific configuration |

#### FTP Adapter Example
```json
{
  "name": "my-ftp",
  "type": "ftp",
  "config": {
    "host": "ftp.example.com",
    "port": 21,
    "username": "user",
    "password": "pass",
    "path": "/remote/files",
    "secure": false
  }
}
```

#### SFTP Adapter Example
```json
{
  "name": "my-sftp",
  "type": "sftp",
  "config": {
    "host": "sftp.example.com",
    "port": 22,
    "username": "user",
    "privateKey": "-----BEGIN RSA PRIVATE KEY-----...",
    "path": "/remote/files"
  }
}
```

#### WebDAV Adapter Example
```json
{
  "name": "my-webdav",
  "type": "webdav",
  "config": {
    "url": "https://cloud.example.com/remote.php/dav/files/user/",
    "username": "user",
    "password": "pass"
  }
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "FS_INVALID_PATH",
    "message": "Invalid file path: directory traversal not allowed",
    "details": {
      "path": "../../../etc/passwd",
      "reason": "Path contains dangerous characters"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Common Error Codes

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `FS_INVALID_PATH` | Invalid file path | 400 |
| `FS_NOT_FOUND` | File or directory not found | 404 |
| `FS_PERMISSION_DENIED` | Access denied | 403 |
| `FS_ALREADY_EXISTS` | File already exists | 409 |
| `FS_NOT_EMPTY` | Directory not empty | 409 |
| `FS_TOO_LARGE` | File too large | 413 |
| `FS_STORAGE_ERROR` | Storage adapter error | 500 |
| `FS_QUOTA_EXCEEDED` | Storage quota exceeded | 413 |

---

## Rate Limiting Details

### Rate Limit Headers
All responses include rate limiting headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

### Rate Limit Response
When rate limit is exceeded:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

---

## Security Considerations

- **Path Validation**: All paths are validated against allowed directories
- **File Type Restrictions**: Dangerous file types are blocked
- **Size Limits**: Maximum file sizes are enforced
- **Permission Checking**: File system permissions are respected
- **Audit Logging**: All file operations are logged

---

## Examples and SDKs

### JavaScript SDK
```javascript
import { FileSystemAPI } from '@webdesktop/client';

const fs = new FileSystemAPI('https://your-domain.com/api');

// List files
const files = await fs.listFiles('/home/user');

// Upload file
const result = await fs.uploadFile(file, '/home/user/uploads');

// Search files
const searchResults = await fs.search({
  query: 'report',
  fileTypes: ['pdf', 'doc']
});
```

### Python SDK
```python
from webdesktop import FileSystemClient

client = FileSystemClient('https://your-domain.com/api')

# List files
files = client.list_files('/home/user')

# Upload file
result = client.upload_file('/path/to/file.txt', '/home/user')
```

For more examples, see the [SDK Documentation](../sdk/).