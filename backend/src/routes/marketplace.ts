import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import { join, resolve, extname, basename } from 'path';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { createHash } from 'crypto';

const router = Router();
const execFileAsync = promisify(execFile);

// Configuration
const MARKETPLACE_DIR = process.env.MARKETPLACE_DIR || join(process.env.HOME || '', '.web-desktop', 'marketplace');
const APPS_DIR = join(MARKETPLACE_DIR, 'apps');
const CACHE_DIR = join(MARKETPLACE_DIR, 'cache');
const TEMP_DIR = join(MARKETPLACE_DIR, 'temp');
const SECURITY_SCAN_DIR = join(MARKETPLACE_DIR, 'security');

// Initialize directories
const initializeDirectories = async () => {
    const dirs = [MARKETPLACE_DIR, APPS_DIR, CACHE_DIR, TEMP_DIR, SECURITY_SCAN_DIR];
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            console.error(`Failed to create directory ${dir}:`, error);
        }
    }
};

// Security and validation functions
const sanitizeId = (id: string): string => {
    return id.replace(/[^a-zA-Z0-9._-]/g, '').substring(0, 100);
};

const validateUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
};

const calculateFileHash = async (filePath: string): Promise<string> => {
    const data = await fs.readFile(filePath);
    return createHash('sha256').update(data).digest('hex');
};

