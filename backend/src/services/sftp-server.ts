import { Client } from 'ssh2';
import { createServer } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { validatePath } from '../utils/file-utils';

export interface SFTPServerConfig {
  port: number;
  host: string;
  privateKey?: string;
  privateKeyPath?: string;
  password?: string;
  hostKeys?: string[];
  banner?: string;
  idleTimeout?: number;
  maxConnections?: number;
  allowedUsers?: Array<{ username: string; password?: string; publicKey?: string; home: string }>;
  algorithms?: {
    kex?: string[];
    cipher?: string[];
    mac?: string[];
  };
}

export const createSftpServer = async (config: SFTPServerConfig) => {
  const connections = new Set();
  const logs: Array<{ timestamp: Date; message: string; type: 'info' | 'error' | 'warning' }> = [];

  const log = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
    const entry = { timestamp: new Date(), message, type };
    logs.push(entry);
    if (logs.length > 1000) logs.shift();
    console.log(`[SFTP] ${entry.timestamp.toISOString()} - ${type.toUpperCase()}: ${message}`);
  };

  // Load private key
  let hostKey: Buffer;
  if (config.privateKey) {
    hostKey = Buffer.from(config.privateKey);
  } else if (config.privateKeyPath && fs.existsSync(config.privateKeyPath)) {
    hostKey = fs.readFileSync(config.privateKeyPath);
  } else {
    // Generate a simple host key (in production, this should be properly managed)
    const { execSync } = require('child_process');
    try {
      const keyPath = '/tmp/web-desktop-sftp-key';
      if (!fs.existsSync(keyPath)) {
        execSync('ssh-keygen -t rsa -b 2048 -f ' + keyPath + ' -N ""');
      }
      hostKey = fs.readFileSync(keyPath);
    } catch (error) {
      log(`Failed to generate/load host key: ${error.message}`, 'error');
      throw error;
    }
  }

  const server = createServer({
    hostKeys: [hostKey],
    banner: config.banner || 'Web Desktop SFTP Server',
    ident: 'WebDesktop-SFTP',
    algorithms: config.algorithms || {
      kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group-exchange-sha256', 'ecdh-sha2-nistp256'],
      cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
      mac: ['hmac-sha2-256', 'hmac-sha1']
    }
  });

  server.on('connection', (conn) => {
    let userInfo: any = null;
    let sftpSession: any = null;

    log(`Connection from ${conn.remoteAddress}`);
    connections.add(conn);

    conn.on('authentication', async (ctx) => {
      try {
        const { username, method } = ctx;

        // Check allowed users if configured
        if (config.allowedUsers && config.allowedUsers.length > 0) {
          const user = config.allowedUsers.find(u => u.username === username);
          if (!user) {
            log(`Authentication failed for unknown user: ${username}`, 'warning');
            return ctx.reject(['password', 'publickey']);
          }

          // Password authentication
          if (method === 'password') {
            if (user.password && ctx.password === user.password) {
              userInfo = { username, home: path.resolve(user.home || process.env.HOME || '/') };
              log(`User ${username} authenticated with password`);
              return ctx.accept();
            }
          }
          // Public key authentication
          else if (method === 'publickey') {
            if (user.publicKey) {
              // Simple public key validation (in production, this should be more sophisticated)
              const pubKey = ctx.key.getPublicSSH();
              if (pubKey === user.publicKey) {
                userInfo = { username, home: path.resolve(user.home || process.env.HOME || '/') };
                log(`User ${username} authenticated with public key`);
                return ctx.accept();
              }
            }
          }

          log(`Authentication failed for ${username} using ${method}`, 'warning');
          return ctx.reject(['password', 'publickey']);
        } else {
          // No user restrictions - allow any login (development mode)
          if (method === 'password' || method === 'publickey') {
            userInfo = { username, home: path.resolve(process.env.HOME || '/') };
            log(`User ${username} authenticated (development mode)`);
            return ctx.accept();
          }
          return ctx.reject(['password']);
        }
      } catch (error) {
        log(`Authentication error: ${error.message}`, 'error');
        return ctx.reject(['password', 'publickey']);
      }
    });

    conn.on('ready', () => {
      log(`SFTP session ready for ${userInfo.username}`);

      conn.on('session', (accept, reject) => {
        const session = accept();
        sftpSession = session;

        session.on('sftp', (accept, reject) => {
          log(`SFTP subsystem started for ${userInfo.username}`);
          const sftpStream = accept();

          // SFTP file operations
          sftpStream.on('OPEN', (reqid, filename, flags, attrs) => {
            try {
              const fullPath = path.resolve(userInfo.home, filename);

              // Basic path validation
              if (!fullPath.startsWith(userInfo.home)) {
                sftpStream.status(reqid, 3, 'Permission denied');
                return;
              }

              fs.open(fullPath, flags, (err, fd) => {
                if (err) {
                  sftpStream.status(reqid, err.code === 'ENOENT' ? 2 : 3, err.message);
                } else {
                  sftpStream.handle(reqid, Buffer.from('handle_' + fd));
                  log(`Opened file: ${filename}`);
                }
              });
            } catch (error) {
              sftpStream.status(reqid, 3, error.message);
            }
          });

          sftpStream.on('READ', (reqid, handle, offset, length) => {
            try {
              const handleStr = handle.toString();
              if (!handleStr.startsWith('handle_')) {
                return sftpStream.status(reqid, 3, 'Invalid handle');
              }

              const fd = parseInt(handleStr.replace('handle_', ''));
              const buffer = Buffer.allocUnsafe(length);

              fs.read(fd, buffer, 0, length, offset, (err, bytesRead) => {
                if (err) {
                  sftpStream.status(reqid, 3, err.message);
                } else {
                  sftpStream.data(reqid, buffer.slice(0, bytesRead));
                }
              });
            } catch (error) {
              sftpStream.status(reqid, 3, error.message);
            }
          });

          sftpStream.on('WRITE', (reqid, handle, offset, data) => {
            try {
              const handleStr = handle.toString();
              if (!handleStr.startsWith('handle_')) {
                return sftpStream.status(reqid, 3, 'Invalid handle');
              }

              const fd = parseInt(handleStr.replace('handle_', ''));
              fs.write(fd, data, 0, data.length, offset, (err) => {
                if (err) {
                  sftpStream.status(reqid, 3, err.message);
                } else {
                  sftpStream.status(reqid, 0, 'OK');
                }
              });
            } catch (error) {
              sftpStream.status(reqid, 3, error.message);
            }
          });

          sftpStream.on('CLOSE', (reqid, handle) => {
            try {
              const handleStr = handle.toString();
              if (handleStr.startsWith('handle_')) {
                const fd = parseInt(handleStr.replace('handle_', ''));
                fs.close(fd, () => {
                  sftpStream.status(reqid, 0, 'OK');
                });
              } else {
                sftpStream.status(reqid, 0, 'OK');
              }
            } catch (error) {
              sftpStream.status(reqid, 3, error.message);
            }
          });

          sftpStream.on('OPENDIR', (reqid, path) => {
            try {
              const fullPath = path.resolve(userInfo.home, path);

              if (!fullPath.startsWith(userInfo.home)) {
                sftpStream.status(reqid, 3, 'Permission denied');
                return;
              }

              fs.opendir(fullPath, (err, dir) => {
                if (err) {
                  sftpStream.status(reqid, err.code === 'ENOENT' ? 2 : 3, err.message);
                } else {
                  sftpStream.handle(reqid, Buffer.from('dir_handle_' + fullPath));
                  log(`Opened directory: ${path}`);
                }
              });
            } catch (error) {
              sftpStream.status(reqid, 3, error.message);
            }
          });

          sftpStream.on('READDIR', (reqid, handle) => {
            try {
              const handleStr = handle.toString();
              if (!handleStr.startsWith('dir_handle_')) {
                return sftpStream.status(reqid, 3, 'Invalid handle');
              }

              const dirPath = handleStr.replace('dir_handle_', '');
              fs.readdir(dirPath, { withFileTypes: true }, (err, entries) => {
                if (err) {
                  sftpStream.status(reqid, 3, err.message);
                } else {
                  const files = entries.map(entry => ({
                    filename: entry.name,
                    longname: entry.name,
                    attrs: {
                      type: entry.isDirectory() ? 2 : 1,
                      size: 0,
                      uid: 0,
                      gid: 0,
                      permissions: entry.isDirectory() ? 0o40755 : 0o100644,
                      atime: 0,
                      mtime: 0
                    }
                  }));
                  sftpStream.name(reqid, files);
                }
              });
            } catch (error) {
              sftpStream.status(reqid, 3, error.message);
            }
          });

          sftpStream.on('STAT', (reqid, path) => {
            try {
              const fullPath = path.resolve(userInfo.home, path);

              if (!fullPath.startsWith(userInfo.home)) {
                sftpStream.status(reqid, 3, 'Permission denied');
                return;
              }

              fs.stat(fullPath, (err, stats) => {
                if (err) {
                  sftpStream.status(reqid, err.code === 'ENOENT' ? 2 : 3, err.message);
                } else {
                  sftpStream.attrs(reqid, {
                    type: stats.isDirectory() ? 2 : 1,
                    size: stats.size,
                    uid: stats.uid,
                    gid: stats.gid,
                    permissions: stats.mode,
                    atime: Math.floor(stats.atimeMs / 1000),
                    mtime: Math.floor(stats.mtimeMs / 1000)
                  });
                }
              });
            } catch (error) {
              sftpStream.status(reqid, 3, error.message);
            }
          });

          sftpStream.on('REALPATH', (reqid, path) => {
            try {
              const fullPath = path.resolve(userInfo.home, path || '.');

              if (!fullPath.startsWith(userInfo.home)) {
                sftpStream.status(reqid, 3, 'Permission denied');
                return;
              }

              const relativePath = fullPath.replace(userInfo.home, '') || '/';
              sftpStream.name(reqid, [{
                filename: relativePath,
                longname: relativePath,
                attrs: {
                  type: 2, // Directory
                  size: 0,
                  uid: 0,
                  gid: 0,
                  permissions: 0o40755,
                  atime: 0,
                  mtime: 0
                }
              }]);
            } catch (error) {
              sftpStream.status(reqid, 3, error.message);
            }
          });
        });
      });
    });

    conn.on('error', (err) => {
      log(`Connection error: ${err.message}`, 'error');
    });

    conn.on('end', () => {
      connections.delete(conn);
      log(`Connection ended`);
    });
  });

  server.on('error', (err) => {
    log(`Server error: ${err.message}`, 'error');
  });

  // Start listening
  return new Promise((resolve, reject) => {
    server.listen(config.port, config.host, () => {
      log(`SFTP Server started on ${config.host}:${config.port}`);
      resolve({
        instance: server,
        connections: () => connections.size,
        logs: () => logs.slice(-50),
        close: () => {
          log('SFTP Server shutting down');
          connections.forEach(conn => conn.end());
          server.close();
        }
      });
    });
  });
};