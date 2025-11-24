import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Server,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader,
  Eye,
  EyeOff,
  Save,
  TestTube,
  Database,
  HardDrive,
  Wifi
} from 'lucide-react';
import { clsx } from 'clsx';

interface EnvironmentConfigurationProps {
  windowId?: string;
}

interface AIModel {
  id: string;
  name: string;
  size?: string;
  description?: string;
}

interface EnvironmentConfig {
  external_services: {
    ollama: {
      url: string;
      enabled: boolean;
      api_key: string;
      models: AIModel[];
    };
    openrouter: {
      url: string;
      enabled: boolean;
      api_key: string;
      models: AIModel[];
    };
    home_assistant: {
      url: string;
      enabled: boolean;
      access_token: string;
    };
    jellyfin: {
      url: string;
      enabled: boolean;
      api_key: string;
    };
    emby: {
      url: string;
      enabled: boolean;
      api_key: string;
    };
    sonarr: {
      url: string;
      enabled: boolean;
      api_key: string;
    };
    radarr: {
      url: string;
      enabled: boolean;
      api_key: string;
    };
    sabnzbd: {
      url: string;
      enabled: boolean;
      api_key: string;
    };
  };
  system_tools: {
    ffmpeg_path: string;
    handbrake_path: string;
    docker_path: string;
    vnc_path: string;
    sensors_path: string;
  };
  security: {
    jwt_secret: string;
    session_secret: string;
    encryption_key: string;
  };
  paths: {
    data_dir: string;
    temp_dir: string;
    transcoding_output: string;
    storage_mount_prefix: string;
  };
  network: {
    backend_port: number;
    frontend_port: number;
    vnc_port: number;
    rdp_port: number;
    allowed_origins: string[];
  };
  features: {
    vnc_enabled: boolean;
    rdp_enabled: boolean;
    ai_enabled: boolean;
    media_server_enabled: boolean;
    container_management_enabled: boolean;
    system_monitoring_enabled: boolean;
  };
  limits: {
    upload_limit: number;
    max_file_size: number;
    max_archive_size: number;
    api_rate_limit: number;
    websocket_rate_limit: number;
  };
}

