import { Router } from 'express';
import { spawn } from 'child_process';

const router = Router();

// Sanitize argument values to prevent command injection
const sanitizeArgument = (arg: any): string | null => {
    if (typeof arg !== 'string') {
        return null;
    }

    // Remove null bytes, control characters, and shell metacharacters
    const sanitized = arg
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .replace(/[;&|`$(){}[\]<>'"\\]/g, ''); // Remove shell metacharacters

    // Check for path traversal attempts
    if (sanitized.includes('../') || sanitized.includes('..\\') || sanitized.includes('~/')) {
        return null;
    }

    // Limit argument length to prevent buffer overflow attacks
    if (sanitized.length > 1000) {
        return null;
    }

    return sanitized;
};

router.post('/launch', (req, res) => {
    const { command, args, vncSessionId } = req.body;

    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    // Validate command type
    if (typeof command !== 'string') {
        return res.status(400).json({ error: 'Invalid command type' });
    }

    // SECURITY: VNC Session validation (if provided)
    let targetDisplay = null;
    if (vncSessionId && typeof vncSessionId === 'string') {
        // SECURITY: Validate VNC session ID format
        if (!vncSessionId.startsWith('vnc-')) {
            return res.status(400).json({ error: 'Invalid VNC session ID format' });
        }

        // Extract display number from VNC session or use default virtual display
        // For security, always use virtual display for VNC sessions
        targetDisplay = ':99'; // Default virtual display for VNC sessions
        console.log(`SECURITY: VNC session provided, app will launch on virtual display ${targetDisplay}`);
    }

    console.log(`Launching: ${command} ${args ? args.join(' ') : ''} ${targetDisplay ? `on ${targetDisplay}` : ''}`);

    try {
        // Whitelist common desktop apps
        const allowedCommands = ['firefox', 'chromium', 'thunar', 'nautilus', 'gedit', 'code', 'vlc', 'mpv', 'gimp', 'inkscape', 'libreoffice'];

        // Additional validation: command must be alphanumeric and common separators only
        if (!/^[a-zA-Z0-9._-]+$/.test(command)) {
            return res.status(400).json({ error: 'Invalid command format' });
        }

        if (!allowedCommands.includes(command)) {
          return res.status(400).json({ error: 'Command not allowed' });
        }

        // Validate and sanitize arguments
        let sanitizedArgs: string[] = [];
        if (args) {
            if (!Array.isArray(args)) {
                return res.status(400).json({ error: 'Arguments must be an array' });
            }

            // Limit number of arguments to prevent argument overflow
            if (args.length > 20) {
                return res.status(400).json({ error: 'Too many arguments' });
            }

            for (const arg of args) {
                const sanitized = sanitizeArgument(arg);
                if (sanitized === null) {
                    return res.status(400).json({ error: 'Invalid argument detected' });
                }
                sanitizedArgs.push(sanitized);
            }
        }

        // SECURITY: Set up environment for virtual desktop display
        const env = { ...process.env };

        if (targetDisplay) {
            // SECURITY: Force the app to use the virtual display
            env.DISPLAY = targetDisplay;

            // SECURITY: Additional security measures for VNC session isolation
            // Set XAUTHORITY to prevent access to other X sessions
            env.XAUTHORITY = `${process.env.HOME || '/tmp'}/.Xauthority-${targetDisplay.replace(':', '')}`;

            // SECURITY: Limit accessibility to virtual session
            env.DESKTOP_SESSION = 'vnc-session';
            env.SESSION_TYPE = 'vnc';

            console.log(`SECURITY: App will launch on virtual display ${targetDisplay}`);
        } else {
            // SECURITY: If no VNC session provided, use a safe default or refuse
            // Option 1: Use a dedicated virtual display
            // env.DISPLAY = ':99';

            // Option 2: Refuse to launch without VNC session context (more secure)
            return res.status(400).json({
                error: 'VNC session required for app launch',
                details: 'Applications can only be launched within VNC sessions for security reasons'
            });
        }

        const subprocess = spawn(command, sanitizedArgs, {
            detached: true,
            stdio: 'ignore',
            env: env
        });

        subprocess.unref();

        subprocess.on('error', (err) => {
            console.error(`Failed to launch ${command}:`, err);
        });

        subprocess.on('exit', (code, signal) => {
            console.log(`App ${command} exited with code ${code}, signal ${signal}`);
        });

        res.json({
            success: true,
            pid: subprocess.pid,
            display: targetDisplay,
            message: `App launched on virtual display ${targetDisplay}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to launch application' });
    }
});

export default router;
