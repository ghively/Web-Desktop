import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Monitor, HardDrive, Wifi, Shield, Users, Server, Zap,
  Cpu, Memory, Network, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Clock, Globe, Lock, UserCheck, Play, Pause, Plus, Edit, Search, Filter, Eye
} from 'lucide-react';
import PowerManagement from './PowerManagement';
import StoragePools from './StoragePools';

// Loading Component (simple inline implementation)
const Loading: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`animate-spin rounded-full border-2 border-gray-600 border-t-blue-500 ${sizeClasses[size]}`} />
    </div>
  );
};

// System Information Interfaces
interface SystemInfo {
  cpu: {
    usage: number;
    cores: number;
    model: string;
    speed: number;
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percent: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    percent: number;
  };
  network: {
    interface: string;
    ip: string;
    download: number;
    upload: number;
    connected: boolean;
  };
  uptime: number;
  os: {
    platform: string;
    distro: string;
    release: string;
    hostname: string;
  };
  temperature?: Array<{
    sensor: string;
    temperature: number;
    max: number;
    status: 'normal' | 'warning' | 'critical';
  }>;
}

interface NetworkInterface {
  name: string;
  type: 'ethernet' | 'wifi' | 'vpn';
  status: 'connected' | 'disconnected' | 'connecting';
  ip?: string;
  gateway?: string;
  dns?: string[];
  speed?: number;
  ssid?: string;
  signal?: number;
  security?: string;
}

interface SystemService {
  name: string;
  displayName: string;
  status: 'running' | 'stopped' | 'failed' | 'disabled';
  enabled: boolean;
  description: string;
  cpu?: number;
  memory?: number;
  pid?: number;
  startTime?: Date;
}

interface UserAccount {
  username: string;
  fullName: string;
  uid: number;
  groups: string[];
  homeDirectory: string;
  shell: string;
  lastLogin?: Date;
  admin: boolean;
  active: boolean;
}

type TabType = 'overview' | 'power' | 'network' | 'storage' | 'users' | 'services' | 'security';

