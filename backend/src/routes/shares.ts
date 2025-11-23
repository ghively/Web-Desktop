import { Router, Request, Response } from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const execAsync = promisify(exec);

// Configuration file paths
const NFS_EXPORTS_FILE = '/etc/exports';
const SMB_CONFIG_FILE = '/etc/samba/smb.conf';
const BACKUP_DIR = '/var/backups/web-desktop';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per minute for config changes
const RATE_WINDOW = 60000; // 1 minute

const checkRateLimit = (req: Request, res: Response, next: Function): void => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    let clientData = rateLimitMap.get(ip);

    if (!clientData || now > clientData.resetTime) {
        clientData = { count: 0, resetTime: now + RATE_WINDOW };
        rateLimitMap.set(ip, clientData);
    }

    if (clientData.count >= RATE_LIMIT) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return;
    }

    clientData.count++;
    next();
};

// Cleanup old rate limit entries
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
        if (now > data.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, RATE_WINDOW);

// Security: Validate path to prevent path traversal
const validateSharePath = (inputPath: string): string | null => {
    if (!inputPath || typeof inputPath !== 'string') {
        return null;
    }

    // Remove null bytes and control characters
    const sanitized = inputPath.replace(/[\x00-\x1F\x7F]/g, '');

    // Resolve path
    const resolvedPath = path.resolve(sanitized);

    // Prevent sharing system directories
    const forbiddenPaths = [
        '/etc',
        '/bin',
        '/sbin',
        '/usr/bin',
        '/usr/sbin',
        '/boot',
        '/sys',
        '/proc',
        '/dev',
        '/root'
    ];

    for (const forbidden of forbiddenPaths) {
        if (resolvedPath === forbidden || resolvedPath.startsWith(forbidden + '/')) {
            return null;
        }
    }

    // Prevent path traversal
    if (sanitized.includes('../') || sanitized.includes('..\\')) {
        return null;
    }

    return resolvedPath;
};

// Security: Validate network/host format for NFS
const validateNFSHost = (host: string): boolean => {
    if (!host || typeof host !== 'string') return false;

    // Allow: IP addresses, CIDR notation, hostnames, wildcards, or '*'
    const nfsHostPattern = /^(\*|[\w.-]+|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?)$/;
    return nfsHostPattern.test(host);
};

// Security: Validate share name for SMB
const validateShareName = (name: string): boolean => {
    if (!name || typeof name !== 'string') return false;

    // Only allow alphanumeric, underscore, hyphen (no spaces or special chars)
    const shareNamePattern = /^[a-zA-Z0-9_-]{1,80}$/;
    return shareNamePattern.test(name);
};

// Security: Validate username for Samba
const validateUsername = (username: string): boolean => {
    if (!username || typeof username !== 'string') return false;

    // Standard Linux username validation
    const usernamePattern = /^[a-z_]([a-z0-9_-]{0,31}|[a-z0-9_-]{0,30}\$)$/;
    return usernamePattern.test(username);
};

