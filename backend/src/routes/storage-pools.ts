import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);
const router = express.Router();

// Configuration storage
const CONFIG_FILE = path.join(process.env.HOME || '', '.web-desktop', 'storage-pools.json');
const MOUNT_PREFIX = '/mnt/web-desktop';

// Types
interface StoragePool {
  id: string;
  name: string;
  type: 'local' | 'webdav' | 'smb' | 'ftp' | 'sftp' | 'nfs';
  path: string;
  mountPoint?: string;
  device?: string;
  autoMount: boolean;
  accessMode: 'read' | 'write' | 'read-write';
  permissions: {
    owner: string;
    group: string;
    mode: string;
  };
  credentials?: {
    username?: string;
    password?: string;
    domain?: string;
    keyPath?: string;
  };
  options: Record<string, string>;
  status: 'connected' | 'disconnected' | 'error';
  size: {
    total: number;
    used: number;
    available: number;
  };
  usage: {
    fileCount: number;
    lastModified: Date;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    description?: string;
    tags: string[];
  };
}

interface StorageStats {
  totalPools: number;
  connectedPools: number;
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
  pools: StoragePool[];
}

// Configuration management
async function loadConfig(): Promise<StoragePool[]> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveConfig(pools: StoragePool[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(pools, null, 2));
  } catch (error) {
    console.error('Failed to save storage pools config:', error);
  }
}

// Mount operations
async function mountLocalDisk(device: string, mountPoint: string, options: string[] = []): Promise<void> {
  try {
    // Create mount point if it doesn't exist
    await fs.mkdir(mountPoint, { recursive: true });

    // Get filesystem type
    const { stdout } = await execAsync(`blkid -o value -s TYPE ${device}`);
    const fsType = stdout.trim();

    // Mount the filesystem
    const mountOptions = options.length > 0 ? `-o ${options.join(',')}` : '';
    await execAsync(`mount -t ${fsType} ${mountOptions} ${device} ${mountPoint}`);
  } catch (error) {
    throw new Error(`Failed to mount ${device}: ${error}`);
  }
}

async function mountWebDAV(url: string, mountPoint: string, credentials: any): Promise<void> {
  try {
    await fs.mkdir(mountPoint, { recursive: true });

    const davfs2Options = [
      `username=${credentials.username}`,
      `password=${credentials.password}`,
      'conf=/etc/davfs2/davfs2.conf'
    ].join(',');

    // Check if davfs2 is available
    try {
      await execAsync('which davfs2');
    } catch {
      throw new Error('davfs2 is not installed. Please install it with: sudo apt install davfs2');
    }

    await execAsync(`mount -t davfs -o ${davfs2Options} "${url}" ${mountPoint}`);
  } catch (error) {
    throw new Error(`Failed to mount WebDAV: ${error}`);
  }
}

async function mountSMB(share: string, mountPoint: string, credentials: any): Promise<void> {
  try {
    await fs.mkdir(mountPoint, { recursive: true });

    const smbOptions = [
      `username=${credentials.username}`,
      `password=${credentials.password}`,
      'iocharset=utf8',
      'vers=3.0'
    ];

    if (credentials.domain) {
      smbOptions.push(`domain=${credentials.domain}`);
    }

    const optionsString = smbOptions.join(',');
    await execAsync(`mount -t cifs -o ${optionsString} "${share}" ${mountPoint}`);
  } catch (error) {
    throw new Error(`Failed to mount SMB share: ${error}`);
  }
}

async function mountFTP(host: string, mountPoint: string, credentials: any): Promise<void> {
  try {
    await fs.mkdir(mountPoint, { recursive: true });

    // Check if curlftpfs is available
    try {
      await execAsync('which curlftpfs');
    } catch {
      throw new Error('curlftpfs is not installed. Please install it with: sudo apt install curlftpfs');
    }

    const ftpUrl = credentials.username
      ? `ftp://${credentials.username}:${credentials.password}@${host}/`
      : `ftp://${host}/`;

    await execAsync(`curlftpfs "${ftpUrl}" ${mountPoint} -o allow_other`);
  } catch (error) {
    throw new Error(`Failed to mount FTP: ${error}`);
  }
}

async function mountSFTP(host: string, mountPoint: string, credentials: any): Promise<void> {
  try {
    await fs.mkdir(mountPoint, { recursive: true });

    // Check if sshfs is available
    try {
      await execAsync('which sshfs');
    } catch {
      throw new Error('sshfs is not installed. Please install it with: sudo apt install sshfs');
    }

    let sshOptions = [];
    if (credentials.keyPath) {
      sshOptions.push(`IdentityFile=${credentials.keyPath}`);
    }

    const userHost = credentials.username ? `${credentials.username}@${host}` : host;
    const options = sshOptions.length > 0 ? `-o ${sshOptions.join(',')}` : '';

    await execAsync(`sshfs ${userHost}:/ ${mountPoint} ${options} -o allow_other`);
  } catch (error) {
    throw new Error(`Failed to mount SFTP: ${error}`);
  }
}

