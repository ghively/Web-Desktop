import { Router, Request, Response } from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const execAsync = promisify(exec);

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 20; // max 20 requests per minute for build operations

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

// Build task management
interface BuildTask {
    id: string;
    name: string;
    type: 'make' | 'cmake' | 'gradle' | 'maven' | 'npm' | 'yarn' | 'cargo' | 'go' | 'custom';
    command: string;
    workingDirectory: string;
    environment?: Record<string, string>;
    args?: string[];
    status: 'queued' | 'running' | 'success' | 'error' | 'cancelled';
    output: string[];
    error: string;
    startTime?: number;
    endTime?: number;
    duration?: number;
    exitCode?: number;
    progress?: number;
    artifacts?: string[];
}

const buildTasks = new Map<string, BuildTask>();
const activeProcesses = new Map<string, any>();

// Validate and sanitize path
const validatePath = async (path: string): Promise<{ valid: boolean; sanitizedPath?: string; error?: string }> => {
    if (!path || typeof path !== 'string') {
        return { valid: false, error: 'Path is required' };
    }

    const trimmedPath = path.trim();

    if (trimmedPath.length === 0) {
        return { valid: false, error: 'Path cannot be empty' };
    }

    // Basic path validation - prevent directory traversal
    if (trimmedPath.includes('..') || trimmedPath.includes('~')) {
        return { valid: false, error: 'Invalid path characters detected' };
    }

    // Ensure absolute path starts with / (Unix) or valid drive letter (Windows)
    const isValidUnixPath = trimmedPath.startsWith('/');
    const isValidWindowsPath = /^[a-zA-Z]:\\/.test(trimmedPath);

    if (!isValidUnixPath && !isValidWindowsPath) {
        return { valid: false, error: 'Path must be absolute' };
    }

    // Check if path exists
    try {
        const stats = await fs.stat(trimmedPath);
        if (!stats.isDirectory()) {
            return { valid: false, error: 'Path must be a directory' };
        }
        return { valid: true, sanitizedPath: trimmedPath };
    } catch (error) {
        return { valid: false, error: 'Path does not exist or is not accessible' };
    }
};

// Detect build system in directory
const detectBuildSystem = async (directory: string): Promise<string | null> => {
    try {
        const files = await fs.readdir(directory);

        // Check for build system files
        if (files.includes('Makefile') || files.includes('makefile')) {
            return 'make';
        }
        if (files.includes('CMakeLists.txt')) {
            return 'cmake';
        }
        if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
            return 'gradle';
        }
        if (files.includes('pom.xml')) {
            return 'maven';
        }
        if (files.includes('package.json')) {
            return 'npm';
        }
        if (files.includes('yarn.lock') || files.includes('package.json')) {
            return 'yarn';
        }
        if (files.includes('Cargo.toml')) {
            return 'cargo';
        }
        if (files.includes('go.mod')) {
            return 'go';
        }

        return null;
    } catch (error) {
        console.error('Error detecting build system:', error);
        return null;
    }
};

// GET /api/build-tools/detect - Detect build system in directory
router.post('/detect', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { directory } = req.body;

    const validation = await validatePath(directory);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid directory path' });
    }

    try {
        const buildSystem = await detectBuildSystem(validation.sanitizedPath!);
        res.json({ buildSystem });
    } catch (error: any) {
        console.error('Build system detection error:', error);
        res.status(500).json({ error: 'Failed to detect build system' });
    }
});

