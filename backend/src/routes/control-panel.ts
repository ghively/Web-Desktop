import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';
import os from 'os';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const router = Router();

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW = 60000; // 1 minute in ms

// Rate limiting middleware
const rateLimit = (req: any, res: any, next: any) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return next();
    }

    const record = rateLimitMap.get(ip)!;

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + RATE_WINDOW;
        return next();
    }

    if (record.count >= RATE_LIMIT) {
        return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
    }

    record.count++;
    next();
};

// Timeout wrapper for async operations
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
        )
    ]);
};

// Input validation helpers
const isValidUsername = (username: string): boolean => {
    return /^[a-z_][a-z0-9_-]{0,31}$/.test(username);
};

const isValidHostname = (hostname: string): boolean => {
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(hostname);
};

const isValidServiceName = (name: string): boolean => {
    return /^[a-zA-Z0-9@._-]+$/.test(name);
};

// Apply rate limiting to all routes
router.use(rateLimit);

// 1. GET /api/control-panel/system - System info
router.get('/system', async (req, res) => {
    try {
        const [osInfo, cpuInfo, memInfo, timeInfo] = await Promise.all([
            withTimeout(si.osInfo(), 5000),
            withTimeout(si.cpu(), 5000),
            withTimeout(si.mem(), 5000),
            withTimeout(si.time(), 5000)
        ]);

        const uptime = os.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        res.json({
            os: {
                platform: osInfo.platform,
                distro: osInfo.distro,
                release: osInfo.release,
                codename: osInfo.codename,
                kernel: osInfo.kernel,
                arch: osInfo.arch
            },
            hostname: osInfo.hostname,
            uptime: {
                seconds: uptime,
                formatted: `${days}d ${hours}h ${minutes}m`
            },
            cpu: {
                manufacturer: cpuInfo.manufacturer,
                brand: cpuInfo.brand,
                cores: cpuInfo.cores,
                physicalCores: cpuInfo.physicalCores,
                speed: cpuInfo.speed
            },
            memory: {
                total: memInfo.total,
                free: memInfo.free,
                used: memInfo.used,
                active: memInfo.active
            },
            timezone: timeInfo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        });
    } catch (error: any) {
        console.error('Error fetching system info:', error);
        res.status(500).json({ error: 'Failed to fetch system information' });
    }
});

// 2. GET /api/control-panel/network - Network interfaces
router.get('/network', async (req, res) => {
    try {
        const [networkInterfaces, networkStats, networkConnections] = await Promise.all([
            withTimeout(si.networkInterfaces(), 5000),
            withTimeout(si.networkStats(), 5000),
            withTimeout(si.networkConnections(), 5000).catch(() => [])
        ]);

        // Get DNS servers
        let dnsServers: string[] = [];
        try {
            const { stdout } = await withTimeout(
                execAsync('cat /etc/resolv.conf | grep nameserver | awk \'{print $2}\''),
                3000
            );
            dnsServers = stdout.trim().split('\n').filter(Boolean);
        } catch (error) {
            console.error('Error fetching DNS servers:', error);
        }

        // Get default gateway
        let defaultGateway = '';
        try {
            const { stdout } = await withTimeout(
                execAsync('ip route | grep default | awk \'{print $3}\' | head -1'),
                3000
            );
            defaultGateway = stdout.trim();
        } catch (error) {
            console.error('Error fetching default gateway:', error);
        }

        res.json({
            interfaces: networkInterfaces.map(iface => ({
                name: iface.iface,
                ip4: iface.ip4,
                ip6: iface.ip6,
                mac: iface.mac,
                internal: iface.internal,
                virtual: iface.virtual,
                type: iface.type,
                speed: iface.speed,
                operstate: iface.operstate
            })),
            stats: networkStats,
            dnsServers,
            defaultGateway,
            activeConnections: networkConnections.length
        });
    } catch (error: any) {
        console.error('Error fetching network info:', error);
        res.status(500).json({ error: 'Failed to fetch network information' });
    }
});

// 3. GET /api/control-panel/users - List system users
router.get('/users', async (req, res) => {
    try {
        const { stdout } = await withTimeout(
            execAsync('getent passwd | awk -F: \'$3 >= 1000 && $3 < 65534 {print $1":"$3":"$4":"$5":"$6":"$7}\''),
            5000
        );

        const users = stdout.trim().split('\n').filter(Boolean).map(line => {
            const [username, uid, gid, gecos, home, shell] = line.split(':');
            return {
                username,
                uid: parseInt(uid),
                gid: parseInt(gid),
                fullName: gecos || '',
                home,
                shell
            };
        });

        res.json({ users });
    } catch (error: any) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch user list' });
    }
});