const scanForMalware = async (extractPath: string): Promise<{ threats: string[]; safe: boolean }> => {
    const threats: string[] = [];

    try {
        // Basic security scan patterns
        const suspiciousPatterns = [
            /\.exe$/i,
            /\.bat$/i,
            /\.cmd$/i,
            /\.scr$/i,
            /\.vbs$/i,
            /\.js$/i,
            /\.jar$/i,
            /eval\s*\(/i,
            /exec\s*\(/i,
            /system\s*\(/i,
            /shell_exec\s*\(/i,
            /passthru\s*\(/i,
            /require\s*\(\s*['"]\.\./i,
            /import\s*.*\.\./i,
        ];

        const scanFile = async (filePath: string): Promise<void> => {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                const fileName = basename(filePath).toLowerCase();

                // Check filename patterns
                for (const pattern of suspiciousPatterns) {
                    if (pattern.test(fileName) || pattern.test(content)) {
                        threats.push(`Suspicious content in ${basename(filePath)}: ${pattern.source}`);
                        break;
                    }
                }

                // Check for large files (>50MB)
                const stats = await fs.stat(filePath);
                if (stats.size > 50 * 1024 * 1024) {
                    threats.push(`Large file detected: ${basename(filePath)} (${stats.size} bytes)`);
                }
            } catch (error) {
                // Skip binary files
            }
        };

        // Recursively scan all files
        const scanDirectory = async (dirPath: string): Promise<void> => {
            try {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = join(dirPath, entry.name);

                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else {
                        await scanFile(fullPath);
                    }
                }
            } catch (error) {
                console.warn(`Could not scan directory ${dirPath}:`, error);
            }
        };

        await scanDirectory(extractPath);

        return {
            threats,
            safe: threats.length === 0
        };
    } catch (error) {
        return {
            threats: [`Security scan failed: ${error}`],
            safe: false
        };
    }
};

const validateManifest = (manifest: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const required = ['id', 'name', 'version', 'description', 'author', 'license', 'main', 'type'];

    for (const field of required) {
        if (!manifest[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    }

    if (manifest.id && !/^[a-z0-9._-]+$/i.test(manifest.id)) {
        errors.push('Invalid app ID format');
    }

    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
        errors.push('Invalid version format');
    }

    if (manifest.type && !['web', 'native', 'hybrid'].includes(manifest.type)) {
        errors.push('Invalid app type');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

const downloadFile = async (url: string, destination: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? 'https' : 'http';
        const client = require(protocol);

        client.get(url, (response: any) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Download failed with status ${response.statusCode}`));
                return;
            }

            const fileStream = require('fs').createWriteStream(destination);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });

            fileStream.on('error', reject);
        }).on('error', reject);
    });
};

const extractArchive = async (archivePath: string, extractPath: string): Promise<void> => {
    const ext = extname(archivePath).toLowerCase();

    try {
        switch (ext) {
            case '.zip':
                await execFileAsync('unzip', ['-q', archivePath, '-d', extractPath]);
                break;
            case '.tar':
            case '.gz':
            case '.tgz':
            case '.bz2':
            case '.xz':
                const tarArgs = ['xf', archivePath, '-C', extractPath];
                await execFileAsync('tar', tarArgs);
                break;
            default:
                throw new Error(`Unsupported archive format: ${ext}`);
        }
    } catch (error) {
        throw new Error(`Failed to extract archive: ${error}`);
    }
};

// API Routes

// GET /api/marketplace/apps - List available apps
router.get('/apps', async (req: Request, res: Response) => {
    try {
        const { category, search, page = 1, limit = 20, sort = 'name' } = req.query;

        const appsPath = join(APPS_DIR, 'registry.json');

        try {
            const data = await fs.readFile(appsPath, 'utf-8');
            let apps = JSON.parse(data);

            // Apply filters
            if (category && category !== 'all') {
                apps = apps.filter((app: any) => app.category === category);
            }

            if (search) {
                const searchTerm = (search as string).toLowerCase();
                apps = apps.filter((app: any) =>
                    app.name.toLowerCase().includes(searchTerm) ||
                    app.description.toLowerCase().includes(searchTerm) ||
                    app.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm))
                );
            }

            // Sort
            apps.sort((a: any, b: any) => {
                switch (sort) {
                    case 'name':
                        return a.name.localeCompare(b.name);
                    case 'rating':
                        return b.rating - a.rating;
                    case 'downloads':
                        return b.downloadCount - a.downloadCount;
                    case 'updated':
                        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                    default:
                        return 0;
                }
            });

            // Pagination
            const offset = (Number(page) - 1) * Number(limit);
            const paginatedApps = apps.slice(offset, offset + Number(limit));

            res.json({
                apps: paginatedApps,
                total: apps.length,
                page: Number(page),
                limit: Number(limit),
                hasMore: offset + Number(limit) < apps.length
            });
        } catch (error) {
            // No registry file found
            res.json({
                apps: [],
                total: 0,
                page: Number(page),
                limit: Number(limit),
                hasMore: false
            });
        }
    } catch (error: any) {
        console.error('Failed to list apps:', error);
        res.status(500).json({ error: 'Failed to list apps', details: error.message });
    }
});

// GET /api/marketplace/apps/:appId - Get app details
router.get('/apps/:appId', async (req: Request, res: Response) => {
    try {
        const { appId } = req.params;
        const sanitizedId = sanitizeId(appId);

        if (!appId || appId !== sanitizedId) {
            return res.status(400).json({ error: 'Invalid app ID' });
        }

        const appPath = join(APPS_DIR, sanitizedId, 'manifest.json');

        try {
            const manifestData = await fs.readFile(appPath, 'utf-8');
            const manifest = JSON.parse(manifestData);

            // Add additional metadata
            const stats = await fs.stat(join(APPS_DIR, sanitizedId));
            manifest.installedSize = stats.size;
            manifest.installedAt = stats.birthtime.toISOString();

            res.json(manifest);
        } catch (error) {
            res.status(404).json({ error: 'App not found' });
        }
    } catch (error: any) {
        console.error('Failed to get app details:', error);
        res.status(500).json({ error: 'Failed to get app details', details: error.message });
    }
});

// GET /api/marketplace/categories - List categories
router.get('/categories', async (req: Request, res: Response) => {
    try {
        const categoriesPath = join(APPS_DIR, 'categories.json');

        try {
            const data = await fs.readFile(categoriesPath, 'utf-8');
            const categories = JSON.parse(data);
            res.json(categories);
        } catch (error) {
            // Default categories
            const defaultCategories = [
                { id: 'productivity', name: 'Productivity', icon: 'briefcase' },
                { id: 'development', name: 'Development', icon: 'code' },
                { id: 'multimedia', name: 'Multimedia', icon: 'play-circle' },
                { id: 'games', name: 'Games', icon: 'gamepad-2' },
                { id: 'education', name: 'Education', icon: 'graduation-cap' },
                { id: 'utilities', name: 'Utilities', icon: 'wrench' },
                { id: 'system', name: 'System', icon: 'settings' },
                { id: 'graphics', name: 'Graphics', icon: 'palette' },
                { id: 'network', name: 'Network', icon: 'globe' },
                { id: 'office', name: 'Office', icon: 'file-text' }
            ];
            res.json(defaultCategories);
        }
    } catch (error: any) {
        console.error('Failed to list categories:', error);
        res.status(500).json({ error: 'Failed to list categories', details: error.message });
    }
});

// POST /api/marketplace/install - Install app from URL
router.post('/install', async (req: Request, res: Response) => {
    try {
        const { url, manifestId, permissions, sandboxOptions } = req.body;

        if (!url && !manifestId) {
            return res.status(400).json({ error: 'URL or manifest ID is required' });
        }

        if (url && !validateUrl(url)) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const sessionId = crypto.randomUUID();
        const installDir = join(TEMP_DIR, sessionId);
        await fs.mkdir(installDir, { recursive: true });

        // Start installation process in background
        const installApp = async () => {
            try {
                let archivePath: string;
                let manifest: any;

                if (url) {
                    // Download from URL
                    const fileName = basename(url) || `app-${sessionId}.zip`;
                    archivePath = join(installDir, fileName);
                    await downloadFile(url, archivePath);
                } else {
                    // Use manifest ID to download from registry
                    // This would typically fetch from a marketplace server
                    return { error: 'Manifest ID installation not implemented yet' };
                }

                // Calculate file hash for integrity
                const fileHash = await calculateFileHash(archivePath);

                // Extract archive
                const extractPath = join(installDir, 'extracted');
                await fs.mkdir(extractPath, { recursive: true });
                await extractArchive(archivePath, extractPath);

                // Find and validate manifest
                const manifestPath = join(extractPath, 'manifest.json');
                try {
                    const manifestData = await fs.readFile(manifestPath, 'utf-8');
                    manifest = JSON.parse(manifestData);
                } catch (error) {
                    throw new Error('Manifest.json not found or invalid');
                }

                // Validate manifest
                const validation = validateManifest(manifest);
                if (!validation.valid) {
                    throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
                }

                // Security scan
                const securityScan = await scanForMalware(extractPath);
                if (!securityScan.safe) {
                    throw new Error(`Security scan failed: ${securityScan.threats.join(', ')}`);
                }

                // Install app
                const finalAppDir = join(APPS_DIR, sanitizeId(manifest.id));
                await fs.mkdir(finalAppDir, { recursive: true });

                // Move extracted files to app directory
                const moveFiles = async (src: string, dest: string): Promise<void> => {
                    const entries = await fs.readdir(src, { withFileTypes: true });

                    for (const entry of entries) {
                        const srcPath = join(src, entry.name);
                        const destPath = join(dest, entry.name);

                        if (entry.isDirectory()) {
                            await fs.mkdir(destPath, { recursive: true });
                            await moveFiles(srcPath, destPath);
                        } else {
                            await fs.rename(srcPath, destPath);
                        }
                    }
                };

                await moveFiles(extractPath, finalAppDir);

                // Create app metadata
                const metadata = {
                    ...manifest,
                    installedAt: new Date().toISOString(),
                    fileHash,
                    securityScan,
                    permissions: permissions || manifest.permissions,
                    sandboxConfig: sandboxOptions || { enabled: true, type: 'partial' }
                };

                await fs.writeFile(
                    join(finalAppDir, 'metadata.json'),
                    JSON.stringify(metadata, null, 2)
                );

                // Clean up temp directory
                await fs.rm(installDir, { recursive: true, force: true });

                return {
                    success: true,
                    appId: manifest.id,
                    appPath: finalAppDir,
                    message: 'App installed successfully'
                };

            } catch (error: any) {
                // Clean up on failure
                try {
                    await fs.rm(installDir, { recursive: true, force: true });
                } catch {}

                return {
                    success: false,
                    error: error.message
                };
            }
        };

        // Start installation asynchronously
        installApp().then(result => {
            console.log(`Installation ${sessionId}:`, result);
        }).catch(error => {
            console.error(`Installation ${sessionId} failed:`, error);
        });

        res.json({
            success: true,
            sessionId,
            message: 'Installation started'
        });

    } catch (error: any) {
        console.error('Failed to start app installation:', error);
        res.status(500).json({ error: 'Failed to start installation', details: error.message });
    }
});

// GET /api/marketplace/install/:sessionId - Get installation status
router.get('/install/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const installDir = join(TEMP_DIR, sessionId);

        try {
            await fs.access(installDir);
            res.json({
                sessionId,
                status: 'installing',
                progress: 0,
                message: 'Installation in progress'
            });
        } catch (error) {
            // Check if completed (temp dir cleaned up)
            res.status(404).json({
                sessionId,
                status: 'not_found',
                message: 'Installation session not found or completed'
            });
        }
    } catch (error: any) {
        console.error('Failed to get installation status:', error);
        res.status(500).json({ error: 'Failed to get installation status', details: error.message });
    }
});

// DELETE /api/marketplace/apps/:appId - Uninstall app
router.delete('/apps/:appId', async (req: Request, res: Response) => {
    try {
        const { appId } = req.params;
        const sanitizedId = sanitizeId(appId);

        if (!appId || appId !== sanitizedId) {
            return res.status(400).json({ error: 'Invalid app ID' });
        }

        const appPath = join(APPS_DIR, sanitizedId);

        try {
            await fs.access(appPath);

            // Check if app is currently running
            // This would require integration with app manager

            // Remove app directory
            await fs.rm(appPath, { recursive: true, force: true });

            res.json({
                success: true,
                message: 'App uninstalled successfully'
            });
        } catch (error) {
            res.status(404).json({ error: 'App not found' });
        }
    } catch (error: any) {
        console.error('Failed to uninstall app:', error);
        res.status(500).json({ error: 'Failed to uninstall app', details: error.message });
    }
});

// GET /api/marketplace/apps/:appId/updates - Check for updates
router.get('/apps/:appId/updates', async (req: Request, res: Response) => {
    try {
        const { appId } = req.params;
        const sanitizedId = sanitizeId(appId);

        if (!appId || appId !== sanitizedId) {
            return res.status(400).json({ error: 'Invalid app ID' });
        }

        const appPath = join(APPS_DIR, sanitizedId);
        const manifestPath = join(appPath, 'manifest.json');

        try {
            const manifestData = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestData);

            // Check for updates (placeholder logic)
            const hasUpdates = false; // This would check against marketplace server

            res.json({
                hasUpdates,
                currentVersion: manifest.version,
                latestVersion: manifest.version,
                updates: hasUpdates ? [{
                    version: '1.0.1',
                    changelog: ['Bug fixes', 'Performance improvements'],
                    downloadUrl: '',
                    size: 0,
                    mandatory: false,
                    publishedAt: new Date().toISOString()
                }] : []
            });
        } catch (error) {
            res.status(404).json({ error: 'App not found' });
        }
    } catch (error: any) {
        console.error('Failed to check for updates:', error);
        res.status(500).json({ error: 'Failed to check for updates', details: error.message });
    }
});

// POST /api/marketplace/apps/:appId/update - Update app
router.post('/apps/:appId/update', async (req: Request, res: Response) => {
    try {
        const { appId } = req.params;
        const sanitizedId = sanitizeId(appId);

        if (!appId || appId !== sanitizedId) {
            return res.status(400).json({ error: 'Invalid app ID' });
        }

        // Update logic would go here
        res.json({
            success: true,
            message: 'App update started'
        });
    } catch (error: any) {
        console.error('Failed to update app:', error);
        res.status(500).json({ error: 'Failed to update app', details: error.message });
    }
});

// GET /api/marketplace/installed - List installed apps
router.get('/installed', async (req: Request, res: Response) => {
    try {
        const installedApps: any[] = [];

        try {
            const appDirs = await fs.readdir(APPS_DIR, { withFileTypes: true });

            for (const dir of appDirs) {
                if (dir.isDirectory()) {
                    try {
                        const manifestPath = join(APPS_DIR, dir.name, 'manifest.json');
                        const metadataPath = join(APPS_DIR, dir.name, 'metadata.json');

                        const manifestData = await fs.readFile(manifestPath, 'utf-8');
                        const manifest = JSON.parse(manifestData);

                        let metadata = {};
                        try {
                            const metadataData = await fs.readFile(metadataPath, 'utf-8');
                            metadata = JSON.parse(metadataData);
                        } catch {}

                        const stats = await fs.stat(join(APPS_DIR, dir.name));

                        installedApps.push({
                            ...manifest,
                            ...metadata,
                            installPath: join(APPS_DIR, dir.name),
                            installedSize: stats.size,
                            status: 'installed'
                        });
                    } catch (error) {
                        console.warn(`Failed to load app ${dir.name}:`, error);
                    }
                }
            }
        } catch (error) {
            console.warn('No apps directory found');
        }

        res.json({
            apps: installedApps,
            total: installedApps.length
        });
    } catch (error: any) {
        console.error('Failed to list installed apps:', error);
        res.status(500).json({ error: 'Failed to list installed apps', details: error.message });
    }
});

// Initialize marketplace directories
initializeDirectories().catch(console.error);

export default router;