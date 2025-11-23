import { Router, Request, Response } from 'express';
import { exec, spawn } from 'child_process';
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

        const desktopFiles = stdout.split('\n').filter(line => line.trim());

        const apps = await Promise.all(desktopFiles.map(async (filepath) => {
            try {
                // SECURITY: Use spawn with proper argument separation instead of shell
                const { stdout: content } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
                    const catProcess = spawn('cat', [filepath], {
                        stdio: ['pipe', 'pipe', 'pipe'],
                        timeout: 5000
                    });

                    let stdout = '';
                    let stderr = '';

                    catProcess.stdout?.on('data', (data) => {
                        stdout += data.toString();
                    });

                    catProcess.stderr?.on('data', (data) => {
                        stderr += data.toString();
                    });

                    catProcess.on('close', (code) => {
                        if (code === 0) {
                            resolve({ stdout, stderr });
                        } else {
                            reject(new Error(`cat failed with exit code ${code}: ${stderr}`));
                        }
                    });

                    catProcess.on('error', (error) => {
                        reject(new Error(`Failed to spawn cat: ${error.message}`));
                    });
                });
                const lines = content.split('\n');

                // Parse .desktop file
                let name = filepath.split('/').pop()?.replace('.desktop', '') || 'Unknown';
                let displayName = name;
                let description = '';
                let icon = '';
                let categories = '';
                let exec = '';

                for (const line of lines) {
                    if (line.startsWith('Name=') && !line.startsWith('Name[')) {
                        displayName = line.substring(5);
                    } else if (line.startsWith('Comment=') && !line.startsWith('Comment[')) {
                        description = line.substring(8);
                    } else if (line.startsWith('Icon=')) {
                        icon = line.substring(5);
                    } else if (line.startsWith('Categories=')) {
                        categories = line.substring(11);
                    } else if (line.startsWith('Exec=')) {
                        exec = line.substring(5);
                    }
                }

                return {
                    id: name,
                    name: displayName,
                    description,
                    icon,
                    categories: categories.split(';').filter(c => c),
                    exec,
                    filepath
                };
            } catch (err) {
                // If we can't read the file, return basic info
                const name = filepath.split('/').pop()?.replace('.desktop', '') || 'Unknown';
                return { id: name, name, filepath };
            }
        }));

        // Filter out system utilities and developer tools
        const filteredApps = apps
            .filter(app => app !== null)
            .filter((app: any) => {
                // Skip apps without names or with no-show categories
                if (!app.name || typeof app.name !== 'string') return false;

                const name = app.name.toLowerCase();
                const description = (app.description || '').toLowerCase();
                const categories = app.categories || [];
                const exec = (app.exec || '').toLowerCase();

                // Skip console-only applications
                if (categories.includes('ConsoleOnly')) return false;

                // Skip apps without executable commands or with dummy commands
                if (!app.exec || app.exec === '/bin/false' || app.exec.trim() === '') return false;

                // Enhanced keyword filtering for stricter filtering
                const excludeKeywords = [
                    'python', 'terminal', 'console', 'debug', 'development', 'session agent',
                    'handler for', 'snap', 'prompt', 'install', 'command line', 'advanced command',
                    'idle', 'texinfo', 'vim', 'byobu', 'htop', 'zutty'
                ];

                // Check both name and description for exclusion keywords
                const hasExcludeKeyword = excludeKeywords.some(keyword =>
                    name.includes(keyword) || description.includes(keyword)
                );
                if (hasExcludeKeyword) return false;

                // Skip system categories entirely
                const excludeCategories = [
                    'System', 'Development', 'GTK', 'GNOME', 'Utility'
                ];
                if (categories.some((cat: string) => excludeCategories.includes(cat))) {
                    return false; // No exceptions for system categories
                }

                // Skip apps with certain patterns in exec command
                if (exec.includes('python') || exec.includes('env TERM=')) return false;

                // Only include apps that are clearly user-facing GUI applications
                const includeKeywords = [
                    'browser', 'editor', 'viewer', 'player', 'office', 'document', 'image',
                    'video', 'audio', 'game', 'calculator', 'settings', 'file', 'manager'
                ];

                const hasIncludeKeyword = includeKeywords.some(keyword =>
                    name.includes(keyword) || description.includes(keyword) || categories.some((cat: string) => cat.toLowerCase().includes(keyword))
                );

                // If no include keywords found, also exclude it
                if (!hasIncludeKeyword) return false;

                return true;
            });

        res.json({ apps: filteredApps });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to list installed packages' });
    }
});

