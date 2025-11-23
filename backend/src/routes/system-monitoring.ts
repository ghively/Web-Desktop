import express from 'express';
import si from 'systeminformation';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = express.Router();

// Cache for performance
let cache = {
  system: null as any,
  timestamp: 0,
  processes: null as any,
  processesTimestamp: 0
};

const CACHE_TTL = 1000; // 1 second cache
const PROCESSES_CACHE_TTL = 5000; // 5 seconds cache for processes

// Helper to get cached data or fetch new data
const getCachedData = async (key: 'system' | 'processes', fetchFn: () => Promise<any>, ttl: number) => {
  const now = Date.now();
  const timestamp = key === 'system' ? cache.timestamp : cache.processesTimestamp;

  if (cache[key] && (now - timestamp) < ttl) {
    return cache[key];
  }

  const data = await fetchFn();
  cache[key] = data;

  if (key === 'system') {
    cache.timestamp = now;
  } else {
    cache.processesTimestamp = now;
  }

  return data;
};

// Get comprehensive system information
router.get('/', async (req, res) => {
  try {
    const data = await getCachedData('system', async () => {
      const [
        cpu,
        mem,
        osInfo,
        diskLayout,
        networkInterfaces,
        networkStats,
        cpuCurrentSpeed,
        cpuTemperature,
        graphics,
        battery
      ] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.osInfo(),
        si.diskLayout(),
        si.networkInterfaces(),
        si.networkStats(),
        si.cpuCurrentSpeed(),
        si.cpuTemperature(),
        si.graphics(),
        si.battery()
      ]);

      // Get CPU load
      const cpuLoad = await si.currentLoad();

      // Get disk usage for main partitions
      const diskUsage = await si.fsSize();

      // Get network stats for active interfaces
      const activeNetworkStats = networkStats.filter(stat => stat.rx_bytes > 0 || stat.tx_bytes > 0);

      return {
        timestamp: Date.now(),
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          cores: cpu.cores,
          physicalCores: cpu.physicalCores,
          speed: cpu.speed,
          currentSpeed: cpuCurrentSpeed.avg || cpu.speed,
          load: {
            currentLoad: cpuLoad.currentLoad,
            currentLoadUser: cpuLoad.currentLoadUser,
            currentLoadSystem: cpuLoad.currentLoadSystem,
            currentLoadIdle: cpuLoad.currentLoadIdle,
            avgLoad: os.loadavg()
          },
          temperature: cpuTemperature.main || null
        },
        memory: {
          total: mem.total,
          free: mem.free,
          used: mem.used,
          active: mem.active,
          available: mem.available,
          swaptotal: mem.swaptotal,
          swapused: mem.swapused,
          swapfree: mem.swapfree
        },
        os: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          codename: osInfo.codename,
          kernel: osInfo.kernel,
          arch: osInfo.arch,
          hostname: osInfo.hostname,
          uptime: osInfo.uptime
        },
        disks: diskLayout.map(disk => ({
          device: disk.device,
          type: disk.type,
          name: disk.name,
          size: disk.size,
          physicalSize: disk.physicalSize,
          interfaceType: disk.interfaceType,
          temperature: disk.temperature
        })),
        diskUsage: diskUsage.map(disk => ({
          fs: disk.fs,
          type: disk.type,
          size: disk.size,
          used: disk.used,
          available: disk.available,
          use: disk.use,
          mount: disk.mount
        })),
        networks: networkInterfaces.map(iface => ({
          iface: iface.iface,
          ifaceName: iface.ifaceName,
          type: iface.type,
          speed: iface.speed,
          mtu: iface.mtu,
          ip4: iface.ip4,
          ip6: iface.ip6,
          mac: iface.mac,
          internal: iface.internal,
          virtual: iface.virtual,
          operstate: iface.operstate
        })),
        networkStats: activeNetworkStats.map(stat => ({
          iface: stat.iface,
          rx_bytes: stat.rx_bytes,
          tx_bytes: stat.tx_bytes,
          rx_sec: stat.rx_sec,
          tx_sec: stat.tx_sec,
          ms: stat.ms
        })),
        graphics: graphics.controllers.map(controller => ({
          model: controller.model,
          vendor: controller.vendor,
          bus: controller.bus,
          vram: controller.vram,
          dram: controller.dram
        })),
        battery: battery.hasBattery ? {
          hasBattery: true,
          percent: battery.percent,
          isCharging: battery.isCharging,
          timeRemaining: battery.timeRemaining,
          cycleCount: battery.cycleCount,
          health: battery.health
        } : null
      };
    }, CACHE_TTL);

    res.json(data);
  } catch (error) {
    console.error('Failed to get system info:', error);
    res.status(500).json({ error: 'Failed to retrieve system information' });
  }
});