export default function ControlCenter({ windowId }: { windowId?: string }) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [networkInterfaces, setNetworkInterfaces] = useState<NetworkInterface[]>([]);
  const [services, setServices] = useState<SystemService[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSystemInfo = useCallback(async () => {
    try {
      const response = await fetch('/api/system/stats');
      const data = await response.json();

      // Enhance with additional system monitoring data
      const monitoringResponse = await fetch('/api/system-monitoring/current');
      const monitoringData = monitoringResponse.ok ? await monitoringResponse.json() : {};

      setSystemInfo({
        cpu: {
          usage: data.cpu || 0,
          cores: monitoringData.cpu?.cores || 4,
          model: monitoringData.cpu?.model || 'Unknown',
          speed: monitoringData.cpu?.speed || 2.5,
          temperature: monitoringData.cpu?.temperature
        },
        memory: {
          total: data.mem?.total || 0,
          used: data.mem?.used || 0,
          available: data.mem?.free || 0,
          percent: data.mem?.percent || 0
        },
        disk: monitoringData.disk?.[0] ? {
          total: monitoringData.disk[0].total || 0,
          used: monitoringData.disk[0].used || 0,
          available: monitoringData.disk[0].available || 0,
          percent: monitoringData.disk[0].percent || 0
        } : { total: 0, used: 0, available: 0, percent: 0 },
        network: {
          interface: monitoringData.network?.interface || 'eth0',
          ip: monitoringData.network?.ip || '127.0.0.1',
          download: monitoringData.network?.rx || 0,
          upload: monitoringData.network?.tx || 0,
          connected: true
        },
        uptime: monitoringData.system?.uptime || 0,
        os: data.os || { platform: 'linux', distro: 'Unknown', release: '1.0', hostname: 'localhost' },
        temperature: monitoringData.temperature || []
      });
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    }
  }, []);

  const fetchNetworkInterfaces = useCallback(async () => {
    try {
      // Mock data for now - would be replaced with actual API call
      setNetworkInterfaces([
        {
          name: 'eth0',
          type: 'ethernet',
          status: 'connected',
          ip: '192.168.1.100',
          gateway: '192.168.1.1',
          dns: ['8.8.8.8', '8.8.4.4'],
          speed: 1000
        },
        {
          name: 'wlan0',
          type: 'wifi',
          status: 'connected',
          ip: '192.168.1.101',
          ssid: 'HomeNetwork',
          signal: 85,
          security: 'WPA2'
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch network interfaces:', error);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      // Mock data for now - would be replaced with actual API call
      setServices([
        {
          name: 'nginx',
          displayName: 'Nginx Web Server',
          status: 'running',
          enabled: true,
          description: 'High performance web server',
          cpu: 2.5,
          memory: 45,
          pid: 1234
        },
        {
          name: 'docker',
          displayName: 'Docker Container Runtime',
          status: 'running',
          enabled: true,
          description: 'Container runtime platform',
          cpu: 5.2,
          memory: 128
        },
        {
          name: 'mysql',
          displayName: 'MySQL Database',
          status: 'stopped',
          enabled: false,
          description: 'Database management system'
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      // Mock data for now - would be replaced with actual API call
      setUsers([
        {
          username: 'admin',
          fullName: 'System Administrator',
          uid: 1000,
          groups: ['sudo', 'adm', 'docker'],
          homeDirectory: '/home/admin',
          shell: '/bin/bash',
          lastLogin: new Date(),
          admin: true,
          active: true
        },
        {
          username: 'user',
          fullName: 'Regular User',
          uid: 1001,
          groups: ['users'],
          homeDirectory: '/home/user',
          shell: '/bin/bash',
          admin: false,
          active: true
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  // Fetch system data on component mount and tab changes
  useEffect(() => {
    const fetchData = async () => {
      if (activeTab === 'overview' || activeTab === 'power') {
        fetchSystemInfo();
      } else if (activeTab === 'network') {
        fetchNetworkInterfaces();
      } else if (activeTab === 'services') {
        fetchServices();
      } else if (activeTab === 'users') {
        fetchUsers();
      }
    };

    // Use setTimeout to make the state update asynchronous
    const timeoutId = setTimeout(fetchData, 0);
    return () => clearTimeout(timeoutId);
  }, [activeTab, fetchSystemInfo, fetchNetworkInterfaces, fetchServices, fetchUsers]);

  // Auto refresh system info
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (activeTab === 'overview' || activeTab === 'power') {
        fetchSystemInfo();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, fetchSystemInfo]);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'normal':
        return 'text-green-500';
      case 'stopped':
      case 'disconnected':
        return 'text-gray-500';
      case 'failed':
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'connecting':
        return 'text-blue-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'normal':
        return CheckCircle;
      case 'stopped':
      case 'disconnected':
        return XCircle;
      case 'failed':
      case 'critical':
        return AlertTriangle;
      default:
        return XCircle;
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Monitor },
    { id: 'power' as TabType, label: 'Power', icon: Zap },
    { id: 'network' as TabType, label: 'Network', icon: Wifi },
    { id: 'storage' as TabType, label: 'Storage', icon: HardDrive },
    { id: 'users' as TabType, label: 'Users', icon: Users },
    { id: 'services' as TabType, label: 'Services', icon: Server },
    { id: 'security' as TabType, label: 'Security', icon: Shield },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold">Control Center</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none w-64"
              />
            </div>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
            >
              {autoRefresh ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                if (activeTab === 'overview' || activeTab === 'power') fetchSystemInfo();
                else if (activeTab === 'network') fetchNetworkInterfaces();
                else if (activeTab === 'services') fetchServices();
                else if (activeTab === 'users') fetchUsers();
              }}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!systemInfo && activeTab === 'overview' ? (
          <div className="flex items-center justify-center h-full">
            <Loading size="large" />
          </div>
        ) : (
          <>
            {/* System Overview Tab */}
            {activeTab === 'overview' && systemInfo && (
              <div className="p-6 space-y-6">
                {/* System Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">CPU Usage</span>
                      <Cpu className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-blue-500">{systemInfo.cpu.usage}%</div>
                    <div className="text-xs text-gray-500">{systemInfo.cpu.cores} cores</div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Memory</span>
                      <Memory className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-500">{systemInfo.memory.percent}%</div>
                    <div className="text-xs text-gray-500">
                      {formatBytes(systemInfo.memory.used)} / {formatBytes(systemInfo.memory.total)}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Disk Usage</span>
                      <HardDrive className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-orange-500">{systemInfo.disk.percent}%</div>
                    <div className="text-xs text-gray-500">
                      {formatBytes(systemInfo.disk.used)} / {formatBytes(systemInfo.disk.total)}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Uptime</span>
                      <Clock className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-lg font-bold text-purple-500">{formatUptime(systemInfo.uptime)}</div>
                  </div>
                </div>

                {/* System Information */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">System Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Operating System:</span>
                        <span className="font-medium">{systemInfo.os.distro} {systemInfo.os.release}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Platform:</span>
                        <span className="font-medium capitalize">{systemInfo.os.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Hostname:</span>
                        <span className="font-medium">{systemInfo.os.hostname}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">CPU Model:</span>
                        <span className="font-medium">{systemInfo.cpu.model}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">CPU Speed:</span>
                        <span className="font-medium">{systemInfo.cpu.speed.toFixed(1)} GHz</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Network Interface:</span>
                        <span className="font-medium">{systemInfo.network.interface}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">IP Address:</span>
                        <span className="font-medium">{systemInfo.network.ip}</span>
                      </div>
                      {systemInfo.cpu.temperature && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">CPU Temperature:</span>
                          <span className="font-medium">{systemInfo.cpu.temperature.toFixed(1)}°C</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Temperature Sensors */}
                {systemInfo.temperature && systemInfo.temperature.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Temperature Sensors</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {systemInfo.temperature.map((temp, index) => {
                        const StatusIcon = getStatusIcon(temp.status);
                        return (
                          <div key={index} className="bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{temp.sensor}</span>
                              <StatusIcon className={`w-4 h-4 ${getStatusColor(temp.status)}`} />
                            </div>
                            <div className="text-2xl font-bold mb-1">{temp.temperature.toFixed(1)}°C</div>
                            <div className="text-xs text-gray-400">
                              Max: {temp.max}°C
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Power Management Tab - Integrated PowerManagement component */}
            {activeTab === 'power' && (
              <PowerManagement windowId={windowId} />
            )}

            {/* Network Tab */}
            {activeTab === 'network' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Network Interfaces</h3>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Auto-refresh</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {networkInterfaces.map((interface_, index) => {
                    const StatusIcon = getStatusIcon(interface_.status);
                    return (
                      <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {interface_.type === 'wifi' ? (
                              <Wifi className="w-5 h-5 text-blue-500" />
                            ) : interface_.type === 'vpn' ? (
                              <Lock className="w-5 h-5 text-green-500" />
                            ) : (
                              <Network className="w-5 h-5 text-gray-500" />
                            )}
                            <div>
                              <h4 className="font-medium">{interface_.name}</h4>
                              <p className="text-sm text-gray-400 capitalize">{interface_.type}</p>
                            </div>
                          </div>
                          <StatusIcon className={`w-4 h-4 ${getStatusColor(interface_.status)}`} />
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span className={`capitalize ${getStatusColor(interface_.status)}`}>{interface_.status}</span>
                          </div>
                          {interface_.ip && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">IP Address:</span>
                              <span>{interface_.ip}</span>
                            </div>
                          )}
                          {interface_.ssid && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Network:</span>
                              <span>{interface_.ssid}</span>
                            </div>
                          )}
                          {interface_.signal && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Signal:</span>
                              <span>{interface_.signal}%</span>
                            </div>
                          )}
                          {interface_.speed && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Speed:</span>
                              <span>{interface_.speed} Mbps</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Storage Tab - Integrated StoragePools component */}
            {activeTab === 'storage' && (
              <StoragePools windowId={windowId} />
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">User Accounts</h3>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" />
                    Add User
                  </button>
                </div>

                <div className="space-y-4">
                  {users.map((user, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            user.admin ? 'bg-blue-600' : 'bg-gray-600'
                          }`}>
                            {user.admin ? <Shield className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="font-medium">{user.fullName}</h4>
                            <p className="text-sm text-gray-400">@{user.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {user.admin && (
                            <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full">
                              Admin
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.active
                              ? 'bg-green-600/20 text-green-400'
                              : 'bg-gray-600/20 text-gray-400'
                          }`}>
                            {user.active ? 'Active' : 'Inactive'}
                          </span>

                          <button className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-all">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">UID:</span>
                          <span className="ml-2 font-medium">{user.uid}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Shell:</span>
                          <span className="ml-2 font-medium">{user.shell}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Groups:</span>
                          <span className="ml-2 font-medium">{user.groups.slice(0, 2).join(', ')}</span>
                          {user.groups.length > 2 && <span className="text-gray-500"> +{user.groups.length - 2}</span>}
                        </div>
                        <div>
                          <span className="text-gray-400">Last Login:</span>
                          <span className="ml-2 font-medium">
                            {user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">System Services</h3>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm">
                      <option>All Services</option>
                      <option>Running</option>
                      <option>Stopped</option>
                      <option>Failed</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {services.map((service, index) => {
                    const StatusIcon = getStatusIcon(service.status);
                    return (
                      <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Server className="w-5 h-5 text-blue-500" />
                            <div>
                              <h4 className="font-medium">{service.displayName}</h4>
                              <p className="text-sm text-gray-400">{service.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`w-4 h-4 ${getStatusColor(service.status)}`} />
                            <span className={`capitalize text-sm ${getStatusColor(service.status)}`}>
                              {service.status}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-400 mb-3">{service.description}</p>

                        {service.status === 'running' && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {service.cpu && (
                              <div>
                                <span className="text-gray-400">CPU:</span>
                                <span className="ml-2 font-medium">{service.cpu.toFixed(1)}%</span>
                              </div>
                            )}
                            {service.memory && (
                              <div>
                                <span className="text-gray-400">Memory:</span>
                                <span className="ml-2 font-medium">{formatBytes(service.memory * 1024 * 1024)}</span>
                              </div>
                            )}
                            {service.pid && (
                              <div>
                                <span className="text-gray-400">PID:</span>
                                <span className="ml-2 font-medium">{service.pid}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-400">Enabled:</span>
                              <span className="ml-2 font-medium">{service.enabled ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-4">
                          {service.status === 'running' ? (
                            <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-sm rounded-lg transition-colors">
                              Stop
                            </button>
                          ) : (
                            <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-sm rounded-lg transition-colors">
                              Start
                            </button>
                          )}
                          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm rounded-lg transition-colors">
                            Restart
                          </button>
                          <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition-colors">
                            Configure
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="p-6 space-y-6">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Security Status</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-5 h-5 text-green-500" />
                        <span className="font-medium">Firewall</span>
                      </div>
                      <p className="text-sm text-gray-400">Active and configured</p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Lock className="w-5 h-5 text-green-500" />
                        <span className="font-medium">Encryption</span>
                      </div>
                      <p className="text-sm text-gray-400">Disk encryption enabled</p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Eye className="w-5 h-5 text-yellow-500" />
                        <span className="font-medium">Access Control</span>
                      </div>
                      <p className="text-sm text-gray-400">User permissions active</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Security Settings</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <h4 className="font-medium">Automatic Updates</h4>
                        <p className="text-sm text-gray-400">Keep system packages up to date</p>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                        Configure
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <h4 className="font-medium">User Authentication</h4>
                        <p className="text-sm text-gray-400">Manage authentication methods</p>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                        Manage
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <h4 className="font-medium">Network Security</h4>
                        <p className="text-sm text-gray-400">Configure firewall and network rules</p>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                        Configure
                      </button>
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
}