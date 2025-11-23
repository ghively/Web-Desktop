import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = Router();
const HOME_DIR = os.homedir();

// Timeout wrapper for async operations
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
        )
    ]);
};

// Security: Validate and sanitize path
const validatePath = (inputPath: string): string | null => {
    if (!inputPath || typeof inputPath !== 'string') {
        return null;
    }

    // Remove null bytes and control characters
    const sanitized = inputPath.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Resolve path and ensure it's within allowed bounds
    const resolvedPath = path.resolve(sanitized);
    const homeResolved = path.resolve(HOME_DIR);
    
    // Only allow access within home directory and system directories
    const allowedPaths = [
        homeResolved,
        '/tmp',
        '/var/tmp',
        '/mnt'
    ];
    
    const isAllowed = allowedPaths.some(allowed => 
        resolvedPath.startsWith(allowed) || resolvedPath === allowed
    );
    
    if (!isAllowed) {
        return null;
    }

    // Prevent path traversal
    if (sanitized.includes('../') || sanitized.includes('..\\')) {
        return null;
    }

    return resolvedPath;
};

router.get('/', async (req, res) => {
    const inputPath = req.query.path as string;
    const dirPath = validatePath(inputPath) || HOME_DIR;

    try {
        // Additional security: Check if path exists and is directory
        const stats = await withTimeout(
            fs.stat(dirPath).catch(() => null),
            5000 // 5 second timeout
        );
        if (!stats) {
            return res.status(404).json({ error: 'Directory not found' });
        }

        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Path is not a directory' });
        }

        // Limit directory size to prevent DoS
        const items = await withTimeout(
            fs.readdir(dirPath, { withFileTypes: true }),
            10000 // 10 second timeout
        );
        if (items.length > 10000) {
            return res.status(400).json({ error: 'Directory contains too many items' });
        }

        const files = await Promise.all(
            items.slice(0, 1000).map(async (item) => { // Limit to 1000 items
                const fullPath = path.join(dirPath, item.name);
                let size = 0;
                let modified = null;

                try {
                    const fileStats = await fs.stat(fullPath);
                    size = Math.min(fileStats.size, 1073741824); // Cap at 1GB for display
                    modified = fileStats.mtime.toISOString();
                } catch (err) {
                    // Ignore stat errors
                }

                return {
                    name: item.name,
                    isDirectory: item.isDirectory(),
                    path: fullPath,
                    size,
                    modified
                };
            })
        );

        res.json({ path: dirPath, files });
    } catch (error: any) {
        console.error('File system error:', error);
        
        // Handle specific errors
        if (error.code === 'EACCES') {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Directory not found' });
        }
        if (error.code === 'EMFILE') {
            return res.status(503).json({ error: 'Too many open files' });
        }
        if (error.message === 'Operation timed out') {
            return res.status(504).json({ error: 'Request timed out' });
        }
        
        res.status(500).json({ error: 'Failed to read directory' });
    }
});