// 4. POST /api/control-panel/users - Create user
router.post('/users', async (req, res) => {
    const { username, password, fullName, shell } = req.body;

    // Validation
    if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username is required' });
    }

    if (!isValidUsername(username)) {
        return res.status(400).json({
            error: 'Invalid username format',
            details: 'Username must start with lowercase letter or underscore, contain only lowercase letters, digits, underscores, and hyphens, and be max 32 characters'
        });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const validShells = ['/bin/bash', '/bin/sh', '/bin/zsh', '/usr/bin/fish', '/bin/false'];
    const userShell = validShells.includes(shell) ? shell : '/bin/bash';

    try {
        // Check if user already exists
        try {
            await withTimeout(execAsync(`id ${username}`), 3000);
            return res.status(409).json({ error: 'User already exists' });
        } catch {
            // User doesn't exist, continue
        }

        // Create user with sudo
        const gecosFlag = fullName ? `-c "${fullName.replace(/"/g, '\\"')}"` : '';
        const createCommand = `sudo useradd -m -s ${userShell} ${gecosFlag} ${username}`;

        await withTimeout(execAsync(createCommand), 10000);

        // Set password
        const passwdCommand = `echo '${username}:${password}' | sudo chpasswd`;
        await withTimeout(execAsync(passwdCommand), 5000);

        res.json({
            success: true,
            message: 'User created successfully',
            user: { username, shell: userShell, fullName: fullName || '' }
        });
    } catch (error: any) {
        console.error('Error creating user:', error);
        res.status(500).json({
            error: 'Failed to create user'
        });
    }
});

// 5. PUT /api/control-panel/users/:username - Modify user
router.put('/users/:username', async (req, res) => {
    const { username } = req.params;
    const { fullName, shell, password } = req.body;

    if (!isValidUsername(username)) {
        return res.status(400).json({ error: 'Invalid username format' });
    }

    try {
        // Check if user exists
        try {
            await withTimeout(execAsync(`id ${username}`), 3000);
        } catch {
            return res.status(404).json({ error: 'User not found' });
        }

        const updates: string[] = [];

        // Update full name
        if (fullName !== undefined && typeof fullName === 'string') {
            const gecosCommand = `sudo usermod -c "${fullName.replace(/"/g, '\\"')}" ${username}`;
            await withTimeout(execAsync(gecosCommand), 5000);
            updates.push('full name');
        }

        // Update shell
        if (shell !== undefined) {
            const validShells = ['/bin/bash', '/bin/sh', '/bin/zsh', '/usr/bin/fish', '/bin/false'];
            if (!validShells.includes(shell)) {
                return res.status(400).json({ error: 'Invalid shell', validShells });
            }
            const shellCommand = `sudo usermod -s ${shell} ${username}`;
            await withTimeout(execAsync(shellCommand), 5000);
            updates.push('shell');
        }

        // Update password
        if (password !== undefined && typeof password === 'string') {
            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }
            const passwdCommand = `echo '${username}:${password}' | sudo chpasswd`;
            await withTimeout(execAsync(passwdCommand), 5000);
            updates.push('password');
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }

        res.json({
            success: true,
            message: `User updated successfully: ${updates.join(', ')}`,
            updated: updates
        });
    } catch (error: any) {
        console.error('Error updating user:', error);
        res.status(500).json({
            error: 'Failed to update user'
        });
    }
});

// 6. DELETE /api/control-panel/users/:username - Delete user
router.delete('/users/:username', async (req, res) => {
    const { username } = req.params;
    const { removeHome } = req.query;

    if (!isValidUsername(username)) {
        return res.status(400).json({ error: 'Invalid username format' });
    }

    // Prevent deletion of system users and current user
    const currentUser = process.env.USER || os.userInfo().username;
    if (username === currentUser) {
        return res.status(403).json({ error: 'Cannot delete current user' });
    }

    if (['root', 'daemon', 'bin', 'sys', 'sync', 'games', 'man', 'lp', 'mail', 'news', 'uucp', 'proxy', 'www-data', 'backup', 'list', 'irc', 'gnats', 'nobody'].includes(username)) {
        return res.status(403).json({ error: 'Cannot delete system user' });
    }

    try {
        // Check if user exists
        try {
            await withTimeout(execAsync(`id ${username}`), 3000);
        } catch {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete user
        const removeHomeFlag = removeHome === 'true' ? '-r' : '';
        const deleteCommand = `sudo userdel ${removeHomeFlag} ${username}`;
        await withTimeout(execAsync(deleteCommand), 10000);

        res.json({
            success: true,
            message: 'User deleted successfully',
            removedHome: removeHome === 'true'
        });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            error: 'Failed to delete user'
        });
    }
});

