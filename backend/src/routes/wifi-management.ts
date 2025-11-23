import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);
const router = express.Router();

// Configuration storage
const CONFIG_FILE = path.join(process.env.HOME || '', '.web-desktop', 'wifi-management.json');

interface NetworkInterface {
  name: string;
  type: 'ethernet' | 'wifi' | 'loopback';
  state: 'up' | 'down';
  ipv4: string[];
  ipv6: string[];
  mac: string;
}

interface WiFiNetwork {
  ssid: string;
  bssid: string;
  frequency: number;
  channel: number;
  signalStrength: number;
  security: string[];
  mode: 'ad-hoc' | 'infrastructure' | 'mesh';
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  lastSeen: Date;
}

interface WiFiConfig {
  interfaceName: string;
  ssid: string;
  password?: string;
  security: string[];
  mode: 'adhoc' | 'infrastructure' | 'mesh';
  autoConnect: boolean;
  priority: number;
  hidden: boolean;
  band: '2.4GHz' | '5GHz' | 'auto';
}

interface ConnectionStatus {
  connected: boolean;
  interface: string;
  ssid?: string;
  ip?: string;
  gateway?: string;
  dns?: string[];
  signalStrength?: number;
  speed?: number;
}

// Configuration management
async function loadConfig(): Promise<WiFiConfig[]> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveConfig(configs: WiFiConfig[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(configs, null, 2));
  } catch (error) {
    console.error('Failed to save WiFi config:', error);
  }
}

// Get network interfaces
async function getNetworkInterfaces(): Promise<NetworkInterface[]> {
  try {
    const { stdout: ipOutput } = await execAsync('ip -j addr');
    const interfaces = JSON.parse(ipOutput);

    return interfaces.map((iface: any) => ({
      name: iface.ifname,
      type: iface.link_type as NetworkInterface['type'],
      state: iface.operstate as NetworkInterface['state'],
      ipv4: iface.addr_info?.filter((addr: any) => addr.family === 'inet').map((addr: any) => addr.local) || [],
      ipv6: iface.addr_info?.filter((addr: any) => addr.family === 'inet6').map((addr: any) => addr.local) || [],
      mac: iface.address
    }));
  } catch (error) {
    console.error('Failed to get network interfaces:', error);
    return [];
  }
}

// Scan for WiFi networks
async function scanWiFiNetworks(interfaceName?: string): Promise<WiFiNetwork[]> {
  try {
    // Determine interface to use
    let targetInterface = interfaceName;
    if (!targetInterface) {
      const interfaces = await getNetworkInterfaces();
      const wifiInterface = interfaces.find(iface => iface.type === 'wifi' && iface.state === 'up');
      targetInterface = wifiInterface?.name;
    }

    if (!targetInterface) {
      throw new Error('No WiFi interface available or not connected');
    }

    // Scan for networks
    const { stdout } = await execAsync(`nmcli -t dev wifi list rescan iface ${targetInterface} && sleep 2 && nmcli -t dev wifi list iface ${targetInterface}`);
    const lines = stdout.split('\n');

    const networks: WiFiNetwork[] = [];
    let currentNetwork: any = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.includes('*:') || line.includes('SSID:')) {
        if (currentNetwork && currentNetwork.ssid) {
          networks.push(currentNetwork);
        }

        currentNetwork = {
          ssid: '',
          bssid: '',
          frequency: 0,
          channel: 0,
          signalStrength: 0,
          security: [],
          mode: 'infrastructure' as const,
          quality: 'good' as const,
          lastSeen: new Date()
        };

        // Extract SSID
        const ssidMatch = line.match(/SSID:\s*(.+?)(\s|$)/);
        if (ssidMatch) {
          currentNetwork.ssid = ssidMatch[1].replace(/"/g, '');
        }
      } else if (currentNetwork && line.includes('BSSID:')) {
        const bssidMatch = line.match(/BSSID:\s*([0-9A-Fa-f:]+)/);
        if (bssidMatch) {
          currentNetwork.bssid = bssidMatch[1];
        }
      } else if (currentNetwork && line.includes('FREQ:')) {
        const freqMatch = line.match(/FREQ:\s*(\d+)/);
        if (freqMatch) {
          currentNetwork.frequency = parseInt(freqMatch[1]);
        }
      } else if (currentNetwork && line.includes('CHAN:')) {
        const chanMatch = line.match(/CHAN:\s*(\d+)/);
        if (chanMatch) {
          currentNetwork.channel = parseInt(chanMatch[1]);
        }
      } else if (currentNetwork && line.includes('SIGNAL:')) {
        const signalMatch = line.match(/SIGNAL:\s*(-?\d+)/);
        if (signalMatch) {
          currentNetwork.signalStrength = parseInt(signalMatch[1]);
        }
      } else if (currentNetwork && line.includes('SECURITY:')) {
        const securityMatch = line.match(/SECURITY:\s*(.+)/);
        if (securityMatch) {
          currentNetwork.security = securityMatch[1].split(' ');
        }
      } else if (currentNetwork && line.includes('MODE:')) {
        const modeMatch = line.match(/MODE:\s*(\w+)/);
        if (modeMatch) {
          currentNetwork.mode = modeMatch[1].toLowerCase() as WiFiNetwork['mode'];
        }
      }
    }

    // Add the last network if it exists
    if (currentNetwork && currentNetwork.ssid) {
      networks.push(currentNetwork);
    }

    // Calculate quality based on signal strength
    networks.forEach(network => {
      const rssi = network.signalStrength;
      if (rssi > -50) {
        network.quality = 'excellent';
      } else if (rssi > -60) {
        network.quality = 'good';
      } else if (rssi > -70) {
        network.quality = 'fair';
      } else {
        network.quality = 'poor';
      }
    });

    return networks.filter(n => n.ssid.length > 0);
  } catch (error) {
    console.error('Failed to scan WiFi networks:', error);
    return [];
  }
}

