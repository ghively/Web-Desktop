import { Router, Request, Response } from 'express';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import fs from 'fs/promises'; // Added for file operations
import crypto from 'crypto'; // Added for secure password generation
import os from 'os'; // Added for os.tmpdir()
import path from 'path'; // Added for path.join()

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
interface VNCSession {
    id: string;
    display: number;
    vncPort: number;
    websockifyPort: number;
    resolution: string;
    status: 'starting' | 'running' | 'stopped' | 'error';
    vncProcess?: ChildProcess;
    websockifyProcess?: ChildProcess;
    xvfbProcess?: ChildProcess;
    createdAt: number;
    lastAccess: number;
    vncPassword?: string; // Added for VNC password
    vncPasswordFilePath?: string; // Added for temporary password file path
    apps?: Set<ChildProcess>;
}

const sessions = new Map<string, VNCSession>();
const usedPorts = new Set<number>();
const usedDisplays = new Set<number>();

// Port allocation
const VNC_PORT_START = 5900;
const VNC_PORT_END = 5999;
const WEBSOCKIFY_PORT_START = 6080;
const WEBSOCKIFY_PORT_END = 6179;
const DISPLAY_START = 99;
const DISPLAY_END = 199;

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

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

// Find available display
const findAvailableDisplay = (): number | null => {
    for (let display = DISPLAY_START; display <= DISPLAY_END; display++) {
        if (!usedDisplays.has(display)) {
            return display;
        }
    }
    return null;
};

