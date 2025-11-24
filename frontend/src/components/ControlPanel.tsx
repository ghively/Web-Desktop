import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Users, Network, Server, Globe, Play, Square, RefreshCw, Settings } from 'lucide-react';
import { API_CONFIG } from '../config/api';

interface ControlPanelProps {
  windowId: string;
}

interface SystemInfo {
  os: {
    platform: string;
    distro: string;
    release: string;
    codename: string;
    kernel: string;
    arch: string;
  };
  hostname: string;
  uptime: {
    seconds: number;
    formatted: string;
  };
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    physicalCores: number;
    speed: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    active: number;
  };
  timezone: string;
}

interface NetworkInterface {
  name: string;
  ip4: string;
  ip6: string;
  mac: string;
  internal: boolean;
  virtual: boolean;
  type: string;
  speed?: number;
  operstate: string;
}

interface NetworkInfo {
  interfaces: NetworkInterface[];
  dnsServers: string[];
  defaultGateway: string;
  activeConnections: number;
}

interface User {
  username: string;
  uid: number;
  gid: number;
  fullName: string;
  home: string;
  shell: string;
}

interface Service {
  name: string;
  load: string;
  active: string;
  sub: string;
  description: string;
  running: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'network' | 'users' | 'services' | 'hostname'>('system');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [hostname, setHostname] = useState<{ hostname: string; static: string; pretty: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = API_CONFIG.getEndpointUrl('controlPanel');

  const loadSystemInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/system`);
      if (!response.ok) throw new Error('Failed to fetch system info');
      const data = await response.json();
      setSystemInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const loadNetworkInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/network`);
      if (!response.ok) throw new Error('Failed to fetch network info');
      const data = await response.json();
      setNetworkInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/services`);
      if (!response.ok) throw new Error('Failed to fetch services');
      const data = await response.json();
      setServices(data.services);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const loadHostname = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/hostname`);
      if (!response.ok) throw new Error('Failed to fetch hostname');
      const data = await response.json();
      setHostname(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const toggleService = async (serviceName: string, action: 'start' | 'stop') => {
    try {
      const response = await fetch(`${API_BASE}/services/${serviceName}/${action}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`Failed to ${action} service`);
      loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  
  useEffect(() => {
    switch (activeTab) {
      case 'system':
        loadSystemInfo();
        break;
      case 'network':
        loadNetworkInfo();
        break;
      case 'users':
        loadUsers();
        break;
      case 'services':
        loadServices();
        break;
      case 'hostname':
        loadHostname();
        break;
    }
  }, [activeTab, loadHostname, loadNetworkInfo, loadServices, loadSystemInfo, loadUsers]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Settings className="text-blue-400" size={20} />
          <h2 className="text-gray-100 font-semibold">Control Panel</h2>
        </div>
        <button
          onClick={() => {
            switch (activeTab) {
              case 'system': loadSystemInfo(); break;
              case 'network': loadNetworkInfo(); break;
              case 'users': loadUsers(); break;
              case 'services': loadServices(); break;
              case 'hostname': loadHostname(); break;
            }
          }}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'system', label: 'System', icon: Monitor },
          { id: 'network', label: 'Network', icon: Network },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'services', label: 'Services', icon: Server },
          { id: 'hostname', label: 'Hostname', icon: Globe },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === id
                ? 'border-blue-500 text-blue-400 bg-gray-800/50'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* System Info */}
            {activeTab === 'system' && systemInfo && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-gray-300 font-semibold mb-3">Operating System</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Platform:</span>
                        <span className="text-gray-200">{systemInfo.os.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Distribution:</span>
                        <span className="text-gray-200">{systemInfo.os.distro}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Release:</span>
                        <span className="text-gray-200">{systemInfo.os.release}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Kernel:</span>
                        <span className="text-gray-200">{systemInfo.os.kernel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Architecture:</span>
                        <span className="text-gray-200">{systemInfo.os.arch}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-gray-300 font-semibold mb-3">System Info</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Hostname:</span>
                        <span className="text-gray-200">{systemInfo.hostname}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Uptime:</span>
                        <span className="text-gray-200">{systemInfo.uptime.formatted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Timezone:</span>
                        <span className="text-gray-200">{systemInfo.timezone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-gray-300 font-semibold mb-3">CPU</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Processor:</span>
                        <span className="text-gray-200">{systemInfo.cpu.brand}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cores:</span>
                        <span className="text-gray-200">{systemInfo.cpu.cores} ({systemInfo.cpu.physicalCores} physical)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Speed:</span>
                        <span className="text-gray-200">{systemInfo.cpu.speed} GHz</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-gray-300 font-semibold mb-3">Memory</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total:</span>
                        <span className="text-gray-200">{formatBytes(systemInfo.memory.total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Used:</span>
                        <span className="text-gray-200">{formatBytes(systemInfo.memory.used)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Free:</span>
                        <span className="text-gray-200">{formatBytes(systemInfo.memory.free)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active:</span>
                        <span className="text-gray-200">{formatBytes(systemInfo.memory.active)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Network */}
            {activeTab === 'network' && networkInfo && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-gray-300 font-semibold mb-3">Network Configuration</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Default Gateway:</span>
                      <span className="text-gray-200">{networkInfo.defaultGateway || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">DNS Servers:</span>
                      <span className="text-gray-200">{networkInfo.dnsServers.join(', ') || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Active Connections:</span>
                      <span className="text-gray-200">{networkInfo.activeConnections}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-gray-300 font-semibold mb-3">Network Interfaces</h3>
                  <div className="space-y-3">
                    {networkInfo.interfaces.map((iface, index) => (
                      <div key={index} className="border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-gray-200 font-medium">{iface.name}</h4>
                          <span className={`px-2 py-1 rounded text-xs ${
                            iface.operstate === 'up' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                          }`}>
                            {iface.operstate}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-400">IPv4:</span>
                            <span className="text-gray-200 ml-2">{iface.ip4 || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">IPv6:</span>
                            <span className="text-gray-200 ml-2">{iface.ip6 || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">MAC:</span>
                            <span className="text-gray-200 ml-2">{iface.mac || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Type:</span>
                            <span className="text-gray-200 ml-2">{iface.type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Users */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-gray-300 font-semibold mb-3">System Users</h3>
                  <div className="space-y-2">
                    {users.map((user, index) => (
                      <div key={index} className="border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-gray-200 font-medium">{user.username}</h4>
                            <p className="text-gray-400 text-sm">{user.fullName || 'No full name'}</p>
                          </div>
                          <div className="text-right text-sm text-gray-400">
                            <div>UID: {user.uid}</div>
                            <div>Shell: {user.shell}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Services */}
            {activeTab === 'services' && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-gray-300 font-semibold mb-3">System Services</h3>
                  <div className="space-y-2">
                    {services.slice(0, 20).map((service, index) => (
                      <div key={index} className="border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-gray-200 font-medium">{service.name}</h4>
                            <p className="text-gray-400 text-sm">{service.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              service.running ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                            }`}>
                              {service.running ? 'Running' : 'Stopped'}
                            </span>
                            <button
                              onClick={() => toggleService(service.name, service.running ? 'stop' : 'start')}
                              className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                              title={service.running ? 'Stop' : 'Start'}
                            >
                              {service.running ? <Square size={14} /> : <Play size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Hostname */}
            {activeTab === 'hostname' && hostname && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-gray-300 font-semibold mb-3">Hostname Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Current Hostname</label>
                      <input
                        type="text"
                        value={hostname.hostname}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Static Hostname</label>
                      <input
                        type="text"
                        value={hostname.static}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Pretty Hostname</label>
                      <input
                        type="text"
                        value={hostname.pretty}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border border-gray-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};