// POST /api/packages/install - Install a package
router.post('/install', async (req: Request, res: Response) => {
    const { packageName } = req.body;

    if (!packageName || typeof packageName !== 'string') {
        return res.status(400).json({ error: 'Package name is required' });
    }

    // SECURITY: Validate package name (alphanumeric, hyphens, dots only)
    if (!/^[a-z0-9.-]+$/.test(packageName)) {
        return res.status(400).json({ error: 'Invalid package name format' });
    }

    // SECURITY: Additional restrictions on package name
    if (packageName.length > 50) {
        return res.status(400).json({ error: 'Package name too long' });
    }

    // SECURITY: Block dangerous package names
    const blockedPackages = ['sudo', 'passwd', 'su', 'shadow', 'cron', 'systemd', 'init', 'kernel'];
    if (blockedPackages.some(blocked => packageName.includes(blocked))) {
        return res.status(400).json({
            error: 'Installation of system packages is not allowed',
            details: 'This package could compromise system security'
        });
    }

    try {
        // SECURITY: Use spawn with proper argument separation instead of shell
        const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            const aptProcess = spawn('sudo', ['apt-get', 'install', '-y', packageName], {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 120000
            });

            let stdout = '';
            let stderr = '';

            aptProcess.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            aptProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            aptProcess.on('close', (code) => {
                resolve({ stdout, stderr });
            });

            aptProcess.on('error', (error) => {
                reject(new Error(`Failed to spawn apt-get: ${error.message}`));
            });
        });

        res.json({
            success: true,
            message: `Package ${packageName} installed successfully`,
            output: stdout.substring(0, 10000) // Limit output size
        });
    } catch (error: any) {
        console.error('Package installation error:', error);
        res.status(500).json({
            error: 'Failed to install package',
            details: error.message
        });
    }
});

// DELETE /api/packages/:packageName - Uninstall a package
router.delete('/:packageName', async (req: Request, res: Response) => {
    const { packageName } = req.params;

    // SECURITY: Validate package name format
    if (!/^[a-z0-9.-]+$/.test(packageName)) {
        return res.status(400).json({ error: 'Invalid package name format' });
    }

    // SECURITY: Additional restrictions on package name
    if (packageName.length > 50) {
        return res.status(400).json({ error: 'Package name too long' });
    }

    // SECURITY: Block removal of critical system packages
    const criticalPackages = [
        'sudo', 'passwd', 'su', 'shadow', 'cron', 'systemd', 'init',
        'ubuntu-minimal', 'ubuntu-standard', 'ubuntu-desktop',
        'gnome-shell', 'xorg', 'lightdm', 'gdm', 'network-manager'
    ];
    if (criticalPackages.some(critical => packageName.includes(critical))) {
        return res.status(400).json({
            error: 'Removal of critical system packages is not allowed',
            details: 'This package is essential for system operation'
        });
    }

    try {
        // SECURITY: Use spawn with proper argument separation instead of shell
        const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            const aptProcess = spawn('sudo', ['apt-get', 'remove', '-y', packageName], {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 120000
            });

            let stdout = '';
            let stderr = '';

            aptProcess.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            aptProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            aptProcess.on('close', (code) => {
                resolve({ stdout, stderr });
            });

            aptProcess.on('error', (error) => {
                reject(new Error(`Failed to spawn apt-get: ${error.message}`));
            });
        });

        res.json({
            success: true,
            message: `Package ${packageName} removed successfully`,
            output: stdout.substring(0, 10000) // Limit output size
        });
    } catch (error: any) {
        console.error('Package removal error:', error);
        res.status(500).json({
            error: 'Failed to remove package',
            details: error.message
        });
    }
});

// GET /api/packages/search?q=firefox - Search for packages
router.get('/search', async (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    // SECURITY: Validate and sanitize search query
    if (typeof query !== 'string') {
        return res.status(400).json({ error: 'Invalid search query type' });
    }

    // SECURITY: Remove shell metacharacters and limit length
    const sanitizedQuery = query
        .replace(/[;&|`$(){}[\]<>'"\\]/g, '') // Remove shell metacharacters
        .replace(/\.\./g, '') // Remove path traversal
        .trim()
        .substring(0, 100); // Limit length

    if (!/^[a-zA-Z0-9\s\-_.]+$/.test(sanitizedQuery)) {
        return res.status(400).json({
            error: 'Invalid search query format',
            details: 'Search query contains invalid characters'
        });
    }

    try {
        // SECURITY: Use spawn with proper argument separation
        const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            const aptCacheProcess = spawn('apt-cache', ['search', sanitizedQuery], {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 30000
            });

            let stdout = '';
            let stderr = '';

            aptCacheProcess.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            aptCacheProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            aptCacheProcess.on('close', (code) => {
                resolve({ stdout, stderr });
            });

            aptCacheProcess.on('error', (error) => {
                reject(new Error(`Failed to spawn apt-cache: ${error.message}`));
            });
        });

        // Limit to 20 results and parse
        const packages = stdout.split('\n')
            .filter(line => line.trim())
            .slice(0, 20)
            .map(line => {
                const [name, ...descParts] = line.split(' - ');
                return {
                    name: name?.trim(),
                    description: descParts.join(' - ').trim()
                };
            });

        res.json({ packages });
    } catch (error: any) {
        console.error('Package search error:', error);
        res.status(500).json({
            error: 'Failed to search packages',
            details: error.message
        });
    }
});

export default router;
