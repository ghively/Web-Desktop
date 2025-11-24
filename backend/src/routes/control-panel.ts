import { Router } from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as si from 'systeminformation';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as dns from 'dns';

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
        const [osInfo, cpuInfo, memInfo] = await Promise.all([
            withTimeout(si.osInfo(), 5000),
            withTimeout(si.cpu(), 5000),
            withTimeout(si.mem(), 5000)
        ]);

        const timeInfo = si.time();

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

        // Get DNS servers using cross-platform approach
        let dnsServers: string[] = [];
        try {
            // Use Node.js dns.getServers() for cross-platform DNS server detection
            dnsServers = dns.getServers().filter(server =>
                server && (server.includes('.') || server.includes(':'))
            );
        } catch (error) {
            console.error('Error fetching DNS servers:', error);
            // Fallback to platform-specific commands
            if (os.platform() === 'linux') {
                try {
                    const { stdout } = await withTimeout(
                        execAsync('cat /etc/resolv.conf | grep nameserver | awk \'{print $2}\''),
                        3000
                    );
                    dnsServers = stdout.trim().split('\n').filter(Boolean);
                } catch (fallbackError) {
                    console.error('Fallback DNS fetch failed:', fallbackError);
                }
            } else if (os.platform() === 'win32') {
                try {
                    const { stdout } = await withTimeout(
                        execAsync('nslookup localhost 2>nul | findstr Server: | findstr /v "#"'),
                        3000
                    );
                    const lines = stdout.split('\n');
                    const serverLine = lines.find(line => line.includes('Server:'));
                    if (serverLine) {
                        const server = serverLine.split(':')[1]?.trim();
                        if (server) dnsServers = [server];
                    }
                } catch (fallbackError) {
                    console.error('Fallback DNS fetch failed:', fallbackError);
                }
            }
        }

        // Get default gateway using cross-platform approach
        let defaultGateway = '';
        try {
            // Try to find an interface with a default route (systeminformation doesn't expose gateway directly)
            // We'll rely on the platform-specific fallback commands for gateway information
            const activeInterface = networkInterfaces.find(iface =>
                iface.ip4 && !iface.internal && iface.operstate === 'up'
            );
            if (activeInterface) {
                console.log(`Found active interface: ${activeInterface.iface} (${activeInterface.ip4})`);
            }
        } catch (error) {
            console.error('Error analyzing network interfaces:', error);
        }

        // Fallback to platform-specific commands if systeminformation didn't provide gateway
        if (!defaultGateway) {
            try {
                if (os.platform() === 'linux') {
                    const { stdout } = await withTimeout(
                        execAsync('ip route | grep default | awk \'{print $3}\' | head -1'),
                        3000
                    );
                    defaultGateway = stdout.trim();
                } else if (os.platform() === 'win32') {
                    const { stdout } = await withTimeout(
                        execAsync('ipconfig | findstr "Default Gateway"'),
                        3000
                    );
                    const lines = stdout.split('\n');
                    const gatewayLine = lines.find(line => line.includes('Default Gateway'));
                    if (gatewayLine) {
                        const match = gatewayLine.match(/(\d+\.\d+\.\d+\.\d+)/);
                        if (match) defaultGateway = match[1];
                    }
                }
            } catch (fallbackError) {
                console.error('Fallback gateway fetch failed:', fallbackError);
            }
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
        let users: any[] = [];

        if (os.platform() === 'win32') {
            // Windows user management approach
            try {
                // Get user accounts using wmic
                const { stdout } = await withTimeout(
                    execAsync('wmic useraccount get name,fullname,sid /format:csv'),
                    5000
                );

                const lines = stdout.trim().split('\n').filter(line => line && !line.includes('Node,'));

                for (const line of lines) {
                    const parts = line.split(',');
                    if (parts.length >= 4) {
                        const username = parts[1];
                        const fullName = parts[2];
                        const sid = parts[3];

                        // Skip system accounts and disabled accounts
                        if (username &&
                            !['Administrator', 'Guest', 'DefaultAccount'].includes(username) &&
                            !username.endsWith('$') &&
                            !sid.startsWith('S-1-5-18') && // Local System
                            !sid.startsWith('S-1-5-19') && // Local Service
                            !sid.startsWith('S-1-5-20')) { // Network Service

                            try {
                                // Get user profile directory
                                const { stdout: profileOut } = await withTimeout(
                                    execAsync(`echo %USERPROFILE%`, { timeout: 2000 })
                                    .catch(() => ({ stdout: '' })), 3000
                                );

                                users.push({
                                    username,
                                    uid: sid, // Use SID as UID on Windows
                                    gid: sid, // Use SID as GID on Windows
                                    fullName: fullName || '',
                                    home: profileOut.trim() || `C:\\Users\\${username}`,
                                    shell: 'cmd.exe'
                                });
                            } catch (profileError) {
                                users.push({
                                    username,
                                    uid: sid,
                                    gid: sid,
                                    fullName: fullName || '',
                                    home: `C:\\Users\\${username}`,
                                    shell: 'cmd.exe'
                                });
                            }
                        }
                    }
                }
            } catch (windowsError) {
                console.error('Windows user fetch failed:', windowsError);
                // Fallback to basic user list
                users.push({
                    username: os.userInfo().username,
                    uid: os.userInfo().uid,
                    gid: os.userInfo().gid,
                    fullName: '',
                    home: os.userInfo().homedir,
                    shell: 'cmd.exe'
                });
            }
        } else {
            // Linux/Unix user management approach
            try {
                const { stdout } = await withTimeout(
                    execAsync('getent passwd | awk -F: \'$3 >= 1000 && $3 < 65534 {print $1":"$3":"$4":"$5":"$6":"$7}\''),
                    5000
                );

                users = stdout.trim().split('\n').filter(Boolean).map(line => {
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
            } catch (linuxError) {
                console.error('Linux user fetch failed:', linuxError);
                // Fallback to current user
                const userInfo = os.userInfo();
                users.push({
                    username: userInfo.username,
                    uid: userInfo.uid,
                    gid: userInfo.gid,
                    fullName: '',
                    home: userInfo.homedir,
                    shell: '/bin/bash'
                });
            }
        }

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

    // Adjust username validation for Windows (case insensitive, allows more characters)
    const isWindows = os.platform() === 'win32';
    const usernameRegex = isWindows
        ? /^[a-zA-Z0-9._-]{1,20}$/
        : /^[a-z_][a-z0-9_-]{0,31}$/;

    if (!usernameRegex.test(username)) {
        return res.status(400).json({
            error: 'Invalid username format',
            details: isWindows
                ? 'Username must be 1-20 characters, contain only letters, numbers, dots, hyphens, and underscores'
                : 'Username must start with lowercase letter or underscore, contain only lowercase letters, digits, underscores, and hyphens, and be max 32 characters'
        });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // SECURITY: Validate full name to prevent injection
    if (fullName !== undefined && typeof fullName === 'string') {
        if (!/^[a-zA-Z0-9\s\-_.,]+$/.test(fullName)) {
            return res.status(400).json({
                error: 'Invalid full name format',
                details: 'Full name contains invalid characters'
            });
        }
        if (fullName.length > 100) {
            return res.status(400).json({
                error: 'Full name too long',
                details: 'Full name must be less than 100 characters'
            });
        }
    }

    try {
        if (isWindows) {
            // Windows user creation
            try {
                // Check if user already exists using net user
                try {
                    await withTimeout(execAsync(`net user "${username}"`, { timeout: 3000 }), 4000);
                    return res.status(409).json({ error: 'User already exists' });
                } catch {
                    // User doesn't exist, continue
                }

                // Create user using net user command
                const createCmd = `net user "${username}" "${password}" /add`;
                if (fullName) {
                    await withTimeout(execAsync(`${createCmd} /fullname:"${fullName}"`, { timeout: 10000 }), 12000);
                } else {
                    await withTimeout(execAsync(createCmd, { timeout: 10000 }), 12000);
                }

                res.json({
                    success: true,
                    message: 'User created successfully on Windows',
                    user: { username, shell: 'cmd.exe', fullName: fullName || '' }
                });
            } catch (windowsError: any) {
                console.error('Windows user creation failed:', windowsError);
                return res.status(500).json({
                    error: 'Failed to create Windows user',
                    details: windowsError.message
                });
            }
        } else {
            // Linux/Unix user creation
            const validShells = ['/bin/bash', '/bin/sh', '/bin/zsh', '/usr/bin/fish', '/bin/false'];
            const userShell = validShells.includes(shell) ? shell : '/bin/bash';

            // Check if user already exists
            try {
                await withTimeout(execAsync(`id ${username}`, { timeout: 3000 }), 4000);
                return res.status(409).json({ error: 'User already exists' });
            } catch {
                // User doesn't exist, continue
            }

            // SECURITY: Use spawn with proper argument separation instead of shell command
            await new Promise<void>((resolve, reject) => {
                const args = ['-m', '-s', userShell];

                if (fullName) {
                    args.push('-c', fullName);
                }

                args.push(username);

                const useraddProcess = spawn('sudo', ['useradd', ...args], {
                    stdio: 'pipe',
                    timeout: 10000
                });

                useraddProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`useradd failed with exit code ${code}`));
                    }
                });

                useraddProcess.on('error', (error) => {
                    reject(new Error(`Failed to spawn useradd: ${error.message}`));
                });
            });

            // SECURITY: Set password more securely without using echo pipe
            await new Promise<void>((resolve, reject) => {
                const chpasswdProcess = spawn('sudo', ['chpasswd'], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    timeout: 5000
                });

                chpasswdProcess.stdin.write(`${username}:${password}\n`);
                chpasswdProcess.stdin.end();

                chpasswdProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`chpasswd failed with exit code ${code}`));
                    }
                });

                chpasswdProcess.on('error', (error) => {
                    reject(new Error(`Failed to spawn chpasswd: ${error.message}`));
                });
            });

            res.json({
                success: true,
                message: 'User created successfully on Linux',
                user: { username, shell: userShell, fullName: fullName || '' }
            });
        }
    } catch (error: any) {
        console.error('Error creating user:', error);
        res.status(500).json({
            error: 'Failed to create user',
            details: error.message
        });
    }
});

