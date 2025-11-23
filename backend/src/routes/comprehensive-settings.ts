import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const router = express.Router();

// Rate limiting for settings API
const settingsLimiter = new RateLimiterMemory({
  points: 30, // 30 requests per window
  duration: 60, // per 1 minute window
  blockDuration: 60, // block for 1 minute if exceeded
});

// Settings storage directory
const SETTINGS_DIR = process.env.SETTINGS_DIR || '/tmp/webdesktop-settings';

// Ensure settings directory exists
async function ensureSettingsDir() {
  try {
    await fs.mkdir(SETTINGS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create settings directory:', error);
  }
}

// Load settings from file
async function loadSettings(category?: string): Promise<any> {
  try {
    await ensureSettingsDir();

    if (category) {
      const filePath = path.join(SETTINGS_DIR, `${category}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } else {
      // Load all settings
      const settings: any = {};
      const files = await fs.readdir(SETTINGS_DIR);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const category = file.replace('.json', '');
          const filePath = path.join(SETTINGS_DIR, file);
          const data = await fs.readFile(filePath, 'utf8');
          settings[category] = JSON.parse(data);
        }
      }

      return settings;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    return category ? {} : {};
  }
}

// Save settings to file
async function saveSettings(category: string, settings: any): Promise<void> {
  try {
    await ensureSettingsDir();
    const filePath = path.join(SETTINGS_DIR, `${category}.json`);
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw new Error(`Failed to save ${category} settings`);
  }
}

// Get system information
async function getSystemInfo() {
  return new Promise((resolve, reject) => {
    const commands = {
      hostname: 'hostname',
      platform: 'uname -s',
      release: 'uname -r',
      arch: 'uname -m',
      uptime: 'uptime',
      memory: 'free -m',
      disk: 'df -h',
      cpu: 'nproc',
      timestamp: 'date "+%Y-%m-%d %H:%M:%S"'
    };

    const results: any = {};
    let completed = 0;
    const total = Object.keys(commands).length;

    Object.entries(commands).forEach(([key, command]) => {
      exec(command, { encoding: 'utf8' }, (error, stdout) => {
        if (error) {
          results[key] = `Error: ${error.message}`;
        } else {
          results[key] = stdout.trim();
        }

        completed++;
        if (completed === total) {
          resolve(results);
        }
      });
    });
  });
}

// Middleware for rate limiting
router.use(async (req, res, next) => {
  try {
    await settingsLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }
});

// Get all settings or specific category
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const settings = await loadSettings(category as string);
    res.json(settings);
  } catch (error) {
    console.error('Error loading settings:', error);
    res.status(500).json({
      error: 'Failed to load settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update settings
router.put('/', async (req, res) => {
  try {
    const { category, settings } = req.body;

    if (!category || !settings) {
      return res.status(400).json({
        error: 'Category and settings are required'
      });
    }

    // Validate settings based on category
    const validatedSettings = validateSettings(category, settings);

    await saveSettings(category, validatedSettings);

    res.json({
      success: true,
      message: `${category} settings updated successfully`
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get system information
router.get('/system/info', async (req, res) => {
  try {
    const systemInfo = await getSystemInfo();
    res.json(systemInfo);
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({
      error: 'Failed to get system information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update system settings
router.put('/system', async (req, res) => {
  try {
    const settings = req.body;
    const validatedSettings = validateSettings('system', settings);

    // Apply system settings (hostname, timezone, etc.)
    if (validatedSettings.hostname) {
      // Update hostname (requires sudo)
      // spawn('sudo', ['hostname', validatedSettings.hostname]);
    }

    await saveSettings('system', validatedSettings);

    res.json({
      success: true,
      message: 'System settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({
      error: 'Failed to update system settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get users
router.get('/users', async (req, res) => {
  try {
    // For now, return mock user data
    // In a real implementation, this would query the system's user database
    const users = [
      {
        id: '1',
        username: 'admin',
        displayName: 'Administrator',
        email: 'admin@example.com',
        role: 'admin',
        shell: '/bin/bash',
        homeDirectory: '/home/admin',
        uid: 1000,
        gid: 1000,
        isActive: true,
        permissions: {
          canAccessTerminal: true,
          canManageFiles: true,
          canManageUsers: true,
          canManageSystem: true,
          canManageNetwork: true,
          canManageStorage: true,
          canInstallApps: true,
          canViewSystemInfo: true
        },
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }
    ];

    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create user
router.post('/users', async (req, res) => {
  try {
    const user = req.body;

    // Validate user data
    if (!user.username || !user.displayName) {
      return res.status(400).json({
        error: 'Username and display name are required'
      });
    }

    // In a real implementation, this would create the system user
    // spawn('sudo', ['useradd', '-m', '-s', user.shell || '/bin/bash', user.username]);

    const newUser = {
      id: crypto.randomUUID(),
      username: user.username,
      displayName: user.displayName,
      email: user.email || '',
      role: user.role || 'user',
      shell: user.shell || '/bin/bash',
      homeDirectory: `/home/${user.username}`,
      isActive: true,
      permissions: user.permissions || {},
      createdAt: new Date().toISOString()
    };

    res.json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // In a real implementation, this would update the system user
    // and the user's permissions

    res.json({
      success: true,
      message: `User ${id} updated successfully`
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, this would remove the system user
    // and clean up their home directory
    // spawn('sudo', ['userdel', '-r', username]);

    res.json({
      success: true,
      message: `User ${id} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get network interfaces
router.get('/network/interfaces', async (req, res) => {
  try {
    const interfaces = [
      {
        name: 'eth0',
        type: 'ethernet',
        status: 'up',
        ipAddress: '192.168.1.100',
        netmask: '255.255.255.0',
        gateway: '192.168.1.1',
        macAddress: '00:11:22:33:44:55',
        isPrimary: true
      }
    ];

    res.json(interfaces);
  } catch (error) {
    console.error('Error getting network interfaces:', error);
    res.status(500).json({
      error: 'Failed to get network interfaces',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get storage volumes
router.get('/storage/volumes', async (req, res) => {
  try {
    const volumes = [
      {
        id: 'root',
        name: 'Root Filesystem',
        path: '/',
        type: 'local',
        mountPoint: '/',
        fileSystem: 'ext4',
        totalSize: 1000000000000, // 1TB
        usedSize: 500000000000, // 500GB
        availableSize: 500000000000, // 500GB
        isMounted: true,
        mountOnBoot: true
      }
    ];

    res.json(volumes);
  } catch (error) {
    console.error('Error getting storage volumes:', error);
    res.status(500).json({
      error: 'Failed to get storage volumes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get services
router.get('/services', async (req, res) => {
  try {
    const services = [
      {
        id: 'nginx',
        name: 'nginx',
        description: 'Nginx web server',
        status: 'active',
        enabled: true,
        loaded: true,
        vendor: 'Nginx'
      },
      {
        id: 'ssh',
        name: 'ssh',
        description: 'OpenSSH server',
        status: 'active',
        enabled: true,
        loaded: true,
        vendor: 'OpenBSD'
      }
    ];

    res.json(services);
  } catch (error) {
    console.error('Error getting services:', error);
    res.status(500).json({
      error: 'Failed to get services',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Control service
router.post('/services/:id/:action', async (req, res) => {
  try {
    const { id, action } = req.params;

    // In a real implementation, this would control the systemd service
    // spawn('sudo', ['systemctl', action, id]);

    const validActions = ['start', 'stop', 'restart', 'enable', 'disable'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        message: `Valid actions are: ${validActions.join(', ')}`
      });
    }

    res.json({
      success: true,
      message: `Service ${id} ${action}ed successfully`
    });
  } catch (error) {
    console.error('Error controlling service:', error);
    res.status(500).json({
      error: 'Failed to control service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get API keys
router.get('/security/api-keys', async (req, res) => {
  try {
    const apiKeys = await loadSettings('api-keys');
    res.json(apiKeys);
  } catch (error) {
    console.error('Error getting API keys:', error);
    res.status(500).json({
      error: 'Failed to get API keys',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create API key
router.post('/security/api-keys', async (req, res) => {
  try {
    const { name, permissions, allowedIPs, rateLimitPerHour } = req.body;

    if (!name || !permissions) {
      return res.status(400).json({
        error: 'Name and permissions are required'
      });
    }

    const apiKey = {
      id: crypto.randomUUID(),
      name,
      key: `wdsk_${crypto.randomBytes(32).toString('hex')}`,
      permissions,
      createdAt: new Date().toISOString(),
      expiresAt: req.body.expiresAt,
      isActive: true,
      createdBy: 'admin',
      allowedIPs: allowedIPs || [],
      rateLimitPerHour: rateLimitPerHour || 1000
    };

    const apiKeys = await loadSettings('api-keys');
    apiKeys.keys = apiKeys.keys || [];
    apiKeys.keys.push(apiKey);

    await saveSettings('api-keys', apiKeys);

    res.json({
      success: true,
      apiKey
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({
      error: 'Failed to create API key',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete API key
router.delete('/security/api-keys/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const apiKeys = await loadSettings('api-keys');
    if (apiKeys.keys) {
      apiKeys.keys = apiKeys.keys.filter((key: any) => key.id !== id);
      await saveSettings('api-keys', apiKeys);
    }

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({
      error: 'Failed to delete API key',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validate settings based on category
function validateSettings(category: string, settings: any): any {
  const validated = { ...settings };

  // Basic validation
  switch (category) {
    case 'system':
      if (validated.hostname) {
        validated.hostname = String(validated.hostname).replace(/[^a-zA-Z0-9.-]/g, '');
      }
      break;

    case 'users':
      if (validated.passwordPolicy) {
        validated.passwordPolicy.minPasswordLength = Math.max(4, validated.passwordPolicy.minPasswordLength || 8);
        validated.passwordPolicy.maxAge = Math.max(1, validated.passwordPolicy.maxAge || 90);
      }
      break;

    case 'network':
      if (validated.dnsServers) {
        validated.dnsServers = validated.dnsServers.filter((ip: string) =>
          ip.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/) || ip.match(/^fe80:/)
        );
      }
      break;

    case 'security':
      if (validated.passwordMinLength) {
        validated.passwordMinLength = Math.max(4, validated.passwordMinLength);
      }
      break;
  }

  return validated;
}

export default router;