// Generate session ID
const generateSessionId = (): string => {
    return `vnc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Cleanup session
const generateRandomPassword = (length: number = 10): string => {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

const cleanupSession = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) return;

    console.log(`Cleaning up VNC session: ${sessionId}`);

    // Kill processes
    if (session.websockifyProcess) {
        try {
            session.websockifyProcess.kill('SIGTERM');
            setTimeout(() => {
                if (session.websockifyProcess && !session.websockifyProcess.killed) {
                    session.websockifyProcess.kill('SIGKILL');
                }
            }, 5000);
        } catch (error) {
            console.error('Error killing websockify:', error);
        }
    }

    if (session.vncProcess) {
        try {
            session.vncProcess.kill('SIGTERM');
            setTimeout(() => {
                if (session.vncProcess && !session.vncProcess.killed) {
                    session.vncProcess.kill('SIGKILL');
                }
            }, 5000);
        } catch (error) {
            console.error('Error killing VNC server:', error);
        }
    }

    if (session.xvfbProcess) {
        try {
            session.xvfbProcess.kill('SIGTERM');
            setTimeout(() => {
                if (session.xvfbProcess && !session.xvfbProcess.killed) {
                    session.xvfbProcess.kill('SIGKILL');
                }
            }, 5000);
        } catch (error) {
            console.error('Error killing Xvfb:', error);
        }
    }

    // Kill apps
    if (session.apps) {
        for (const app of Array.from(session.apps)) {
            try {
                app.kill('SIGTERM');
                setTimeout(() => {
                    if (!app.killed) {
                        app.kill('SIGKILL');
                    }
                }, 5000);
            } catch (error) {
                console.error('Error killing app:', error);
            }
        }
        session.apps.clear();
    }

    // Delete VNC password file
    if (session.vncPasswordFilePath) {
        try {
            await fs.unlink(session.vncPasswordFilePath);
        } catch (error) {
            console.error(`Error deleting VNC password file ${session.vncPasswordFilePath}:`, error);
        }
    }

    // Release resources
    usedPorts.delete(session.vncPort);
    usedPorts.delete(session.websockifyPort);
    usedDisplays.delete(session.display);

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

// POST /api/vnc/session/start - Start VNC session
router.post('/session/start', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const { width = 1280, height = 720 } = req.body;

        // Validate resolution
        const resWidth = Math.min(Math.max(parseInt(width, 10), 640), 3840);
        const resHeight = Math.min(Math.max(parseInt(height, 10), 480), 2160);

        if (isNaN(resWidth) || isNaN(resHeight)) {
            return res.status(400).json({ error: 'Invalid resolution parameters' });
        }

        const resolution = `${resWidth}x${resHeight}`;

        // Check session limit (max 5 concurrent sessions)
        if (sessions.size >= 5) {
            return res.status(503).json({ error: 'Maximum concurrent sessions reached' });
        }

        // Allocate resources
        const display = findAvailableDisplay();
        const vncPort = await findAvailablePort(VNC_PORT_START, VNC_PORT_END);
        const websockifyPort = await findAvailablePort(WEBSOCKIFY_PORT_START, WEBSOCKIFY_PORT_END);

        if (!display || !vncPort || !websockifyPort) {
            return res.status(503).json({ error: 'No available resources for new session' });
        }

        const sessionId = generateSessionId();

        // Mark resources as used
        usedDisplays.add(display);
        usedPorts.add(vncPort);
        usedPorts.add(websockifyPort);

        // Create session object
        const session: VNCSession = {
            id: sessionId,
            display,
            vncPort,
            websockifyPort,
            resolution,
            status: 'starting',
            createdAt: Date.now(),
            lastAccess: Date.now()
        };

        sessions.set(sessionId, session);

        // Generate VNC password
        const vncPassword = generateRandomPassword(12);
        const vncPasswordFilePath = path.join(os.tmpdir(), `vnc_pass_${sessionId}.txt`);
        
        // Save password to file (plain text for now, x11vnc will hash it)
        await fs.writeFile(vncPasswordFilePath, vncPassword);

        // Run vncpasswd to hash the password for x11vnc
        await new Promise<void>((resolve, reject) => {
            const vncpasswdProcess = spawn('vncpasswd', [vncPasswordFilePath], { stdio: 'pipe' });
            vncpasswdProcess.stdin.write(`${vncPassword}\n`); // New password
            vncpasswdProcess.stdin.write(`${vncPassword}\n`); // Confirm new password
            vncpasswdProcess.stdin.end();

            vncpasswdProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`vncpasswd exited with code ${code}`));
                }
            });
            vncpasswdProcess.on('error', (err) => {
                reject(new Error(`Failed to spawn vncpasswd process: ${err.message}`));
            });
        });

        // Store password and file path in session
        session.vncPassword = vncPassword;
        session.vncPasswordFilePath = vncPasswordFilePath;

        // Start Xvfb (virtual framebuffer)
        const xvfbProcess = spawn('Xvfb', [
            `:${display}`,
            '-screen', '0', `${resolution}x24`,
            '-ac',
            '+extension', 'GLX',
            '+render',
            '-noreset'
        ], {
            detached: false,
            stdio: 'pipe'
        });

        session.xvfbProcess = xvfbProcess;

        xvfbProcess.on('error', (error) => {
            console.error(`Xvfb error for session ${sessionId}:`, error);
            session.status = 'error';
        });

        xvfbProcess.on('exit', (code, signal) => {
            console.log(`Xvfb exited for session ${sessionId}: ${code || signal}`);
        });

        // Wait for Xvfb to start
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Start x11vnc server
        const vncProcess = spawn('x11vnc', [
            '-display', `:${display}`,
            '-rfbport', vncPort.toString(),
            '-localhost',
            '-rfbauth', vncPasswordFilePath, // Use the generated password file
            '-once',
            '-shared',
            '-bg',
            '-forever',
            '-noxdamage'
        ], {
            detached: false,
            stdio: 'pipe',
            env: {
                ...process.env,
                DISPLAY: `:${display}`
            }
        });

        session.vncProcess = vncProcess;

        vncProcess.on('error', (error) => {
            console.error(`x11vnc error for session ${sessionId}:`, error);
            session.status = 'error';
            cleanupSession(sessionId); // Clean up on VNC error
        });

        vncProcess.on('exit', (code, signal) => {
            console.log(`x11vnc exited for session ${sessionId}: ${code || signal}`);
            if (session.status === 'running') { // Only clean up if not already errored
                cleanupSession(sessionId);
            }
        });

        // Wait for VNC server to start
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Start websockify (WebSocket to VNC proxy)
        const websockifyProcess = spawn('websockify', [
            '--web=/usr/share/novnc',
            `${websockifyPort}`,
            `localhost:${vncPort}`
        ], {
            detached: false,
            stdio: 'pipe'
        });

        session.websockifyProcess = websockifyProcess;

        websockifyProcess.on('error', (error) => {
            console.error(`websockify error for session ${sessionId}:`, error);
            session.status = 'error';
            cleanupSession(sessionId); // Clean up on websockify error
        });

        websockifyProcess.on('exit', (code, signal) => {
            console.log(`websockify exited for session ${sessionId}: ${code || signal}`);
            if (session.status === 'running') { // Only clean up if not already errored
                cleanupSession(sessionId);
            }
        });

        // Wait for websockify to start
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify all processes are running
        if (session.status !== 'error') {
            session.status = 'running';
        }

        res.json({
            success: true,
            session: {
                id: sessionId,
                display,
                websockifyPort,
                resolution,
                status: session.status,
                websocketUrl: `ws://localhost:${session.websockifyPort}`,
                vncPassword: vncPassword // Return the password to the client
            }
        });

    } catch (error: any) {
        console.error('VNC session start error:', error);
        res.status(500).json({ error: 'Failed to start VNC session' });
    }
});