// 5. PUT /api/control-panel/users/:username - Modify user
router.put('/users/:username', async (req, res) => {
    const { username } = req.params;
    const { fullName, shell, password } = req.body;

    const isWindows = os.platform() === 'win32';
    const usernameRegex = isWindows
        ? /^[a-zA-Z0-9._-]{1,20}$/
        : /^[a-z_][a-z0-9_-]{0,31}$/;

    if (!usernameRegex.test(username)) {
        return res.status(400).json({ error: 'Invalid username format' });
    }

    try {
        if (isWindows) {
            // Windows user modification
            try {
                // Check if user exists
                try {
                    await withTimeout(execAsync(`net user "${username}"`, { timeout: 3000 }), 4000);
                } catch {
                    return res.status(404).json({ error: 'User not found' });
                }

                const updates: string[] = [];

                // Update full name
                if (fullName !== undefined && typeof fullName === 'string') {
                    if (!/^[a-zA-Z0-9\s\-_.,]+$/.test(fullName)) {
                        return res.status(400).json({
                            error: 'Invalid full name format',
                            details: 'Full name contains invalid characters'
                        });
                    }
                    if (fullName.length > 100) {
                        return res.status(400).json({
                            error: 'Full name too long',
                            details: 'Full name must be less than 100 characters'
                        });
                    }

                    await withTimeout(
                        execAsync(`net user "${username}" /fullname:"${fullName}"`),
                        5000
                    );
                    updates.push('full name');
                }

                // Update password
                if (password !== undefined && typeof password === 'string') {
                    if (password.length < 8) {
                        return res.status(400).json({ error: 'Password must be at least 8 characters' });
                    }

                    await withTimeout(
                        execAsync(`net user "${username}" "${password}"`),
                        5000
                    );
                    updates.push('password');
                }

                // Note: Shell concept doesn't apply to Windows users

                if (updates.length === 0) {
                    return res.status(400).json({ error: 'No valid updates provided' });
                }

                res.json({
                    success: true,
                    message: `Windows user updated successfully: ${updates.join(', ')}`,
                    updated: updates
                });
            } catch (windowsError: any) {
                console.error('Windows user update failed:', windowsError);
                res.status(500).json({
                    error: 'Failed to update Windows user',
                    details: windowsError.message
                });
            }
        } else {
            // Linux/Unix user modification
            try {
                // Check if user exists
                try {
                    await withTimeout(execAsync(`id ${username}`, { timeout: 3000 }), 4000);
                } catch {
                    return res.status(404).json({ error: 'User not found' });
                }

                const updates: string[] = [];

                // Update full name
                if (fullName !== undefined && typeof fullName === 'string') {
                    if (!/^[a-zA-Z0-9\s\-_.,]+$/.test(fullName)) {
                        return res.status(400).json({
                            error: 'Invalid full name format',
                            details: 'Full name contains invalid characters'
                        });
                    }
                    if (fullName.length > 100) {
                        return res.status(400).json({
                            error: 'Full name too long',
                            details: 'Full name must be less than 100 characters'
                        });
                    }

                    await new Promise<void>((resolve, reject) => {
                        const usermodProcess = spawn('sudo', ['usermod', '-c', fullName, username], {
                            stdio: 'pipe',
                            timeout: 5000
                        });

                        usermodProcess.on('close', (code) => {
                            if (code === 0) {
                                resolve();
                            } else {
                                reject(new Error(`usermod -c failed with exit code ${code}`));
                            }
                        });

                        usermodProcess.on('error', (error) => {
                            reject(new Error(`Failed to spawn usermod: ${error.message}`));
                        });
                    });
                    updates.push('full name');
                }

                // Update shell
                if (shell !== undefined) {
                    const validShells = ['/bin/bash', '/bin/sh', '/bin/zsh', '/usr/bin/fish', '/bin/false'];
                    if (!validShells.includes(shell)) {
                        return res.status(400).json({ error: 'Invalid shell', validShells });
                    }

                    await new Promise<void>((resolve, reject) => {
                        const usermodProcess = spawn('sudo', ['usermod', '-s', shell, username], {
                            stdio: 'pipe',
                            timeout: 5000
                        });

                        usermodProcess.on('close', (code) => {
                            if (code === 0) {
                                resolve();
                            } else {
                                reject(new Error(`usermod -s failed with exit code ${code}`));
                            }
                        });

                        usermodProcess.on('error', (error) => {
                            reject(new Error(`Failed to spawn usermod: ${error.message}`));
                        });
                    });
                    updates.push('shell');
                }

                // Update password
                if (password !== undefined && typeof password === 'string') {
                    if (password.length < 8) {
                        return res.status(400).json({ error: 'Password must be at least 8 characters' });
                    }

                    await new Promise<void>((resolve, reject) => {
                        const chpasswdProcess = spawn('sudo', ['chpasswd'], {
                            stdio: ['pipe', 'pipe', 'pipe'],
                            timeout: 5000
                        });

                        chpasswdProcess.stdin.write(`${username}:${password}\n`);
                        chpasswdProcess.stdin.end();

                        chpasswdProcess.on('close', (code) => {
                            if (code === 0) {
                                resolve();
                            } else {
                                reject(new Error(`chpasswd failed with exit code ${code}`));
                            }
                        });

                        chpasswdProcess.on('error', (error) => {
                            reject(new Error(`Failed to spawn chpasswd: ${error.message}`));
                        });
                    });
                    updates.push('password');
                }

                if (updates.length === 0) {
                    return res.status(400).json({ error: 'No valid updates provided' });
                }

                res.json({
                    success: true,
                    message: `Linux user updated successfully: ${updates.join(', ')}`,
                    updated: updates
                });
            } catch (linuxError: any) {
                console.error('Linux user update failed:', linuxError);
                res.status(500).json({
                    error: 'Failed to update Linux user',
                    details: linuxError.message
                });
            }
        }
    } catch (error: any) {
        console.error('Error updating user:', error);
        res.status(500).json({
            error: 'Failed to update user',
            details: error.message
        });
    }
});

