import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';

import fsRoutes from '../../../routes/fs';
import systemRoutes from '../../../routes/system';
import appsRoutes from '../../../routes/apps';
import packagesRoutes from '../../../routes/packages';
import notesRoutes from '../../../routes/notes';
import containersRoutes from '../../../routes/containers';

export interface TestServer {
  app: express.Application;
  server: http.Server;
  wss: WebSocketServer;
  port: number;
}

export async function createTestServer(): Promise<TestServer> {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/fs', fsRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/apps', appsRoutes);
  app.use('/api/packages', packagesRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api/containers', containersRoutes);

  // Health check endpoint for testing
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start server
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = (server.address() as any)?.port;
      if (!port) {
        reject(new Error('Failed to get server port'));
        return;
      }
      resolve({ app, server, wss, port });
    });
  });
}

export async function stopTestServer(testServer: TestServer): Promise<void> {
  return new Promise((resolve) => {
    testServer.wss.close();
    testServer.server.close(() => {
      resolve();
    });
  });
}