// GET /api/vnc/session/:id - Get VNC session info
router.get('/session/:id', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    // Validate session ID
    if (!id || typeof id !== 'string' || !id.startsWith('vnc-')) {
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
            display: session.display,
            websockifyPort: session.websockifyPort,
            resolution: session.resolution,
            status: session.status,
            websocketUrl: `ws://localhost:${session.websockifyPort}`,
            createdAt: session.createdAt,
            lastAccess: session.lastAccess
        }
    });
});

// DELETE /api/vnc/session/:id - Stop VNC session
router.delete('/session/:id', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    // Validate session ID
    if (!id || typeof id !== 'string' || !id.startsWith('vnc-')) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }

    const session = sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    await cleanupSession(id);

    res.json({ success: true, message: 'Session stopped' });
});

// POST /api/vnc/launch-app - Launch X11 app in VNC session
router.post('/launch-app', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const { sessionId, appCommand } = req.body;

        // Validate input
        if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('vnc-')) {
            return res.status(400).json({ error: 'Invalid session ID' });
        }

        if (!appCommand || typeof appCommand !== 'string') {
            return res.status(400).json({ error: 'Invalid app command' });
        }

        // Security: More restrictive validation for executable and arguments
        // Allow alphanumeric, underscore, hyphen, dot, forward slash. No spaces in executable path.
        const safeExecutablePattern = /^[a-zA-Z0-9_\-\/\.]+$/;
        // Allow alphanumeric, underscore, hyphen, dot, forward slash, and spaces for arguments (if quoted).
        // This is still quite permissive but avoids direct shell metacharacters.
        const safeArgumentPattern = /^[a-zA-Z0-9_\-\/\.\s\"\'\=\:\,]+$/; // Added quotes, colon, comma for flexibility

        const args = appCommand.split(/\s+/).filter(Boolean); // Split by one or more spaces
        if (args.length === 0) {
            return res.status(400).json({ error: 'App command cannot be empty' });
        }

        const executable = args[0];
        const executableArgs = args.slice(1);

        if (!safeExecutablePattern.test(executable)) {
            return res.status(400).json({ error: 'Invalid characters in executable path' });
        }

        for (const arg of executableArgs) {
            if (!safeArgumentPattern.test(arg)) {
                return res.status(400).json({ error: `Invalid characters in argument: "${arg}"` });
            }
        }
        
        const session = sessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (session.status !== 'running') {
            return res.status(400).json({ error: 'Session is not running' });
        }

        // Update last access
        session.lastAccess = Date.now();

        // Launch app in the X session directly without 'sh -c'
        const appProcess = spawn(executable, executableArgs, {
            detached: true,
            stdio: 'ignore',
            env: {
                ...process.env,
                DISPLAY: `:${session.display}`
            }
        });

        if (!session.apps) {
            session.apps = new Set();
        }
        session.apps!.add(appProcess);
        appProcess.on('exit', () => {
            session.apps?.delete(appProcess);
        });
        appProcess.unref();

        res.json({
            success: true,
            message: 'Application launched',
            sessionId: session.id
        });

    } catch (error: any) {
        console.error('App launch error:', error);
        res.status(500).json({ error: 'Failed to launch application' });
    }
});

// GET /api/vnc/sessions - List all active VNC sessions
router.get('/sessions', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const sessionList = Array.from(sessions.values()).map(session => ({
        id: session.id,
        display: session.display,
        websockifyPort: session.websockifyPort,
        resolution: session.resolution,
        status: session.status,
        websocketUrl: `ws://localhost:${session.websockifyPort}`,
        createdAt: session.createdAt,
        lastAccess: session.lastAccess
    }));

    res.json({ sessions: sessionList });
});

export default router;