// 6. DELETE /api/control-panel/users/:username - Delete user
router.delete('/users/:username', async (req, res) => {
    const { username } = req.params;
    const { removeHome } = req.query;

    const isWindows = os.platform() === 'win32';
    const usernameRegex = isWindows
        ? /^[a-zA-Z0-9._-]{1,20}$/
        : /^[a-z_][a-z0-9_-]{0,31}$/;

    if (!usernameRegex.test(username)) {
        return res.status(400).json({ error: 'Invalid username format' });
    }

    // Prevent deletion of current user
    const currentUser = process.env.USER || process.env.USERNAME || os.userInfo().username;
    if (username.toLowerCase() === currentUser.toLowerCase()) {
        return res.status(403).json({ error: 'Cannot delete current user' });
    }

    try {
        if (isWindows) {
            // Windows user deletion
            const protectedUsers = ['Administrator', 'Guest', 'DefaultAccount'];
            if (protectedUsers.includes(username)) {
                return res.status(403).json({ error: 'Cannot delete protected Windows user' });
            }

            try {
                // Check if user exists
                try {
                    await withTimeout(execAsync(`net user "${username}"`, { timeout: 3000 }), 4000);
                } catch {
                    return res.status(404).json({ error: 'User not found' });
                }

                // Delete user using net user
                await withTimeout(execAsync(`net user "${username}" /delete`, { timeout: 10000 }), 12000);

                // Note: removeHome concept on Windows is more complex and involves profile directories
                // We'll provide information about what would need to be done
                let profileMessage = '';
                if (removeHome === 'true') {
                    profileMessage = 'Note: User deleted. Manual deletion of profile directory (C:\\Users\\' + username + ') may be required.';
                }

                res.json({
                    success: true,
                    message: `Windows user deleted successfully. ${profileMessage}`,
                    removedHome: removeHome === 'true',
                    platform: 'Windows'
                });
            } catch (windowsError: any) {
                console.error('Windows user deletion failed:', windowsError);
                res.status(500).json({
                    error: 'Failed to delete Windows user',
                    details: windowsError.message
                });
            }
        } else {
            // Linux/Unix user deletion
            const protectedUsers = ['root', 'daemon', 'bin', 'sys', 'sync', 'games', 'man', 'lp', 'mail', 'news', 'uucp', 'proxy', 'www-data', 'backup', 'list', 'irc', 'gnats', 'nobody'];
            if (protectedUsers.includes(username)) {
                return res.status(403).json({ error: 'Cannot delete system user' });
            }

            try {
                // Check if user exists
                try {
                    await withTimeout(execAsync(`id ${username}`, { timeout: 3000 }), 4000);
                } catch {
                    return res.status(404).json({ error: 'User not found' });
                }

                // SECURITY: Use spawn with proper argument separation
                const args = [username];
                if (removeHome === 'true') {
                    args.unshift('-r');
                }

                await new Promise<void>((resolve, reject) => {
                    const userdelProcess = spawn('sudo', ['userdel', ...args], {
                        stdio: 'pipe',
                        timeout: 10000
                    });

                    userdelProcess.on('close', (code) => {
                        if (code === 0) {
                            resolve();
                        } else {
                            reject(new Error(`userdel failed with exit code ${code}`));
                        }
                    });

                    userdelProcess.on('error', (error) => {
                        reject(new Error(`Failed to spawn userdel: ${error.message}`));
                    });
                });

                res.json({
                    success: true,
                    message: 'Linux user deleted successfully',
                    removedHome: removeHome === 'true',
                    platform: 'Linux'
                });
            } catch (linuxError: any) {
                console.error('Linux user deletion failed:', linuxError);
                res.status(500).json({
                    error: 'Failed to delete Linux user',
                    details: linuxError.message
                });
            }
        }
    } catch (error: any) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            error: 'Failed to delete user',
            details: error.message
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
        // SECURITY: Use spawn with proper argument separation
        await new Promise<void>((resolve, reject) => {
            const systemctlProcess = spawn('sudo', ['systemctl', 'start', `${name}.service`], {
                stdio: 'pipe',
                timeout: 15000
            });

            systemctlProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`systemctl start failed with exit code ${code}`));
                }
            });

            systemctlProcess.on('error', (error) => {
                reject(new Error(`Failed to spawn systemctl: ${error.message}`));
            });
        });

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
            error: 'Failed to start service',
            details: error.message
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
        // SECURITY: Use spawn with proper argument separation
        await new Promise<void>((resolve, reject) => {
            const systemctlProcess = spawn('sudo', ['systemctl', 'stop', `${name}.service`], {
                stdio: 'pipe',
                timeout: 15000
            });

            systemctlProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`systemctl stop failed with exit code ${code}`));
                }
            });

            systemctlProcess.on('error', (error) => {
                reject(new Error(`Failed to spawn systemctl: ${error.message}`));
            });
        });

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
            error: 'Failed to stop service',
            details: error.message
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

    // SECURITY: Validate pretty hostname to prevent injection
    if (pretty !== undefined && typeof pretty === 'string') {
        if (!/^[a-zA-Z0-9\s\-_.,]+$/.test(pretty)) {
            return res.status(400).json({
                error: 'Invalid pretty hostname format',
                details: 'Pretty hostname contains invalid characters'
            });
        }
        if (pretty.length > 100) {
            return res.status(400).json({
                error: 'Pretty hostname too long',
                details: 'Pretty hostname must be less than 100 characters'
            });
        }
    }

    try {
        // SECURITY: Use spawn with proper argument separation
        const args = [hostname];
        if (pretty) {
            args.push('--pretty', pretty);
        }

        await new Promise<void>((resolve, reject) => {
            const hostnamectlProcess = spawn('sudo', ['hostnamectl', 'set-hostname', ...args], {
                stdio: 'pipe',
                timeout: 5000
            });

            hostnamectlProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`hostnamectl failed with exit code ${code}`));
                }
            });

            hostnamectlProcess.on('error', (error) => {
                reject(new Error(`Failed to spawn hostnamectl: ${error.message}`));
            });
        });

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
            error: 'Failed to set hostname',
            details: error.message
        });
    }
});

