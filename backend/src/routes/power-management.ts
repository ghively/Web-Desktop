import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);
const router = express.Router();

// Configuration storage
const CONFIG_FILE = path.join(process.env.HOME || '', '.web-desktop', 'power-management.json');

interface PowerConfig {
  enableSuspend: boolean;
  enableHibernate: boolean;
  enableReboot: boolean;
  enableShutdown: boolean;
  autoShutdownRules: AutoShutdownRule[];
  powerSaverMode: boolean;
  customPowerPlans: PowerPlan[];
  activePlan?: string;
}

interface AutoShutdownRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    cpuUsage?: { max: number; duration: number };
    memoryUsage?: { max: number; duration: number };
    temperature?: { max: number; duration: number };
    idleTime?: { minutes: number };
    batteryLevel?: { min: number };
    timeOfDay?: { start: string; end: string };
  };
  action: 'suspend' | 'hibernate' | 'shutdown';
}

interface PowerPlan {
  id: string;
  name: string;
  description: string;
  settings: {
    screenTimeout?: number;
    sleepTimeout?: number;
    hibernateTimeout?: number;
    cpuGovernor?: 'performance' | 'powersave' | 'ondemand' | 'conservative' | 'userspace';
    brightness?: number;
    wifiPower?: boolean;
    bluetoothPower?: boolean;
  };
}

interface PowerStatus {
  battery: {
    present: boolean;
    charging: boolean;
    level: number;
    status: string;
    health: string;
    technology: string;
    voltage?: number;
    temperature?: number;
  };
  ac: {
    connected: boolean;
    adapter?: string;
  };
  uptime: number;
  suspendAvailable: boolean;
  hibernateAvailable: boolean;
  cpuGovernor: string;
  powerConsumption?: number;
  thermalState: ThermalState[];
}

interface ThermalState {
  sensor: string;
  temperature: number;
  max: number;
  critical: number;
  status: 'normal' | 'warning' | 'critical';
}

class PowerManager extends EventEmitter {
  private config: PowerConfig;
  private monitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private lastStates: Map<string, any> = new Map();

