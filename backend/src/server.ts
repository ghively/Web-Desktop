import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import os from 'os';
import pty from 'node-pty';
import fsRoutes from './routes/fs';
import systemRoutes from './routes/system';
import appRoutes from './routes/apps';
import packagesRoutes from './routes/packages';
import notesRoutes from './routes/notes';
import containersRoutes from './routes/containers';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Enhanced CORS configuration
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Enhanced WebSocket handling with security
wss.on('connection', (ws, req) => {
    // Basic origin validation - allow any origin for development
    const origin = req.headers.origin;
    console.log('WebSocket connection from:', origin);
    console.log('WebSocket URL:', req.url);
    console.log('Headers:', req.headers);

    console.log('Client connected from:', origin);

    // Rate limiting
    const lastCommandTime = new Map();
    const COMMAND_RATE_LIMIT = 10; // commands per second
    const COMMAND_WINDOW = 1000; // 1 second window

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    
    let ptyProcess;
    try {
        ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME || process.cwd(),
            env: {
                ...process.env,
                TERM: 'xterm-256color'
            }
        });
        console.log('PTY process created successfully');
    } catch (error) {
        console.error('Failed to create PTY process:', error);
        ws.close(1011, 'Failed to create terminal process');
        return;
    }

    ptyProcess.onData(data => {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        } catch (error) {
            console.error('Error sending data to WebSocket:', error);
        }
    });

    ws.on('message', (message) => {
        // Rate limiting check
        const now = Date.now();
        const lastTime = lastCommandTime.get(ws) || 0;
        
        if (now - lastTime < COMMAND_WINDOW / COMMAND_RATE_LIMIT) {
            ws.send('\r\n\x1b[31mRate limit exceeded. Please slow down.\x1b[0m');
            return;
        }
        
        lastCommandTime.set(ws, now);

        try {
            // Limit message length for security (but keep control characters for terminal)
            const input = message.toString().substring(0, 1000);
            ptyProcess.write(input);
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send('\r\n\x1b[31mError processing command\x1b[0m');
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`Client disconnected: ${code} - ${reason}`);
        lastCommandTime.delete(ws);
        
        try {
            ptyProcess.kill();
        } catch (error) {
            console.error('Error killing PTY process:', error);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`Pty process exited with code ${exitCode} and signal ${signal}`);
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(`\r\n\x1b[33mProcess exited: ${exitCode || signal}\x1b[0m`);
        }
    });

    // Cleanup on interval
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [clientWs, lastTime] of lastCommandTime.entries()) {
            if (now - lastTime > 60000) { // 1 minute timeout
                lastCommandTime.delete(clientWs);
            }
        }
    }, 30000); // Check every 30 seconds

    ws.on('close', () => {
        clearInterval(cleanupInterval);
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
