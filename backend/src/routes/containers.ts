import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = Router();
const execAsync = promisify(exec);

// GET /api/containers - List all containers
router.get('/', async (req: Request, res: Response) => {
    try {
        const { stdout } = await execAsync('docker ps -a --format "{{json .}}"');

        const lines = stdout.trim().split('\n').filter(line => line);
        const containers = lines.map(line => {
            const container = JSON.parse(line);
            return {
                id: container.ID,
                name: container.Names,
                image: container.Image,
                state: container.State,
                status: container.Status,
                ports: container.Ports
            };
        });

        res.json({ containers });
    } catch (error: any) {
        if (error.message.includes('command not found') || error.message.includes('not recognized')) {
            res.status(503).json({ error: 'Docker is not installed or not in PATH' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// POST /api/containers/:id/start - Start a container
router.post('/:id/start', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        await execAsync(`docker start ${id}`);
        res.json({ success: true, message: 'Container started' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/containers/:id/stop - Stop a container
router.post('/:id/stop', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        await execAsync(`docker stop ${id}`);
        res.json({ success: true, message: 'Container stopped' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/containers/:id/restart - Restart a container
router.post('/:id/restart', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        await execAsync(`docker restart ${id}`);
        res.json({ success: true, message: 'Container restarted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/containers/:id/logs - Get container logs
router.get('/:id/logs', async (req: Request, res: Response) => {
    const { id } = req.params;
    const lines = req.query.lines || '100';

    try {
        const { stdout } = await execAsync(`docker logs --tail ${lines} ${id}`);
        res.json({ logs: stdout });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