// Backup configuration file
const backupConfigFile = async (filePath: string): Promise<void> => {
    try {
        await fs.mkdir(BACKUP_DIR, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = path.basename(filePath);
        const backupPath = path.join(BACKUP_DIR, `${filename}.${timestamp}.bak`);

        await fs.copyFile(filePath, backupPath);

        // Keep only last 10 backups
        const backups = await fs.readdir(BACKUP_DIR);
        const relevantBackups = backups
            .filter(f => f.startsWith(filename))
            .sort()
            .reverse();

        for (let i = 10; i < relevantBackups.length; i++) {
            await fs.unlink(path.join(BACKUP_DIR, relevantBackups[i]));
        }
    } catch (error) {
        console.error('Backup failed:', error);
        throw new Error('Failed to backup configuration file');
    }
};

// Check if running as root/sudo
const checkPrivileges = async (): Promise<boolean> => {
    try {
        const { stdout } = await execAsync('id -u');
        return stdout.trim() === '0';
    } catch (error) {
        return false;
    }
};

// ============================================================================
// NFS ENDPOINTS
// ============================================================================

interface NFSShare {
    id: string;
    path: string;
    clients: string;
    options: string;
}

// Parse /etc/exports file
const parseNFSExports = async (): Promise<NFSShare[]> => {
    try {
        const content = await fs.readFile(NFS_EXPORTS_FILE, 'utf-8');
        const lines = content.split('\n');
        const shares: NFSShare[] = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Parse NFS export line: /path client(options)
            const match = trimmed.match(/^(\S+)\s+(.+)$/);
            if (match) {
                const [, sharePath, clientsAndOptions] = match;
                shares.push({
                    id: Buffer.from(sharePath).toString('base64'),
                    path: sharePath,
                    clients: clientsAndOptions.split(/\s+/)[0] || '*',
                    options: clientsAndOptions
                });
            }
        }

        return shares;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
};

// GET /api/shares/nfs - List NFS shares
router.get('/nfs', async (req: Request, res: Response) => {
    try {
        // Check if NFS is installed
        try {
            await execAsync('which exportfs', { timeout: 5000 });
        } catch {
            return res.status(503).json({
                error: 'NFS server not installed. Please install nfs-kernel-server package.'
            });
        }

        const shares = await parseNFSExports();
        res.json({ shares });
    } catch (error: any) {
        console.error('NFS list error:', error);
        res.status(500).json({ error: 'Failed to list NFS shares' });
    }
});

// POST /api/shares/nfs - Create NFS share
router.post('/nfs', checkRateLimit, async (req: Request, res: Response) => {
    const { path: sharePath, clients, options } = req.body;

    if (!sharePath || !clients) {
        return res.status(400).json({
            error: 'Missing required fields: path, clients'
        });
    }

    // Validate inputs
    const validatedPath = validateSharePath(sharePath);
    if (!validatedPath) {
        return res.status(400).json({ error: 'Invalid share path' });
    }

    if (!validateNFSHost(clients)) {
        return res.status(400).json({ error: 'Invalid client/network format' });
    }

    // Validate options
    const validOptions = ['ro', 'rw', 'sync', 'async', 'no_subtree_check',
                         'no_root_squash', 'root_squash', 'all_squash'];
    const optionList = (options || 'ro,sync,no_subtree_check').split(',');

    for (const opt of optionList) {
        if (!validOptions.includes(opt.trim())) {
            return res.status(400).json({ error: `Invalid option: ${opt}` });
        }
    }

    try {
        // Check privileges
        if (!await checkPrivileges()) {
            return res.status(403).json({
                error: 'Requires root privileges. Please run backend with sudo.'
            });
        }

        // Check if path exists and is a directory
        const stats = await fs.stat(validatedPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Path is not a directory' });
        }

        // Backup configuration
        await backupConfigFile(NFS_EXPORTS_FILE);

        // Read current exports
        let exportsContent = '';
        try {
            exportsContent = await fs.readFile(NFS_EXPORTS_FILE, 'utf-8');
        } catch (error: any) {
            if (error.code !== 'ENOENT') throw error;
        }

        // Check if share already exists
        if (exportsContent.includes(validatedPath)) {
            return res.status(409).json({
                error: 'Share already exists for this path'
            });
        }

        // Add new export
        const newExport = `${validatedPath} ${clients}(${optionList.join(',')})\n`;
        exportsContent += newExport;

        // Write configuration
        await fs.writeFile(NFS_EXPORTS_FILE, exportsContent, 'utf-8');

        // Apply changes
        await execAsync('exportfs -ra', { timeout: 10000 });

        res.json({
            success: true,
            message: 'NFS share created successfully',
            share: {
                id: Buffer.from(validatedPath).toString('base64'),
                path: validatedPath,
                clients,
                options: optionList.join(',')
            }
        });
    } catch (error: any) {
        console.error('NFS create error:', error);

        if (error.code === 'EACCES') {
            return res.status(403).json({ error: 'Permission denied' });
        }
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Path does not exist' });
        }

        res.status(500).json({ error: 'Failed to create NFS share' });
    }
});

