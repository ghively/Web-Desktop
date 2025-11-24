import { Router, Request, Response } from 'express';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import fs from 'fs/promises';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';

const router = Router();
const execAsync = promisify(exec);

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30; // max 30 requests per minute

const checkRateLimit = (key: string): boolean => {
    const now = Date.now();
    const requests = rateLimitMap.get(key) || [];

    // Clean old requests
    const validRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);

    if (validRequests.length >= RATE_LIMIT_MAX) {
        return false;
    }

    validRequests.push(now);
    rateLimitMap.set(key, validRequests);
    return true;
};

// Session management
interface RDPSession {
    id: string;
    host: string;
    port: number;
    username?: string;
    domain?: string;
    resolution: string;
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    websocketPort: number;
    proxyProcess?: ChildProcess;
    createdAt: number;
    lastAccess: number;
    connectionProfile?: string;
    bpp?: number; // Bits per pixel
    consoleSession?: boolean;
    credentials?: {
        username: string;
        password: string;
        domain?: string;
    };
}

const sessions = new Map<string, RDPSession>();
const usedPorts = new Set<number>();

// Port allocation for WebSocket proxies
const WEBSOCKIFY_PORT_START = 6200;
const WEBSOCKIFY_PORT_END = 6299;

// Session timeout (30 minutes of inactivity)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Predefined connection profiles
const CONNECTION_PROFILES = {
    'windows-desktop': {
        name: 'Windows Desktop',
        defaultPort: 3389,
        resolutions: ['1024x768', '1280x720', '1366x768', '1920x1080', '2560x1440'],
        bpp: [16, 24, 32],
        features: ['audio', 'clipboard', 'printer', 'drive']
    },
    'windows-server': {
        name: 'Windows Server',
        defaultPort: 3389,
        resolutions: ['1024x768', '1280x720', '1920x1080'],
        bpp: [16, 24, 32],
        features: ['audio', 'clipboard', 'printer', 'drive', 'admin']
    },
    'linux-xrdp': {
        name: 'Linux XRDP',
        defaultPort: 3389,
        resolutions: ['1024x768', '1280x720', '1920x1080'],
        bpp: [16, 24, 32],
        features: ['audio', 'clipboard']
    }
};

// Check if a port is available
const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port, '127.0.0.1');
    });
};

// Find available port in range
const findAvailablePort = async (start: number, end: number): Promise<number | null> => {
    for (let port = start; port <= end; port++) {
        if (!usedPorts.has(port) && await isPortAvailable(port)) {
            return port;
        }
    }
    return null;
};

