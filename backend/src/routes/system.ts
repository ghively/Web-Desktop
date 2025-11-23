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

router.post('/command', async (req, res) => {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Command is required' });
    }

    try {
        const { stdout, stderr } = await execAsync(command); // Use execAsync

        res.json({
            success: true,
            stdout,
            stderr
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
            stdout: error.stdout, // Sometimes stderr is in stdout for errors
            stderr: error.stderr
        });
    }
});

export default router;