// PUT /api/shares/nfs/:id - Modify NFS share
router.put('/nfs/:id', checkRateLimit, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { clients, options } = req.body;

    if (!clients && !options) {
        return res.status(400).json({
            error: 'At least one field required: clients or options'
        });
    }

    try {
        // Check privileges
        if (!await checkPrivileges()) {
            return res.status(403).json({
                error: 'Requires root privileges. Please run backend with sudo.'
            });
        }

        // Decode path from ID
        const sharePath = Buffer.from(id, 'base64').toString('utf-8');
        const validatedPath = validateSharePath(sharePath);

        if (!validatedPath) {
            return res.status(400).json({ error: 'Invalid share ID' });
        }

        // Validate inputs if provided
        if (clients && !validateNFSHost(clients)) {
            return res.status(400).json({ error: 'Invalid client/network format' });
        }

        // Backup configuration
        await backupConfigFile(NFS_EXPORTS_FILE);

        // Read and parse exports
        const exportsContent = await fs.readFile(NFS_EXPORTS_FILE, 'utf-8');
        const lines = exportsContent.split('\n');
        let found = false;

        const newLines = lines.map(line => {
            if (line.trim().startsWith(validatedPath + ' ')) {
                found = true;

                // Parse current settings
                const match = line.match(/^(\S+)\s+(\S+)\((.+)\)$/);
                if (match) {
                    const [, path, currentClients, currentOptions] = match;
                    const newClients = clients || currentClients;
                    const newOptions = options || currentOptions;
                    return `${path} ${newClients}(${newOptions})`;
                }
            }
            return line;
        });

        if (!found) {
            return res.status(404).json({ error: 'NFS share not found' });
        }

        // Write updated configuration
        await fs.writeFile(NFS_EXPORTS_FILE, newLines.join('\n'), 'utf-8');

        // Apply changes
        await execAsync('exportfs -ra', { timeout: 10000 });

        res.json({ success: true, message: 'NFS share updated successfully' });
    } catch (error: any) {
        console.error('NFS update error:', error);
        res.status(500).json({ error: 'Failed to update NFS share' });
    }
});

// DELETE /api/shares/nfs/:id - Delete NFS share
router.delete('/nfs/:id', checkRateLimit, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Check privileges
        if (!await checkPrivileges()) {
            return res.status(403).json({
                error: 'Requires root privileges. Please run backend with sudo.'
            });
        }

        // Decode path from ID
        const sharePath = Buffer.from(id, 'base64').toString('utf-8');
        const validatedPath = validateSharePath(sharePath);

        if (!validatedPath) {
            return res.status(400).json({ error: 'Invalid share ID' });
        }

        // Backup configuration
        await backupConfigFile(NFS_EXPORTS_FILE);

        // Read and filter exports
        const exportsContent = await fs.readFile(NFS_EXPORTS_FILE, 'utf-8');
        const lines = exportsContent.split('\n');
        let found = false;

        const newLines = lines.filter(line => {
            if (line.trim().startsWith(validatedPath + ' ')) {
                found = true;
                return false;
            }
            return true;
        });

        if (!found) {
            return res.status(404).json({ error: 'NFS share not found' });
        }

        // Write updated configuration
        await fs.writeFile(NFS_EXPORTS_FILE, newLines.join('\n'), 'utf-8');

        // Apply changes
        await execAsync('exportfs -ra', { timeout: 10000 });

        res.json({ success: true, message: 'NFS share deleted successfully' });
    } catch (error: any) {
        console.error('NFS delete error:', error);
        res.status(500).json({ error: 'Failed to delete NFS share' });
    }
});

// POST /api/shares/nfs/reload - Reload NFS exports
router.post('/nfs/reload', checkRateLimit, async (req: Request, res: Response) => {
    try {
        // Check privileges
        if (!await checkPrivileges()) {
            return res.status(403).json({
                error: 'Requires root privileges. Please run backend with sudo.'
            });
        }

        await execAsync('exportfs -ra', { timeout: 10000 });
        res.json({ success: true, message: 'NFS exports reloaded successfully' });
    } catch (error: any) {
        console.error('NFS reload error:', error);
        res.status(500).json({ error: 'Failed to reload NFS exports' });
    }
});

// ============================================================================
// SMB/SAMBA ENDPOINTS
// ============================================================================

interface SMBShare {
    id: string;
    name: string;
    path: string;
    comment?: string;
    browseable?: string;
    writable?: string;
    validUsers?: string;
    guestOk?: string;
}

