// @ts-nocheck
import * as ftp from 'basic-ftp';
import createServer from 'ftp-srv';
import fs from 'fs';
import path from 'path';
import { validatePath } from '../utils/file-utils';

export interface FTPServerConfig {
  port: number;
  host?: string;
  anonymous?: boolean;
  maxConnections?: number;
  rootPath?: string;
  greeting?: string;
  requirePassword?: boolean;
  allowedUsers?: Array<{ username: string; password: string; home: string }>;
}

export const createFtpServer = async (config: FTPServerConfig) => {
  const ftpServer = createServer({
    url: `ftp://${config.host || '0.0.0.0'}:${config.port}`,
    anonymous: config.anonymous !== false,
    max_connections: config.maxConnections || 10,
    greeting: config.greeting || 'Welcome to Web Desktop FTP Server',
    whitelist: ['::1', '127.0.0.1', 'localhost'],
    blacklist: []
  });

  const connections = new Set();
  const logs: Array<{ timestamp: Date; message: string; type: 'info' | 'error' | 'warning' }> = [];

  const log = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
    const entry = { timestamp: new Date(), message, type };
    logs.push(entry);
    if (logs.length > 1000) logs.shift(); // Keep last 1000 logs
    console.log(`[FTP] ${entry.timestamp.toISOString()} - ${type.toUpperCase()}: ${message}`);
  };

  ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
    try {
      log(`Login attempt: ${username} from ${connection.ip}`);

      // Check for allowed users if configured
      if (config.allowedUsers && config.allowedUsers.length > 0) {
        const user = config.allowedUsers.find(u => u.username === username);
        if (!user || (config.requirePassword && user.password !== password)) {
          log(`Login failed for ${username}`, 'warning');
          return reject(new Error('Invalid credentials'));
        }
        // Set user's home directory
        connection.fs = new ftp.FileSystem(path.resolve(user.home || config.rootPath || process.env.HOME || '/'));
      } else {
        // Use default root path
        const rootPath = path.resolve(config.rootPath || process.env.HOME || '/');
        connection.fs = new ftp.FileSystem(rootPath);
      }

      connections.add(connection);
      log(`User ${username} connected successfully`);

      resolve({
        fs: connection.fs
      });

    } catch (error) {
      log(`Login error: ${error.message}`, 'error');
      reject(error);
    }
  });

  ftpServer.on('client-error', ({ connection, context, error }, reject) => {
    log(`Client error from ${connection.ip}: ${error.message}`, 'error');
    reject(error);
  });

  ftpServer.on('disconnect', (connection) => {
    connections.delete(connection);
    log(`Client disconnected: ${connection.ip}`);
  });

  // Start listening
  try {
    await ftpServer.listen();
    log(`FTP Server started on port ${config.port}`);
    return {
      instance: ftpServer,
      connections: () => connections.size,
      logs: () => logs.slice(-50), // Return last 50 logs
      close: async () => {
        log('FTP Server shutting down');
        connections.forEach(conn => conn.close());
        await ftpServer.close();
      }
    };
  } catch (error) {
    log(`Failed to start FTP server: ${error.message}`, 'error');
    throw error;
  }
};
