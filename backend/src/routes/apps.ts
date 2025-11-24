import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

const __dirname = path.dirname(__filename);

const router = Router();

// Data storage paths
const DATA_DIR = path.join(__dirname, '../../data');
const APPS_DIR = path.join(DATA_DIR, 'apps');
const USAGE_FILE = path.join(APPS_DIR, 'usage.json');
const PREFERENCES_FILE = path.join(APPS_DIR, 'preferences.json');
const LAUNCH_HISTORY_FILE = path.join(APPS_DIR, 'launch-history.json');

// Ensure data directories exist
async function ensureDataDirectories() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(APPS_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to create data directories:', error);
    }
}

// Initialize data files
async function initializeDataFiles() {
    await ensureDataDirectories();

    try {
        // Initialize usage tracking
        try {
            await fs.access(USAGE_FILE);
        } catch {
            await fs.writeFile(USAGE_FILE, JSON.stringify({}));
        }

        // Initialize preferences
        try {
            await fs.access(PREFERENCES_FILE);
        } catch {
            const defaultPrefs = {
                favorites: [],
                recent: [],
                viewMode: 'grid',
                categories: {},
                quickActions: []
            };
            await fs.writeFile(PREFERENCES_FILE, JSON.stringify(defaultPrefs, null, 2));
        }

        // Initialize launch history
        try {
            await fs.access(LAUNCH_HISTORY_FILE);
        } catch {
            await fs.writeFile(LAUNCH_HISTORY_FILE, JSON.stringify([]));
        }
    } catch (error) {
        console.error('Failed to initialize data files:', error);
    }
}

// Helper function to read JSON file safely
async function readJsonFile(filePath: string): Promise<any> {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return null;
    }
}

// Helper function to write JSON file safely
async function writeJsonFile(filePath: string, data: any): Promise<void> {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        throw error;
    }
}