export const EnvironmentConfiguration: React.FC<EnvironmentConfigurationProps> = () => {
  const [config, setConfig] = useState<EnvironmentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState('services');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({}); // Used for toggling secret visibility
  const [connectionTests, setConnectionTests] = useState<Record<string, { status: 'idle' | 'testing' | 'success' | 'error'; message: string }>>({});

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/environment-config/config');
      const data = await response.json();
      setConfig(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  const saveConfiguration = async (section: string, data: unknown) => {
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/environment-config/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ section, data }),
      });

      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        await loadConfiguration(); // Reload configuration
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setSaveStatus('error');
    }
  };

  const testConnection = async (service: string, serviceConfig: any) => {
    setConnectionTests(prev => ({
      ...prev,
      [service]: { status: 'testing', message: 'Testing connection...' }
    }));

    try {
      const response = await fetch('/api/environment-config/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service, config: serviceConfig }),
      });

      const result = await response.json();
      setConnectionTests(prev => ({
        ...prev,
        [service]: {
          status: result.success ? 'success' : 'error',
          message: result.message
        }
      }));
    } catch (error) {
      setConnectionTests(prev => ({
        ...prev,
        [service]: {
          status: 'error',
          message: 'Connection test failed'
        }
      }));
    }
  };

  const toggleSecret = (field: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const tabs = [
    { id: 'services', name: 'External Services', icon: Globe },
    { id: 'system', name: 'System Tools', icon: Server },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'features', name: 'Features', icon: SettingsIcon },
    { id: 'paths', name: 'Paths', icon: HardDrive },
    { id: 'network', name: 'Network', icon: Wifi },
    { id: 'limits', name: 'Limits', icon: Database }
  ];

  return (
    <div className="flex h-full bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Environment Configuration
          </h2>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                )}
              >
                <tab.icon className="w-4 h-4 mr-3" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {tabs.find(t => t.id === activeTab)?.name}
            </h1>
            {saveStatus !== 'idle' && (
              <div className={clsx(
                'flex items-center px-3 py-1 rounded-full text-sm',
                saveStatus === 'saved' && 'bg-green-100 text-green-700',
                saveStatus === 'saving' && 'bg-blue-100 text-blue-700',
                saveStatus === 'error' && 'bg-red-100 text-red-700'
              )}>
                {saveStatus === 'saving' && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                {saveStatus === 'saved' && <CheckCircle className="w-4 h-4 mr-2" />}
                {saveStatus === 'error' && <AlertCircle className="w-4 h-4 mr-2" />}
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && 'Configuration saved!'}
                {saveStatus === 'error' && 'Failed to save'}
              </div>
            )}
          </div>

          {activeTab === 'services' && (
            <div className="space-y-6">
              {/* AI Services */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">AI Services</h3>
                <div className="space-y-4">
                  <ServiceConfig
                    service="ollama"
                    title="Ollama"
                    description="Local AI model service"
                    config={config.external_services.ollama}
                    onSave={(data) => saveConfiguration('external_services', { ...config.external_services, ollama: data })}
                    onTest={() => testConnection('ollama', config.external_services.ollama)}
                    testResult={connectionTests.ollama}
                  />
                  <ServiceConfig
                    service="openrouter"
                    title="OpenRouter"
                    description="Cloud AI model service"
                    config={config.external_services.openrouter}
                    onSave={(data) => saveConfiguration('external_services', { ...config.external_services, openrouter: data })}
                    onTest={() => testConnection('openrouter', config.external_services.openrouter)}
                    testResult={connectionTests.openrouter}
                  />
                </div>
              </div>

              {/* Home Automation */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Home Automation</h3>
                <ServiceConfig
                  service="home_assistant"
                  title="Home Assistant"
                  description="Home automation platform"
                  config={config.external_services.home_assistant}
                  onSave={(data) => saveConfiguration('external_services', { ...config.external_services, home_assistant: data })}
                  onTest={() => testConnection('home_assistant', config.external_services.home_assistant)}
                  testResult={connectionTests.home_assistant}
                />
              </div>

              {/* Media Servers */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Media Servers</h3>
                <div className="space-y-4">
                  <ServiceConfig
                    service="jellyfin"
                    title="Jellyfin"
                    description="Media server"
                    config={config.external_services.jellyfin}
                    onSave={(data) => saveConfiguration('external_services', { ...config.external_services, jellyfin: data })}
                    onTest={() => testConnection('jellyfin', config.external_services.jellyfin)}
                    testResult={connectionTests.jellyfin}
                  />
                  <ServiceConfig
                    service="emby"
                    title="Emby"
                    description="Media server"
                    config={config.external_services.emby}
                    onSave={(data) => saveConfiguration('external_services', { ...config.external_services, emby: data })}
                    onTest={() => testConnection('emby', config.external_services.emby)}
                    testResult={connectionTests.emby}
                  />
                </div>
              </div>

              {/* Download Managers */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Download Managers</h3>
                <div className="space-y-4">
                  <ServiceConfig
                    service="sonarr"
                    title="Sonarr"
                    description="TV series manager"
                    config={config.external_services.sonarr}
                    onSave={(data) => saveConfiguration('external_services', { ...config.external_services, sonarr: data })}
                    onTest={() => testConnection('sonarr', config.external_services.sonarr)}
                    testResult={connectionTests.sonarr}
                  />
                  <ServiceConfig
                    service="radarr"
                    title="Radarr"
                    description="Movie manager"
                    config={config.external_services.radarr}
                    onSave={(data) => saveConfiguration('external_services', { ...config.external_services, radarr: data })}
                    onTest={() => testConnection('radarr', config.external_services.radarr)}
                    testResult={connectionTests.radarr}
                  />
                  <ServiceConfig
                    service="sabnzbd"
                    title="Sabnzbd"
                    description="Usenet downloader"
                    config={config.external_services.sabnzbd}
                    onSave={(data) => saveConfiguration('external_services', { ...config.external_services, sabnzbd: data })}
                    onTest={() => testConnection('sabnzbd', config.external_services.sabnzbd)}
                    testResult={connectionTests.sabnzbd}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">System Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    FFmpeg Path
                  </label>
                  <input
                    type="text"
                    value={config.system_tools.ffmpeg_path}
                    onChange={(e) => {
                      const newConfig = { ...config, system_tools: { ...config.system_tools, ffmpeg_path: e.target.value } };
                      setConfig(newConfig);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    HandBrake Path
                  </label>
                  <input
                    type="text"
                    value={config.system_tools.handbrake_path}
                    onChange={(e) => {
                      const newConfig = { ...config, system_tools: { ...config.system_tools, handbrake_path: e.target.value } };
                      setConfig(newConfig);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Docker Path
                  </label>
                  <input
                    type="text"
                    value={config.system_tools.docker_path}
                    onChange={(e) => {
                      const newConfig = { ...config, system_tools: { ...config.system_tools, docker_path: e.target.value } };
                      setConfig(newConfig);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    VNC Path
                  </label>
                  <input
                    type="text"
                    value={config.system_tools.vnc_path}
                    onChange={(e) => {
                      const newConfig = { ...config, system_tools: { ...config.system_tools, vnc_path: e.target.value } };
                      setConfig(newConfig);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <button
                onClick={() => saveConfiguration('system_tools', config.system_tools)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save System Tools
              </button>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Feature Flags</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(config.features).map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => {
                        const newConfig = { ...config, features: { ...config.features, [key]: e.target.checked } };
                        setConfig(newConfig);
                      }}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white capitalize">
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Enable {key.replace(/_/g, ' ')} functionality
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <button
                onClick={() => saveConfiguration('features', config.features)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Feature Settings
              </button>
            </div>
          )}

          {/* Additional tabs can be implemented similarly */}
        </div>
      </div>
    </div>
  );
};

interface ServiceConfigProps {
  service: string;
  title: string;
  description: string;
  config: any;
  onSave: (data: any) => void;
  onTest: () => void;
  testResult?: { status: 'idle' | 'testing' | 'success' | 'error'; message: string };
}

const ServiceConfig: React.FC<ServiceConfigProps> = ({ service, title, description, config, onSave, onTest, testResult }) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    onSave(localConfig);
  };

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={localConfig.enabled}
            onChange={(e) => setLocalConfig({ ...localConfig, enabled: e.target.checked })}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
        </label>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            URL
          </label>
          <input
            type="text"
            value={localConfig.url || ''}
            onChange={(e) => setLocalConfig({ ...localConfig, url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder={service === 'ollama' ? 'http://localhost:11434' : 'https://example.com'}
          />
        </div>

        {(localConfig.api_key || localConfig.access_token) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key / Token
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={localConfig.api_key || localConfig.access_token || ''}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  ...(localConfig.api_key !== undefined ? { api_key: e.target.value } : {}),
                  ...(localConfig.access_token !== undefined ? { access_token: e.target.value } : {})
                })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter API key or access token"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={handleSave}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Save className="w-4 h-4 mr-1.5" />
          Save
        </button>

        <div className="flex items-center space-x-2">
          {testResult && (
            <div className={clsx(
              'text-xs px-2 py-1 rounded',
              testResult.status === 'success' && 'bg-green-100 text-green-700',
              testResult.status === 'error' && 'bg-red-100 text-red-700',
              testResult.status === 'testing' && 'bg-blue-100 text-blue-700'
            )}>
              {testResult.message}
            </div>
          )}
          <button
            onClick={onTest}
            disabled={!localConfig.enabled || testResult?.status === 'testing'}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center',
              testResult?.status === 'testing'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            )}
          >
            {testResult?.status === 'testing' ? (
              <Loader className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4 mr-1.5" />
            )}
            {testResult?.status === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>
    </div>
  );
};