// Get connection status
async function getConnectionStatus(): Promise<ConnectionStatus> {
  try {
    const { stdout } = await execAsync('nmcli -t dev status');
    const lines = stdout.split('\n');

    let isConnected = false;
    let interfaceName = '';
    let ssid = '';

    for (const line of lines) {
      if (line.includes('wlan')) {
        const parts = line.trim().split(/\s+/);
        if (parts[1] === 'connected') {
          isConnected = true;
          interfaceName = parts[0];
          // Get SSID from connection
          try {
            const { stdout: connInfo } = await execAsync(`nmcli -t dev show ${interfaceName}`);
            const ssidMatch = connInfo.match(/GENERAL.CONNECTION_NAME:\s*(.+)/);
            if (ssidMatch) {
              ssid = ssidMatch[1];
            }
          } catch {}
        }
      }
    }

    if (!isConnected) {
      return { connected: false, interface: '' };
    }

    // Get IP address
    const interfaces = await getNetworkInterfaces();
    const wifiInterface = interfaces.find(iface => iface.name === interfaceName);
    const ipv4 = wifiInterface?.ipv4[0] || '';

    // Get speed and signal strength
    let signalStrength = 0;
    let speed = 0;
    try {
      const { stdout: wifiInfo } = await execAsync(`nmcli -t dev wifi show ${interfaceName}`);
      const signalMatch = wifiInfo.match(/WLAN: (\d+) Mb\/s/);
      if (signalMatch) {
        speed = parseInt(signalMatch[1]);
      }

      const dbmMatch = wifiInfo.match(/Signal strength = (-?\d+) dBm/);
      if (dbmMatch) {
        signalStrength = parseInt(dbmMatch[1]);
      }
    } catch {}

    return {
      connected: isConnected,
      interface: interfaceName,
      ssid,
      ip: ipv4,
      signalStrength,
      speed
    };
  } catch (error) {
    return { connected: false, interface: '' };
  }
}

// Connect to WiFi network
async function connectWiFi(config: WiFiConfig): Promise<void> {
  try {
    const connectionName = `${config.ssid.replace(/\s+/g, '_')}_${Date.now()}`;

    let cmd = `nmcli dev wifi connect "${config.ssid}"`;

    if (config.password) {
      cmd += ` password "${config.password}"`;
    }

    if (config.mode === 'adhoc') {
      cmd += ' mode ad-hoc';
    }

    if (config.band !== 'auto') {
      cmd += ` band ${config.band}`;
    }

    if (config.interfaceName) {
      cmd += ` ifname ${config.interfaceName}`;
    }

    if (config.hidden) {
      cmd += ' hidden yes';
    }

    await execAsync(cmd);

    // Save configuration for auto-connect
    const configs = await loadConfig();
    const existingIndex = configs.findIndex(c => c.ssid === config.ssid);

    if (existingIndex >= 0) {
      configs[existingIndex] = config;
    } else {
      configs.push(config);
    }

    await saveConfig(configs);
  } catch (error) {
    throw new Error(`Failed to connect to WiFi: ${error}`);
  }
}