// Parse smb.conf file
const parseSMBConfig = async (): Promise<SMBShare[]> => {
    try {
        const content = await fs.readFile(SMB_CONFIG_FILE, 'utf-8');
        const shares: SMBShare[] = [];

        let currentShare: Partial<SMBShare> | null = null;

        for (const line of content.split('\n')) {
            const trimmed = line.trim();

            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;

            // Section header [share_name]
            const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
            if (sectionMatch) {
                // Save previous share
                if (currentShare && currentShare.name && currentShare.path) {
                    shares.push(currentShare as SMBShare);
                }

                const shareName = sectionMatch[1];

                // Skip global and special sections
                if (shareName === 'global' || shareName === 'homes' || shareName === 'printers') {
                    currentShare = null;
                } else {
                    currentShare = {
                        id: Buffer.from(shareName).toString('base64'),
                        name: shareName
                    };
                }
                continue;
            }

            // Property = value
            if (currentShare) {
                const propMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
                if (propMatch) {
                    const [, key, value] = propMatch;
                    const lowerKey = key.toLowerCase().replace(/\s/g, '');

                    if (lowerKey === 'path') currentShare.path = value.trim();
                    else if (lowerKey === 'comment') currentShare.comment = value.trim();
                    else if (lowerKey === 'browseable') currentShare.browseable = value.trim();
                    else if (lowerKey === 'writable' || lowerKey === 'writeable') {
                        currentShare.writable = value.trim();
                    }
                    else if (lowerKey === 'validusers') currentShare.validUsers = value.trim();
                    else if (lowerKey === 'guestok') currentShare.guestOk = value.trim();
                }
            }
        }

        // Save last share
        if (currentShare && currentShare.name && currentShare.path) {
            shares.push(currentShare as SMBShare);
        }

        return shares;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
};

// GET /api/shares/smb - List Samba shares
router.get('/smb', async (req: Request, res: Response) => {
    try {
        // Check if Samba is installed
        try {
            await execAsync('which smbcontrol', { timeout: 5000 });
        } catch {
            return res.status(503).json({
                error: 'Samba not installed. Please install samba package.'
            });
        }

        const shares = await parseSMBConfig();
        res.json({ shares });
    } catch (error: any) {
        console.error('SMB list error:', error);
        res.status(500).json({ error: 'Failed to list SMB shares' });
    }
});

// POST /api/shares/smb - Create Samba share
router.post('/smb', checkRateLimit, async (req: Request, res: Response) => {
    const { name, path: sharePath, comment, browseable, writable, validUsers, guestOk } = req.body;

    if (!name || !sharePath) {
        return res.status(400).json({
            error: 'Missing required fields: name, path'
        });
    }

    // Validate inputs
    if (!validateShareName(name)) {
        return res.status(400).json({
            error: 'Invalid share name. Use only alphanumeric, underscore, hyphen.'
        });
    }

    const validatedPath = validateSharePath(sharePath);
    if (!validatedPath) {
        return res.status(400).json({ error: 'Invalid share path' });
    }

    try {
        // Check privileges
        if (!await checkPrivileges()) {
            return res.status(403).json({
                error: 'Requires root privileges. Please run backend with sudo.'
            });
        }

        // Check if path exists and is a directory
        const stats = await fs.stat(validatedPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Path is not a directory' });
        }

        // Backup configuration
        await backupConfigFile(SMB_CONFIG_FILE);

        // Read current config
        let configContent = '';
        try {
            configContent = await fs.readFile(SMB_CONFIG_FILE, 'utf-8');
        } catch (error: any) {
            if (error.code !== 'ENOENT') throw error;
        }

        // Check if share already exists
        if (configContent.includes(`[${name}]`)) {
            return res.status(409).json({
                error: 'Share already exists with this name'
            });
        }

        // Build new share configuration
        const shareConfig = [
            '',
            `[${name}]`,
            `   path = ${validatedPath}`,
            comment ? `   comment = ${comment}` : '',
            `   browseable = ${browseable || 'yes'}`,
            `   writable = ${writable || 'no'}`,
            validUsers ? `   valid users = ${validUsers}` : '',
            guestOk ? `   guest ok = ${guestOk}` : '',
            '   create mask = 0644',
            '   directory mask = 0755',
        ].filter(line => line).join('\n');

        configContent += '\n' + shareConfig + '\n';

        // Write configuration
        await fs.writeFile(SMB_CONFIG_FILE, configContent, 'utf-8');

        // Reload Samba
        await execAsync('smbcontrol all reload-config', { timeout: 10000 });

        res.json({
            success: true,
            message: 'SMB share created successfully',
            share: {
                id: Buffer.from(name).toString('base64'),
                name,
                path: validatedPath,
                comment,
                browseable,
                writable,
                validUsers,
                guestOk
            }
        });
    } catch (error: any) {
        console.error('SMB create error:', error);

        if (error.code === 'EACCES') {
            return res.status(403).json({ error: 'Permission denied' });
        }
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Path does not exist' });
        }

        res.status(500).json({ error: 'Failed to create SMB share' });
    }
});

