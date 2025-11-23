import { Router } from 'express';
import si from 'systeminformation';

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

export default router;
