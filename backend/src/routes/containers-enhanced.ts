import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

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

// Enhanced container validation
const validateContainerId = (id: string): { valid: boolean; sanitizedId?: string; error?: string } => {
    if (!id || typeof id !== 'string') {
        return { valid: false, error: 'Container ID is required' };
    }

    const trimmedId = id.trim();

    if (trimmedId.length === 0) {
        return { valid: false, error: 'Container ID cannot be empty' };
    }

    if (trimmedId.length > 128) {
        return { valid: false, error: 'Container ID too long' };
    }

    // Allow Docker container IDs (hex) and container names (alphanumeric + limited special chars)
    const hexPattern = /^[a-f0-9]{12,64}$/i;
    const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

    if (hexPattern.test(trimmedId)) {
        return { valid: true, sanitizedId: trimmedId };
    }

    if (namePattern.test(trimmedId)) {
        const sanitizedId = trimmedId.replace(/(["'$`\\])/g, '\\$1');
        return { valid: true, sanitizedId: sanitizedId };
    }

    return { valid: false, error: 'Invalid container ID format. Must be a valid Docker container ID (hex) or name' };
};

// GET /api/containers-enhanced/images - List Docker images
router.get('/images', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const { stdout, stderr } = await execAsync('docker images --format "{{json .}}"', {
            timeout: 10000
        });

        if (stderr && stderr.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied. Docker requires sudo privileges.' });
        }

        const lines = stdout.trim().split('\n').filter(line => line);
        const images = lines.map(line => {
            try {
                const image = JSON.parse(line);
                return {
                    id: image.ID,
                    repository: image.Repository,
                    tag: image.Tag,
                    size: image.Size,
                    created: image.CreatedAt
                };
            } catch (parseError) {
                console.error('Failed to parse image JSON:', parseError);
                return null;
            }
        }).filter(image => image !== null);

        res.json({ images });
    } catch (error: any) {
        console.error('Container images listing error:', error);

        if (error.message.includes('command not found') || error.message.includes('not recognized')) {
            res.status(503).json({ error: 'Docker is not installed or not in PATH' });
        } else if (error.message.includes('permission denied')) {
            res.status(403).json({ error: 'Permission denied. Docker requires sudo privileges.' });
        } else if (error.code === 'ETIMEDOUT') {
            res.status(504).json({ error: 'Docker command timed out' });
        } else {
            res.status(500).json({ error: 'Failed to list container images' });
        }
    }
});

// GET /api/containers-enhanced/networks - List Docker networks
router.get('/networks', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const { stdout, stderr } = await execAsync('docker network ls --format "{{json .}}"', {
            timeout: 10000
        });

        if (stderr && stderr.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied. Docker requires sudo privileges.' });
        }

        const lines = stdout.trim().split('\n').filter(line => line);
        const networks = lines.map(line => {
            try {
                const network = JSON.parse(line);
                return {
                    id: network.ID,
                    name: network.Name,
                    driver: network.Driver,
                    scope: network.Scope
                };
            } catch (parseError) {
                console.error('Failed to parse network JSON:', parseError);
                return null;
            }
        }).filter(network => network !== null);

        res.json({ networks });
    } catch (error: any) {
        console.error('Container networks listing error:', error);

        if (error.message.includes('command not found') || error.message.includes('not recognized')) {
            res.status(503).json({ error: 'Docker is not installed or not in PATH' });
        } else if (error.message.includes('permission denied')) {
            res.status(403).json({ error: 'Permission denied. Docker requires sudo privileges.' });
        } else if (error.code === 'ETIMEDOUT') {
            res.status(504).json({ error: 'Docker command timed out' });
        } else {
            res.status(500).json({ error: 'Failed to list container networks' });
        }
    }
});

// GET /api/containers-enhanced/volumes - List Docker volumes
router.get('/volumes', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const { stdout, stderr } = await execAsync('docker volume ls --format "{{json .}}"', {
            timeout: 10000
        });

        if (stderr && stderr.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied. Docker requires sudo privileges.' });
        }

        const lines = stdout.trim().split('\n').filter(line => line);
        const volumes = lines.map(line => {
            try {
                const volume = JSON.parse(line);
                return {
                    name: volume.Name,
                    driver: volume.Driver
                };
            } catch (parseError) {
                console.error('Failed to parse volume JSON:', parseError);
                return null;
            }
        }).filter(volume => volume !== null);

        res.json({ volumes });
    } catch (error: any) {
        console.error('Container volumes listing error:', error);

        if (error.message.includes('command not found') || error.message.includes('not recognized')) {
            res.status(503).json({ error: 'Docker is not installed or not in PATH' });
        } else if (error.message.includes('permission denied')) {
            res.status(403).json({ error: 'Permission denied. Docker requires sudo privileges.' });
        } else if (error.code === 'ETIMEDOUT') {
            res.status(504).json({ error: 'Docker command timed out' });
        } else {
            res.status(500).json({ error: 'Failed to list container volumes' });
        }
    }
});