async function mountNFS(nfsExport: string, mountPoint: string, options: string[] = []): Promise<void> {
  try {
    await fs.mkdir(mountPoint, { recursive: true });

    const nfsOptions = options.length > 0 ? options.join(',') : 'defaults';
    await execAsync(`mount -t nfs -o ${nfsOptions} "${nfsExport}" ${mountPoint}`);
  } catch (error) {
    throw new Error(`Failed to mount NFS: ${error}`);
  }
}

async function unmountStorage(mountPoint: string): Promise<void> {
  try {
    await execAsync(`umount ${mountPoint}`);
    await fs.rmdir(mountPoint).catch(() => {}); // Remove mount point if empty
  } catch (error) {
    throw new Error(`Failed to unmount ${mountPoint}: ${error}`);
  }
}

// Get storage statistics
async function getStorageStats(mountPoint: string): Promise<{ total: number; used: number; available: number }> {
  try {
    const { stdout } = await execAsync(`df -B1 "${mountPoint}"`);
    const lines = stdout.trim().split('\n');

    if (lines.length < 2) {
      return { total: 0, used: 0, available: 0 };
    }

    const parts = lines[1].split(/\s+/);
    return {
      total: parseInt(parts[1]),
      used: parseInt(parts[2]),
      available: parseInt(parts[3])
    };
  } catch (error) {
    return { total: 0, used: 0, available: 0 };
  }
}

// Scan for available disks
async function scanLocalDisks(): Promise<any[]> {
  try {
    const { stdout } = await execAsync('lsblk -J -o NAME,SIZE,FSTYPE,MOUNTPOINT,TYPE');
    const data = JSON.parse(stdout);

    return data.blockdevices
      .filter((device: any) =>
        device.type === 'disk' &&
        !device.name.includes('loop') &&
        !device.mountpoint
      )
      .map((disk: any) => ({
        name: disk.name,
        size: disk.size,
        model: disk.model || '',
        partitions: disk.children?.map((part: any) => ({
          name: part.name,
          size: part.size,
          fstype: part.fstype,
          mountpoint: part.mountpoint,
          type: part.type
        })) || []
      }));
  } catch (error) {
    console.error('Failed to scan local disks:', error);
    return [];
  }
}

// Routes

// Get all storage pools
router.get('/pools', async (req, res) => {
  try {
    const pools = await loadConfig();

    // Update status for all pools
    for (const pool of pools) {
      if (pool.mountPoint) {
        try {
          const stats = await getStorageStats(pool.mountPoint);
          pool.size = stats;
          pool.status = 'connected';
        } catch {
          pool.status = 'disconnected';
        }
      }
    }

    res.json(pools);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load storage pools' });
  }
});

// Get storage statistics
router.get('/stats', async (req, res) => {
  try {
    const pools = await loadConfig();
    let totalSpace = 0;
    let usedSpace = 0;
    let connectedPools = 0;

    for (const pool of pools) {
      if (pool.mountPoint) {
        try {
          const stats = await getStorageStats(pool.mountPoint);
          totalSpace += stats.total;
          usedSpace += stats.used;
          connectedPools++;
        } catch {
          // Pool not accessible
        }
      }
    }

    const stats: StorageStats = {
      totalPools: pools.length,
      connectedPools,
      totalSpace,
      usedSpace,
      availableSpace: totalSpace - usedSpace,
      pools
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get storage statistics' });
  }
});

// Create storage pool
router.post('/pools', async (req, res) => {
  try {
    const poolData: Omit<StoragePool, 'id' | 'status' | 'size' | 'usage' | 'metadata'> = req.body;

    // Validate required fields
    if (!poolData.name || !poolData.type || !poolData.path) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pools = await loadConfig();

    // Check for duplicate names
    if (pools.some(p => p.name === poolData.name)) {
      return res.status(400).json({ error: 'Pool name already exists' });
    }

    const pool: StoragePool = {
      ...poolData,
      id: crypto.randomUUID(),
      status: 'disconnected',
      size: { total: 0, used: 0, available: 0 },
      usage: { fileCount: 0, lastModified: new Date() },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: []
      }
    };

    // Set mount point
    if (!pool.mountPoint) {
      pool.mountPoint = path.join(MOUNT_PREFIX, pool.id);
    }

    pools.push(pool);
    await saveConfig(pools);

    res.status(201).json(pool);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create storage pool' });
  }
});

// Update storage pool
router.put('/pools/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const pools = await loadConfig();
    const poolIndex = pools.findIndex(p => p.id === id);

    if (poolIndex === -1) {
      return res.status(404).json({ error: 'Storage pool not found' });
    }

    pools[poolIndex] = {
      ...pools[poolIndex],
      ...updates,
      id,
      metadata: {
        ...pools[poolIndex].metadata,
        updatedAt: new Date()
      }
    };

    await saveConfig(pools);
    res.json(pools[poolIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update storage pool' });
  }
});

