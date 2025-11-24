import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import os from 'os';
import * as nodePty from 'node-pty';
import fsRoutes from './routes/fs';
import systemRoutes from './routes/system';
import appRoutes from './routes/apps';
import packagesRoutes from './routes/packages';
import notesRoutes from './routes/notes';
import containersRoutes from './routes/containers';
import vncRoutes from './routes/vnc';
import controlPanelRoutes from './routes/control-panel';
import nginxProxyRoutes from './routes/nginx-proxy';
import sharesRoutes from './routes/shares';
import comprehensiveSettingsRoutes from './routes/comprehensive-settings';
import marketplaceRoutes from './routes/marketplace';
import fileServersRoutes from './routes/file-servers';
import systemMonitoringRoutes from './routes/system-monitoring';
import aiIntegrationRoutes from './routes/ai-integration';
import smartStorageRoutes from './routes/smart-storage';
import aiModelManagerRoutes from './routes/ai-model-manager';
import storagePoolsRoutes from './routes/storage-pools';
import wifiManagementRoutes from './routes/wifi-management';
import homeAssistantRoutes from './routes/home-assistant';
import powerManagementRoutes from './routes/power-management';
import mediaServerRoutes from './routes/media-server';
import fileMetadataRoutes from './routes/file-metadata';
import monitoringRoutes from './routes/monitoring';
import rdpRoutes from './routes/rdp';
import environmentConfigRoutes from './routes/environment-config';

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
app.use((_req, res, next) => {
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
app.use('/api/vnc', vncRoutes);
app.use('/api/control-panel', controlPanelRoutes);
app.use('/api/nginx-proxy', nginxProxyRoutes);
app.use('/api/shares', sharesRoutes);
app.use('/api/comprehensive-settings', comprehensiveSettingsRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/file-servers', fileServersRoutes);
app.use('/api/system-monitoring', systemMonitoringRoutes);
app.use('/api/ai-integration', aiIntegrationRoutes);
app.use('/api/smart-storage', smartStorageRoutes);
app.use('/api/ai-model-manager', aiModelManagerRoutes);
app.use('/api/storage-pools', storagePoolsRoutes);
app.use('/api/wifi-management', wifiManagementRoutes);
app.use('/api/home-assistant', homeAssistantRoutes);
app.use('/api/power-management', powerManagementRoutes);
app.use('/api/media-server', mediaServerRoutes);
app.use('/api/file-metadata', fileMetadataRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/rdp', rdpRoutes);
app.use('/api/environment-config', environmentConfigRoutes);

// Serve installed marketplace apps
app.use('/apps', express.static(path.join(process.env.HOME || '', '.web-desktop', 'marketplace', 'apps')));

// Enhanced rate limiting with per-IP tracking
const clientRateLimits = new Map<string, { lastCommandTime: number; commandCount: number; windowStart: number }>();
const COMMAND_RATE_LIMIT = 10; // commands per second
const COMMAND_WINDOW = 1000; // 1 second window
const CLEANUP_INTERVAL = 60000; // 1 minute cleanup interval

// Extract client IP from request, handling proxies and IPv6
const getClientIP = (req: any): string => {
    // Try various headers that might contain the real IP
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const cfConnectingIP = req.headers['cf-connecting-ip']; // Cloudflare

    if (forwardedFor) {
        // X-Forwarded-For can contain multiple IPs, take the first one
        return forwardedFor.split(',')[0].trim();
    }

    if (realIP) {
        return realIP;
    }

    if (cfConnectingIP) {
        return cfConnectingIP;
    }

    // Fallback to connection remoteAddress
    if (req.socket && req.socket.remoteAddress) {
        // Handle IPv6-mapped IPv4 addresses (::ffff:192.168.1.1)
        return req.socket.remoteAddress.replace(/^::ffff:/, '');
    }

    return 'unknown';
};

// Enhanced rate limiting with per-IP tracking
const checkRateLimit = (clientIP: string): { allowed: boolean; retryAfter?: number } => {
    const now = Date.now();
    const rateLimitData = clientRateLimits.get(clientIP);

    if (!rateLimitData) {
        // First request from this IP
        clientRateLimits.set(clientIP, {
            lastCommandTime: now,
            commandCount: 1,
            windowStart: now
        });
        return { allowed: true };
    }

    // Check if we need to reset the window
    if (now - rateLimitData.windowStart >= COMMAND_WINDOW) {
        rateLimitData.commandCount = 0;
        rateLimitData.windowStart = now;
    }

    // Check rate limit
    if (rateLimitData.commandCount >= COMMAND_RATE_LIMIT) {
        const timeUntilReset = COMMAND_WINDOW - (now - rateLimitData.windowStart);
        return {
            allowed: false,
            retryAfter: Math.ceil(timeUntilReset / 1000)
        };
    }

    // Update rate limit data
    rateLimitData.commandCount++;
    rateLimitData.lastCommandTime = now;

    return { allowed: true };
};

// Cleanup old rate limit entries
const cleanupRateLimits = (): void => {
    const now = Date.now();
    const cutoffTime = now - CLEANUP_INTERVAL;

    for (const [ip, data] of clientRateLimits.entries()) {
        if (data.lastCommandTime < cutoffTime) {
            clientRateLimits.delete(ip);
        }
    }
};

// Set up periodic cleanup
setInterval(cleanupRateLimits, CLEANUP_INTERVAL);

// Enhanced WebSocket handling with security and improved timeout management
wss.on('connection', (ws, req) => {
    // Basic origin validation - allow any origin for development
    const origin = req.headers.origin;
    const clientIP = getClientIP(req);
    const connectionId = `${clientIP}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`WebSocket connection from: ${origin} (ID: ${connectionId})`);
    console.log('Client IP:', clientIP);
    console.log('WebSocket URL:', req.url);
    console.log('Headers:', req.headers);

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

    // Connection management variables
    let isCleanup = false;
    let heartbeatTimeout: NodeJS.Timeout | null = null;
    let ptyProcess: nodePty.IPty | null = null;

    // Heartbeat mechanism - detect stale connections
    const startHeartbeat = () => {
        if (heartbeatTimeout) {
            clearTimeout(heartbeatTimeout);
        }

        heartbeatTimeout = setTimeout(() => {
            console.log(`Connection timeout for ${connectionId}, closing...`);
            if (ws.readyState === ws.OPEN) {
                ws.close(1000, 'Connection timeout - no activity');
            }
        }, 60000); // 1 minute timeout without activity
    };

    const resetHeartbeat = () => {
        startHeartbeat();
    };

    try {
        ptyProcess = nodePty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME || process.cwd(),
            env: {
                ...process.env,
                TERM: 'xterm-256color'
            }
        });
        console.log(`PTY process created successfully for ${connectionId}`);
        resetHeartbeat(); // Start heartbeat timer
    } catch (error) {
        console.error(`Failed to create PTY process for ${connectionId}:`, error);
        ws.close(1011, 'Failed to create terminal process');
        return;
    }

    // PTY data handler with error protection
    ptyProcess.onData(data => {
        try {
            if (ws.readyState === ws.OPEN && !isCleanup) {
                ws.send(data);
                resetHeartbeat(); // Reset heartbeat on activity
            }
        } catch (error) {
            console.error(`Error sending data to WebSocket (${connectionId}):`, error);
            // Don't close connection on send error, let heartbeat handle it
        }
    });

    // WebSocket message handler with enhanced security
    ws.on('message', (message) => {
        if (isCleanup) return;

        // Reset heartbeat on any message
        resetHeartbeat();

        // Rate limiting check (per-IP)
        const rateLimitResult = checkRateLimit(clientIP);

        if (!rateLimitResult.allowed) {
            const waitTime = rateLimitResult.retryAfter || 1;
            try {
                ws.send(`\r\n\x1b[31mRate limit exceeded (${clientIP}). Please wait ${waitTime}s.\x1b[0m`);
            } catch (error) {
                console.error(`Failed to send rate limit message to ${connectionId}:`, error);
            }
            return;
        }

        try {
            const input = message.toString();

            // Handle heartbeat ping from client
            if (input === '\x00') {
                // Respond with pong
                if (ws.readyState === ws.OPEN) {
                    ws.send('\x00');
                }
                return;
            }

            // Limit message length for security (but keep control characters for terminal)
            const sanitizedInput = input.substring(0, 1000);
            ptyProcess?.write(sanitizedInput);
        } catch (error) {
            console.error(`Error processing message from ${connectionId}:`, error);
            try {
                ws.send('\r\n\x1b[31mError processing command\x1b[0m');
            } catch (sendError) {
                console.error(`Failed to send error message to ${connectionId}:`, sendError);
            }
        }
    });

    // PTY exit handler
    ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`PTY process exited for ${connectionId} with code ${exitCode} and signal ${signal}`);
        if (ws.readyState === ws.OPEN && !isCleanup) {
            try {
                ws.send(`\r\n\x1b[33mProcess exited: ${exitCode || signal}\x1b[0m\r\n`);
            } catch (error) {
                console.error(`Failed to send exit message to ${connectionId}:`, error);
            }
        }
        // Don't cleanup here - let WebSocket close handle it
    });

    // Enhanced consolidated cleanup function
    const performCleanup = (reason?: string) => {
        if (isCleanup) return; // Prevent multiple cleanups
        isCleanup = true;

        console.log(`Performing WebSocket cleanup for ${connectionId}${reason ? ` (${reason})` : ''}...`);

        // Clear heartbeat timeout
        if (heartbeatTimeout) {
            clearTimeout(heartbeatTimeout);
            heartbeatTimeout = null;
        }

        // Kill the PTY process if it's still running
        if (ptyProcess && typeof ptyProcess.kill === 'function') {
            try {
                // Try graceful shutdown first
                ptyProcess.kill('SIGTERM');

                // Force kill after 3 seconds if still running
                setTimeout(() => {
                    if (ptyProcess && typeof ptyProcess.kill === 'function') {
                        try {
                            ptyProcess.kill('SIGKILL');
                        } catch (error) {
                            console.error(`Error force-killing PTY process for ${connectionId}:`, error);
                        }
                    }
                }, 3000);

                console.log(`PTY process termination initiated for ${connectionId}`);
            } catch (error) {
                console.error(`Error killing PTY process during cleanup for ${connectionId}:`, error);
            }
        }

        ptyProcess = null;

        // Set a timeout for force cleanup if needed
        setTimeout(() => {
            console.log(`WebSocket cleanup completed for ${connectionId}`);
        }, 100);
    };

    // WebSocket close handler with enhanced cleanup
    ws.on('close', (code, reason) => {
        console.log(`Client disconnected (${connectionId}): ${code} - ${reason}`);
        performCleanup('WebSocket closed');
    });

    // WebSocket error handler with enhanced cleanup
    ws.on('error', (error) => {
        console.error(`WebSocket error (${connectionId}):`, error);
        performCleanup('WebSocket error');
    });

    // WebSocket pong handler (for built-in WebSocket ping/pong)
    ws.on('pong', () => {
        resetHeartbeat(); // Reset heartbeat on pong response
    });

    // Send initial connection message
    try {
        ws.send('\x1b[32mTerminal connection established.\x1b[0m\r\n');
    } catch (error) {
        console.error(`Failed to send welcome message to ${connectionId}:`, error);
    }
});

// WebSocket server-level heartbeat and cleanup
const serverHeartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            // Send ping to check if connection is still alive
            ws.ping();
        }
    });
}, 30000); // Ping every 30 seconds

// Graceful shutdown handler
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    clearInterval(serverHeartbeatInterval);

    // Close all WebSocket connections
    wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.close(1001, 'Server shutting down');
        }
    });

    // Close the server
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('WebSocket terminal endpoint available on the same port');
});