// PUT /api/shares/smb/:id - Modify Samba share
router.put('/smb/:id', checkRateLimit, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { comment, browseable, writable, validUsers, guestOk } = req.body;

    try {
        // Check privileges
        if (!await checkPrivileges()) {
            return res.status(403).json({
                error: 'Requires root privileges. Please run backend with sudo.'
            });
        }

        // Decode share name from ID
        const shareName = Buffer.from(id, 'base64').toString('utf-8');

        if (!validateShareName(shareName)) {
            return res.status(400).json({ error: 'Invalid share ID' });
        }

        // Backup configuration
        await backupConfigFile(SMB_CONFIG_FILE);

        // Read and parse config
        const configContent = await fs.readFile(SMB_CONFIG_FILE, 'utf-8');
        const lines = configContent.split('\n');
        let inTargetShare = false;
        let found = false;

        const newLines = lines.map(line => {
            const trimmed = line.trim();

            // Check for section header
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                const section = trimmed.slice(1, -1);
                inTargetShare = section === shareName;
                if (inTargetShare) found = true;
                return line;
            }

            // Modify properties in target share
            if (inTargetShare && trimmed.match(/^(\w+)\s*=/)) {
                const key = trimmed.split('=')[0].trim().toLowerCase();

                if (key === 'comment' && comment !== undefined) {
                    return `   comment = ${comment}`;
                }
                if (key === 'browseable' && browseable !== undefined) {
                    return `   browseable = ${browseable}`;
                }
                if ((key === 'writable' || key === 'writeable') && writable !== undefined) {
                    return `   writable = ${writable}`;
                }
                if (key === 'valid users' && validUsers !== undefined) {
                    return `   valid users = ${validUsers}`;
                }
                if (key === 'guest ok' && guestOk !== undefined) {
                    return `   guest ok = ${guestOk}`;
                }
            }

            return line;
        });

        if (!found) {
            return res.status(404).json({ error: 'SMB share not found' });
        }

        // Write updated configuration
        await fs.writeFile(SMB_CONFIG_FILE, newLines.join('\n'), 'utf-8');

        // Reload Samba
        await execAsync('smbcontrol all reload-config', { timeout: 10000 });

        res.json({ success: true, message: 'SMB share updated successfully' });
    } catch (error: any) {
        console.error('SMB update error:', error);
        res.status(500).json({ error: 'Failed to update SMB share' });
    }
});

// DELETE /api/shares/smb/:id - Delete Samba share
router.delete('/smb/:id', checkRateLimit, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Check privileges
        if (!await checkPrivileges()) {
            return res.status(403).json({
                error: 'Requires root privileges. Please run backend with sudo.'
            });
        }

        // Decode share name from ID
        const shareName = Buffer.from(id, 'base64').toString('utf-8');

        if (!validateShareName(shareName)) {
            return res.status(400).json({ error: 'Invalid share ID' });
        }

        // Backup configuration
        await backupConfigFile(SMB_CONFIG_FILE);

        // Read and parse config
        const configContent = await fs.readFile(SMB_CONFIG_FILE, 'utf-8');
        const lines = configContent.split('\n');
        let inTargetShare = false;
        let found = false;

        const newLines = lines.filter(line => {
            const trimmed = line.trim();

            // Check for section header
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                const section = trimmed.slice(1, -1);

                if (section === shareName) {
                    found = true;
                    inTargetShare = true;
                    return false; // Remove section header
                } else {
                    inTargetShare = false;
                }
            }

            // Remove lines in target share
            if (inTargetShare) {
                return false;
            }

            return true;
        });

        if (!found) {
            return res.status(404).json({ error: 'SMB share not found' });
        }

        // Write updated configuration
        await fs.writeFile(SMB_CONFIG_FILE, newLines.join('\n'), 'utf-8');

        // Reload Samba
        await execAsync('smbcontrol all reload-config', { timeout: 10000 });

        res.json({ success: true, message: 'SMB share deleted successfully' });
    } catch (error: any) {
        console.error('SMB delete error:', error);
        res.status(500).json({ error: 'Failed to delete SMB share' });
    }
});