// Delete storage pool
router.delete('/pools/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pools = await loadConfig();
    const poolIndex = pools.findIndex(p => p.id === id);

    if (poolIndex === -1) {
      return res.status(404).json({ error: 'Storage pool not found' });
    }

    const pool = pools[poolIndex];

    // Unmount if mounted
    if (pool.mountPoint && pool.status === 'connected') {
      try {
        await unmountStorage(pool.mountPoint);
      } catch (error) {
        console.warn('Failed to unmount storage pool:', error);
      }
    }

    pools.splice(poolIndex, 1);
    await saveConfig(pools);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete storage pool' });
  }
});

// Mount storage pool
router.post('/pools/:id/mount', async (req, res) => {
  try {
    const { id } = req.params;
    const pools = await loadConfig();
    const pool = pools.find(p => p.id === id);

    if (!pool) {
      return res.status(404).json({ error: 'Storage pool not found' });
    }

    if (pool.status === 'connected') {
      return res.status(400).json({ error: 'Storage pool is already mounted' });
    }

    try {
      switch (pool.type) {
        case 'local':
          if (pool.device) {
            await mountLocalDisk(pool.device, pool.mountPoint!, pool.options ? Object.values(pool.options) : []);
          }
          break;
        case 'webdav':
          await mountWebDAV(pool.path, pool.mountPoint!, pool.credentials);
          break;
        case 'smb':
          await mountSMB(pool.path, pool.mountPoint!, pool.credentials);
          break;
        case 'ftp':
          await mountFTP(pool.path, pool.mountPoint!, pool.credentials);
          break;
        case 'sftp':
          await mountSFTP(pool.path, pool.mountPoint!, pool.credentials);
          break;
        case 'nfs':
          await mountNFS(pool.path, pool.mountPoint!, pool.options ? Object.values(pool.options) : []);
          break;
        default:
          throw new Error(`Unsupported storage type: ${pool.type}`);
      }

      pool.status = 'connected';
      pool.size = await getStorageStats(pool.mountPoint!);

    } catch (error) {
      pool.status = 'error';
      throw error;
    }

    await saveConfig(pools);
    res.json(pool);
  } catch (error) {
    res.status(500).json({ error: `Failed to mount storage pool: ${error}` });
  }
});

// Unmount storage pool
router.post('/pools/:id/unmount', async (req, res) => {
  try {
    const { id } = req.params;
    const pools = await loadConfig();
    const pool = pools.find(p => p.id === id);

    if (!pool) {
      return res.status(404).json({ error: 'Storage pool not found' });
    }

    if (pool.status !== 'connected') {
      return res.status(400).json({ error: 'Storage pool is not mounted' });
    }

    if (pool.mountPoint) {
      await unmountStorage(pool.mountPoint);
    }

    pool.status = 'disconnected';
    pool.size = { total: 0, used: 0, available: 0 };

    await saveConfig(pools);
    res.json(pool);
  } catch (error) {
    res.status(500).json({ error: `Failed to unmount storage pool: ${error}` });
  }
});

// Scan for local disks
router.get('/scan/local', async (req, res) => {
  try {
    const disks = await scanLocalDisks();
    res.json(disks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to scan local disks' });
  }
});

// Test connection to remote storage
router.post('/test', async (req, res) => {
  try {
    const { type, path, credentials } = req.body;
    const testMount = path.join(MOUNT_PREFIX, 'test-' + Date.now());

    await fs.mkdir(testMount, { recursive: true });

    try {
      switch (type) {
        case 'webdav':
          await mountWebDAV(path, testMount, credentials);
          break;
        case 'smb':
          await mountSMB(path, testMount, credentials);
          break;
        case 'ftp':
          await mountFTP(path, testMount, credentials);
          break;
        case 'sftp':
          await mountSFTP(path, testMount, credentials);
          break;
        case 'nfs':
          await mountNFS(path, testMount);
          break;
        default:
          throw new Error(`Unsupported storage type: ${type}`);
      }

      // Test read access
      await fs.readdir(testMount);

      // Cleanup
      await unmountStorage(testMount);

      res.json({ success: true, message: 'Connection test successful' });
    } catch (error) {
      // Cleanup on error
      try {
        await unmountStorage(testMount);
      } catch {}
      throw error;
    }
  } catch (error) {
    res.status(400).json({ error: `Connection test failed: ${error}` });
  }
});

// Get pool usage details
router.get('/pools/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const pools = await loadConfig();
    const pool = pools.find(p => p.id === id);

    if (!pool) {
      return res.status(404).json({ error: 'Storage pool not found' });
    }

    if (!pool.mountPoint || pool.status !== 'connected') {
      return res.status(400).json({ error: 'Storage pool is not mounted' });
    }

    // Count files and get last modified
    let fileCount = 0;
    let lastModified = new Date(0);

    async function scanDirectory(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else {
            fileCount++;
            const stats = await fs.stat(fullPath);
            if (stats.mtime > lastModified) {
              lastModified = stats.mtime;
            }
          }
        }
      } catch (error) {
        // Skip directories we can't access
      }
    }

    await scanDirectory(pool.mountPoint);

    pool.usage = {
      fileCount,
      lastModified
    };

    await saveConfig(pools);
    res.json(pool.usage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pool usage' });
  }
});

export default router;