// Cleanup rate limit map periodically
setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((record, ip) => {
        if (now > record.resetTime) {
            rateLimitMap.delete(ip);
        }
    });
}, 60000); // Clean up every minute

// Settings management endpoints
router.get('/settings', async (req, res) => {
    try {
        const configPath = '/tmp/control-panel-settings.json';
        let settings = {
            theme: 'light',
            wallpaper: '',
            opacity: 0.95,
            enableSounds: false,
            soundVolume: 50,
            timezone: 'UTC',
            useNtp: true,
            hostname: os.hostname(),
            domain: '',
            language: 'en-US',
            autoUpdates: true,
            updateSchedule: 'weekly',
            useProxy: false,
            proxyUrl: '',
            proxyBypass: 'localhost,127.0.0.1,*.local',
            dnsPrimary: '8.8.8.8',
            dnsSecondary: '8.8.4.4',
            sshAuth: true,
            passwordComplexity: true,
            sessionTimeout: 30,
            autoCleanup: true,
            cleanupThreshold: 85,
            retainDays: 30,
            firewallEnabled: true,
            sudoPassword: true,
            fail2banEnabled: true,
            auditLog: true,
            gitUserName: '',
            gitUserEmail: '',
            gitEditor: 'nano'
        };

        try {
            const fileContent = await fs.readFile(configPath, 'utf-8');
            settings = { ...settings, ...JSON.parse(fileContent) };
        } catch (error) {
            // File doesn't exist, use defaults
        }

        res.json(settings);
    } catch (error: any) {
        console.error('Error loading settings:', error);
        res.status(500).json({
            error: 'Failed to load settings',
            details: error.message
        });
    }
});

