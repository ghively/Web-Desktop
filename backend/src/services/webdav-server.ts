import express from 'express';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { validatePath, ensureDirectoryExists } from '../utils/file-utils';

export interface WebDAVServerConfig {
  port: number;
  host: string;
  rootPath?: string;
  auth?: {
    type: 'basic' | 'digest' | 'none';
    realm?: string;
    users?: Array<{ username: string; password: string; home?: string }>;
  };
  readOnly?: boolean;
  enableLocking?: boolean;
  enableProperties?: boolean;
  maxFileSize?: number;
  allowedMethods?: string[];
  cors?: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    headers: string[];
  };
}

export const createWebDavServer = async (config: WebDAVServerConfig) => {
  const app = express();
  const server = createServer(app);
  const connections = new Set();
  const locks = new Map();
  const logs: Array<{ timestamp: Date; message: string; type: 'info' | 'error' | 'warning' }> = [];

  const log = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
    const entry = { timestamp: new Date(), message, type };
    logs.push(entry);
    if (logs.length > 1000) logs.shift();
    console.log(`[WebDAV] ${entry.timestamp.toISOString()} - ${type.toUpperCase()}: ${message}`);
  };

  // CORS configuration
  if (config.cors?.enabled) {
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', config.cors.origins.join(', '));
      res.header('Access-Control-Allow-Methods', config.cors.methods.join(', '));
      res.header('Access-Control-Allow-Headers', config.cors.headers.join(', '));
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      next();
    });
  }

  // Authentication middleware
  const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!config.auth || config.auth.type === 'none') {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.setHeader('WWW-Authenticate', `Basic realm="${config.auth.realm || 'WebDAV'}"`);
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const auth = authHeader.split(' ')[1];
      const [username, password] = Buffer.from(auth, 'base64').toString().split(':');

      const user = config.auth.users?.find(u => u.username === username && u.password === password);
      if (!user) {
        log(`Authentication failed for ${username}`, 'warning');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      (req as any).user = user;
      log(`User ${username} authenticated successfully`);
      next();
    } catch (error) {
      log(`Authentication error: ${error.message}`, 'error');
      res.status(401).json({ error: 'Authentication failed' });
    }
  };

  // Helper to get file path
  const getFilePath = (reqPath: string, user?: any): string => {
    const rootPath = user?.home || config.rootPath || process.env.HOME || '/';
    const cleanPath = decodeURIComponent(reqPath).replace(/^\//, '');
    return path.resolve(rootPath, cleanPath);
  };

  // WebDAV method handlers
  const handleOptions = (req: express.Request, res: express.Response) => {
    const allowedMethods = config.allowedMethods || [
      'OPTIONS', 'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'COPY', 'MOVE',
      'MKCOL', 'PROPFIND', 'PROPPATCH', 'LOCK', 'UNLOCK'
    ];
    res.setHeader('Allow', allowedMethods.join(', '));
    res.setHeader('DAV', '1,2,3');
    res.setHeader('MS-Author-Via', 'DAV');
    res.status(200).end();
  };

  const handlePropfind = (req: express.Request, res: express.Response) => {
    try {
      const filePath = getFilePath(req.path, (req as any).user);
      const depth = req.headers.depth || 'infinity';

      log(`PROPFIND on ${filePath} (depth: ${depth})`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const stats = fs.statSync(filePath);
      const isDirectory = stats.isDirectory();

      // Basic PROPFIND response
      const getProps = (path: string, stats: fs.Stats, isDir: boolean) => {
        const name = path.basename(path);
        return `\
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>${req.path}</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>${name}</d:displayname>
        <d:creationdate>${stats.birthtime.toISOString()}</d:creationdate>
        <d:getlastmodified>${stats.mtime.toUTCString()}</d:getlastmodified>
        <d:getcontentlength>${stats.size}</d:getcontentlength>
        <d:resourcetype>${isDir ? '<d:collection/>' : ''}</d:resourcetype>
        <d:getcontenttype>${isDir ? 'httpd/unix-directory' : 'application/octet-stream'}</d:getcontenttype>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`;
      };

      let content = getProps(filePath, stats, isDirectory);

      // If depth > 0 and it's a directory, include children
      if (isDirectory && depth !== '0') {
        const files = fs.readdirSync(filePath);
        const children = files.map(file => {
          const childPath = path.join(filePath, file);
          const childStats = fs.statSync(childPath);
          const isChildDir = childStats.isDirectory();
          const childWebPath = path.posix.join(req.path, file);

          return `\
  <d:response>
    <d:href>${childWebPath}</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>${file}</d:displayname>
        <d:creationdate>${childStats.birthtime.toISOString()}</d:creationdate>
        <d:getlastmodified>${childStats.mtime.toUTCString()}</d:getlastmodified>
        <d:getcontentlength>${childStats.size}</d:getcontentlength>
        <d:resourcetype>${isChildDir ? '<d:collection/>' : ''}</d:resourcetype>
        <d:getcontenttype>${isChildDir ? 'httpd/unix-directory' : 'application/octet-stream'}</d:getcontenttype>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>`;
        }).join('\n');

        content = content.replace('</d:multistatus>', children + '\n</d:multistatus>');
      }

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.status(207).send(content);

    } catch (error) {
      log(`PROPFIND error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  };

  const handleGet = (req: express.Request, res: express.Response) => {
    try {
      const filePath = getFilePath(req.path, (req as any).user);
      log(`GET on ${filePath}`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        // Return directory listing
        const files = fs.readdirSync(filePath);
        res.json({ files });
      } else {
        // Return file content
        if (config.maxFileSize && stats.size > config.maxFileSize) {
          return res.status(413).json({ error: 'File too large' });
        }

        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Content-Type', 'application/octet-stream');
      }

    } catch (error) {
      log(`GET error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  };

  const handlePut = (req: express.Request, res: express.Response) => {
    try {
      if (config.readOnly) {
        return res.status(403).json({ error: 'Server is read-only' });
      }

      const filePath = getFilePath(req.path, (req as any).user);
      log(`PUT on ${filePath}`);

      // Ensure parent directory exists
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        ensureDirectoryExists(dirPath);
      }

      // Check file size limit
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (config.maxFileSize && contentLength > config.maxFileSize) {
        return res.status(413).json({ error: 'File too large' });
      }

      const writeStream = fs.createWriteStream(filePath);
      req.pipe(writeStream);

      writeStream.on('finish', () => {
        log(`File written: ${filePath}`);
        res.status(201).end();
      });

      writeStream.on('error', (error) => {
        log(`PUT error: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
      });

    } catch (error) {
      log(`PUT error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  };

  const handleMkcol = (req: express.Request, res: express.Response) => {
    try {
      if (config.readOnly) {
        return res.status(403).json({ error: 'Server is read-only' });
      }

      const filePath = getFilePath(req.path, (req as any).user);
      log(`MKCOL on ${filePath}`);

      if (fs.existsSync(filePath)) {
        return res.status(405).json({ error: 'Method not allowed - resource already exists' });
      }

      ensureDirectoryExists(filePath);
      log(`Directory created: ${filePath}`);
      res.status(201).end();

    } catch (error) {
      log(`MKCOL error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  };

  const handleDelete = (req: express.Request, res: express.Response) => {
    try {
      if (config.readOnly) {
        return res.status(403).json({ error: 'Server is read-only' });
      }

      const filePath = getFilePath(req.path, (req as any).user);
      log(`DELETE on ${filePath}`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }

      log(`Resource deleted: ${filePath}`);
      res.status(204).end();

    } catch (error) {
      log(`DELETE error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  };

  const handleCopy = (req: express.Request, res: express.Response) => {
    try {
      const destHeader = req.headers.destination;
      if (!destHeader) {
        return res.status(400).json({ error: 'Destination header required' });
      }

      const srcPath = getFilePath(req.path, (req as any).user);
      const destPath = getFilePath(new URL(destHeader, `http://${req.headers.host}`).pathname, (req as any).user);

      log(`COPY from ${srcPath} to ${destPath}`);

      if (!fs.existsSync(srcPath)) {
        return res.status(404).json({ error: 'Source not found' });
      }

      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        ensureDirectoryExists(destDir);
      }

      if (fs.existsSync(destPath)) {
        const overwrite = req.headers.overwrite === 'T';
        if (!overwrite) {
          return res.status(412).json({ error: 'Destination already exists' });
        }
        fs.rmSync(destPath, { recursive: true, force: true });
      }

      const srcStats = fs.statSync(srcPath);
      if (srcStats.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        // Copy directory contents recursively
        const copyDir = (src: string, dest: string) => {
          const items = fs.readdirSync(src);
          items.forEach(item => {
            const srcItem = path.join(src, item);
            const destItem = path.join(dest, item);
            const itemStats = fs.statSync(srcItem);
            if (itemStats.isDirectory()) {
              fs.mkdirSync(destItem);
              copyDir(srcItem, destItem);
            } else {
              fs.copyFileSync(srcItem, destItem);
            }
          });
        };
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }

      log(`Resource copied: ${srcPath} -> ${destPath}`);
      res.status(201).end();

    } catch (error) {
      log(`COPY error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  };

  // Apply authentication and route handlers
  app.use(authenticate);

  // WebDAV methods
  app.options('*', handleOptions);
  app.propfind('*', handlePropfind);
  app.get('*', handleGet);
  app.put('*', handlePut);
  app.mkcol('*', handleMkcol);
  app.delete('*', handleDelete);
  app.copy('*', handleCopy);

  // Simple MOVE implementation (copy + delete)
  app.move('*', (req, res) => {
    // Implement move as copy then delete
    handleCopy(req, res);
    if (res.statusCode < 400) {
      // If copy succeeded, delete source
      try {
        const srcPath = getFilePath(req.path, (req as any).user);
        const stats = fs.statSync(srcPath);
        if (stats.isDirectory()) {
          fs.rmSync(srcPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(srcPath);
        }
      } catch (error) {
        log(`MOVE (delete) error: ${error.message}`, 'error');
      }
    }
  });

  // Start server
  return new Promise((resolve, reject) => {
    server.listen(config.port, config.host, () => {
      log(`WebDAV Server started on ${config.host}:${config.port}`);
      resolve({
        instance: server,
        connections: () => connections.size,
        logs: () => logs.slice(-50),
        close: () => {
          log('WebDAV Server shutting down');
          connections.forEach(conn => conn.destroy());
          server.close();
        }
      });
    });

    server.on('connection', (conn) => {
      connections.add(conn);
      conn.on('close', () => connections.delete(conn));
    });

    server.on('error', (error) => {
      log(`Server error: ${error.message}`, 'error');
      reject(error);
    });
  });
};