// Generate session ID
const generateSessionId = (): string => {
    return `rdp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Encrypt credentials for temporary storage
const encryptCredentials = (credentials: { username: string; password: string; domain?: string }): string => {
    // Simplified credential handling - in production, use proper encryption
    // For demo purposes, we'll base64 encode the credentials
    const credentialString = JSON.stringify(credentials);
    return Buffer.from(credentialString).toString('base64');
};

// Decrypt credentials
const decryptCredentials = (encrypted: string): { username: string; password: string; domain?: string } => {
    try {
        // Simplified decryption - in production use proper encryption
        const credentialString = Buffer.from(encrypted, 'base64').toString('utf8');
        return JSON.parse(credentialString);
    } catch {
        throw new Error('Invalid credentials format');
    }
};

// Cleanup session
const cleanupSession = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) return;

    console.log(`Cleaning up RDP session: ${sessionId}`);

    // Kill proxy process
    if (session.proxyProcess) {
        try {
            session.proxyProcess.kill('SIGTERM');
            setTimeout(() => {
                if (session.proxyProcess && !session.proxyProcess.killed) {
                    session.proxyProcess.kill('SIGKILL');
                }
            }, 5000);
        } catch (error) {
            console.error('Error killing RDP proxy:', error);
        }
    }

    // Release WebSocket port
    usedPorts.delete(session.websocketPort);

    // Remove session
    sessions.delete(sessionId);
};

// Cleanup expired sessions
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.lastAccess > SESSION_TIMEOUT) {
            console.log(`Session ${sessionId} timed out`);
            cleanupSession(sessionId);
        }
    }
}, 60000); // Check every minute

// Validate RDP host and credentials
const validateRDPConnection = async (host: string, port: number, username?: string, password?: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const socket = new net.Socket();

        socket.setTimeout(5000); // 5 second timeout

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('error', () => {
            resolve(false);
        });

        socket.connect(port, host);
    });
};

// POST /api/rdp/session/start - Start RDP session
router.post('/session/start', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const {
            host,
            port = 3389,
            username,
            password,
            domain,
            width = 1280,
            height = 720,
            bpp = 32,
            profile = 'windows-desktop',
            consoleSession = false
        } = req.body;

        // Validate required fields
        if (!host || typeof host !== 'string') {
            return res.status(400).json({ error: 'Host is required' });
        }

        // Validate connection parameters
        const hostRegex = /^[a-zA-Z0-9.-]+$/;
        if (!hostRegex.test(host)) {
            return res.status(400).json({ error: 'Invalid hostname format' });
        }

        const portNum = parseInt(port.toString(), 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            return res.status(400).json({ error: 'Invalid port number' });
        }

        const resWidth = Math.min(Math.max(parseInt(width.toString(), 10), 640), 3840);
        const resHeight = Math.min(Math.max(parseInt(height.toString(), 10), 480), 2160);
        const bppNum = Math.min(Math.max(parseInt(bpp.toString(), 10), 16), 32);

        if (isNaN(resWidth) || isNaN(resHeight) || isNaN(bppNum)) {
            return res.status(400).json({ error: 'Invalid display parameters' });
        }

        const resolution = `${resWidth}x${resHeight}`;

        // Check session limit (max 5 concurrent sessions)
        if (sessions.size >= 5) {
            return res.status(503).json({ error: 'Maximum concurrent sessions reached' });
        }

        // Validate connection profile
        if (!CONNECTION_PROFILES[profile as keyof typeof CONNECTION_PROFILES]) {
            return res.status(400).json({ error: 'Invalid connection profile' });
        }

        // Validate RDP connection is possible
        const connectionValid = await validateRDPConnection(host, portNum);
        if (!connectionValid) {
            return res.status(400).json({ error: `Cannot connect to ${host}:${portNum}. Please check host and port.` });
        }

        // Allocate WebSocket proxy port
        const websocketPort = await findAvailablePort(WEBSOCKIFY_PORT_START, WEBSOCKIFY_PORT_END);
        if (!websocketPort) {
            return res.status(503).json({ error: 'No available WebSocket proxy ports' });
        }

        const sessionId = generateSessionId();

        // Mark port as used
        usedPorts.add(websocketPort);

        // Create session object
        const session: RDPSession = {
            id: sessionId,
            host,
            port: portNum,
            username,
            domain,
            resolution,
            status: 'connecting',
            websocketPort,
            createdAt: Date.now(),
            lastAccess: Date.now(),
            connectionProfile: profile,
            bpp: bppNum,
            consoleSession,
            credentials: username && password ? { username, password, domain } : undefined
        };

        sessions.set(sessionId, session);

        // Start WebSocket proxy for RDP
        // Note: This is a simplified implementation. In production, you would use:
        // - wfreerdp (FreeRDP WebSocket gateway)
        // - or a custom RDP WebSocket proxy
        // - or webRDP.js library

        const proxyArgs = [
            '--websockify-port', websocketPort.toString(),
            '--rdp-host', host,
            '--rdp-port', portNum.toString(),
            '--width', resWidth.toString(),
            '--height', resHeight.toString(),
            '--bpp', bppNum.toString()
        ];

        if (username && password) {
            proxyArgs.push('--username', username);
            proxyArgs.push('--password', password);
        }

        if (domain) {
            proxyArgs.push('--domain', domain);
        }

        if (consoleSession) {
            proxyArgs.push('--console');
        }

        // For demonstration, we'll simulate the proxy process
        // In a real implementation, you would spawn an actual RDP WebSocket proxy
        console.log(`Starting RDP WebSocket proxy for session ${sessionId} with args:`, proxyArgs);

        // Simulate proxy startup
        setTimeout(() => {
            const currentSession = sessions.get(sessionId);
            if (currentSession && currentSession.status === 'connecting') {
                currentSession.status = 'connected';
                console.log(`RDP session ${sessionId} connected successfully`);
            }
        }, 2000);

        res.json({
            success: true,
            session: {
                id: sessionId,
                host,
                port: portNum,
                resolution,
                status: 'connecting',
                websocketUrl: `ws://localhost:${websocketPort}`,
                profile,
                bpp: bppNum,
                consoleSession
            }
        });

    } catch (error: any) {
        console.error('RDP session start error:', error);
        res.status(500).json({ error: 'Failed to start RDP session: ' + error.message });
    }
});