router.post('/operation', async (req, res) => {
    const { type, path: targetPath, dest, name } = req.body;

    if (!type || !targetPath) {
        return res.status(400).json({ error: 'Missing type or path' });
    }

    try {
        switch (type) {
            case 'create_folder':
                if (!name) return res.status(400).json({ error: 'Missing folder name' });
                await fs.mkdir(path.join(targetPath, name), { recursive: true });
                break;

            case 'delete':
                await fs.rm(targetPath, { recursive: true, force: true });
                break;

            case 'rename':
                if (!name) return res.status(400).json({ error: 'Missing new name' });
                const newPath = path.join(path.dirname(targetPath), name);
                await fs.rename(targetPath, newPath);
                break;

            case 'copy':
                if (!dest) return res.status(400).json({ error: 'Missing destination' });
                await fs.cp(targetPath, dest, { recursive: true });
                break;

            case 'move':
                if (!dest) return res.status(400).json({ error: 'Missing destination' });
                await fs.rename(targetPath, dest);
                break;

            default:
                return res.status(400).json({ error: 'Invalid operation type' });
// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

const checkRateLimit = (req: any, res: any, next: any) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    let clientData = rateLimitMap.get(ip);

    if (!clientData || now > clientData.resetTime) {
        clientData = { count: 0, resetTime: now + RATE_WINDOW };
        rateLimitMap.set(ip, clientData);
    }

    if (clientData.count >= RATE_LIMIT) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    clientData.count++;
    next();
};

// Cleanup old rate limit entries
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
        if (now > data.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, RATE_WINDOW);

// POST /api/fs/upload - Upload file
router.post('/upload', checkRateLimit, async (req, res) => {
    const { path: targetPath, content, filename } = req.body;

    if (!targetPath || !content || !filename) {
        return res.status(400).json({ error: 'Missing required fields: path, content, filename' });
    }

    const validatedPath = validatePath(targetPath);
    if (!validatedPath) {
        return res.status(403).json({ error: 'Access denied: Invalid path' });
    }

    // Validate filename
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
    if (!sanitizedFilename || sanitizedFilename.startsWith('.')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    const fullPath = path.join(validatedPath, sanitizedFilename);

    // Security: Check if target path is within validated directory
    if (!fullPath.startsWith(validatedPath)) {
        return res.status(403).json({ error: 'Access denied: Path traversal detected' });
    }

    try {
        // Validate content is base64
        const fileBuffer = Buffer.from(content, 'base64');

        // Limit file size to 100MB
        if (fileBuffer.length > 100 * 1024 * 1024) {
            return res.status(400).json({ error: 'File too large (max 100MB)' });
        }

        // Check if file already exists
        const exists = await fs.access(fullPath).then(() => true).catch(() => false);
        if (exists) {
            return res.status(409).json({ error: 'File already exists' });
        }

        await withTimeout(fs.writeFile(fullPath, fileBuffer), 30000);

        res.json({ success: true, path: fullPath });
    } catch (error: any) {
        console.error('Upload error:', error);

        if (error.code === 'EACCES') {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (error.code === 'ENOSPC') {
            return res.status(507).json({ error: 'Insufficient storage' });
        }
        if (error.message === 'Operation timed out') {
            return res.status(504).json({ error: 'Upload timed out' });
        }

        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// POST /api/fs/copy - Copy file or directory
router.post('/copy', checkRateLimit, async (req, res) => {
    const { source, destination } = req.body;

    if (!source || !destination) {
        return res.status(400).json({ error: 'Missing required fields: source, destination' });
    }

    const validatedSource = validatePath(source);
    const validatedDest = validatePath(destination);

    if (!validatedSource || !validatedDest) {
        return res.status(403).json({ error: 'Access denied: Invalid path' });
    }

    try {
        // Check if source exists
        const sourceStats = await withTimeout(fs.stat(validatedSource), 5000);

        // Check if destination already exists
        const destExists = await fs.access(validatedDest).then(() => true).catch(() => false);
        if (destExists) {
            return res.status(409).json({ error: 'Destination already exists' });
        }

        if (sourceStats.isDirectory()) {
            // Copy directory recursively
            await withTimeout(
                fs.cp(validatedSource, validatedDest, { recursive: true }),
                60000 // 1 minute for large directories
            );
        } else {
            // Copy file
            await withTimeout(fs.copyFile(validatedSource, validatedDest), 30000);
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
        console.error('Copy error:', error);

        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Source not found' });
        }
        if (error.code === 'EACCES') {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (error.code === 'ENOSPC') {
            return res.status(507).json({ error: 'Insufficient storage' });
        }
        if (error.message === 'Operation timed out') {
            return res.status(504).json({ error: 'Copy operation timed out' });
        }

        res.status(500).json({ error: 'Failed to copy file' });
    }
});

// POST /api/fs/move - Move/rename file or directory
router.post('/move', checkRateLimit, async (req, res) => {
    const { source, destination } = req.body;

    if (!source || !destination) {
        return res.status(400).json({ error: 'Missing required fields: source, destination' });
    }

    const validatedSource = validatePath(source);
    const validatedDest = validatePath(destination);

    if (!validatedSource || !validatedDest) {
        return res.status(403).json({ error: 'Access denied: Invalid path' });
    }

    try {
        // Check if source exists
        await withTimeout(fs.stat(validatedSource), 5000);

        // Check if destination already exists
        const destExists = await fs.access(validatedDest).then(() => true).catch(() => false);
        if (destExists) {
            return res.status(409).json({ error: 'Destination already exists' });
        }

        // Move/rename
        await withTimeout(fs.rename(validatedSource, validatedDest), 30000);

        res.json({ success: true });
    } catch (error: any) {
        console.error('Move error:', error);

        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Source not found' });
        }
        if (error.code === 'EACCES') {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (error.code === 'EXDEV') {
            return res.status(400).json({ error: 'Cross-device move not supported. Use copy instead.' });
        }
        if (error.message === 'Operation timed out') {
            return res.status(504).json({ error: 'Move operation timed out' });
        }

        res.status(500).json({ error: 'Failed to move file' });
    }
});

// POST /api/fs/rename - Rename file or directory (convenience endpoint)
router.post('/rename', checkRateLimit, async (req, res) => {
    const { path: filePath, newName } = req.body;

    if (!filePath || !newName) {
        return res.status(400).json({ error: 'Missing required fields: path, newName' });
    }

    const validatedPath = validatePath(filePath);
    if (!validatedPath) {
        return res.status(403).json({ error: 'Access denied: Invalid path' });
    }

    // Validate new name
    const sanitizedNewName = newName.replace(/[\/\\]/g, '').substring(0, 255);
    if (!sanitizedNewName || sanitizedNewName === '.' || sanitizedNewName === '..') {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    const dir = path.dirname(validatedPath);
    const newPath = path.join(dir, sanitizedNewName);

    // Security: Ensure new path is in same directory
    if (path.dirname(newPath) !== dir) {
        return res.status(403).json({ error: 'Access denied: Cannot move to different directory' });
    }

    try {
        // Check if source exists
        await withTimeout(fs.stat(validatedPath), 5000);

        // Check if destination already exists
        const destExists = await fs.access(newPath).then(() => true).catch(() => false);
        if (destExists) {
            return res.status(409).json({ error: 'A file with that name already exists' });
        }

        await withTimeout(fs.rename(validatedPath, newPath), 10000);

        res.json({ success: true, newPath });
    } catch (error: any) {
        console.error('Rename error:', error);

        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'File not found' });
        }
        if (error.code === 'EACCES') {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (error.message === 'Operation timed out') {
            return res.status(504).json({ error: 'Rename operation timed out' });
        }

        res.status(500).json({ error: 'Failed to rename file' });
    }
});

// DELETE /api/fs/delete - Delete file or directory
router.delete('/delete', checkRateLimit, async (req, res) => {
    const { path: filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({ error: 'Missing required field: path' });
    }

    const validatedPath = validatePath(filePath);
    if (!validatedPath) {
        return res.status(403).json({ error: 'Access denied: Invalid path' });
    }

    try {
        // Check if file exists
        const stats = await withTimeout(fs.stat(validatedPath), 5000);

        if (stats.isDirectory()) {
            // Delete directory recursively
            await withTimeout(
                fs.rm(validatedPath, { recursive: true, force: true }),
                60000 // 1 minute for large directories
            );
        } else {
            // Delete file
            await withTimeout(fs.unlink(validatedPath), 10000);
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete error:', error);

        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'File not found' });
        }
        if (error.code === 'EACCES') {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (error.message === 'Operation timed out') {
            return res.status(504).json({ error: 'Delete operation timed out' });
        }

        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// GET /api/fs/read - Read file content (for preview)
router.get('/read', checkRateLimit, async (req, res) => {
    const filePath = req.query.path as string;

    if (!filePath) {
        return res.status(400).json({ error: 'Missing required parameter: path' });
    }

    const validatedPath = validatePath(filePath);
    if (!validatedPath) {
        return res.status(403).json({ error: 'Access denied: Invalid path' });
    }

    try {
        const stats = await withTimeout(fs.stat(validatedPath), 5000);

        if (stats.isDirectory()) {
            return res.status(400).json({ error: 'Cannot read directory as file' });
        }

        // Limit file size for preview (10MB)
        if (stats.size > 10 * 1024 * 1024) {
            return res.status(400).json({ error: 'File too large for preview (max 10MB)' });
        }

        const content = await withTimeout(fs.readFile(validatedPath), 30000);

        // Detect MIME type based on extension
        const ext = path.extname(validatedPath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.json': 'application/json',
            '.js': 'text/javascript',
            '.ts': 'text/typescript',
            '.html': 'text/html',
            '.css': 'text/css',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
        };

        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        const isText = mimeType.startsWith('text/') ||
                      mimeType === 'application/json' ||
                      ext === '.ts' || ext === '.tsx' || ext === '.jsx';

        if (isText) {
            res.json({
                content: content.toString('utf-8'),
                type: 'text',
                mimeType
            });
        } else {
            res.json({
                content: content.toString('base64'),
                type: 'binary',
                mimeType
            });
        }
    } catch (error: any) {
        console.error('Read error:', error);

        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'File not found' });
        }
        if (error.code === 'EACCES') {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (error.message === 'Operation timed out') {
            return res.status(504).json({ error: 'Read operation timed out' });
        }

        res.status(500).json({ error: 'Failed to read file' });
    }
});

export default router;
