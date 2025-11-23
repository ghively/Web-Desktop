import { Router } from 'express';
import si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const router = Router();

router.get('/stats', async (req, res) => {
    try {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const os = await si.osInfo();

        res.json({
            cpu: Math.round(cpu.currentLoad),
            mem: {
                total: mem.total,
                used: mem.used,
                free: mem.free,
                percent: Math.round((mem.used / mem.total) * 100)
            },
            os: {
                platform: os.platform,
                distro: os.distro,
                release: os.release,
                hostname: os.hostname
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
});

// DANGEROUS: This endpoint allows arbitrary command execution and should be disabled or heavily restricted
router.post('/command', async (req, res) => {
    // TEMPORARY: Disable this dangerous endpoint entirely
    return res.status(403).json({
        error: 'Command execution endpoint disabled for security reasons'
    });

    /*
    // IF YOU MUST RE-ENABLE THIS, implement these security measures:

    const { command } = req.body;

    if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Command is required' });
    }

    // SECURITY: Whitelist approach - only allow specific safe commands
    const allowedCommands = [
        'whoami', 'date', 'uptime', 'uname', 'df', 'free', 'ps', 'top', 'htop',
        'ls', 'pwd', 'cat', 'head', 'tail', 'grep', 'find', 'which', 'whereis'
    ];

    const baseCommand = command.split(/\s+/)[0];

    if (!allowedCommands.includes(baseCommand)) {
        return res.status(403).json({
            error: 'Command not allowed',
            details: `${baseCommand} is not in the allowed commands list`
        });
    }

    // SECURITY: Sanitize command to prevent injection
    const sanitizedCommand = command
        .replace(/[;&|`$(){}[\]<>'"\\]/g, '') // Remove shell metacharacters
        .replace(/\.\./g, '') // Remove path traversal
        .trim()
        .substring(0, 200); // Limit length

    if (sanitizedCommand !== command) {
        return res.status(400).json({
            error: 'Invalid characters detected in command',
            details: 'Command contains disallowed characters'
        });
    }

    try {
        const { stdout, stderr } = await execAsync(sanitizedCommand, {
            timeout: 5000, // 5 second timeout
            maxBuffer: 1024 * 1024 // 1MB max output
        });

        res.json({
            success: true,
            stdout: stdout.substring(0, 10000), // Limit response size
            stderr: stderr.substring(0, 10000)
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
            stdout: error.stdout ? error.stdout.substring(0, 10000) : '',
            stderr: error.stderr ? error.stderr.substring(0, 10000) : ''
        });
    }
    */
});

// Root route for legacy frontend compatibility
router.get('/', async (req, res) => {
    try {
        const [cpu, mem, os] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.osInfo()
        ]);

        res.json({
            cpu: {
                currentLoad: Math.round(cpu.currentLoad)
            },
            mem: {
                total: mem.total,
                used: mem.used,
                free: mem.free
            },
            os: {
                platform: os.platform,
                distro: os.distro,
                release: os.release,
                hostname: os.hostname
            }
        });
    } catch (error: any) {
        console.error('System info error:', error);
        res.status(500).json({ error: 'Failed to fetch system information' });
    }
});

export default router;