  constructor() {
    super();
    this.config = {
      enableSuspend: true,
      enableHibernate: true,
      enableReboot: true,
      enableShutdown: true,
      autoShutdownRules: [],
      powerSaverMode: false,
      customPowerPlans: []
    };
    this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf8');
      this.config = { ...this.config, ...JSON.parse(data) };
    } catch (error) {
      await this.saveConfig();
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
      await fs.writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save power management config: ${error}`);
    }
  }

  getConfig(): PowerConfig {
    return this.config;
  }

  async updateConfig(updates: Partial<PowerConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
    this.emit('configUpdated', this.config);
  }

  async getPowerStatus(): Promise<PowerStatus> {
    try {
      const [
        batteryInfo,
        uptimeInfo,
        governorInfo,
        thermalInfo
      ] = await Promise.allSettled([
        this.getBatteryInfo(),
        this.getUptime(),
        this.getCpuGovernor(),
        this.getThermalInfo()
      ]);

      return {
        battery: batteryInfo.status === 'fulfilled' ? batteryInfo.value : this.getDefaultBatteryInfo(),
        ac: await this.getACInfo(),
        uptime: uptimeInfo.status === 'fulfilled' ? uptimeInfo.value : 0,
        suspendAvailable: await this.checkSuspendAvailable(),
        hibernateAvailable: await this.checkHibernateAvailable(),
        cpuGovernor: governorInfo.status === 'fulfilled' ? governorInfo.value : 'unknown',
        thermalState: thermalInfo.status === 'fulfilled' ? thermalInfo.value : [],
        powerConsumption: await this.getPowerConsumption()
      };
    } catch (error) {
      throw new Error(`Failed to get power status: ${error}`);
    }
  }

  private getDefaultBatteryInfo() {
    return {
      present: false,
      charging: false,
      level: 0,
      status: 'N/A',
      health: 'N/A',
      technology: 'N/A'
    };
  }

  private async getBatteryInfo(): Promise<PowerStatus['battery']> {
    try {
      const { stdout } = await execAsync('upower -i /org/freedesktop/UPower/battery_BAT0 2>/dev/null || upower -i $(upower -e | grep battery) 2>/dev/null');

      const info = this.parseUpowerOutput(stdout);
      return {
        present: info.present === 'yes',
        charging: info.state === 'charging',
        level: Math.round(parseFloat(info.percentage || '0')),
        status: info.state || 'unknown',
        health: info.health || 'unknown',
        technology: info.technology || 'unknown',
        voltage: info.voltage ? parseFloat(info.voltage) : undefined,
        temperature: info.temperature ? parseFloat(info.temperature) : undefined
      };
    } catch (error) {
      // Fallback to /sys/class/power_supply
      try {
        const { stdout } = await execAsync('cat /sys/class/power_supply/BAT0/status 2>/dev/null || echo "unknown"');
        const { stdout: capacity } = await execAsync('cat /sys/class/power_supply/BAT0/capacity 2>/dev/null || echo "0"');
        const { stdout: health } = await execAsync('cat /sys/class/power_supply/BAT0/health 2>/dev/null || echo "unknown"');

        return {
          present: true,
          charging: stdout.trim() === 'Charging',
          level: parseInt(capacity) || 0,
          status: stdout.trim(),
          health: health.trim(),
          technology: 'Li-ion'
        };
      } catch (fallbackError) {
        return this.getDefaultBatteryInfo();
      }
    }
  }

  private parseUpowerOutput(output: string): Record<string, string> {
    const lines = output.split('\n');
    const info: Record<string, string> = {};

    for (const line of lines) {
      const match = line.match(/^\s*([^:]+):\s*(.+)$/);
      if (match) {
        info[match[1].trim().toLowerCase().replace(/\s+/g, '_')] = match[2].trim();
      }
    }

    return info;
  }

  private async getACInfo(): Promise<PowerStatus['ac']> {
    try {
      const { stdout } = await execAsync('upower -i /org/freedesktop/UPower/line_power_AC0 2>/dev/null || upower -i $(upower -e | grep ac) 2>/dev/null');
      const info = this.parseUpowerOutput(stdout);

      return {
        connected: info.online === 'yes',
        adapter: info.native_path
      };
    } catch (error) {
      // Fallback to /sys/class/power_supply
      try {
        const { stdout } = await execAsync('cat /sys/class/power_supply/AC/online 2>/dev/null || cat /sys/class/power_supply/ACAD/online 2>/dev/null || echo "0"');
        return {
          connected: stdout.trim() === '1',
          adapter: 'AC Adapter'
        };
      } catch (fallbackError) {
        return {
          connected: false
        };
      }
    }
  }

  private async getUptime(): Promise<number> {
    try {
      const { stdout } = await execAsync('cat /proc/uptime');
      return Math.floor(parseFloat(stdout.split(' ')[0]));
    } catch (error) {
      return 0;
    }
  }

  private async getCpuGovernor(): Promise<string> {
    try {
      const { stdout } = await execAsync("cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null || cpupower frequency-info -p | grep 'scaling governor' | awk '{print $3}' 2>/dev/null || echo 'unknown'");
      return stdout.trim() || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  private async getThermalInfo(): Promise<ThermalState[]> {
    const thermalStates: ThermalState[] = [];

    try {
      // Try to get thermal information from various sources
      const { stdout: sensors } = await execAsync('sensors 2>/dev/null || echo ""');

      if (sensors) {
        const lines = sensors.split('\n');
        for (const line of lines) {
          const tempMatch = line.match(/(\d+\.\d+)°C/);
          if (tempMatch) {
            const temp = parseFloat(tempMatch[1]);
            let sensorName = 'Unknown';

            const nameMatch = line.match(/^([^:]+):/);
            if (nameMatch) {
              sensorName = nameMatch[1].trim();
            }

            thermalStates.push({
              sensor: sensorName,
              temperature: temp,
              max: 80, // Default max temp
              critical: 95, // Default critical temp
              status: temp >= 90 ? 'critical' : temp >= 75 ? 'warning' : 'normal'
            });
          }
        }
      }

      // Fallback to /sys/class/thermal
      if (thermalStates.length === 0) {
        try {
          const { stdout: thermalZones } = await execAsync('ls /sys/class/thermal/thermal_zone*/temp 2>/dev/null || echo ""');
          const zones = thermalZones.trim().split('\n').filter(z => z);

          for (let i = 0; i < zones.length; i++) {
            try {
              const { stdout: temp } = await execAsync(`cat ${zones[i]}`);
              const temperature = parseInt(temp) / 1000; // Convert from millidegrees

              thermalStates.push({
                sensor: `thermal_zone${i}`,
                temperature,
                max: 80,
                critical: 95,
                status: temperature >= 90 ? 'critical' : temperature >= 75 ? 'warning' : 'normal'
              });
            } catch (zoneError) {
              // Skip zones that can't be read
            }
          }
        } catch (thermalError) {
          // Thermal zones not available
        }
      }
    } catch (error) {
      // Thermal monitoring not available
    }

    return thermalStates;
  }

  private async getPowerConsumption(): Promise<number | undefined> {
    try {
      // Try to get power consumption from various sources
      const { stdout } = await execAsync('cat /sys/class/power_supply/BAT0/power_now 2>/dev/null || bbswitch 2>/dev/null | grep "Level" | awk \'{print $3}\' || echo ""');

      if (stdout.trim()) {
        return parseFloat(stdout.trim()) / 1000000; // Convert microwatts to watts
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async checkSuspendAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('systemctl status sleep.target 2>/dev/null | grep -q "Active: active" && echo "true" || echo "false"');
      return stdout.trim() === 'true';
    } catch (error) {
      try {
        await execAsync('which pm-suspend 2>/dev/null');
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  private async checkHibernateAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('systemctl status hibernate.target 2>/dev/null | grep -q "Active: active" && echo "true" || echo "false"');
      return stdout.trim() === 'true';
    } catch (error) {
      try {
        await execAsync('which pm-hibernate 2>/dev/null');
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  async suspend(): Promise<void> {
    if (!this.config.enableSuspend) {
      throw new Error('Suspend is disabled in configuration');
    }

    try {
      await execAsync('systemctl suspend || pm-suspend');
    } catch (error) {
      throw new Error(`Failed to suspend: ${error}`);
    }
  }

  async hibernate(): Promise<void> {
    if (!this.config.enableHibernate) {
      throw new Error('Hibernate is disabled in configuration');
    }

    try {
      await execAsync('systemctl hibernate || pm-hibernate');
    } catch (error) {
      throw new Error(`Failed to hibernate: ${error}`);
    }
  }

  async reboot(): Promise<void> {
    if (!this.config.enableReboot) {
      throw new Error('Reboot is disabled in configuration');
    }

    try {
      await execAsync('systemctl reboot');
    } catch (error) {
      throw new Error(`Failed to reboot: ${error}`);
    }
  }

  async shutdown(): Promise<void> {
    if (!this.config.enableShutdown) {
      throw new Error('Shutdown is disabled in configuration');
    }

    try {
      await execAsync('systemctl poweroff');
    } catch (error) {
      throw new Error(`Failed to shutdown: ${error}`);
    }
  }

  async setCpuGovernor(governor: string): Promise<void> {
    try {
      const validGovernors = ['performance', 'powersave', 'ondemand', 'conservative', 'userspace'];
      if (!validGovernors.includes(governor)) {
        throw new Error(`Invalid governor: ${governor}`);
      }

      await execAsync(`cpupower frequency-set -g ${governor} || echo ${governor} | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor`);
    } catch (error) {
      throw new Error(`Failed to set CPU governor: ${error}`);
    }
  }

  async setBrightness(level: number): Promise<void> {
    if (level < 0 || level > 100) {
      throw new Error('Brightness level must be between 0 and 100');
    }

    try {
      // Try multiple methods to set brightness
      await execAsync(`
        brightnessctl set ${level}% 2>/dev/null ||
        echo $(((${level} * 255) / 100)) | sudo tee /sys/class/backlight/*/brightness 2>/dev/null ||
        xbacklight -set ${level} 2>/dev/null ||
        light -S ${level} 2>/dev/null ||
        echo "Failed to set brightness"
      `);
    } catch (error) {
      throw new Error(`Failed to set brightness: ${error}`);
    }
  }

  async getBrightness(): Promise<number> {
    try {
      const { stdout } = await execAsync(`
        brightnessctl get 2>/dev/null | awk '{print $2}' | sed 's/%//' ||
        cat /sys/class/backlight/*/brightness 2>/dev/null | head -1 | awk '{print ($0 * 100) / 255}' ||
        xbacklight -get 2>/dev/null ||
        light -G 2>/dev/null ||
        echo "50"
      `);
      return Math.round(parseFloat(stdout.trim()) || 50);
    } catch (error) {
      return 50; // Default to 50%
    }
  }

  startMonitoring(): void {
    if (this.monitoring) return;

    this.monitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        const status = await this.getPowerStatus();
        await this.checkAutoShutdownRules(status);
        this.emit('statusUpdate', status);
      } catch (error) {
        console.error('Error monitoring power status:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.monitoring = false;
  }

  private async checkAutoShutdownRules(status: PowerStatus): Promise<void> {
    for (const rule of this.config.autoShutdownRules.filter(r => r.enabled)) {
      if (await this.evaluateRule(rule, status)) {
        console.log(`Auto shutdown rule triggered: ${rule.name}`);

        switch (rule.action) {
          case 'suspend':
            await this.suspend();
            break;
          case 'hibernate':
            await this.hibernate();
            break;
          case 'shutdown':
            await this.shutdown();
            break;
        }

        this.emit('ruleTriggered', rule);
      }
    }
  }

  private async evaluateRule(rule: AutoShutdownRule, status: PowerStatus): Promise<boolean> {
    try {
      const conditions = rule.conditions;

      // Check battery level
      if (conditions.batteryLevel && status.battery.present) {
        if (status.battery.level < conditions.batteryLevel.min) {
          return true;
        }
      }

      // Check temperature
      if (conditions.temperature) {
        const maxTemp = Math.max(...status.thermalState.map(t => t.temperature));
        if (maxTemp > conditions.temperature.max) {
          if (!this.lastStates.has('temperature') ||
              Date.now() - this.lastStates.get('temperature').timestamp >= conditions.temperature.duration * 1000) {
            this.lastStates.set('temperature', { timestamp: Date.now(), value: maxTemp });
            if (this.lastStates.get('temperature').value > conditions.temperature.max) {
              return true;
            }
          }
        } else {
          this.lastStates.delete('temperature');
        }
      }

      // Check time of day
      if (conditions.timeOfDay) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [startHour, startMin] = conditions.timeOfDay.start.split(':').map(Number);
        const [endHour, endMin] = conditions.timeOfDay.end.split(':').map(Number);
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        if (currentTime >= startTime && currentTime <= endTime) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error evaluating auto shutdown rule:', error);
      return false;
    }
  }
}

// Global instance
const powerManager = new PowerManager();

// Routes

// Get power status
router.get('/status', async (req, res) => {
  try {
    const status = await powerManager.getPowerStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get configuration
router.get('/config', async (req, res) => {
  try {
    const config = powerManager.getConfig();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update configuration
router.post('/config', async (req, res) => {
  try {
    const updates: Partial<PowerConfig> = req.body;
    await powerManager.updateConfig(updates);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend system
router.post('/suspend', async (req, res) => {
  try {
    await powerManager.suspend();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Hibernate system
router.post('/hibernate', async (req, res) => {
  try {
    await powerManager.hibernate();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reboot system
router.post('/reboot', async (req, res) => {
  try {
    await powerManager.reboot();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Shutdown system
router.post('/shutdown', async (req, res) => {
  try {
    await powerManager.shutdown();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Set CPU governor
router.post('/cpu-governor', async (req, res) => {
  try {
    const { governor } = req.body;
    await powerManager.setCpuGovernor(governor);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get/set brightness
router.get('/brightness', async (req, res) => {
  try {
    const brightness = await powerManager.getBrightness();
    res.json({ brightness });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/brightness', async (req, res) => {
  try {
    const { level } = req.body;
    await powerManager.setBrightness(level);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start/stop monitoring
router.post('/monitoring/start', async (req, res) => {
  try {
    powerManager.startMonitoring();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/monitoring/stop', async (req, res) => {
  try {
    powerManager.stopMonitoring();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Event streaming
router.get('/events', async (req, res) => {
  try {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    powerManager.on('statusUpdate', sendEvent);
    powerManager.on('configUpdated', sendEvent);
    powerManager.on('ruleTriggered', sendEvent);

    req.on('close', () => {
      powerManager.off('statusUpdate', sendEvent);
      powerManager.off('configUpdated', sendEvent);
      powerManager.off('ruleTriggered', sendEvent);
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;