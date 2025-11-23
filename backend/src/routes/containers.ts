import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = Router();
const execAsync = promisify(exec);

// Enhanced container ID/name validation
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
    // Container IDs: 64-character hex strings (but we'll accept 12-64 chars for short IDs)
    // Container names: letters, numbers, underscores, hyphens, dots, and forward slashes
    const hexPattern = /^[a-f0-9]{12,64}$/i;
    const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

    if (hexPattern.test(trimmedId)) {
        return { valid: true, sanitizedId: trimmedId };
    }

    if (namePattern.test(trimmedId)) {
        // For names, we need to escape special shell characters
        const sanitizedId = trimmedId.replace(/(["'$`\\])/g, '\\$1');
        return { valid: true, sanitizedId: sanitizedId };
    }

    return { valid: false, error: 'Invalid container ID format. Must be a valid Docker container ID (hex) or name' };
};

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

// GET /api/containers - List all containers
router.get('/', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        // Add timeout to prevent hanging
        const { stdout, stderr } = await execAsync('docker ps -a --format "{{json .}}"', {
            timeout: 10000 // 10 second timeout
        });

        if (stderr && stderr.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied. Docker requires sudo privileges.' });
        }

        const lines = stdout.trim().split('\n').filter(line => line);
        const containers = lines.map(line => {
            try {
                const container = JSON.parse(line);
                return {
                    id: container.ID,
                    name: container.Names,
                    image: container.Image,
                    state: container.State,
                    status: container.Status,
                    ports: container.Ports
                };
            } catch (parseError) {
                console.error('Failed to parse container JSON:', parseError);
                return null;
            }
        }).filter(container => container !== null);

        res.json({ containers });
    } catch (error: any) {
        console.error('Container listing error:', error);
        
        if (error.message.includes('command not found') || error.message.includes('not recognized')) {
            res.status(503).json({ error: 'Docker is not installed or not in PATH' });
        } else if (error.message.includes('permission denied')) {
            res.status(403).json({ error: 'Permission denied. Docker requires sudo privileges.' });
        } else if (error.code === 'ETIMEDOUT') {
            res.status(504).json({ error: 'Docker command timed out' });
        } else {
            res.status(500).json({ error: 'Failed to list containers' });
        }
    }
});

// POST /api/containers/:id/start - Start a container
router.post('/:id/start', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    // Validate container ID using enhanced validation
    const validation = validateContainerId(id);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid container ID' });
    }

    try {
        await execAsync(`docker start ${validation.sanitizedId}`, { timeout: 30000 });
        res.json({ success: true, message: 'Container started' });
    } catch (error: any) {
        console.error('Container start error:', error);
        
        if (error.message.includes('No such container')) {
            return res.status(404).json({ error: 'Container not found' });
        }
        if (error.message.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        res.status(500).json({ error: 'Failed to start container' });
    }
});

// POST /api/containers/:id/stop - Stop a container
router.post('/:id/stop', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    // Validate container ID using enhanced validation
    const validation = validateContainerId(id);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid container ID' });
    }

    try {
        await execAsync(`docker stop ${validation.sanitizedId}`, { timeout: 30000 });
        res.json({ success: true, message: 'Container stopped' });
    } catch (error: any) {
        console.error('Container stop error:', error);
        
        if (error.message.includes('No such container')) {
            return res.status(404).json({ error: 'Container not found' });
        }
        if (error.message.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        res.status(500).json({ error: 'Failed to stop container' });
    }
});

// POST /api/containers/:id/restart - Restart a container
router.post('/:id/restart', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    // Validate container ID using enhanced validation
    const validation = validateContainerId(id);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid container ID' });
    }

    try {
        await execAsync(`docker restart ${validation.sanitizedId}`, { timeout: 45000 });
        res.json({ success: true, message: 'Container restarted' });
    } catch (error: any) {
        console.error('Container restart error:', error);
        
        if (error.message.includes('No such container')) {
            return res.status(404).json({ error: 'Container not found' });
        }
        if (error.message.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        res.status(500).json({ error: 'Failed to restart container' });
    }
});

// GET /api/containers/:id/logs - Get container logs
router.get('/:id/logs', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;
    const linesParam = req.query.lines as string;

    // Validate container ID using enhanced validation
    const validation = validateContainerId(id);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid container ID' });
    }

    // Sanitize and validate lines parameter
    const lines = Math.min(Math.max(parseInt(linesParam || '100', 10), 1), 10000);
    if (isNaN(lines)) {
        return res.status(400).json({ error: 'Invalid lines parameter' });
    }

    try {
        const { stdout } = await execAsync(`docker logs --tail ${lines} ${validation.sanitizedId}`, {
            timeout: 15000 // 15 second timeout
        });
        res.json({ logs: stdout });
    } catch (error: any) {
        console.error('Container logs error:', error);

        if (error.message.includes('No such container')) {
            return res.status(404).json({ error: 'Container not found' });
        }
        if (error.message.includes('permission denied')) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        if (error.code === 'ETIMEDOUT') {
            return res.status(504).json({ error: 'Request timed out' });
        }
        res.status(500).json({ error: 'Failed to retrieve container logs' });
    }
});

export default router;