router.post('/settings', async (req, res) => {
    try {
        const { settings } = req.body;
        const configPath = '/tmp/control-panel-settings.json';

        await fs.writeFile(configPath, JSON.stringify(settings, null, 2));

        res.json({ success: true, message: 'Settings saved successfully' });
    } catch (error: any) {
        console.error('Error saving settings:', error);
        res.status(500).json({
            error: 'Failed to save settings',
            details: error.message
        });
    }
});

// Backup and restore endpoints
router.get('/backups', async (req, res) => {
    try {
        const backupDir = '/tmp/control-panel-backups';
        const backups = [];

        try {
            await fs.mkdir(backupDir, { recursive: true });
            const files = await fs.readdir(backupDir);

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = `${backupDir}/${file}`;
                    const stats = await fs.stat(filePath);
                    backups.push({
                        id: file.replace('.json', ''),
                        name: file.replace('.json', '').replace(/-/g, ' '),
                        date: stats.mtime.toISOString(),
                        size: stats.size
                    });
                }
            }
        } catch (error) {
            // Directory doesn't exist, return empty list
        }

        backups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.json(backups);
    } catch (error: any) {
        console.error('Error loading backups:', error);
        res.status(500).json({
            error: 'Failed to load backups',
            details: error.message
        });
    }
});