// 7. GET /api/control-panel/services - List system services
router.get('/services', async (req, res) => {
    try {
        // Get systemd services
        const { stdout } = await withTimeout(
            execAsync('systemctl list-units --type=service --all --no-pager --no-legend'),
            10000
        );

        const services = stdout.trim().split('\n').filter(Boolean).map(line => {
            const parts = line.trim().split(/\s+/);
            const name = parts[0];
            const load = parts[1];
            const active = parts[2];
            const sub = parts[3];
            const description = parts.slice(4).join(' ');

            return {
                name: name.replace('.service', ''),
                load,
                active,
                sub,
                description,
                running: active === 'active' && sub === 'running'
            };
        });

        res.json({ services });
    } catch (error: any) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Failed to fetch services', details: error.message });
    }
});

// 8. POST /api/control-panel/services/:name/start - Start service
router.post('/services/:name/start', async (req, res) => {
    const { name } = req.params;

    if (!isValidServiceName(name)) {
        return res.status(400).json({ error: 'Invalid service name' });
    }

    try {
        await withTimeout(
            execAsync(`sudo systemctl start ${name}.service`),
            15000
        );

        // Verify service started
        const { stdout } = await withTimeout(
            execAsync(`systemctl is-active ${name}.service`),
            3000
        );

        const isActive = stdout.trim() === 'active';

        res.json({
            success: true,
            message: `Service ${name} start command executed`,
            active: isActive
        });
    } catch (error: any) {
        console.error('Error starting service:', error);
        res.status(500).json({
            error: 'Failed to start service'
        });
    }
});

// 9. POST /api/control-panel/services/:name/stop - Stop service
router.post('/services/:name/stop', async (req, res) => {
    const { name } = req.params;

    if (!isValidServiceName(name)) {
        return res.status(400).json({ error: 'Invalid service name' });
    }

    try {
        await withTimeout(
            execAsync(`sudo systemctl stop ${name}.service`),
            15000
        );

        // Verify service stopped
        const { stdout } = await withTimeout(
            execAsync(`systemctl is-active ${name}.service`),
            3000
        ).catch(() => ({ stdout: 'inactive' }));

        const isActive = stdout.trim() === 'active';

        res.json({
            success: true,
            message: `Service ${name} stop command executed`,
            active: isActive
        });
    } catch (error: any) {
        console.error('Error stopping service:', error);
        res.status(500).json({
            error: 'Failed to stop service'
        });
    }
});

// 10. GET /api/control-panel/hostname - Get hostname
router.get('/hostname', async (req, res) => {
    try {
        const hostname = os.hostname();

        // Also get from hostnamectl for more info
        try {
            const { stdout } = await withTimeout(
                execAsync('hostnamectl'),
                3000
            );

            const lines = stdout.split('\n');
            const staticHostname = lines.find(l => l.includes('Static hostname'))?.split(':')[1]?.trim();
            const prettyHostname = lines.find(l => l.includes('Pretty hostname'))?.split(':')[1]?.trim();

            res.json({
                hostname,
                static: staticHostname || hostname,
                pretty: prettyHostname || ''
            });
        } catch {
            res.json({ hostname });
        }
    } catch (error: any) {
        console.error('Error fetching hostname:', error);
        res.status(500).json({ error: 'Failed to fetch hostname' });
    }
});

// 11. PUT /api/control-panel/hostname - Set hostname
router.put('/hostname', async (req, res) => {
    const { hostname, pretty } = req.body;

    if (!hostname || typeof hostname !== 'string') {
        return res.status(400).json({ error: 'Hostname is required' });
    }

    if (!isValidHostname(hostname)) {
        return res.status(400).json({
            error: 'Invalid hostname format',
            details: 'Hostname must contain only alphanumeric characters, hyphens, and dots'
        });
    }

    try {
        // Set hostname using hostnamectl
        let command = `sudo hostnamectl set-hostname ${hostname}`;

        if (pretty && typeof pretty === 'string') {
            command += ` --pretty "${pretty.replace(/"/g, '\\"')}"`;
        }

        await withTimeout(execAsync(command), 5000);

        // Verify
        const newHostname = os.hostname();

        res.json({
            success: true,
            message: 'Hostname updated successfully',
            hostname: newHostname,
            pretty: pretty || ''
        });
    } catch (error: any) {
        console.error('Error setting hostname:', error);
        res.status(500).json({
            error: 'Failed to set hostname'
        });
    }
});

// Cleanup rate limit map periodically
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
        if (now > record.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, 60000); // Clean up every minute

export default router;
