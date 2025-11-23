import { Router } from 'express';
import { spawn } from 'child_process';

const router = Router();

router.post('/launch', (req, res) => {
    const { command, args } = req.body;

    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    console.log(`Launching: ${command} ${args ? args.join(' ') : ''}`);

    // TODO: Implement VNC/X11 forwarding logic here.
    // For now, we just spawn it on the host (which might open on the host's screen if DISPLAY is set).
    // In the real implementation, we would set DISPLAY=:99 etc.

    try {
        const subprocess = spawn(command, args || [], {
            detached: true,
            stdio: 'ignore'
        });

        subprocess.unref();

        res.json({ success: true, pid: subprocess.pid });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to launch application' });
    }
});

export default router;