// POST /api/build-tools/build - Execute build command
router.post('/build', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { directory, command, buildSystem = 'custom', environment = {}, args = [] } = req.body;

    const validation = await validatePath(directory);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid directory path' });
    }

    if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Build command is required' });
    }

    const taskId = `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const buildTask: BuildTask = {
        id: taskId,
        name: `${path.basename(validation.sanitizedPath!)} - ${buildSystem}`,
        type: buildSystem as any,
        command,
        workingDirectory: validation.sanitizedPath!,
        environment,
        args,
        status: 'queued',
        output: [],
        error: '',
        progress: 0
    };

    buildTasks.set(taskId, buildTask);

    // Respond immediately with task ID
    res.json({ taskId, status: 'queued' });

    // Start build process asynchronously
    setImmediate(() => executeBuild(taskId));
});

// Execute build command asynchronously
const executeBuild = async (taskId: string) => {
    const task = buildTasks.get(taskId);
    if (!task) return;

    task.status = 'running';
    task.startTime = Date.now();

    try {
        // Prepare environment
        const env = { ...process.env, ...task.environment };

        // Split command and args
        const commandParts = task.command.split(/\s+/);
        const command = commandParts[0];
        const args = [...commandParts.slice(1), ...(task.args || [])];

        // Spawn process
        const child = spawn(command, args, {
            cwd: task.workingDirectory,
            env,
            stdio: 'pipe'
        });

        activeProcesses.set(taskId, child);

        // Capture output
        child.stdout?.on('data', (data) => {
            const output = data.toString();
            task.output.push(output.trim());

            // Update progress based on common build patterns
            if (output.includes('Building') || output.includes('Compiling')) {
                task.progress = Math.min((task.progress || 0) + 10, 80);
            } else if (output.includes('Linking') || output.includes('Link')) {
                task.progress = Math.min((task.progress || 0) + 5, 90);
            } else if (output.includes('Built target') || output.includes('BUILD SUCCESSFUL')) {
                task.progress = 100;
            }
        });

        child.stderr?.on('data', (data) => {
            const output = data.toString();
            task.output.push(`ERROR: ${output.trim()}`);
        });

        child.on('close', (code) => {
            task.endTime = Date.now();
            task.duration = task.endTime - (task.startTime || 0);
            task.exitCode = code || 0;

            if (code === 0) {
                task.status = 'success';
                task.progress = 100;

                // Look for build artifacts
                detectBuildArtifacts(task);
            } else {
                task.status = 'error';
                task.error = `Build failed with exit code ${code}`;
            }

            activeProcesses.delete(taskId);
        });

        child.on('error', (error) => {
            task.status = 'error';
            task.error = error.message;
            task.endTime = Date.now();
            task.duration = task.endTime - (task.startTime || 0);
            activeProcesses.delete(taskId);
        });

    } catch (error: any) {
        task.status = 'error';
        task.error = error.message;
        task.endTime = Date.now();
        task.duration = task.endTime - (task.startTime || 0);
    }
};

// Detect build artifacts
const detectBuildArtifacts = async (task: BuildTask) => {
    try {
        const files = await fs.readdir(task.workingDirectory);
        const artifactPatterns = [
            /^build$/,
            /^dist$/,
            /^out$/,
            /^target$/,
            /\.exe$/i,
            /\.so$/,
            /\.a$/,
            /\.dll$/i
        ];

        const artifacts = files.filter(file =>
            artifactPatterns.some(pattern => pattern.test(file))
        );

        if (artifacts.length > 0) {
            task.artifacts = artifacts;
        }
    } catch (error) {
        console.error('Error detecting build artifacts:', error);
    }
};

// GET /api/build-tools/status/:taskId - Get build task status
router.get('/status/:taskId', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { taskId } = req.params;

    const task = buildTasks.get(taskId);
    if (!task) {
        return res.status(404).json({ error: 'Build task not found' });
    }

    res.json({
        taskId: task.id,
        status: task.status,
        progress: task.progress,
        duration: task.duration,
        exitCode: task.exitCode,
        error: task.error,
        artifacts: task.artifacts,
        output: task.output.slice(-50) // Return last 50 lines of output
    });
});

// POST /api/build-tools/stop/:taskId - Stop a running build
router.post('/stop/:taskId', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { taskId } = req.params;

    const task = buildTasks.get(taskId);
    if (!task) {
        return res.status(404).json({ error: 'Build task not found' });
    }

    if (task.status !== 'running') {
        return res.status(400).json({ error: 'Build task is not running' });
    }

    const process = activeProcesses.get(taskId);
    if (process) {
        process.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
            if (activeProcesses.has(taskId)) {
                process.kill('SIGKILL');
            }
        }, 5000);
    }

    task.status = 'cancelled';
    task.endTime = Date.now();
    task.duration = task.endTime - (task.startTime || 0);

    activeProcesses.delete(taskId);

    res.json({ success: true, message: 'Build task stopped' });
});

// GET /api/build-tools/tasks - List all build tasks
router.get('/tasks', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const tasks = Array.from(buildTasks.values()).map(task => ({
        id: task.id,
        name: task.name,
        type: task.type,
        status: task.status,
        progress: task.progress,
        duration: task.duration,
        startTime: task.startTime,
        endTime: task.endTime,
        exitCode: task.exitCode,
        error: task.error
    }));

    // Sort by start time (most recent first)
    tasks.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));

    res.json({ tasks });
});

// DELETE /api/build-tools/tasks/:taskId - Delete build task
router.delete('/tasks/:taskId', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { taskId } = req.params;

    const task = buildTasks.get(taskId);
    if (!task) {
        return res.status(404).json({ error: 'Build task not found' });
    }

    // Stop if running
    if (task.status === 'running') {
        const process = activeProcesses.get(taskId);
        if (process) {
            process.kill('SIGTERM');
            activeProcesses.delete(taskId);
        }
    }

    buildTasks.delete(taskId);

    res.json({ success: true, message: 'Build task deleted' });
});

// Cleanup old completed tasks (older than 1 hour)
setInterval(() => {
    const oneHourAgo = Date.now() - 3600000;

    for (const [taskId, task] of buildTasks.entries()) {
        if (
            (task.status === 'success' || task.status === 'error' || task.status === 'cancelled') &&
            task.endTime &&
            task.endTime < oneHourAgo
        ) {
            buildTasks.delete(taskId);
        }
    }
}, 300000); // Check every 5 minutes

export default router;