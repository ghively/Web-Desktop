import express from 'express';
import fs from 'fs';
import path from 'path';
import { createFtpServer } from '../services/ftp-server';
import { createSftpServer } from '../services/sftp-server';
import { createWebDavServer } from '../services/webdav-server';
import { validatePath, ensureDirectoryExists } from '../utils/file-utils';

const router = express.Router();

// Server instances storage
const activeServers = new Map<string, any>();

// Helper function to validate server configuration
const validateServerConfig = (type: string, config: any): boolean => {
  switch (type) {
    case 'ftp':
      return config.port && config.port > 0 && config.port < 65536;
    case 'sftp':
      return config.port && config.port > 0 && config.port < 65536 &&
             config.host && (config.privateKey || config.password);
    case 'webdav':
      return config.port && config.port > 0 && config.port < 65536;
    default:
      return false;
  }
};

// Get all file servers
router.get('/', (req, res) => {
  try {
    const servers = [];
    for (const [id, server] of activeServers.entries()) {
      servers.push({
        id,
        type: server.type,
        port: server.config.port,
        status: server.server?.listening ? 'running' : 'stopped',
        connections: server.connections || 0,
        startTime: server.startTime
      });
    }
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve servers' });
  }
});

// Create and start a file server
router.post('/', async (req, res) => {
  try {
    const { type, config, name } = req.body;

    if (!type || !config || !name) {
      return res.status(400).json({ error: 'Missing required fields: type, config, name' });
    }

    if (!['ftp', 'sftp', 'webdav'].includes(type)) {
      return res.status(400).json({ error: 'Invalid server type. Must be ftp, sftp, or webdav' });
    }

    if (!validateServerConfig(type, config)) {
      return res.status(400).json({ error: 'Invalid server configuration' });
    }

    const serverId = `${type}_${Date.now()}`;
    let server;

    switch (type) {
      case 'ftp':
        server = await createFtpServer(config);
        break;
      case 'sftp':
        server = await createSftpServer(config);
        break;
      case 'webdav':
        server = await createWebDavServer(config);
        break;
    }

    if (server) {
      activeServers.set(serverId, {
        type,
        config,
        name,
        server: server.instance || server,
        connections: 0,
        startTime: new Date().toISOString()
      });

      res.json({
        id: serverId,
        type,
        name,
        port: config.port,
        status: 'running'
      });
    } else {
      res.status(500).json({ error: `Failed to create ${type} server` });
    }
  } catch (error) {
    console.error('Failed to create file server:', error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

// Stop a file server
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const server = activeServers.get(id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.server && typeof server.server.close === 'function') {
      server.server.close();
    }

    activeServers.delete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop server' });
  }
});

// Get server status and statistics
router.get('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const server = activeServers.get(id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const stats = {
      id,
      type: server.type,
      name: server.name,
      status: server.server?.listening ? 'running' : 'stopped',
      port: server.config.port,
      connections: server.connections || 0,
      startTime: server.startTime,
      uptime: server.startTime ? Date.now() - new Date(server.startTime).getTime() : 0
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get server status' });
  }
});

// Update server configuration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { config } = req.body;
    const server = activeServers.get(id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (!validateServerConfig(server.type, config)) {
      return res.status(400).json({ error: 'Invalid server configuration' });
    }

    // Stop existing server
    if (server.server && typeof server.server.close === 'function') {
      server.server.close();
    }

    // Create new server with updated config
    let newServer;
    switch (server.type) {
      case 'ftp':
        newServer = await createFtpServer(config);
        break;
      case 'sftp':
        newServer = await createSftpServer(config);
        break;
      case 'webdav':
        newServer = await createWebDavServer(config);
        break;
    }

    if (newServer) {
      server.config = config;
      server.server = newServer.instance || newServer;
      server.connections = 0;
      server.startTime = new Date().toISOString();

      res.json({
        id,
        type: server.type,
        name: server.name,
        port: config.port,
        status: 'running'
      });
    } else {
      res.status(500).json({ error: `Failed to restart ${server.type} server` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update server' });
  }
});

// Get server logs
router.get('/:id/logs', (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;
    const server = activeServers.get(id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Return logs if available (this would need to be implemented in the server classes)
    const logs = server.logs || [];
    res.json(logs.slice(0, parseInt(limit as string)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// Test server connectivity
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const server = activeServers.get(id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Basic connectivity test
    const isListening = server.server?.listening || false;
    const port = server.config.port;

    res.json({
      id,
      listening: isListening,
      port,
      reachable: isListening
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to test server' });
  }
});

export default router;