import express from 'express';
import axios from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

const router = express.Router();

// Configuration storage
const CONFIG_FILE = process.env.HOME + '/.web-desktop/home-assistant.json';

interface HomeAssistantConfig {
  url: string;
  accessToken: string;
  webhookId?: string;
  enabled: boolean;
  name: string;
  version?: string;
  location?: string;
  timezone?: string;
  unitSystem: 'metric' | 'imperial';
  latitude?: number;
  longitude?: number;
}

interface EntityState {
  entity_id: string;
  state: string;
  last_changed: string;
  last_updated: string;
  attributes: Record<string, any>;
  context: {
    id: string;
    user_id?: string;
    parent_id?: string;
  };
}

interface Device {
  id: string;
  name: string;
  model?: string;
  manufacturer?: string;
  sw_version?: string;
  connections: Array<[string, string]>;
  config_entries: string[];
  disabled_by?: string;
  area_id?: string;
  labels: string[];
}

interface Area {
  area_id: string;
  name: string;
  picture?: string;
  created_at: string;
  modified_at: string;
}

interface Automation {
  id: string;
  name: string;
  description?: string;
  mode: 'single' | 'restart' | 'queued' | 'parallel' | 'max';
  trigger: any[];
  condition: any[];
  action: any[];
  last_triggered?: string;
  current: number;
  max: number;
  is_enabled: boolean;
}

interface Script {
  id: string;
  name: string;
  description?: string;
  mode: 'single' | 'restart' | 'queued' | 'parallel' | 'max';
  sequence: any[];
  last_triggered?: string;
  current: number;
  max: number;
  is_enabled: boolean;
}

class HomeAssistantAPI extends EventEmitter {
  private config: HomeAssistantConfig | null = null;
  private ws: WebSocket | null = null;
  private wsMessageId = 1;
  private wsCallbacks = new Map<number, (data: any) => void>();