// POST /api/shares/smb/reload - Reload Samba configuration
router.post('/smb/reload', checkRateLimit, async (req: Request, res: Response) => {
    try {
        // Check privileges
        if (!await checkPrivileges()) {
            return res.status(403).json({
                error: 'Requires root privileges. Please run backend with sudo.'
            });
        }

        await execAsync('smbcontrol all reload-config', { timeout: 10000 });
        res.json({ success: true, message: 'Samba configuration reloaded successfully' });
    } catch (error: any) {
        console.error('SMB reload error:', error);
        res.status(500).json({ error: 'Failed to reload Samba configuration' });
    }
});

// GET /api/shares/smb/users - List Samba users
router.get('/smb/users', async (req: Request, res: Response) => {
    try {
        // Check privileges
        if (!await checkPrivileges()) {
            return res.status(403).json({
                error: 'Requires root privileges. Please run backend with sudo.'
            });
        }

        const { stdout } = await execAsync('pdbedit -L', { timeout: 10000 });

        const users = stdout
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                // Format: username:UID:...
                const parts = line.split(':');
                return {
                    username: parts[0],
                    uid: parts[1]
                };
            });

        res.json({ users });
    } catch (error: any) {
        console.error('SMB users list error:', error);

        if (error.message.includes('command not found')) {
            return res.status(503).json({ error: 'Samba tools not available' });
        }

        res.status(500).json({ error: 'Failed to list Samba users' });
    }
});

// POST /api/shares/smb/users - Create Samba user
router.post('/smb/users', checkRateLimit, async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            error: 'Missing required fields: username, password'
        });
    }

    // Validate username
    if (!validateUsername(username)) {
        return res.status(400).json({
            error: 'Invalid username. Use lowercase letters, numbers, underscore, hyphen.'
        });
    }

    // Validate password strength
    if (password.length < 8) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters'
        });
    }

    try {
        // Check privileges
        if (!await checkPrivileges()) {
            return res.status(403).json({
                error: 'Requires root privileges. Please run backend with sudo.'
            });
        }

        // Check if Linux user exists
        try {
            await execAsync(`id ${username}`, { timeout: 5000 });
        } catch {
            return res.status(400).json({
                error: 'Linux user does not exist. Create Linux user first.'
            });
        }

        // Add Samba user with password
        const smbpasswdProcess = spawn('sudo', ['smbpasswd', '-a', '-s', username], {
            stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
            timeout: 10000
        });

        smbpasswdProcess.stdin.write(`${password}\n`);
        smbpasswdProcess.stdin.write(`${password}\n`);
        smbpasswdProcess.stdin.end();

        let stdout = '';
        let stderr = '';
        smbpasswdProcess.stdout.on('data', (data) => { stdout += data.toString(); });
        smbpasswdProcess.stderr.on('data', (data) => { stderr += data.toString(); });

        await new Promise<void>((resolve, reject) => {
            smbpasswdProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error('Failed to create Samba user (smbpasswd process failed)'));
                }
            });
            smbpasswdProcess.on('error', (err) => {
                reject(new Error('Failed to create Samba user (spawn process failed)'));
            });
        });

        res.json({
            success: true,
            message: 'Samba user created successfully',
            username
        });
    } catch (error: any) {
        console.error('SMB user create error:', error);

        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: 'Samba user already exists' });
        }

        res.status(500).json({ error: 'Failed to create Samba user' });
    }
});

export default router;
