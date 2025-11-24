import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const router = express.Router();

// Rate limiting for environment config API
const envConfigLimiter = new RateLimiterMemory({
  points: 20, // 20 requests per window
  duration: 60, // per 1 minute window
  blockDuration: 60, // block for 1 minute if exceeded
});

// Configuration file path
const ENV_CONFIG_FILE = path.join(process.env.HOME || '', '.web-desktop', 'environment-config.json');
const ENV_FILE_PATH = process.env.ENV_FILE_PATH || '/opt/web-desktop/backend/.env';

// Default environment configuration template
const DEFAULT_ENV_CONFIG = {
  external_services: {
    ollama: {
      url: 'http://localhost:11434',
      enabled: false,
      api_key: '',
      models: []
    },
    openrouter: {
      url: 'https://openrouter.ai/api/v1',
      enabled: false,
      api_key: '',
      models: []
    },
    home_assistant: {
      url: 'http://localhost:8123',
      enabled: false,
      access_token: ''
    },
    jellyfin: {
      url: 'http://localhost:8096',
      enabled: false,
      api_key: ''
    },
    emby: {
      url: 'http://localhost:8096',
      enabled: false,
      api_key: ''
    },
    sonarr: {
      url: 'http://localhost:8989',
      enabled: false,
      api_key: ''
    },
    radarr: {
      url: 'http://localhost:7878',
      enabled: false,
      api_key: ''
    },
    sabnzbd: {
      url: 'http://localhost:8080',
      enabled: false,
      api_key: ''
    }
  },
  system_tools: {
    ffmpeg_path: '/usr/bin/ffmpeg',
    handbrake_path: '/usr/bin/HandBrakeCLI',
    docker_path: '/usr/bin/docker',
    vnc_path: '/usr/bin/x11vnc',
    sensors_path: '/usr/bin/sensors'
  },
  security: {
    jwt_secret: '',
    session_secret: '',
    encryption_key: ''
  },
  paths: {
    data_dir: '/var/lib/web-desktop',
    temp_dir: '/tmp/web-desktop',
    transcoding_output: '/var/lib/web-desktop/transcoding',
    storage_mount_prefix: '/media/webdesktop'
  },
  network: {
    backend_port: 3001,
    frontend_port: 5173,
    vnc_port: 5900,
    rdp_port: 3389,
    allowed_origins: ['http://localhost:5173', 'http://localhost:5174']
  },
  features: {
    vnc_enabled: true,
    rdp_enabled: true,
    ai_enabled: false,
    media_server_enabled: false,
    container_management_enabled: true,
    system_monitoring_enabled: true
  },
  limits: {
    upload_limit: 104857600, // 100MB
    max_file_size: 52428800,  // 50MB
    max_archive_size: 209715200, // 200MB
    api_rate_limit: 30,
    websocket_rate_limit: 10
  }
};

