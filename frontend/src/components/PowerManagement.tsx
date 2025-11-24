import React, { useState, useEffect, useRef } from 'react';
import { Power, Zap, Battery, BatteryCharging, Thermometer, Cpu, Sun, Moon, Settings, AlertTriangle, Clock, Activity, Play, Pause, Plus, Trash2, Edit, RefreshCw } from 'lucide-react';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function PowerManagement({ windowId: _windowId }: { windowId?: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'battery' | 'thermal' | 'plans' | 'rules'>('overview');
  const [status, setStatus] = useState<PowerStatus | null>(null);
  const [config, setConfig] = useState<PowerConfig | null>(null);
  const [brightness, setBrightness] = useState<number>(50);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoShutdownRule | null>(null);
  const [newRule, setNewRule] = useState<Partial<AutoShutdownRule>>({
    name: '',
    enabled: true,
    conditions: {},
    action: 'suspend'
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchStatus();
    fetchConfig();
    fetchBrightness();
  }, []);

  // Set up event streaming
  useEffect(() => {
    if (isMonitoring) {
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
  }, [isMonitoring]);

  // Auto-refresh status
  useEffect(() => {
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/power-management/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch power status:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/power-management/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch power config:', error);
    }
  };

  const fetchBrightness = async () => {
    try {
      const response = await fetch('/api/power-management/brightness');
      const data = await response.json();
      setBrightness(data.brightness);
    } catch (error) {
      console.error('Failed to fetch brightness:', error);
    }
  };

  const setupEventStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = new EventSource('/api/power-management/events');

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.battery || data.thermalState) {
          setStatus(data);
        }
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error('EventSource error:', error);
    };
  };

  const executePowerAction = async (action: string) => {
    if (!confirm(`Are you sure you want to ${action}? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/power-management/${action}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      // Success message (note: for shutdown/reboot, this may not display)
      console.log(`${action} initiated successfully`);
    } catch (error) {
      alert(`Failed to ${action}: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const setBrightnessLevel = async (level: number) => {
    try {
      const response = await fetch('/api/power-management/brightness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level })
      });

      if (response.ok) {
        setBrightness(level);
      }
    } catch (error) {
      console.error('Failed to set brightness:', error);
    }
  };

  const setCpuGovernor = async (governor: string) => {
    try {
      const response = await fetch('/api/power-management/cpu-governor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ governor })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      await fetchStatus();
    } catch (error) {
      alert(`Failed to set CPU governor: ${error.message}`);
    }
  };

  const saveAutoShutdownRule = async () => {
    if (!newRule.name || !newRule.action) {
      alert('Please provide a rule name and action');
      return;
    }

    setIsLoading(true);
    try {
      const rule: AutoShutdownRule = {
        id: editingRule?.id || Date.now().toString(),
        name: newRule.name,
        enabled: newRule.enabled || true,
        conditions: newRule.conditions || {},
        action: newRule.action as 'suspend' | 'hibernate' | 'shutdown'
      };

      const updatedRules = editingRule
        ? config!.autoShutdownRules.map(r => r.id === editingRule.id ? rule : r)
        : [...config!.autoShutdownRules, rule];

      await fetch('/api/power-management/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          autoShutdownRules: updatedRules
        })
      });

      await fetchConfig();
      setShowRuleDialog(false);
      setEditingRule(null);
      setNewRule({
        name: '',
        enabled: true,
        conditions: {},
        action: 'suspend'
      });
    } catch (error) {
      alert(`Failed to save rule: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAutoShutdownRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      const updatedRules = config!.autoShutdownRules.filter(r => r.id !== ruleId);
      await fetch('/api/power-management/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          autoShutdownRules: updatedRules
        })
      });

      await fetchConfig();
    } catch (error) {
      alert(`Failed to delete rule: ${error.message}`);
    }
  };

  const toggleAutoShutdownRule = async (ruleId: string, enabled: boolean) => {
    try {
      const updatedRules = config!.autoShutdownRules.map(r =>
        r.id === ruleId ? { ...r, enabled } : r
      );

      await fetch('/api/power-management/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          autoShutdownRules: updatedRules
        })
      });

      await fetchConfig();
    } catch (error) {
      alert(`Failed to update rule: ${error.message}`);
    }
  };

  const toggleMonitoring = async (enabled: boolean) => {
    const action = enabled ? 'start' : 'stop';
    try {
      await fetch(`/api/power-management/monitoring/${action}`, {
        method: 'POST'
      });
      setIsMonitoring(enabled);
    } catch (error) {
      alert(`Failed to ${action} monitoring: ${error.message}`);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getBatteryIcon = (level: number, charging: boolean) => {
    if (charging) return BatteryCharging;
    if (level > 75) return Battery;
    if (level > 50) return Battery;
    if (level > 25) return Battery;
    return Battery;
  };

  const getThermalIcon = (status: string) => {
    switch (status) {
      case 'critical': return AlertTriangle;
      case 'warning': return Thermometer;
      default: return Thermometer;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Power className="w-6 h-6" />
            Power Management
          </h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className={`w-5 h-5 ${isMonitoring ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm">
                {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
              </span>
            </div>

            <button
              onClick={() => toggleMonitoring(!isMonitoring)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                isMonitoring
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isMonitoring ? 'Stop' : 'Start'} Monitoring
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('battery')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'battery'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Battery className="w-4 h-4" />
            Battery
          </button>
          <button
            onClick={() => setActiveTab('thermal')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'thermal'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Thermometer className="w-4 h-4" />
            Thermal
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'plans'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Plans
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'rules'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Rules
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {!status ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Power className="w-16 h-16 text-gray-600 mx-auto mb-4 animate-pulse" />
              <p>Loading power status...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">System Uptime</span>
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-blue-500">
                      {formatUptime(status.uptime)}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Power Source</span>
                      {status.ac.connected ? <Zap className="w-4 h-4 text-green-500" /> : <Battery className="w-4 h-4 text-yellow-500" />}
                    </div>
                    <div className="text-lg font-semibold">
                      {status.ac.connected ? 'AC Power' : 'Battery'}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">CPU Governor</span>
                      <Cpu className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-lg font-semibold capitalize">
                      {status.cpuGovernor}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Power Consumption</span>
                      <Zap className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-lg font-semibold">
                      {status.powerConsumption ? `${status.powerConsumption.toFixed(1)}W` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Battery Status */}
                {status.battery.present && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Battery className="w-5 h-5" />
                      Battery Status
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold">{status.battery.level}%</span>
                          {React.createElement(getBatteryIcon(status.battery.level, status.battery.charging), {
                            className: `w-8 h-8 ${status.battery.charging ? 'text-green-500' : 'text-gray-400'}`
                          })}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span className="capitalize">{status.battery.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Health:</span>
                            <span className="capitalize">{status.battery.health}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Technology:</span>
                            <span>{status.battery.technology}</span>
                          </div>
                          {status.battery.voltage && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Voltage:</span>
                              <span>{status.battery.voltage.toFixed(1)}V</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Brightness</span>
                            <span className="text-sm">{brightness}%</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={brightness}
                            onChange={(e) => setBrightnessLevel(parseInt(e.target.value))}
                            className="w-full"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setBrightnessLevel(Math.max(1, brightness - 10))}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                          >
                            <Moon className="w-4 h-4 inline mr-1" />
                            Dimmer
                          </button>
                          <button
                            onClick={() => setBrightnessLevel(Math.min(100, brightness + 10))}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                          >
                            <Sun className="w-4 h-4 inline mr-1" />
                            Brighter
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Power Actions */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Power Actions</h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => executePowerAction('suspend')}
                      disabled={!status.suspendAvailable || !config?.enableSuspend}
                      className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors"
                    >
                      <Moon className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Suspend</div>
                    </button>

                    <button
                      onClick={() => executePowerAction('hibernate')}
                      disabled={!status.hibernateAvailable || !config?.enableHibernate}
                      className="p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors"
                    >
                      <Moon className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Hibernate</div>
                    </button>

                    <button
                      onClick={() => executePowerAction('reboot')}
                      disabled={!config?.enableReboot}
                      className="p-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Reboot</div>
                    </button>

                    <button
                      onClick={() => executePowerAction('shutdown')}
                      disabled={!config?.enableShutdown}
                      className="p-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors"
                    >
                      <Power className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Shutdown</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Battery Tab */}
            {activeTab === 'battery' && (
              <div className="space-y-6">
                {status.battery.present ? (
                  <>
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Battery Information</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm text-gray-400 mb-2">Charge Level</div>
                            <div className="relative">
                              <div className="w-full bg-gray-700 rounded-full h-8">
                                <div
                                  className={`h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                                    status.battery.level > 60 ? 'bg-green-600' :
                                    status.battery.level > 30 ? 'bg-yellow-600' : 'bg-red-600'
                                  }`}
                                  style={{ width: `${status.battery.level}%` }}
                                >
                                  {status.battery.level}%
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Status:</span>
                              <div className="font-medium capitalize">{status.battery.status}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Health:</span>
                              <div className="font-medium capitalize">{status.battery.health}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Technology:</span>
                              <div className="font-medium">{status.battery.technology}</div>
                            </div>
                            {status.battery.voltage && (
                              <div>
                                <span className="text-gray-400">Voltage:</span>
                                <div className="font-medium">{status.battery.voltage.toFixed(1)}V</div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="text-sm text-gray-400 mb-2">Power Source</div>
                            <div className="flex items-center gap-2">
                              {status.ac.connected ? (
                                <>
                                  <Zap className="w-5 h-5 text-green-500" />
                                  <span>AC Adapter{status.ac.adapter ? ` (${status.ac.adapter})` : ''}</span>
                                </>
                              ) : (
                                <>
                                  <Battery className="w-5 h-5 text-yellow-500" />
                                  <span>Battery Power</span>
                                </>
                              )}
                            </div>
                          </div>

                          {status.battery.temperature && (
                            <div>
                              <div className="text-sm text-gray-400 mb-2">Battery Temperature</div>
                              <div className="flex items-center gap-2">
                                <Thermometer className="w-5 h-5 text-blue-500" />
                                <span>{status.battery.temperature.toFixed(1)}°C</span>
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="text-sm text-gray-400 mb-2">Estimated Time</div>
                            <div className="text-sm">
                              {status.battery.charging
                                ? 'Charging...'
                                : status.battery.level > 20
                                ? `~${Math.round((status.battery.level / 100) * 8)}h remaining`
                                : 'Low battery - consider charging'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <Battery className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Battery Detected</h3>
                    <p className="text-gray-400">This system appears to be running on AC power only.</p>
                  </div>
                )}
              </div>
            )}

            {/* Thermal Tab */}
            {activeTab === 'thermal' && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">CPU Performance</h3>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">Current Governor:</span>
                    <span className="font-medium capitalize">{status.cpuGovernor}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {['performance', 'ondemand', 'conservative', 'powersave', 'userspace'].map(governor => (
                      <button
                        key={governor}
                        onClick={() => setCpuGovernor(governor)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          status.cpuGovernor === governor
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        {governor}
                      </button>
                    ))}
                  </div>
                </div>

                {status.thermalState.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Temperature Sensors</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {status.thermalState.map((thermal, index) => {
                        const TempIcon = getThermalIcon(thermal.status);
                        return (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border transition-all ${
                              thermal.status === 'critical' ? 'bg-red-600/20 border-red-500' :
                              thermal.status === 'warning' ? 'bg-yellow-600/20 border-yellow-500' :
                              'bg-gray-700 border-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <TempIcon className={`w-5 h-5 ${
                                thermal.status === 'critical' ? 'text-red-500' :
                                thermal.status === 'warning' ? 'text-yellow-500' :
                                'text-green-500'
                              }`} />
                              <span className={`text-xs px-2 py-1 rounded ${
                                thermal.status === 'critical' ? 'bg-red-600' :
                                thermal.status === 'warning' ? 'bg-yellow-600' :
                                'bg-green-600'
                              }`}>
                                {thermal.status}
                              </span>
                            </div>

                            <div className="text-sm font-medium mb-1">
                              {thermal.temperature.toFixed(1)}°C
                            </div>

                            <div className="text-xs text-gray-400">
                              {thermal.sensor}
                            </div>

                            <div className="text-xs text-gray-500 mt-1">
                              Max: {thermal.max}°C / Critical: {thermal.critical}°C
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {status.thermalState.length === 0 && (
                  <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <Thermometer className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Thermal Sensors</h3>
                    <p className="text-gray-400">Thermal monitoring is not available on this system.</p>
                  </div>
                )}
              </div>
            )}

            {/* Plans Tab */}
            {activeTab === 'plans' && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Power Plans</h3>
                  <p className="text-gray-400 mb-4">Custom power plans for different usage scenarios.</p>

                  <div className="text-center py-8">
                    <Settings className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Power plans feature coming soon...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Rules Tab */}
            {activeTab === 'rules' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Auto Shutdown Rules</h3>
                  <button
                    onClick={() => {
                      setEditingRule(null);
                      setNewRule({
                        name: '',
                        enabled: true,
                        conditions: {},
                        action: 'suspend'
                      });
                      setShowRuleDialog(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Rule
                  </button>
                </div>

                <div className="space-y-4">
                  {config?.autoShutdownRules.map(rule => (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-lg border transition-all ${
                        rule.enabled
                          ? 'bg-green-600/20 border-green-500'
                          : 'bg-gray-800 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className={`w-5 h-5 ${rule.enabled ? 'text-green-500' : 'text-gray-400'}`} />
                          <div>
                            <div className="font-semibold">{rule.name}</div>
                            <div className="text-sm text-gray-400">
                              Action: {rule.action} •
                              {Object.keys(rule.conditions).length} condition(s)
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleAutoShutdownRule(rule.id, !rule.enabled)}
                            className={`p-2 rounded transition-colors ${
                              rule.enabled
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            {rule.enabled ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setEditingRule(rule);
                              setNewRule(rule);
                              setShowRuleDialog(true);
                            }}
                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => deleteAutoShutdownRule(rule.id)}
                            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-gray-400">
                          {Object.entries(rule.conditions).map(([key, value]) => {
                              if (!value) return null;

                              const val = value as Record<string, unknown>;
                              let conditionText = '';
                              switch (key) {
                                case 'batteryLevel':
                                  conditionText = `Battery ≤ ${val.min}%`;
                                  break;
                                case 'temperature':
                                  conditionText = `Temp ≥ ${val.max}°C for ${val.duration || 0}s`;
                                  break;
                                case 'timeOfDay':
                                  conditionText = `Time: ${val.start || ''} - ${val.end || ''}`;
                                  break;
                                default:
                                  conditionText = `${key}: ${JSON.stringify(val)}`;
                              }

                          return (
                            <span key={key} className="mr-4">
                              {conditionText}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {(!config?.autoShutdownRules || config.autoShutdownRules.length === 0) && (
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                      <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Rules Configured</h3>
                      <p className="text-gray-400">Add auto shutdown rules to automatically manage power based on conditions.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rule Dialog */}
      {showRuleDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {editingRule ? 'Edit Rule' : 'Add Auto Shutdown Rule'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rule Name</label>
                <input
                  type="text"
                  value={newRule.name || ''}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Low Battery Shutdown"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Action</label>
                <select
                  value={newRule.action || 'suspend'}
                  onChange={(e) => setNewRule({ ...newRule, action: e.target.value as 'suspend' | 'hibernate' | 'shutdown' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="suspend">Suspend</option>
                  <option value="hibernate">Hibernate</option>
                  <option value="shutdown">Shutdown</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Conditions</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="battery-enabled"
                      checked={!!newRule.conditions?.batteryLevel}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewRule({
                            ...newRule,
                            conditions: {
                              ...newRule.conditions,
                              batteryLevel: { min: 10 }
                            }
                          });
                        } else {
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          const { batteryLevel: _batteryLevel, ...rest } = newRule.conditions || {};
                          setNewRule({ ...newRule, conditions: rest });
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor="battery-enabled" className="text-sm">Battery Level</label>
                    {newRule.conditions?.batteryLevel && (
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newRule.conditions.batteryLevel.min}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          conditions: {
                            ...newRule.conditions,
                            batteryLevel: { min: parseInt(e.target.value) }
                          }
                        })}
                        className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    )}
                    <span className="text-xs text-gray-400">%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="temp-enabled"
                      checked={!!newRule.conditions?.temperature}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewRule({
                            ...newRule,
                            conditions: {
                              ...newRule.conditions,
                              temperature: { max: 80, duration: 60 }
                            }
                          });
                        } else {
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          const { temperature: _temperature, ...rest } = newRule.conditions || {};
                          setNewRule({ ...newRule, conditions: rest });
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor="temp-enabled" className="text-sm">Temperature</label>
                    {newRule.conditions?.temperature && (
                      <>
                        <input
                          type="number"
                          min="40"
                          max="100"
                          value={newRule.conditions.temperature.max}
                          onChange={(e) => setNewRule({
                            ...newRule,
                            conditions: {
                              ...newRule.conditions,
                              temperature: {
                                ...newRule.conditions.temperature!,
                                max: parseInt(e.target.value)
                              }
                            }
                          })}
                          className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                        />
                        <span className="text-xs text-gray-400">°C for</span>
                        <input
                          type="number"
                          min="10"
                          max="3600"
                          value={newRule.conditions.temperature.duration}
                          onChange={(e) => setNewRule({
                            ...newRule,
                            conditions: {
                              ...newRule.conditions,
                              temperature: {
                                ...newRule.conditions.temperature!,
                                duration: parseInt(e.target.value)
                              }
                            }
                          })}
                          className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                        />
                        <span className="text-xs text-gray-400">s</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newRule.enabled !== false}
                    onChange={(e) => setNewRule({ ...newRule, enabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Enable rule</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRuleDialog(false);
                  setEditingRule(null);
                  setNewRule({
                    name: '',
                    enabled: true,
                    conditions: {},
                    action: 'suspend'
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAutoShutdownRule}
                disabled={isLoading || !newRule.name}
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