router.post('/backup', async (req, res) => {
    try {
        const { name, include } = req.body;
        const backupId = name.toLowerCase().replace(/\s+/g, '-');
        const backupDir = '/tmp/control-panel-backups';
        const backupPath = `${backupDir}/${backupId}.json`;

        await fs.mkdir(backupDir, { recursive: true });

        const backupData: any = {
            id: backupId,
            name,
            date: new Date().toISOString(),
            include,
            settings: {},
            services: {},
            network: {},
            security: {}
        };

        if (include.system) {
            const configPath = '/tmp/control-panel-settings.json';
            try {
                const fileContent = await fs.readFile(configPath, 'utf-8');
                backupData.settings = JSON.parse(fileContent);
            } catch (error) {
                // Settings file doesn't exist
            }
        }

        if (include.users || include.network || include.security) {
            // In a real implementation, these would gather actual system data
            backupData.services = { example: { status: 'running' } };
            backupData.network = { interfaces: [] };
            backupData.security = { firewall: { enabled: true } };
        }

        await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

        res.json({ success: true, message: 'Backup created successfully', backupId });
    } catch (error: any) {
        console.error('Error creating backup:', error);
        res.status(500).json({
            error: 'Failed to create backup',
            details: error.message
        });
    }
});

router.post('/restore', async (req, res) => {
    try {
        const { backupId } = req.body;
        const backupPath = `/tmp/control-panel-backups/${backupId}.json`;

        const backupData = JSON.parse(await fs.readFile(backupPath, 'utf-8'));

        if (backupData.settings) {
            const configPath = '/tmp/control-panel-settings.json';
            await fs.writeFile(configPath, JSON.stringify(backupData.settings, null, 2));
        }

        // In a real implementation, this would restore services, network, and security settings

        res.json({ success: true, message: 'Settings restored successfully' });
    } catch (error: any) {
        console.error('Error restoring backup:', error);
        res.status(500).json({
            error: 'Failed to restore backup',
            details: error.message
        });
    }
});

// Diagnostic endpoints
router.get('/diagnostic/system/health', async (req, res) => {
    try {
        const loadAvg = os.loadavg();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memUsage = ((totalMem - freeMem) / totalMem) * 100;

        let status = 'good';
        if (memUsage > 90 || loadAvg[0] > os.cpus().length * 2) {
            status = 'critical';
        } else if (memUsage > 80 || loadAvg[0] > os.cpus().length) {
            status = 'warning';
        }

        res.json({
            status,
            message: `System health: ${status}`,
            details: {
                memoryUsage: memUsage.toFixed(2),
                loadAverage: loadAvg[0].toFixed(2),
                uptime: os.uptime()
            }
        });
    } catch (error: any) {
        res.json({
            status: 'error',
            message: 'Failed to check system health',
            details: { error: error.message }
        });
    }
});

