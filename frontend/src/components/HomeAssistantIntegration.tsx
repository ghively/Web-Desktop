import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Home, Power, Lightbulb, Thermometer, DoorOpen, Camera, Lock, Wind, Settings, Play, Pause, AlertTriangle, CheckCircle, Wifi, WifiOff, RefreshCw, MapPin, Clock, Activity, Code, Zap, Droplets, Sun, Cloud } from 'lucide-react';

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
  attributes: Record<string, unknown>;
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
  trigger: Record<string, unknown>[];
  condition: Record<string, unknown>[];
  action: Record<string, unknown>[];
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
  sequence: Record<string, unknown>[];
  last_triggered?: string;
  current: number;
  max: number;
  is_enabled: boolean;
}

export default function HomeAssistantIntegration() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'devices' | 'automations' | 'scripts' | 'settings'>('dashboard');
  const [config, setConfig] = useState<HomeAssistantConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [states, setStates] = useState<EntityState[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [configForm, setConfigForm] = useState<Partial<HomeAssistantConfig>>({
    url: '',
    accessToken: '',
    name: 'Home Assistant',
    unitSystem: 'metric'
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load configuration
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Set up event streaming when connected
  useEffect(() => {
    if (isConnected) {
      setupEventStream();
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isConnected]);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/home-assistant/config');
      const data = await response.json();
      setConfig(data);
      setIsConfigured(!!data);
      if (data) {
        setConfigForm({
          url: data.url || '',
          accessToken: data.accessToken || '',
          name: data.name || 'Home Assistant',
          unitSystem: data.unitSystem || 'metric'
        });
      }
    } catch (error) {
      console.error('Failed to fetch Home Assistant config:', error);
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/home-assistant/status');
      const data = await response.json();
      setIsConnected(data.connected);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const fetchStates = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/home-assistant/states');
      const data = await response.json();
      setStates(data);
    } catch (error) {
      console.error('Failed to fetch states:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  const fetchDevices = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/home-assistant/devices');
      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  const fetchAreas = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/home-assistant/areas');
      const data = await response.json();
      setAreas(data);
    } catch (error) {
      console.error('Failed to fetch areas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  const fetchAutomations = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/home-assistant/automations');
      const data = await response.json();
      setAutomations(data);
    } catch (error) {
      console.error('Failed to fetch automations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  const fetchScripts = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/home-assistant/scripts');
      const data = await response.json();
      setScripts(data);
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  const setupEventStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = new EventSource('/api/home-assistant/events');

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'state_changed') {
          setStates(prevStates =>
            prevStates.map(state =>
              state.entity_id === data.entity_id ? data.new_state : state
            )
          );
        }
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error('EventSource error:', error);
    };
  };

  const testConnection = async () => {
    setTestResult(null);
    try {
      const response = await fetch('/api/home-assistant/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      });
      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.success ? `Connected successfully! Version: ${data.version}` : data.error
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed'
      });
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/home-assistant/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setIsConfigured(true);
        setShowConfigDialog(false);
        setTestResult(null);
        await fetchStatus();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message || 'Failed to save configuration'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const callService = async (domain: string, service: string, serviceData?: Record<string, unknown>) => {
    try {
      await fetch(`/api/home-assistant/services/${domain}/${service}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData)
      });
      await fetchStates();
    } catch (error) {
      console.error('Failed to call service:', error);
    }
  };

  const toggleEntity = async (entityId: string, currentState: string) => {
    const [domain] = entityId.split('.');
    const service = currentState === 'on' ? 'turn_off' : 'turn_on';
    await callService(domain, service, { entity_id: entityId });
  };

  const toggleAutomation = async (entityId: string, isEnabled: boolean) => {
    const service = isEnabled ? 'turn_off' : 'turn_on';
    await callService('automation', service, { entity_id: entityId });
    await fetchAutomations();
  };

  const runScript = async (entityId: string) => {
    await callService('script', entityId.replace('script.', ''));
  };

  const getEntityIcon = (entityId: string) => {
    const domain = entityId.split('.')[0];

    const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
      light: Lightbulb,
      switch: Power,
      cover: DoorOpen,
      camera: Camera,
      lock: Lock,
      climate: Thermometer,
      fan: Wind,
      humidifier: Droplets,
      water_heater: Droplets,
      sensor: Activity,
      binary_sensor: AlertTriangle,
      sun: Sun,
      weather: Cloud
    };

    return iconMap[domain] || Power;
  };

  const getEntitiesByDomain = (domain: string) => {
    return states.filter(state => state.entity_id.startsWith(domain));
  };

  
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchStates();
      fetchDevices();
      fetchAreas();
      if (activeTab === 'automations') fetchAutomations();
      if (activeTab === 'scripts') fetchScripts();
    }
  }, [isConnected, activeTab, fetchStates, fetchDevices, fetchAreas, fetchAutomations, fetchScripts]);

  const commonDomains = ['light', 'switch', 'cover', 'climate', 'sensor', 'binary_sensor', 'lock'];

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Home className="w-6 h-6" />
            Home Assistant
          </h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm">
                {isConnected ? 'Connected' : isConfigured ? 'Disconnected' : 'Not configured'}
              </span>
            </div>

            <button
              onClick={() => setShowConfigDialog(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </button>

            <button
              onClick={fetchStatus}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status */}
        {config && (
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span>{config.name}</span>
            {config.version && <span>v{config.version}</span>}
            {config.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {config.location}
              </span>
            )}
            <span>{devices.length} devices</span>
            <span>{states.length} entities</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1 mt-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'devices'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Devices
          </button>
          <button
            onClick={() => setActiveTab('automations')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'automations'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            Automations
          </button>
          <button
            onClick={() => setActiveTab('scripts')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'scripts'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Code className="w-4 h-4" />
            Scripts
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {!isConfigured ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Home className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Configure Home Assistant</h2>
            <p className="text-gray-400 mb-6 max-w-md">
              Connect to your Home Assistant instance to control and monitor your smart home devices.
            </p>
            <button
              onClick={() => setShowConfigDialog(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Get Started
            </button>
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <WifiOff className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Not Connected</h2>
            <p className="text-gray-400 mb-6 max-w-md">
              Unable to connect to Home Assistant. Please check your configuration and network connection.
            </p>
            <button
              onClick={() => setShowConfigDialog(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Check Configuration
            </button>
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-500">{states.length}</div>
                    <div className="text-sm text-gray-400">Total Entities</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-500">
                      {states.filter(s => s.state === 'on').length}
                    </div>
                    <div className="text-sm text-gray-400">Entities On</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-500">{devices.length}</div>
                    <div className="text-sm text-gray-400">Devices</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-500">{areas.length}</div>
                    <div className="text-sm text-gray-400">Areas</div>
                  </div>
                </div>

                {/* Common Controls */}
                {commonDomains.map(domain => {
                  const domainStates = getEntitiesByDomain(domain);
                  if (domainStates.length === 0) return null;

                  return (
                    <div key={domain} className="bg-gray-800 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
                        {React.createElement(getEntityIcon(domain))}
                        {domain} ({domainStates.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {domainStates.slice(0, 6).map(state => {
                          const Icon = getEntityIcon(state.entity_id, state.attributes);
                          const isOn = state.state === 'on';
                          const isControllable = ['light', 'switch', 'cover', 'lock'].includes(domain);

                          return (
                            <div
                              key={state.entity_id}
                              className={`p-3 rounded-lg border transition-all ${
                                isOn ? 'bg-green-600/20 border-green-500' : 'bg-gray-700 border-gray-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-4 h-4 ${isOn ? 'text-green-500' : 'text-gray-400'}`} />
                                  <div>
                                    <div className="font-medium text-sm">
                                      {state.attributes?.friendly_name || state.entity_id}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {state.state}
                                    </div>
                                  </div>
                                </div>

                                {isControllable && (
                                  <button
                                    onClick={() => toggleEntity(state.entity_id, state.state)}
                                    className={`p-2 rounded transition-colors ${
                                      isOn
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                  >
                                    {isOn ? <Power className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Devices Tab */}
            {activeTab === 'devices' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {devices.map(device => (
                    <div
                      key={device.id}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{device.name}</h4>
                        {!device.disabled_by && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>

                      {device.manufacturer && (
                        <div className="text-sm text-gray-400">{device.manufacturer}</div>
                      )}
                      {device.model && (
                        <div className="text-sm text-gray-400">{device.model}</div>
                      )}
                      {device.sw_version && (
                        <div className="text-sm text-gray-400">v{device.sw_version}</div>
                      )}

                      {device.labels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {device.labels.map(label => (
                            <span key={label} className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Automations Tab */}
            {activeTab === 'automations' && (
              <div className="space-y-4">
                {automations.map(automation => (
                  <div
                    key={automation.id}
                    className={`p-4 rounded-lg border transition-all ${
                      automation.is_enabled
                        ? 'bg-green-600/20 border-green-500'
                        : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Zap className={`w-5 h-5 ${automation.is_enabled ? 'text-green-500' : 'text-gray-400'}`} />
                        <div>
                          <div className="font-semibold">{automation.name}</div>
                          {automation.description && (
                            <div className="text-sm text-gray-400">{automation.description}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Mode: {automation.mode} • Triggers: {automation.trigger.length}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {automation.last_triggered && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(automation.last_triggered).toLocaleTimeString()}
                          </span>
                        )}

                        <button
                          onClick={() => toggleAutomation(automation.id, automation.is_enabled)}
                          className={`p-2 rounded transition-colors ${
                            automation.is_enabled
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {automation.is_enabled ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Scripts Tab */}
            {activeTab === 'scripts' && (
              <div className="space-y-4">
                {scripts.map(script => (
                  <div
                    key={script.id}
                    className="p-4 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Code className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="font-semibold">{script.name}</div>
                          {script.description && (
                            <div className="text-sm text-gray-400">{script.description}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Mode: {script.mode} • Sequence: {script.sequence.length} steps
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {script.last_triggered && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(script.last_triggered).toLocaleTimeString()}
                          </span>
                        )}

                        <button
                          onClick={() => runScript(script.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Run
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Connection Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">URL:</span>
                      <span>{config?.url}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span>{config?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Version:</span>
                      <span>{config?.version || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Location:</span>
                      <span>{config?.location || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Unit System:</span>
                      <span className="capitalize">{config?.unitSystem}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Timezone:</span>
                      <span>{config?.timezone || 'Local'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">{states.length}</div>
                      <div className="text-sm text-gray-400">Entities</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">{devices.length}</div>
                      <div className="text-sm text-gray-400">Devices</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-500">{automations.length}</div>
                      <div className="text-sm text-gray-400">Automations</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-500">{scripts.length}</div>
                      <div className="text-sm text-gray-400">Scripts</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Configuration Dialog */}
      {showConfigDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Configure Home Assistant</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={configForm.name}
                  onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="My Home Assistant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Home Assistant URL</label>
                <input
                  type="url"
                  value={configForm.url}
                  onChange={(e) => setConfigForm({ ...configForm, url: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="http://homeassistant.local:8123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Access Token</label>
                <input
                  type="password"
                  value={configForm.accessToken}
                  onChange={(e) => setConfigForm({ ...configForm, accessToken: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Your long-lived access token"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Unit System</label>
                <select
                  value={configForm.unitSystem}
                  onChange={(e) => setConfigForm({ ...configForm, unitSystem: e.target.value as 'metric' | 'imperial' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="metric">Metric</option>
                  <option value="imperial">Imperial</option>
                </select>
              </div>
            </div>

            {testResult && (
              <div className={`mt-4 p-3 rounded-lg ${
                testResult.success ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
              }`}>
                {testResult.message}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowConfigDialog(false);
                  setTestResult(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={testConnection}
                disabled={isLoading || !configForm.url || !configForm.accessToken}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 rounded-lg transition-colors"
              >
                Test
              </button>
              <button
                onClick={saveConfig}
                disabled={isLoading || !configForm.url || !configForm.accessToken}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