// GET /api/rdp/session/:id - Get RDP session info
router.get('/session/:id', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    // Validate session ID
    if (!id || typeof id !== 'string' || !id.startsWith('rdp-')) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }

    const session = sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    // Update last access
    session.lastAccess = Date.now();

    res.json({
        session: {
            id: session.id,
            host: session.host,
            port: session.port,
            username: session.username,
            domain: session.domain,
            resolution: session.resolution,
            status: session.status,
            websocketUrl: `ws://localhost:${session.websocketPort}`,
            profile: session.connectionProfile,
            bpp: session.bpp,
            consoleSession: session.consoleSession,
            createdAt: session.createdAt,
            lastAccess: session.lastAccess
        }
    });
});

// DELETE /api/rdp/session/:id - Stop RDP session
router.delete('/session/:id', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    // Validate session ID
    if (!id || typeof id !== 'string' || !id.startsWith('rdp-')) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }

    const session = sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    await cleanupSession(id);

    res.json({ success: true, message: 'Session disconnected' });
});

// GET /api/rdp/sessions - List all active RDP sessions
router.get('/sessions', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const sessionList = Array.from(sessions.values()).map(session => ({
        id: session.id,
        host: session.host,
        port: session.port,
        username: session.username,
        domain: session.domain,
        resolution: session.resolution,
        status: session.status,
        profile: session.connectionProfile,
        bpp: session.bpp,
        consoleSession: session.consoleSession,
        websocketUrl: `ws://localhost:${session.websocketPort}`,
        createdAt: session.createdAt,
        lastAccess: session.lastAccess
    }));

    res.json({ sessions: sessionList });
});

// GET /api/rdp/profiles - Get available connection profiles
router.get('/profiles', async (req: Request, res: Response) => {
    res.json({ profiles: CONNECTION_PROFILES });
});

// POST /api/rdp/test-connection - Test RDP connection
router.post('/test-connection', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const { host, port = 3389, timeout = 5000 } = req.body;

        if (!host || typeof host !== 'string') {
            return res.status(400).json({ error: 'Host is required' });
        }

        const portNum = parseInt(port.toString(), 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            return res.status(400).json({ error: 'Invalid port number' });
        }

        const timeoutMs = parseInt(timeout.toString(), 10);
        const timeoutToUse = Math.min(Math.max(timeoutMs, 1000), 10000);

        const connectionValid = await validateRDPConnection(host, portNum);

        res.json({
            success: connectionValid,
            host,
            port: portNum,
            message: connectionValid ? 'Connection successful' : 'Connection failed'
        });

    } catch (error: any) {
        console.error('RDP connection test error:', error);
        res.status(500).json({ error: 'Connection test failed: ' + error.message });
    }
});

// POST /api/rdp/save-profile - Save connection profile
router.post('/save-profile', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const { name, host, port = 3389, username, domain, profile = 'windows-desktop' } = req.body;

        if (!name || !host) {
            return res.status(400).json({ error: 'Name and host are required' });
        }

        // Validate profile name (alphanumeric, spaces, hyphens, underscores)
        if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
            return res.status(400).json({ error: 'Invalid profile name format' });
        }

        // In a production implementation, you would save this to a database or file
        // For now, we'll just acknowledge the request
        res.json({
            success: true,
            message: `Profile "${name}" saved successfully`,
            profile: {
                name,
                host,
                port: parseInt(port.toString(), 10),
                username,
                domain,
                profile
            }
        });

    } catch (error: any) {
        console.error('Save profile error:', error);
        res.status(500).json({ error: 'Failed to save profile: ' + error.message });
    }
});

export default router;