router.get('/diagnostic/services/status', async (req, res) => {
    try {
        const services = ['ssh', 'nginx', 'docker', 'ufw'];
        const results = [];

        for (const service of services) {
            try {
                const { stdout } = await execAsync(`systemctl is-active ${service}`);
                results.push({ service, status: stdout.trim() });
            } catch (error) {
                results.push({ service, status: 'inactive' });
            }
        }

        const runningCount = results.filter(r => r.status === 'active').length;
        let status = 'good';
        if (runningCount < services.length * 0.5) {
            status = 'warning';
        }

        res.json({
            status,
            message: `${runningCount}/${services.length} services running`,
            details: { services: results }
        });
    } catch (error: any) {
        res.json({
            status: 'error',
            message: 'Failed to check service status',
            details: { error: error.message }
        });
    }
});

router.get('/diagnostic/storage/disk-health', async (req, res) => {
    try {
        const disks = await si.diskLayout();
        const fsData = await si.fsSize();
        let status = 'good';
        let issues = [];

        // Check file system usage
        for (const fs of fsData) {
            const usagePercent = (fs.used / fs.size) * 100;
            if (usagePercent > 95) {
                status = 'critical';
                issues.push(`${fs.fs} is ${usagePercent.toFixed(1)}% full`);
            } else if (usagePercent > 90) {
                status = status === 'critical' ? 'critical' : 'warning';
                issues.push(`${fs.fs} is ${usagePercent.toFixed(1)}% full`);
            }
        }

        // Check disk information
        for (const disk of disks) {
            if (disk.temperature && disk.temperature > 60) {
                status = status === 'critical' ? 'critical' : 'warning';
                issues.push(`Disk ${disk.device} temperature is ${disk.temperature}°C`);
            }
        }

        const message = issues.length > 0 ? issues.join('; ') : `Disk health: ${status}`;

        res.json({
            status,
            message,
            details: { disks, filesystems: fsData, issues }
        });
    } catch (error: any) {
        res.json({
            status: 'warning',
            message: 'Unable to check disk health',
            details: { error: error.message }
        });
    }
});

router.get('/diagnostic/network/health', async (req, res) => {
    try {
        const interfaces = await si.networkInterfaces();
        const activeInterfaces = interfaces.filter(iface => iface.operstate === 'up');

        let status = 'good';
        if (activeInterfaces.length === 0) {
            status = 'critical';
        } else if (activeInterfaces.length === 1 && activeInterfaces[0].type === 'wired' && !activeInterfaces[0].ip4) {
            status = 'warning';
        }

        res.json({
            status,
            message: `${activeInterfaces.length} network interfaces active`,
            details: { interfaces: activeInterfaces }
        });
    } catch (error: any) {
        res.json({
            status: 'error',
            message: 'Failed to check network health',
            details: { error: error.message }
        });
    }
});

router.get('/diagnostic/security/audit', async (req, res) => {
    try {
        const checks = [];
        let status = 'good';

        // Check if firewall is enabled
        try {
            const { stdout } = await execAsync('sudo ufw status');
            if (stdout.includes('Status: inactive')) {
                checks.push({ check: 'Firewall', status: 'fail', message: 'Firewall is disabled' });
                status = 'warning';
            } else {
                checks.push({ check: 'Firewall', status: 'pass', message: 'Firewall is enabled' });
            }
        } catch (error) {
            checks.push({ check: 'Firewall', status: 'unknown', message: 'Unable to check firewall status' });
        }

        // Check for failed login attempts
        try {
            const { stdout } = await execAsync('sudo journalctl -u ssh --since "1 day ago" | grep "Failed password" | wc -l');
            const failedAttempts = parseInt(stdout.trim());
            if (failedAttempts > 10) {
                checks.push({ check: 'Failed Logins', status: 'warning', message: `${failedAttempts} failed login attempts in last day` });
                status = status === 'good' ? 'warning' : status;
            } else {
                checks.push({ check: 'Failed Logins', status: 'pass', message: `${failedAttempts} failed login attempts in last day` });
            }
        } catch (error) {
            checks.push({ check: 'Failed Logins', status: 'unknown', message: 'Unable to check failed login attempts' });
        }

        res.json({
            status,
            message: `Security audit: ${status}`,
            details: { checks }
        });
    } catch (error: any) {
        res.json({
            status: 'error',
            message: 'Failed to run security audit',
            details: { error: error.message }
        });
    }
});

router.get('/diagnostic/system/performance', async (req, res) => {
    try {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const disk = await si.fsSize();

        const cpuUsage = cpu.currentLoad;
        const memUsage = (mem.used / mem.total) * 100;
        const diskUsage = (disk[0]?.used / disk[0]?.size) * 100 || 0;

        let status = 'good';
        if (cpuUsage > 90 || memUsage > 90 || diskUsage > 95) {
            status = 'critical';
        } else if (cpuUsage > 75 || memUsage > 80 || diskUsage > 85) {
            status = 'warning';
        }

        res.json({
            status,
            message: `Performance: ${status}`,
            details: {
                cpu: cpuUsage.toFixed(2),
                memory: memUsage.toFixed(2),
                disk: diskUsage.toFixed(2)
            }
        });
    } catch (error: any) {
        res.json({
            status: 'error',
            message: 'Failed to check system performance',
            details: { error: error.message }
        });
    }
});

