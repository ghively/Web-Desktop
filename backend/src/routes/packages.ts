import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = Router();
const execAsync = promisify(exec);

// Check if running with sufficient privileges
const checkPrivileges = async () => {
    try {
        await execAsync('which apt-get');
        return true;
    } catch {
        return false;
    }
};

// GET /api/packages/installed - List installed packages
router.get('/installed', async (req: Request, res: Response) => {
    try {
        // List installed GUI applications (those with .desktop files)
        const { stdout } = await execAsync('find /usr/share/applications -name "*.desktop" 2>/dev/null || echo ""');

        const apps = stdout.split('\n')
            .filter(line => line.trim())
            .map(filepath => {
                const name = filepath.split('/').pop()?.replace('.desktop', '') || 'Unknown';
                return { name, filepath };
            });

        res.json({ apps });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/packages/install - Install a package
router.post('/install', async (req: Request, res: Response) => {
    const { packageName } = req.body;

    if (!packageName || typeof packageName !== 'string') {
        return res.status(400).json({ error: 'Package name is required' });
    }

    // Validate package name (alphanumeric, hyphens, dots only)
    if (!/^[a-z0-9.-]+$/.test(packageName)) {
        return res.status(400).json({ error: 'Invalid package name format' });
    }

    try {
        // Note: This requires the backend to run with sudo or have passwordless sudo configured
        // In production, you'd use PolicyKit or a separate privileged service
        const { stdout, stderr } = await execAsync(`sudo apt-get install -y ${packageName}`);

        res.json({
            success: true,
            message: `Package ${packageName} installed successfully`,
            output: stdout
        });
    } catch (error: any) {
        res.status(500).json({
            error: error.message,
            stderr: error.stderr
        });
    }
});

// DELETE /api/packages/:packageName - Uninstall a package
router.delete('/:packageName', async (req: Request, res: Response) => {
    const { packageName } = req.params;

    if (!/^[a-z0-9.-]+$/.test(packageName)) {
        return res.status(400).json({ error: 'Invalid package name format' });
    }

    try {
        const { stdout } = await execAsync(`sudo apt-get remove -y ${packageName}`);

        res.json({
            success: true,
            message: `Package ${packageName} removed successfully`,
            output: stdout
        });
    } catch (error: any) {
        res.status(500).json({
            error: error.message,
            stderr: error.stderr
        });
    }
});

// GET /api/packages/search?q=firefox - Search for packages
router.get('/search', async (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const { stdout } = await execAsync(`apt-cache search ${query} | head -20`);

        const packages = stdout.split('\n')
            .filter(line => line.trim())
            .map(line => {
                const [name, ...descParts] = line.split(' - ');
                return {
                    name: name?.trim(),
                    description: descParts.join(' - ').trim()
                };
            });

        res.json({ packages });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