// GET /api/containers-enhanced/:id/stats - Get container statistics
router.get('/:id/stats', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    const validation = validateContainerId(id);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid container ID' });
    }

    try {
        const { stdout, stderr } = await execAsync(`docker stats ${validation.sanitizedId} --no-stream --format "{{json .}}"`, {
            timeout: 10000
        });

        if (stderr && stderr.includes('No such container')) {
            return res.status(404).json({ error: 'Container not found' });
        }

        if (stderr && stderr.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied. Docker requires sudo privileges.' });
        }

        try {
            const stats = JSON.parse(stdout.trim());

            // Parse CPU and memory usage
            const cpuPercentage = parseFloat(stats.CPUPerc.replace('%', '')) || 0;
            const memoryUsage = parseFloat(stats.MemUsage?.split('/')[0]?.replace(/[^\d.]/g, '') || '0') || 0;
            const networkIO = parseFloat(stats.NetIO?.split('/').reduce((sum: string, part: string) => {
                const value = parseFloat(part.replace(/[^\d.]/g, ''));
                return (parseFloat(sum) || 0) + value;
            }, '0') || '0');
            const blockIO = parseFloat(stats.BlockIO?.split('/').reduce((sum: string, part: string) => {
                const value = parseFloat(part.replace(/[^\d.]/g, ''));
                return (parseFloat(sum) || 0) + value;
            }, '0') || '0');

            res.json({
                stats: {
                    cpu: cpuPercentage,
                    memory: memoryUsage,
                    networkIO: networkIO,
                    diskIO: blockIO,
                    memUsage: stats.MemUsage,
                    memLimit: stats.MemPerc,
                    netIO: stats.NetIO,
                    blockIO: stats.BlockIO,
                    pids: stats.PIDs
                }
            });
        } catch (parseError) {
            console.error('Failed to parse container stats JSON:', parseError);
            res.status(500).json({ error: 'Failed to parse container statistics' });
        }
    } catch (error: any) {
        console.error('Container stats error:', error);

        if (error.message.includes('No such container')) {
            return res.status(404).json({ error: 'Container not found' });
        }
        if (error.message.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        if (error.code === 'ETIMEDOUT') {
            return res.status(504).json({ error: 'Request timed out' });
        }
        res.status(500).json({ error: 'Failed to retrieve container statistics' });
    }
});

// GET /api/containers-enhanced/:id/inspect - Get detailed container information
router.get('/:id/inspect', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    const validation = validateContainerId(id);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid container ID' });
    }

    try {
        const { stdout, stderr } = await execAsync(`docker inspect ${validation.sanitizedId}`, {
            timeout: 15000
        });

        if (stderr && stderr.includes('No such container')) {
            return res.status(404).json({ error: 'Container not found' });
        }

        if (stderr && stderr.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied. Docker requires sudo privileges.' });
        }

        try {
            const inspectData = JSON.parse(stdout);
            if (Array.isArray(inspectData) && inspectData.length > 0) {
                const container = inspectData[0];

                // Extract relevant information
                const info = {
                    id: container.Id,
                    name: container.Name,
                    state: container.State?.Status,
                    status: container.State?.Status,
                    image: container.Config?.Image,
                    created: container.Created,
                    labels: container.Config?.Labels || {},
                    environment: container.Config?.Env || [],
                    volumes: container.Mounts?.map((mount: any) => `${mount.Source}:${mount.Destination}`) || [],
                    networks: Object.keys(container.NetworkSettings?.Networks || {}),
                    ports: container.NetworkSettings?.Ports,
                    restartCount: container.RestartCount,
                    exitCode: container.State?.ExitCode,
                    resources: container.HostConfig?.Resources
                };

                res.json({ container: info });
            } else {
                res.status(404).json({ error: 'Container not found' });
            }
        } catch (parseError) {
            console.error('Failed to parse container inspect JSON:', parseError);
            res.status(500).json({ error: 'Failed to parse container information' });
        }
    } catch (error: any) {
        console.error('Container inspect error:', error);

        if (error.message.includes('No such container')) {
            return res.status(404).json({ error: 'Container not found' });
        }
        if (error.message.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        if (error.code === 'ETIMEDOUT') {
            return res.status(504).json({ error: 'Request timed out' });
        }
        res.status(500).json({ error: 'Failed to retrieve container information' });
    }
});

// DELETE /api/containers-enhanced/:id - Remove a container
router.delete('/:id', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;
    const { force = false } = req.query;

    const validation = validateContainerId(id);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid container ID' });
    }

    try {
        const forceFlag = force === 'true' ? '-f' : '';
        const { stdout, stderr } = await execAsync(`docker rm ${forceFlag} ${validation.sanitizedId}`, {
            timeout: 30000
        });

        if (stderr && stderr.includes('No such container')) {
            return res.status(404).json({ error: 'Container not found' });
        }

        if (stderr && stderr.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied. Docker requires sudo privileges.' });
        }

        res.json({ success: true, message: 'Container removed successfully' });
    } catch (error: any) {
        console.error('Container removal error:', error);

        if (error.message.includes('No such container')) {
            return res.status(404).json({ error: 'Container not found' });
        }
        if (error.message.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        if (error.message.includes('You cannot remove a running container')) {
            return res.status(409).json({ error: 'Cannot remove running container. Use force=true to remove.' });
        }
        res.status(500).json({ error: 'Failed to remove container' });
    }
});

export default router;