// Extended service management endpoints
router.post('/services/start-all', async (req, res) => {
    try {
        const services = ['ssh', 'nginx'];
        const results = [];

        for (const service of services) {
            try {
                await execAsync(`sudo systemctl start ${service}`);
                results.push({ service, status: 'success', message: 'Started successfully' });
            } catch (error: any) {
                results.push({ service, status: 'error', message: error.message });
            }
        }

        res.json({ success: true, results });
    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to start services',
            details: error.message
        });
    }
});

router.post('/services/stop-all', async (req, res) => {
    try {
        const services = ['nginx', 'ssh'];
        const results = [];

        for (const service of services) {
            try {
                await execAsync(`sudo systemctl stop ${service}`);
                results.push({ service, status: 'success', message: 'Stopped successfully' });
            } catch (error: any) {
                results.push({ service, status: 'error', message: error.message });
            }
        }

        res.json({ success: true, results });
    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to stop services',
            details: error.message
        });
    }
});

router.post('/services/:name/restart', async (req, res) => {
    const serviceName = req.params.name;

    // Validate service name to prevent command injection
    if (!isValidServiceName(serviceName)) {
        return res.status(400).json({ error: 'Invalid service name' });
    }

    try {
        // SECURITY: Use spawn with proper argument separation instead of exec
        await new Promise<void>((resolve, reject) => {
            const systemctlProcess = spawn('sudo', ['systemctl', 'restart', `${serviceName}.service`], {
                stdio: 'pipe',
                timeout: 15000
            });

            systemctlProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`systemctl restart failed with exit code ${code}`));
                }
            });

            systemctlProcess.on('error', (error) => {
                reject(new Error(`Failed to spawn systemctl: ${error.message}`));
            });
        });

        res.json({ success: true, message: `Service ${serviceName} restarted successfully` });
    } catch (error: any) {
        res.status(500).json({
            error: `Failed to restart service ${serviceName}`,
            details: error.message
        });
    }
});

router.get('/services/:name/logs', async (req, res) => {
    try {
        const serviceName = req.params.name;
        const { stdout } = await execAsync(`sudo journalctl -u ${serviceName} --no-pager -n 100`);
        res.json({ logs: stdout });
    } catch (error: any) {
        res.status(500).json({
            error: `Failed to get logs for service ${req.params.name}`,
            details: error.message
        });
    }
});

router.post('/services/:name/logs/clear', async (req, res) => {
    try {
        const serviceName = req.params.name;
        await execAsync(`sudo journalctl -u ${serviceName} --vacuum-files=1`);
        res.json({ success: true, message: `Logs cleared for service ${serviceName}` });
    } catch (error: any) {
        res.status(500).json({
            error: `Failed to clear logs for service ${req.params.name}`,
            details: error.message
        });
    }
});

router.get('/services/:name/logs/download', async (req, res) => {
    try {
        const serviceName = req.params.name;
        const { stdout } = await execAsync(`sudo journalctl -u ${serviceName} --no-pager`);

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${serviceName}-logs.txt"`);
        res.send(stdout);
    } catch (error: any) {
        res.status(500).json({
            error: `Failed to download logs for service ${req.params.name}`,
            details: error.message
        });
    }
});

router.get('/services/:name/config', async (req, res) => {
    try {
        const serviceName = req.params.name;
        let configPath = '';

        switch (serviceName) {
            case 'ssh':
                configPath = '/etc/ssh/sshd_config';
                break;
            case 'nginx':
                configPath = '/etc/nginx/nginx.conf';
                break;
            default:
                throw new Error(`Unknown service: ${serviceName}`);
        }

        const content = await fs.readFile(configPath, 'utf-8');
        res.json({ content });
    } catch (error: any) {
        res.status(500).json({
            error: `Failed to get config for service ${req.params.name}`,
            details: error.message
        });
    }
});

router.post('/services/:name/config', async (req, res) => {
    try {
        const serviceName = req.params.name;
        const { content } = req.body;
        let configPath = '';

        switch (serviceName) {
            case 'ssh':
                configPath = '/tmp/sshd_config_backup';
                break;
            case 'nginx':
                configPath = '/tmp/nginx_config_backup';
                break;
            default:
                throw new Error(`Unknown service: ${serviceName}`);
        }

        await fs.writeFile(configPath, content);

        res.json({
            success: true,
            message: `Configuration saved for service ${serviceName}. Note: This is a backup file, not the active configuration.`
        });
    } catch (error: any) {
        res.status(500).json({
            error: `Failed to save config for service ${req.params.name}`,
            details: error.message
        });
    }
});

export default router;