// Sanitize argument values to prevent command injection
const sanitizeArgument = (arg: any): string | null => {
    if (typeof arg !== 'string') {
        return null;
    }

    // Remove null bytes, control characters, and shell metacharacters
    const sanitized = arg
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .replace(/[;&|`$(){}[\]<>'"\\]/g, ''); // Remove shell metacharacters

    // Check for path traversal attempts
    if (sanitized.includes('../') || sanitized.includes('..\\') || sanitized.includes('~/')) {
        return null;
    }

    // Limit argument length to prevent buffer overflow attacks
    if (sanitized.length > 1000) {
        return null;
    }

    return sanitized;
};

// Track application usage
router.post('/usage', async (req, res) => {
    try {
        await initializeDataFiles();

        const { appId, action = 'launch', metadata = {} } = req.body;

        if (!appId) {
            return res.status(400).json({ error: 'App ID is required' });
        }

        const usage = await readJsonFile(USAGE_FILE) || {};
        const now = new Date().toISOString();

        // Update usage stats
        if (!usage[appId]) {
            usage[appId] = {
                appId,
                count: 0,
                firstUsed: now,
                lastUsed: now,
                totalSessions: 0,
                averageSessionTime: 0,
                metadata: {}
            };
        }

        usage[appId].count++;
        usage[appId].lastUsed = now;

        if (action === 'launch') {
            usage[appId].totalSessions++;
        }

        // Update metadata
        usage[appId].metadata = { ...usage[appId].metadata, ...metadata };

        await writeJsonFile(USAGE_FILE, usage);

        // Update launch history
        const history = await readJsonFile(LAUNCH_HISTORY_FILE) || [];
        history.unshift({
            appId,
            action,
            timestamp: now,
            metadata
        });

        // Keep only last 1000 entries
        if (history.length > 1000) {
            history.splice(1000);
        }

        await writeJsonFile(LAUNCH_HISTORY_FILE, history);

        res.json({ success: true, usage: usage[appId] });
    } catch (error) {
        console.error('Error tracking app usage:', error);
        res.status(500).json({ error: 'Failed to track usage' });
    }
});

// Get usage statistics
router.get('/usage', async (req, res) => {
    try {
        await initializeDataFiles();

        const usage = await readJsonFile(USAGE_FILE) || {};
        const { limit = 50, sortBy = 'count' } = req.query;

        // Convert to array and sort
        const usageArray = Object.values(usage)
            .sort((a: any, b: any) => {
                switch (sortBy) {
                    case 'lastUsed':
                        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
                    case 'count':
                    default:
                        return b.count - a.count;
                }
            })
            .slice(0, parseInt(limit as string));

        res.json(usageArray);
    } catch (error) {
        console.error('Error getting usage stats:', error);
        res.status(500).json({ error: 'Failed to get usage stats' });
    }
});

// Get/set user preferences
router.get('/preferences', async (req, res) => {
    try {
        await initializeDataFiles();

        const preferences = await readJsonFile(PREFERENCES_FILE) || {
            favorites: [],
            recent: [],
            viewMode: 'grid',
            categories: {},
            quickActions: []
        };

        res.json(preferences);
    } catch (error) {
        console.error('Error getting preferences:', error);
        res.status(500).json({ error: 'Failed to get preferences' });
    }
});

router.post('/preferences', async (req, res) => {
    try {
        await initializeDataFiles();

        const preferences = req.body;

        // Validate preferences structure
        const validPreferences = {
            favorites: Array.isArray(preferences.favorites) ? preferences.favorites : [],
            recent: Array.isArray(preferences.recent) ? preferences.recent.slice(0, 20) : [],
            viewMode: ['grid', 'list'].includes(preferences.viewMode) ? preferences.viewMode : 'grid',
            categories: typeof preferences.categories === 'object' ? preferences.categories : {},
            quickActions: Array.isArray(preferences.quickActions) ? preferences.quickActions : []
        };

        await writeJsonFile(PREFERENCES_FILE, validPreferences);

        res.json({ success: true, preferences: validPreferences });
    } catch (error) {
        console.error('Error setting preferences:', error);
        res.status(500).json({ error: 'Failed to set preferences' });
    }
});

// Toggle favorite status
router.post('/favorites/:appId/toggle', async (req, res) => {
    try {
        await initializeDataFiles();

        const { appId } = req.params;
        const preferences = await readJsonFile(PREFERENCES_FILE) || { favorites: [] };

        const index = preferences.favorites.indexOf(appId);
        if (index > -1) {
            preferences.favorites.splice(index, 1);
        } else {
            preferences.favorites.push(appId);
        }

        await writeJsonFile(PREFERENCES_FILE, preferences);

        res.json({
            success: true,
            isFavorite: preferences.favorites.includes(appId),
            favorites: preferences.favorites
        });
    } catch (error) {
        console.error('Error toggling favorite:', error);
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
});

// Get app recommendations
router.get('/recommendations', async (req, res) => {
    try {
        await initializeDataFiles();

        const { limit = 10, context } = req.query;
        const usage = await readJsonFile(USAGE_FILE) || {};
        const preferences = await readJsonFile(PREFERENCES_FILE) || { favorites: [], recent: [] };

        // Define available apps with metadata
        const allApps = [
            { id: 'terminal', name: 'Terminal', category: 'applications', tags: ['terminal', 'shell', 'command-line'] },
            { id: 'files', name: 'Files', category: 'applications', tags: ['files', 'file-manager', 'browser'] },
            { id: 'notes', name: 'Notes', category: 'applications', tags: ['notes', 'markdown', 'editor'] },
            { id: 'system-monitor', name: 'System Monitor', category: 'system-tools', tags: ['monitor', 'performance', 'system'] },
            { id: 'ai-integration', name: 'AI Integration', category: 'ai-hub', tags: ['ai', 'automation', 'analysis'] },
            { id: 'home-assistant', name: 'Home Assistant', category: 'smart-home', tags: ['home-assistant', 'smart-home', 'iot'] },
            { id: 'media-server', name: 'Media Server', category: 'media-hub', tags: ['media', 'jellyfin', 'streaming'] },
            { id: 'developer-tools', name: 'Developer Tools', category: 'development', tags: ['development', 'debugging', 'tools'] }
        ];

        // Filter out already used/favorited apps
        const usedAppIds = new Set([
            ...Object.keys(usage),
            ...preferences.favorites,
            ...preferences.recent
        ]);

        const unusedApps = allApps.filter(app => !usedAppIds.has(app.id));

        // Score unused apps based on various factors
        const scoredApps = unusedApps.map(app => {
            let score: number = Math.random() * 10; // Base random score

            // Boost score based on context
            if (context) {
                if (app.tags.some(tag => tag.toLowerCase().includes(context as string))) {
                    score += 20;
                }
                if (app.category.toLowerCase().includes(context as string)) {
                    score += 15;
                }
            }

            // Boost popular apps
            const globalUsage = Object.values(usage).reduce((sum: number, appUsage: any) => {
                if (appUsage.appId === app.id) return sum + Number(appUsage.count || 0);
                return sum;
            }, 0);
            score += Number(globalUsage) * 2;

            return { ...app, score };
        });

        // Sort by score and limit results
        const recommendationsList = scoredApps
            .sort((a, b) => b.score - a.score)
            .slice(0, parseInt(limit as string))
            .map(({ score, ...app }) => app);

        res.json(recommendationsList);
    } catch (error) {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

// Search applications
router.get('/search', async (req, res) => {
    try {
        const { q: query, category, limit = 20 } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // Get all available apps
        const allApps = [
            {
                id: 'terminal',
                name: 'Terminal',
                description: 'System terminal with shell access',
                category: 'applications',
                tags: ['terminal', 'shell', 'command-line'],
                keywords: ['cli', 'bash', 'zsh', 'console']
            },
            {
                id: 'files',
                name: 'Files',
                description: 'Browse and manage files',
                category: 'applications',
                tags: ['files', 'file-manager', 'browser'],
                keywords: ['explorer', 'directory', 'folder']
            },
            {
                id: 'system-monitor',
                name: 'System Monitor',
                description: 'Real-time system performance monitoring',
                category: 'system-tools',
                tags: ['monitor', 'performance', 'system'],
                keywords: ['task manager', 'resource monitor', 'cpu', 'memory']
            },
            {
                id: 'ai-integration',
                name: 'AI Integration',
                description: 'Smart file analysis and automation',
                category: 'ai-hub',
                tags: ['ai', 'automation', 'analysis'],
                keywords: ['machine learning', 'artificial intelligence', 'smart']
            }
        ];

        // Simple search implementation
        const searchLower = (query as string).toLowerCase();
        let results = allApps.filter(app =>
            app.name.toLowerCase().includes(searchLower) ||
            app.description.toLowerCase().includes(searchLower) ||
            app.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
            app.keywords.some(keyword => keyword.toLowerCase().includes(searchLower))
        );

        // Filter by category if specified
        if (category) {
            results = results.filter(app => app.category === category);
        }

        // Limit results
        results = results.slice(0, parseInt(limit as string));

        res.json(results);
    } catch (error) {
        console.error('Error searching apps:', error);
        res.status(500).json({ error: 'Failed to search apps' });
    }
});

router.post('/launch', (req, res) => {
    const { command, args, vncSessionId } = req.body;

    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    // Validate command type
    if (typeof command !== 'string') {
        return res.status(400).json({ error: 'Invalid command type' });
    }

    // SECURITY: VNC Session validation (if provided)
    let targetDisplay = null;
    if (vncSessionId && typeof vncSessionId === 'string') {
        // SECURITY: Validate VNC session ID format
        if (!vncSessionId.startsWith('vnc-')) {
            return res.status(400).json({ error: 'Invalid VNC session ID format' });
        }

        // Extract display number from VNC session or use default virtual display
        // For security, always use virtual display for VNC sessions
        targetDisplay = ':99'; // Default virtual display for VNC sessions
        console.log(`SECURITY: VNC session provided, app will launch on virtual display ${targetDisplay}`);
    }

    console.log(`Launching: ${command} ${args ? args.join(' ') : ''} ${targetDisplay ? `on ${targetDisplay}` : ''}`);

    try {
        // Whitelist common desktop apps
        const allowedCommands = ['firefox', 'chromium', 'thunar', 'nautilus', 'gedit', 'code', 'vlc', 'mpv', 'gimp', 'inkscape', 'libreoffice'];

        // Additional validation: command must be alphanumeric and common separators only
        if (!/^[a-zA-Z0-9._-]+$/.test(command)) {
            return res.status(400).json({ error: 'Invalid command format' });
        }

        if (!allowedCommands.includes(command)) {
          return res.status(400).json({ error: 'Command not allowed' });
        }

        // Validate and sanitize arguments
        let sanitizedArgs: string[] = [];
        if (args) {
            if (!Array.isArray(args)) {
                return res.status(400).json({ error: 'Arguments must be an array' });
            }

            // Limit number of arguments to prevent argument overflow
            if (args.length > 20) {
                return res.status(400).json({ error: 'Too many arguments' });
            }

            for (const arg of args) {
                const sanitized = sanitizeArgument(arg);
                if (sanitized === null) {
                    return res.status(400).json({ error: 'Invalid argument detected' });
                }
                sanitizedArgs.push(sanitized);
            }
        }

        // SECURITY: Set up environment for virtual desktop display
        const env = { ...process.env };

        if (targetDisplay) {
            // SECURITY: Force the app to use the virtual display
            env.DISPLAY = targetDisplay;

            // SECURITY: Additional security measures for VNC session isolation
            // Set XAUTHORITY to prevent access to other X sessions
            env.XAUTHORITY = `${process.env.HOME || '/tmp'}/.Xauthority-${targetDisplay.replace(':', '')}`;

            // SECURITY: Limit accessibility to virtual session
            env.DESKTOP_SESSION = 'vnc-session';
            env.SESSION_TYPE = 'vnc';

            console.log(`SECURITY: App will launch on virtual display ${targetDisplay}`);
        } else {
            // SECURITY: If no VNC session provided, use a safe default or refuse
            // Option 1: Use a dedicated virtual display
            // env.DISPLAY = ':99';

            // Option 2: Refuse to launch without VNC session context (more secure)
            return res.status(400).json({
                error: 'VNC session required for app launch',
                details: 'Applications can only be launched within VNC sessions for security reasons'
            });
        }

        const subprocess = spawn(command, sanitizedArgs, {
            detached: true,
            stdio: 'ignore',
            env: env
        });

        subprocess.unref();

        subprocess.on('error', (err) => {
            console.error(`Failed to launch ${command}:`, err);
        });

        subprocess.on('exit', (code, signal) => {
            console.log(`App ${command} exited with code ${code}, signal ${signal}`);
        });

        res.json({
            success: true,
            pid: subprocess.pid,
            display: targetDisplay,
            message: `App launched on virtual display ${targetDisplay}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to launch application' });
    }
});

export default router;
