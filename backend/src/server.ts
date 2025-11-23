import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import os from 'os';
import * as nodePty from 'node-pty';
const pty = require('node-pty') as typeof nodePty;
import fsRoutes from './routes/fs';
import systemRoutes from './routes/system';
import appRoutes from './routes/apps';
import packagesRoutes from './routes/packages';
import notesRoutes from './routes/notes';
import containersRoutes from './routes/containers';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Serve static files from frontend-simple
const frontendPath = path.join(__dirname, '../../frontend-simple');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/fs', fsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/apps', appRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/containers', containersRoutes);

// WebSocket handling
wss.on('connection', (ws) => {
    console.log('Client connected');

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env
    });

    ptyProcess.onData(data => {
        ws.send(data);
    });

    ws.on('message', (message) => {
        ptyProcess.write(message.toString());
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        ptyProcess.kill();
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`Pty process exited with code ${exitCode} and signal ${signal}`);
        ws.close();
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