// Get process list with resource usage
router.get('/processes', async (req, res) => {
  try {
    const { sort = 'cpu', limit = 50 } = req.query;

    const data = await getCachedData('processes', async () => {
      const processes = await si.processes();

      // Sort processes by requested criteria
      let sortedProcesses = [...processes.list];

      switch (sort) {
        case 'cpu':
          sortedProcesses.sort((a, b) => (b.pcpu || 0) - (a.pcpu || 0));
          break;
        case 'memory':
          sortedProcesses.sort((a, b) => (b.pmem || 0) - (a.pmem || 0));
          break;
        case 'name':
          sortedProcesses.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'pid':
          sortedProcesses.sort((a, b) => a.pid - b.pid);
          break;
      }

      return {
        timestamp: Date.now(),
        processes: sortedProcesses.slice(0, parseInt(limit as string)).map(proc => ({
          pid: proc.pid,
          name: proc.name,
          command: proc.command,
          pcpu: proc.pcpu,
          pmem: proc.pmem,
          memRss: proc.memRss,
          memVsz: proc.memVsz,
          user: proc.user,
          state: proc.state,
          started: proc.started,
          cpuTime: proc.cpuTime,
          parentPid: proc.ppid,
          priority: proc.priority,
          nice: proc.nice
        })),
        total: processes.list.length
      };
    }, PROCESSES_CACHE_TTL);

    res.json(data);
  } catch (error) {
    console.error('Failed to get processes:', error);
    res.status(500).json({ error: 'Failed to retrieve process information' });
  }
});

// Get historical performance data
router.get('/performance', async (req, res) => {
  try {
    const { timeframe = '1h' } = req.query;

    // This would typically read from a time-series database or log files
    // For now, we'll provide basic performance metrics
    const [cpuLoad, mem, networkStats] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats()
    ]);

    const performanceData = {
      timestamp: Date.now(),
      timeframe,
      metrics: {
        cpu: {
          usage: cpuLoad.currentLoad,
          user: cpuLoad.currentLoadUser,
          system: cpuLoad.currentLoadSystem,
          idle: cpuLoad.currentLoadIdle
        },
        memory: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          usage: (mem.used / mem.total) * 100
        },
        network: networkStats.map(stat => ({
          interface: stat.iface,
          rx_bytes: stat.rx_bytes,
          tx_bytes: stat.tx_bytes,
          rx_sec: stat.rx_sec,
          tx_sec: stat.tx_sec
        }))
      }
    };

    res.json(performanceData);
  } catch (error) {
    console.error('Failed to get performance data:', error);
    res.status(500).json({ error: 'Failed to retrieve performance data' });
  }
});

// Get disk I/O statistics
router.get('/disk-io', async (req, res) => {
  try {
    const diskIO = await si.disksIO();
    res.json({
      timestamp: Date.now(),
      ...diskIO
    });
  } catch (error) {
    console.error('Failed to get disk I/O:', error);
    res.status(500).json({ error: 'Failed to retrieve disk I/O statistics' });
  }
});

// Get system logs (basic implementation)
router.get('/logs', async (req, res) => {
  try {
    const { lines = 100, type = 'system' } = req.query;

    let logs: string[] = [];

    try {
      if (process.platform === 'linux') {
        const { stdout } = await execAsync(`journalctl -n ${lines} --no-pager`);
        logs = stdout.split('\n').filter(line => line.trim());
      } else {
        // Fallback for other platforms
        logs = [
          `System logs not available on ${process.platform}`,
          'Consider implementing platform-specific log collection'
        ];
      }
    } catch (error) {
      logs = ['Failed to retrieve system logs'];
    }

    res.json({
      timestamp: Date.now(),
      type,
      logs: logs.slice(-parseInt(lines as string))
    });
  } catch (error) {
    console.error('Failed to get logs:', error);
    res.status(500).json({ error: 'Failed to retrieve system logs' });
  }
});

// Get service status (basic implementation for systemd)
router.get('/services', async (req, res) => {
  try {
    let services: any[] = [];

    try {
      if (process.platform === 'linux') {
        const { stdout } = await execAsync('systemctl list-units --type=service --no-pager --no-legend');
        services = stdout.split('\n')
          .filter(line => line.trim())
          .map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              name: parts[0],
              loaded: parts[1],
              active: parts[2],
              sub: parts[3],
              description: parts.slice(4).join(' ')
            };
          })
          .slice(0, 50); // Limit to first 50 services
      } else {
        services = [
          { name: 'Service management not available', loaded: 'N/A', active: 'N/A', sub: 'N/A', description: process.platform }
        ];
      }
    } catch (error) {
      services = [{ name: 'Failed to retrieve services', loaded: 'Error', active: 'Error', sub: 'Error', description: error.message }];
    }

    res.json({
      timestamp: Date.now(),
      services
    });
  } catch (error) {
    console.error('Failed to get services:', error);
    res.status(500).json({ error: 'Failed to retrieve service information' });
  }
});

// Manage processes (kill, nice, etc.)
router.post('/processes/:pid/:action', async (req, res) => {
  try {
    const { pid, action } = req.params;
    const { signal = 15 } = req.body; // SIGTERM default

    // Validate PID
    if (!/^\d+$/.test(pid)) {
      return res.status(400).json({ error: 'Invalid PID' });
    }

    let command = '';
    switch (action) {
      case 'kill':
        command = `kill -${signal} ${pid}`;
        break;
      case 'nice':
        const { nice } = req.body;
        command = `renice ${nice} ${pid}`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    try {
      await execAsync(command);
      res.json({ success: true, message: `${action} performed on PID ${pid}` });
    } catch (error) {
      res.status(500).json({ error: `Failed to ${action} process: ${error.message}` });
    }
  } catch (error) {
    console.error(`Failed to ${req.params.action} process:`, error);
    res.status(500).json({ error: 'Failed to manage process' });
  }
});

export default router;