  constructor() {
    super();
    this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(CONFIG_FILE, 'utf8');
      this.config = JSON.parse(data);
    } catch (error) {
      this.config = null;
    }
  }

  async saveConfig(config: HomeAssistantConfig): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
      await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
      this.config = config;
    } catch (error) {
      throw new Error(`Failed to save Home Assistant config: ${error}`);
    }
  }

  getConfig(): HomeAssistantConfig | null {
    return this.config;
  }

  async testConnection(config: HomeAssistantConfig): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const response = await axios.get(`${config.url}/api/`, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        return {
          success: true,
          version: response.data?.version || 'unknown'
        };
      }

      return { success: false, error: 'Invalid response from Home Assistant' };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Connection failed'
      };
    }
  }

  async connectWebSocket(): Promise<void> {
    if (!this.config || !this.config.enabled) {
      throw new Error('Home Assistant not configured or disabled');
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = this.config.url.replace(/^http/, 'ws') + '/api/websocket';

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('Connected to Home Assistant WebSocket');

        // Authenticate
        this.ws?.send(JSON.stringify({
          type: 'auth',
          access_token: this.config!.accessToken
        }));
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'auth_ok') {
            console.log('Authenticated with Home Assistant');
            this.subscribeToEvents();
            resolve();
          } else if (message.type === 'auth_invalid') {
            reject(new Error('Invalid Home Assistant access token'));
          } else if (message.id && this.wsCallbacks.has(message.id)) {
            const callback = this.wsCallbacks.get(message.id);
            if (callback) {
              callback(message);
              this.wsCallbacks.delete(message.id);
            }
          } else if (message.type === 'state_changed') {
            this.emit('state_changed', message.data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('Home Assistant WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('Home Assistant WebSocket disconnected');
        this.ws = null;
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (this.config?.enabled) {
            this.connectWebSocket().catch(console.error);
          }
        }, 5000);
      });
    });
  }

  private subscribeToEvents(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify({
      id: this.wsMessageId++,
      type: 'subscribe_events',
      event_type: 'state_changed'
    }));
  }

  private sendCommand<T>(command: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const id = this.wsMessageId++;
      command.id = id;

      this.wsCallbacks.set(id, (response) => {
        if (response.type === 'result' && response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.error?.message || 'Command failed'));
        }
      });

      this.ws.send(JSON.stringify(command));
    });
  }

  async getStates(): Promise<EntityState[]> {
    if (!this.config) {
      throw new Error('Home Assistant not configured');
    }

    try {
      const response = await axios.get(`${this.config.url}/api/states`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get states: ${error.response?.data?.message || error.message}`);
    }
  }

  async getDevices(): Promise<Device[]> {
    if (!this.config) {
      throw new Error('Home Assistant not configured');
    }

    try {
      const response = await axios.get(`${this.config.url}/api/devices`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get devices: ${error.response?.data?.message || error.message}`);
    }
  }

  async getAreas(): Promise<Area[]> {
    if (!this.config) {
      throw new Error('Home Assistant not configured');
    }

    try {
      const response = await axios.get(`${this.config.url}/api/areas`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get areas: ${error.response?.data?.message || error.message}`);
    }
  }

  async getAutomations(): Promise<Automation[]> {
    if (!this.config) {
      throw new Error('Home Assistant not configured');
    }

    try {
      const response = await axios.get(`${this.config.url}/api/config/automation/config`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get automations: ${error.response?.data?.message || error.message}`);
    }
  }

  async getScripts(): Promise<Script[]> {
    if (!this.config) {
      throw new Error('Home Assistant not configured');
    }

    try {
      const response = await axios.get(`${this.config.url}/api/config/script/config`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get scripts: ${error.response?.data?.message || error.message}`);
    }
  }

  async callService(domain: string, service: string, serviceData?: any): Promise<void> {
    if (!this.config) {
      throw new Error('Home Assistant not configured');
    }

    try {
      await axios.post(
        `${this.config.url}/api/services/${domain}/${service}`,
        serviceData || {},
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error: any) {
      throw new Error(`Failed to call service: ${error.response?.data?.message || error.message}`);
    }
  }

  async setState(entityId: string, state: string, attributes?: any): Promise<void> {
    if (!this.config) {
      throw new Error('Home Assistant not configured');
    }

    try {
      const data: any = { state };
      if (attributes) {
        data.attributes = attributes;
      }

      await axios.post(`${this.config.url}/api/states/${entityId}`, data, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error: any) {
      throw new Error(`Failed to set state: ${error.response?.data?.message || error.message}`);
    }
  }

  async getHistory(entityId?: string, startTime?: Date, endTime?: Date): Promise<any[]> {
    if (!this.config) {
      throw new Error('Home Assistant not configured');
    }

    try {
      const params = new URLSearchParams();
      if (entityId) {
        params.append('filter_entity_id', entityId);
      }
      if (startTime) {
        params.append('start_time', startTime.toISOString());
      }
      if (endTime) {
        params.append('end_time', endTime.toISOString());
      }

      const response = await axios.get(`${this.config.url}/api/history/period?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get history: ${error.response?.data?.message || error.message}`);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Global instance
const haAPI = new HomeAssistantAPI();

// Routes

// Get configuration
router.get('/config', async (req, res) => {
  try {
    const config = haAPI.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Save configuration
router.post('/config', async (req, res) => {
  try {
    const config: HomeAssistantConfig = req.body;

    // Validate required fields
    if (!config.url || !config.accessToken) {
      return res.status(400).json({ error: 'URL and access token are required' });
    }

    // Test connection
    const testResult = await haAPI.testConnection(config);
    if (!testResult.success) {
      return res.status(400).json({ error: `Connection test failed: ${testResult.error}` });
    }

    config.version = testResult.version;
    config.enabled = true;

    await haAPI.saveConfig(config);

    // Connect WebSocket if enabled
    if (config.enabled) {
      haAPI.connectWebSocket().catch(console.error);
    }

    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: `Failed to save configuration: ${error.message}` });
  }
});

// Test connection
router.post('/test', async (req, res) => {
  try {
    const config: HomeAssistantConfig = req.body;
    const result = await haAPI.testConnection(config);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: `Connection test failed: ${error.message}` });
  }
});

// Get all states
router.get('/states', async (req, res) => {
  try {
    const states = await haAPI.getStates();
    res.json(states);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get devices
router.get('/devices', async (req, res) => {
  try {
    const devices = await haAPI.getDevices();
    res.json(devices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get areas
router.get('/areas', async (req, res) => {
  try {
    const areas = await haAPI.getAreas();
    res.json(areas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get automations
router.get('/automations', async (req, res) => {
  try {
    const automations = await haAPI.getAutomations();
    res.json(automations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get scripts
router.get('/scripts', async (req, res) => {
  try {
    const scripts = await haAPI.getScripts();
    res.json(scripts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Call service
router.post('/services/:domain/:service', async (req, res) => {
  try {
    const { domain, service } = req.params;
    const serviceData = req.body;

    await haAPI.callService(domain, service, serviceData);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Set entity state
router.post('/states/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { state, attributes } = req.body;

    await haAPI.setState(entityId, state, attributes);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get history
router.get('/history', async (req, res) => {
  try {
    const { entityId, startTime, endTime } = req.query;

    const history = await haAPI.getHistory(
      entityId as string,
      startTime ? new Date(startTime as string) : undefined,
      endTime ? new Date(endTime as string) : undefined
    );

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get connection status
router.get('/status', async (req, res) => {
  try {
    const config = haAPI.getConfig();
    res.json({
      connected: haAPI.isConnected(),
      configured: !!config,
      enabled: config?.enabled || false,
      url: config?.url,
      name: config?.name
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket events streaming
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

    haAPI.on('state_changed', sendEvent);

    req.on('close', () => {
      haAPI.off('state_changed', sendEvent);
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;