// Disconnect from WiFi
async function disconnectWiFi(): Promise<void> {
  try {
    await execAsync('nmcli dev wifi disconnect');
  } catch (error) {
    throw new Error(`Failed to disconnect WiFi: ${error}`);
  }
}

// Get available WiFi interfaces
async function getWiFiInterfaces(): Promise<string[]> {
  try {
    const interfaces = await getNetworkInterfaces();
    return interfaces
      .filter(iface => iface.type === 'wifi')
      .map(iface => iface.name);
  } catch (error) {
    console.error('Failed to get WiFi interfaces:', error);
    return [];
  }
}

// Toggle WiFi (enable/disable)
async function toggleWiFi(enable: boolean): Promise<void> {
  try {
    const interfaces = await getWiFiInterfaces();

    for (const iface of interfaces) {
      if (enable) {
        await execAsync(`nmcli radio wifi on`);
        await execAsync(`nmcli dev set ${iface} managed yes`);
      } else {
        await execAsync(`nmcli dev set ${iface} managed no`);
        await execAsync(`nmcli radio wifi off`);
      }
    }
  } catch (error) {
    throw new Error(`Failed to ${enable ? 'enable' : 'disable'} WiFi: ${error}`);
  }
}

// Routes

// Get all WiFi networks
router.get('/scan', async (req, res) => {
  try {
    const { interface: interfaceName } = req.query;
    const networks = await scanWiFiNetworks(interfaceName as string);
    res.json(networks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to scan WiFi networks' });
  }
});

// Get connection status
router.get('/status', async (req, res) => {
  try {
    const status = await getConnectionStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get connection status' });
  }
});

// Get WiFi interfaces
router.get('/interfaces', async (req, res) => {
  try {
    const interfaces = await getWiFiInterfaces();
    const allInterfaces = await getNetworkInterfaces();

    res.json({
      wifi: interfaces,
      all: allInterfaces
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get network interfaces' });
  }
});

// Connect to WiFi
router.post('/connect', async (req, res) => {
  try {
    const config = req.body as WiFiConfig;
    await connectWiFi(config);
    res.json({ success: true, message: 'Connected to WiFi successfully' });
  } catch (error) {
    res.status(500).json({ error: `Failed to connect: ${error}` });
  }
});

// Disconnect from WiFi
router.post('/disconnect', async (req, res) => {
  try {
    await disconnectWiFi();
    res.json({ success: true, message: 'Disconnected from WiFi' });
  } catch (error) {
    res.status(500).json({ error: `Failed to disconnect: ${error}` });
  }
});

// Toggle WiFi
router.post('/toggle', async (req, res) => {
  try {
    const { enable } = req.body;
    await toggleWiFi(enable);
    res.json({ success: true, message: `WiFi ${enable ? 'enabled' : 'disabled'}` });
  } catch (error) {
    res.status(500).json({ error: `Failed to toggle WiFi: ${error}` });
  }
});

// Get saved WiFi configurations
router.get('/configs', async (req, res) => {
  try {
    const configs = await loadConfig();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get WiFi configurations' });
  }
});

// Save WiFi configuration
router.post('/configs', async (req, res) => {
  try {
    const configs = req.body as WiFiConfig[];
    await saveConfig(configs);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save WiFi configurations' });
  }
});

// Delete WiFi configuration
router.delete('/configs/:index', async (req, res) => {
  try {
    const { index } = req.params;
    const configs = await loadConfig();
    configs.splice(parseInt(index), 1);
    await saveConfig(configs);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete WiFi configuration' });
  }
});

// Forget WiFi network
router.post('/forget', async (req, res) => {
  try {
    const { ssid } = req.body;
    await execAsync(`nmcli connection delete "${ssid}"`);

    // Remove from saved configs
    const configs = await loadConfig();
    const filteredConfigs = configs.filter(c => c.ssid !== ssid);
    await saveConfig(filteredConfigs);

    res.json({ success: true, message: `Network "${ssid}" forgotten` });
  } catch (error) {
    res.status(500).json({ error: `Failed to forget network: ${error}` });
  }
});

// Get WiFi statistics
router.get('/stats', async (req, res) => {
  try {
    const [status, networks, interfaces] = await Promise.all([
      getConnectionStatus(),
      scanWiFiNetworks(),
      getWiFiInterfaces()
    ]);

    const stats = {
      isConnected: status.connected,
      currentInterface: status.interface,
      currentSSID: status.ssid,
      signalStrength: status.signalStrength,
      speed: status.speed,
      availableNetworks: networks.length,
      availableInterfaces: interfaces.length,
      savedConfigs: (await loadConfig()).length
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get WiFi statistics' });
  }
});

export default router;