// Ensure config directory exists
async function ensureConfigDir() {
  try {
    const configDir = path.dirname(ENV_CONFIG_FILE);
    await fs.mkdir(configDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create config directory:', error);
  }
}

// Load environment configuration
async function loadEnvConfig(): Promise<any> {
  try {
    await ensureConfigDir();

    if (await fs.access(ENV_CONFIG_FILE).then(() => true).catch(() => false)) {
      const data = await fs.readFile(ENV_CONFIG_FILE, 'utf8');
      return { ...DEFAULT_ENV_CONFIG, ...JSON.parse(data) };
    } else {
      return DEFAULT_ENV_CONFIG;
    }
  } catch (error) {
    console.error('Error loading environment config:', error);
    return DEFAULT_ENV_CONFIG;
  }
}

// Save environment configuration
async function saveEnvConfig(config: any): Promise<void> {
  try {
    await ensureConfigDir();
    await fs.writeFile(ENV_CONFIG_FILE, JSON.stringify(config, null, 2));

    // Update the actual .env file
    await updateEnvFile(config);
  } catch (error) {
    console.error('Error saving environment config:', error);
    throw error;
  }
}

// Update the actual .env file
async function updateEnvFile(config: any): Promise<void> {
  try {
    const envContent = `# Web Desktop Production Configuration
NODE_ENV=production
PORT=${config.network.backend_port}
HOST=0.0.0.0

# Frontend URLs
FRONTEND_URL=http://localhost:${config.network.frontend_port}
FRONTEND_DEV_URL=http://localhost:${config.network.frontend_port}

# Security
JWT_SECRET=${config.security.jwt_secret || crypto.randomBytes(32).toString('base64')}
SESSION_SECRET=${config.security.session_secret || crypto.randomBytes(32).toString('base64')}

# File System
DATA_DIR=${config.paths.data_dir}
UPLOAD_LIMIT=${config.limits.upload_limit}
TEMP_DIR=${config.paths.temp_dir}

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/web-desktop/app.log

# Database
DATABASE_PATH=/var/lib/web-desktop/database.sqlite

# External Tools Configuration
FFMPEG_PATH=${config.system_tools.ffmpeg_path}
HANDBRAKE_PATH=${config.system_tools.handbrake_path}
DOCKER_PATH=${config.system_tools.docker_path}
X11VNC_PATH=${config.system_tools.vnc_path}
SENSORS_PATH=${config.system_tools.sensors_path}

# External Services Configuration
OLLAMA_URL=${config.external_services.ollama.url}
OLLAMA_ENABLED=${config.external_services.ollama.enabled}
OPENROUTER_URL=${config.external_services.openrouter.url}
OPENROUTER_API_KEY=${config.external_services.openrouter.api_key}
OPENROUTER_ENABLED=${config.external_services.openrouter.enabled}
HOME_ASSISTANT_URL=${config.external_services.home_assistant.url}
HOME_ASSISTANT_TOKEN=${config.external_services.home_assistant.access_token}
HOME_ASSISTANT_ENABLED=${config.external_services.home_assistant.enabled}
JELLYFIN_URL=${config.external_services.jellyfin.url}
JELLYFIN_API_KEY=${config.external_services.jellyfin.api_key}
JELLYFIN_ENABLED=${config.external_services.jellyfin.enabled}
EMBY_URL=${config.external_services.emby.url}
EMBY_API_KEY=${config.external_services.emby.api_key}
EMBY_ENABLED=${config.external_services.emby.enabled}
SONARR_URL=${config.external_services.sonarr.url}
SONARR_API_KEY=${config.external_services.sonarr.api_key}
SONARR_ENABLED=${config.external_services.sonarr.enabled}
RADARR_URL=${config.external_services.radarr.url}
RADARR_API_KEY=${config.external_services.radarr.api_key}
RADARR_ENABLED=${config.external_services.radarr.enabled}
SABNZBD_URL=${config.external_services.sabnzbd.url}
SABNZBD_API_KEY=${config.external_services.sabnzbd.api_key}
SABNZBD_ENABLED=${config.external_services.sabnzbd.enabled}

# Media Server Configuration
TRANSCODING_ENGINE=ffmpeg
TRANSCODING_OUTPUT_PATH=${config.paths.transcoding_output}
TRANSCODING_TEMP_DIR=/tmp/web-desktop/transcoding

# Storage Configuration
STORAGE_MOUNT_PREFIX=${config.paths.storage_mount_prefix}
STORAGE_CONFIG_PATH=/etc/web-desktop/storage

# Remote Desktop Configuration
RDP_ENABLED=${config.features.rdp_enabled}
VNC_ENABLED=${config.features.vnc_enabled}
RDP_PORT=${config.network.rdp_port}
VNC_PORT=${config.network.vnc_port}

# System Monitoring
MONITORING_ENABLED=${config.features.system_monitoring_enabled}
MONITORING_INTERVAL=5000
MONITORING_HISTORY_SIZE=1000

# Feature Flags
AI_ENABLED=${config.features.ai_enabled}
MEDIA_SERVER_ENABLED=${config.features.media_server_enabled}
CONTAINER_MANAGEMENT_ENABLED=${config.features.container_management_enabled}

# Security Settings
ALLOWED_ORIGINS=${config.network.allowed_origins.join(',')}

# Rate Limiting
API_RATE_LIMIT=${config.limits.api_rate_limit}
WEBSOCKET_RATE_LIMIT=${config.limits.websocket_rate_limit}`;

    await fs.writeFile(ENV_FILE_PATH, envContent);
  } catch (error) {
    console.error('Error updating .env file:', error);
    throw error;
  }
}

// Get current environment configuration
router.get('/config', async (req, res) => {
  try {
    await envConfigLimiter.consume(req.ip);

    const config = await loadEnvConfig();

    // Don't send sensitive data to frontend
    const safeConfig = {
      ...config,
      security: {
        ...config.security,
        jwt_secret: config.security.jwt_secret ? '***SET***' : '',
        session_secret: config.security.session_secret ? '***SET***' : '',
        encryption_key: config.security.encryption_key ? '***SET***' : ''
      }
    };

    res.json(safeConfig);
  } catch (error) {
    console.error('Error getting environment config:', error);
    res.status(500).json({ error: 'Failed to load environment configuration' });
  }
});

// Update environment configuration
router.post('/config', async (req, res) => {
  try {
    await envConfigLimiter.consume(req.ip);

    const { section, data } = req.body;

    if (!section || !data) {
      return res.status(400).json({ error: 'Section and data are required' });
    }

    const config = await loadEnvConfig();

    // Update specific section
    config[section] = { ...config[section], ...data };

    // Validate sensitive data
    if (section === 'security') {
      // Don't allow clearing secrets unless new ones are provided
      if (data.jwt_secret === '***SET***') {
        delete data.jwt_secret;
      }
      if (data.session_secret === '***SET***') {
        delete data.session_secret;
      }
    }

    if (section === 'external_services') {
      // Validate URLs and API keys
      for (const [service, config] of Object.entries(data)) {
        const serviceConfig = config as any;
        if (serviceConfig.url && !isValidUrl(serviceConfig.url)) {
          return res.status(400).json({ error: `Invalid URL for ${service}` });
        }
      }
    }

    await saveEnvConfig(config);

    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error updating environment config:', error);
    res.status(500).json({ error: 'Failed to update environment configuration' });
  }
});

// Test external service connection
router.post('/test-connection', async (req, res) => {
  try {
    await envConfigLimiter.consume(req.ip);

    const { service, config } = req.body;

    if (!service || !config) {
      return res.status(400).json({ error: 'Service and config are required' });
    }

    const result = await testServiceConnection(service, config);
    res.json(result);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Get available models from AI services
router.get('/models/:service', async (req, res) => {
  try {
    await envConfigLimiter.consume(req.ip);

    const { service } = req.params;
    const config = await loadEnvConfig();

    let models: any[] = [];

    switch (service) {
      case 'ollama':
        models = await getOllamaModels(config.external_services.ollama.url);
        break;
      case 'openrouter':
        models = await getOpenRouterModels();
        break;
      default:
        return res.status(400).json({ error: 'Unsupported service' });
    }

    res.json(models);
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

// Helper functions
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function testServiceConnection(service: string, config: any): Promise<any> {
  const fetch = (await import('node-fetch')).default;

  try {
    switch (service) {
      case 'ollama':
        const ollamaResponse = await fetch(`${config.url}/api/tags`);
        return { success: ollamaResponse.ok, message: ollamaResponse.ok ? 'Connection successful' : 'Connection failed' };

      case 'openrouter':
        const openrouterResponse = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { 'Authorization': `Bearer ${config.api_key}` }
        });
        return { success: openrouterResponse.ok, message: openrouterResponse.ok ? 'API key valid' : 'Invalid API key' };

      case 'home_assistant':
        const haResponse = await fetch(`${config.url}/api/`, {
          headers: { 'Authorization': `Bearer ${config.access_token}` }
        });
        return { success: haResponse.ok, message: haResponse.ok ? 'Connection successful' : 'Connection failed' };

      default:
        return { success: false, message: 'Unsupported service' };
    }
  } catch (error) {
    return { success: false, message: `Connection error: ${error}` };
  }
}

async function getOllamaModels(url: string): Promise<any[]> {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${url}/api/tags`);
    const data = await response.json() as any;
    return data?.models || [];
  } catch {
    return [];
  }
}

async function getOpenRouterModels(): Promise<any[]> {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://openrouter.ai/api/v1/models');
    const data = await response.json() as any;
    return data?.data || [];
  } catch {
    return [];
  }
}

export default router;