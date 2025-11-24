import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi, WifiOff, Shield, Lock, Unlock, Globe, Server, Router, Ethernet, Activity,
  Download, Upload, Settings, RefreshCw, Play, Pause, AlertTriangle, CheckCircle, XCircle,
  Search, Filter, Grid, List, Plus, Edit, Trash2, Save, Eye, EyeOff, Copy, Monitor,
  Smartphone, Laptop, Tablet, Gamepad2, Camera, Speaker, Thermometer, Lightbulb,
  TrendingUp, TrendingDown, BarChart3, PieChart, LineChart, MapPin, Clock, Calendar,
  User, Key, Certificate, FileText, Database, Cloud, HardDrive, Cpu, Zap, Users,
  Network, Radio, Signal, Settings2, Terminal, Code, Scan, Package, ShieldCheck, Printer
} from 'lucide-react';

interface WiFiNetwork {
  ssid: string;
  bssid: string;
  frequency: number;
  channel: number;
  signal_strength: number;
  security: string;
  connected: boolean;
  saved: boolean;
  last_connected?: string;
  device_count?: number;
}

interface WiFiInterface {
  name: string;
  status: 'up' | 'down' | 'scanning';
  mode: 'managed' | 'access_point' | 'ad_hoc' | 'monitor';
  mac_address: string;
  ip_address: string;
  gateway: string;
  dns_servers: string[];
  connected_network?: WiFiNetwork;
  tx_power: number;
  bitrate: number;
}

interface VPNProvider {
  id: string;
  name: string;
  type: 'openvpn' | 'wireguard' | 'ipsec' | 'pptp';
  servers: VPNServer[];
  config?: Record<string, any>;
  connected: boolean;
  auto_connect: boolean;
  kill_switch: boolean;
  dns_leak_protection: boolean;
}

interface VPNServer {
  id: string;
  name: string;
  country: string;
  city: string;
  flag_emoji: string;
  load: number;
  ping: number;
  bandwidth: number;
  protocols: string[];
  premium: boolean;
  p2p: boolean;
  streaming: boolean;
}

interface VPNConnection {
  id: string;
  provider_id: string;
  server_id: string;
  protocol: string;
  status: 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';
  connected_at?: string;
  bytes_received: number;
  bytes_sent: number;
  public_ip: string;
  location: string;
  dns_leak: boolean;
  kill_switch_active: boolean;
}

interface ProxyConfig {
  enabled: boolean;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  authentication: boolean;
  ssl_verification: boolean;
  bypass_list: string[];
  pac_url?: string;
}

interface NetworkDevice {
  ip_address: string;
  mac_address: string;
  hostname?: string;
  vendor?: string;
  device_type: 'computer' | 'phone' | 'tablet' | 'iot' | 'printer' | 'router' | 'unknown';
  os?: string;
  open_ports: number[];
  first_seen: string;
  last_seen: string;
  trusted: boolean;
  blocked: boolean;
  notes?: string;
}

interface NetworkStats {
  timestamp: string;
  download_speed: number;
  upload_speed: number;
  ping: number;
  packet_loss: number;
  jitter: number;
  latency: number;
  bandwidth_usage: {
    total: number;
    download: number;
    upload: number;
  };
  active_connections: number;
  cpu_usage: number;
  memory_usage: number;
}

interface PortScanResult {
  host: string;
  open_ports: Array<{
    port: number;
    protocol: 'tcp' | 'udp';
    service: string;
    version?: string;
    state: string;
  }>;
  scan_time: string;
  scan_duration: number;
}

interface NetworkRule {
  id: string;
  name: string;
  type: 'allow' | 'deny' | 'redirect';
  direction: 'inbound' | 'outbound' | 'both';
  protocol: 'tcp' | 'udp' | 'icmp' | 'any';
  source_ip?: string;
  source_port?: number;
  dest_ip?: string;
  dest_port?: number;
  action: string;
  enabled: boolean;
  priority: number;
  created: string;
  hit_count: number;
}

export const NetworkHub: React.FC<{ windowId?: string }> = () => {
  const [activeTab, setActiveTab] = useState<'wifi' | 'vpn' | 'proxy' | 'devices' | 'monitoring' | 'security' | 'tools'>('wifi');
  const [wifiInterfaces, setWifiInterfaces] = useState<WiFiInterface[]>([]);
  const [availableNetworks, setAvailableNetworks] = useState<WiFiNetwork[]>([]);
  const [vpnProviders, setVpnProviders] = useState<VPNProvider[]>([]);
  const [vpnConnections, setVpnConnections] = useState<VPNConnection[]>([]);
  const [proxyConfig, setProxyConfig] = useState<ProxyConfig | null>(null);
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats[]>([]);
  const [networkRules, setNetworkRules] = useState<NetworkRule[]>([]);
  const [scanResults, setScanResults] = useState<PortScanResult[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>('');
  const [selectedVpnProvider, setSelectedVpnProvider] = useState<string>('');
  const [selectedVpnServer, setSelectedVpnServer] = useState<string>('');
  const [scanTarget, setScanTarget] = useState('');
  const [scanInProgress, setScanInProgress] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [wifiPassword, setWifiPassword] = useState('');
  const [connectingToNetwork, setConnectingToNetwork] = useState<string | null>(null);

  useEffect(() => {
    loadNetworkData();
    const interval = setInterval(loadNetworkData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadNetworkData = async () => {
    try {
      const [wifiRes, vpnRes, proxyRes, devicesRes, statsRes, rulesRes] = await Promise.all([
        fetch('/api/network/wifi/interfaces'),
        fetch('/api/network/vpn/providers'),
        fetch('/api/network/proxy/config'),
        fetch('/api/network/devices'),
        fetch('/api/network/stats'),
        fetch('/api/network/firewall/rules')
      ]);

      if (wifiRes.ok) {
        const wifiData = await wifiRes.json();
        setWifiInterfaces(wifiData.interfaces);
        setAvailableNetworks(wifiData.networks);
        if (wifiData.interfaces.length > 0 && !selectedInterface) {
          setSelectedInterface(wifiData.interfaces[0].name);
        }
      }
      if (vpnRes.ok) {
        const vpnData = await vpnRes.json();
        setVpnProviders(vpnData.providers);
        setVpnConnections(vpnData.connections);
      }
      if (proxyRes.ok) setProxyConfig(await proxyRes.json());
      if (devicesRes.ok) setNetworkDevices(await devicesRes.json());
      if (statsRes.ok) setNetworkStats(await statsRes.json());
      if (rulesRes.ok) setNetworkRules(await rulesRes.json());
    } catch (error) {
      console.error('Failed to load network data:', error);
    }
  };

  const scanWiFiNetworks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/network/wifi/${selectedInterface}/scan`, {
        method: 'POST'
      });
      if (response.ok) {
        const networks = await response.json();
        setAvailableNetworks(networks);
      }
    } catch (error) {
      console.error('Failed to scan WiFi networks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const connectToWiFi = async (network: WiFiNetwork, password?: string) => {
    setConnectingToNetwork(network.ssid);
    try {
      const response = await fetch(`/api/network/wifi/${selectedInterface}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid: network.ssid, password })
      });
      if (response.ok) {
        await loadNetworkData();
      }
    } catch (error) {
      console.error('Failed to connect to WiFi:', error);
    } finally {
      setConnectingToNetwork(null);
    }
  };

  const disconnectFromWiFi = async () => {
    try {
      await fetch(`/api/network/wifi/${selectedInterface}/disconnect`, {
        method: 'POST'
      });
      await loadNetworkData();
    } catch (error) {
      console.error('Failed to disconnect from WiFi:', error);
    }
  };

  const connectToVPN = async (providerId: string, serverId: string, protocol: string = 'udp') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/network/vpn/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, server_id: serverId, protocol })
      });
      if (response.ok) {
        await loadNetworkData();
      }
    } catch (error) {
      console.error('Failed to connect to VPN:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectFromVPN = async (connectionId: string) => {
    try {
      await fetch(`/api/network/vpn/${connectionId}/disconnect`, {
        method: 'POST'
      });
      await loadNetworkData();
    } catch (error) {
      console.error('Failed to disconnect from VPN:', error);
    }
  };

  const updateProxyConfig = async (config: ProxyConfig) => {
    try {
      await fetch('/api/network/proxy/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      await loadNetworkData();
    } catch (error) {
      console.error('Failed to update proxy config:', error);
    }
  };

  const scanPorts = async (target: string, ports?: string) => {
    setScanInProgress(true);
    try {
      const response = await fetch('/api/network/tools/portscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, ports: ports || '1-1000' })
      });
      if (response.ok) {
        const result = await response.json();
        setScanResults(prev => [result, ...prev]);
      }
    } catch (error) {
      console.error('Failed to scan ports:', error);
    } finally {
      setScanInProgress(false);
    }
  };

  const blockDevice = async (deviceId: string, blocked: boolean) => {
    try {
      await fetch(`/api/network/devices/${deviceId}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked })
      });
      await loadNetworkData();
    } catch (error) {
      console.error('Failed to block device:', error);
    }
  };

  const updateFirewallRule = async (ruleId: string, enabled: boolean) => {
    try {
      await fetch(`/api/network/firewall/rules/${ruleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      await loadNetworkData();
    } catch (error) {
      console.error('Failed to update firewall rule:', error);
    }
  };

  const getSignalStrengthColor = (strength: number) => {
    if (strength > -50) return 'text-green-500';
    if (strength > -60) return 'text-yellow-500';
    if (strength > -70) return 'text-orange-500';
    return 'text-red-500';
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'computer': return Laptop;
      case 'phone': return Smartphone;
      case 'tablet': return Tablet;
      case 'iot': return Lightbulb;
      case 'printer': return Printer;
      case 'router': return Router;
      default: return Monitor;
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatSpeed = (bytes: number) => {
    return formatBytes(bytes) + '/s';
  };

  const filteredNetworks = availableNetworks.filter(network => {
    const matchesSearch = network.ssid.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' ||
      (filterType === 'connected' && network.connected) ||
      (filterType === 'saved' && network.saved);
    return matchesSearch && matchesType;
  });

  const filteredDevices = networkDevices.filter(device =>
    device.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.ip_address.includes(searchQuery) ||
    device.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentInterface = wifiInterfaces.find(i => i.name === selectedInterface);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Network className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold">Network Hub</h1>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={selectedInterface}
              onChange={(e) => setSelectedInterface(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              {wifiInterfaces.map(iface => (
                <option key={iface.name} value={iface.name}>
                  {iface.name} ({iface.status})
                </option>
              ))}
            </select>

            <button
              onClick={loadNetworkData}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1 overflow-x-auto">
          {[
            { id: 'wifi', label: 'WiFi', icon: Wifi },
            { id: 'vpn', label: 'VPN', icon: Shield },
            { id: 'proxy', label: 'Proxy', icon: Globe },
            { id: 'devices', label: 'Devices', icon: Users },
            { id: 'monitoring', label: 'Monitoring', icon: BarChart3 },
            { id: 'security', label: 'Security', icon: ShieldCheck },
            { id: 'tools', label: 'Tools', icon: Settings2 }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* WiFi Tab */}
        {activeTab === 'wifi' && (
          <div className="space-y-6">
            {/* Interface Status */}
            {currentInterface && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Interface Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Status</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        currentInterface.status === 'up' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="capitalize">{currentInterface.status}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Mode</div>
                    <div className="capitalize">{currentInterface.mode.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">IP Address</div>
                    <div className="font-mono">{currentInterface.ip_address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">MAC Address</div>
                    <div className="font-mono">{currentInterface.mac_address}</div>
                  </div>
                </div>

                {currentInterface.connected_network && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Wifi className="w-5 h-5 text-green-500" />
                        <div>
                          <div className="font-medium">{currentInterface.connected_network.ssid}</div>
                          <div className="text-sm text-gray-400">
                            Signal: {currentInterface.connected_network.signal_strength} dBm
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={disconnectFromWiFi}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WiFi Networks */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Available Networks</h3>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search networks..."
                      className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">All Networks</option>
                    <option value="connected">Connected</option>
                    <option value="saved">Saved</option>
                  </select>
                  <button
                    onClick={scanWiFiNetworks}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Scan
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {filteredNetworks.map(network => (
                  <div
                    key={network.bssid}
                    className={`p-4 rounded-lg border transition-all ${
                      network.connected
                        ? 'bg-green-600/10 border-green-500'
                        : network.saved
                        ? 'bg-blue-600/10 border-blue-500'
                        : 'bg-gray-700 border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Wifi className={`w-5 h-5 ${
                            network.connected ? 'text-green-500' : 'text-gray-400'
                          }`} />
                          <div>
                            <div className="font-medium">{network.ssid}</div>
                            <div className="text-sm text-gray-400">
                              {network.security || 'Open'} • Ch {network.channel} • {network.frequency} MHz
                            </div>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 ${getSignalStrengthColor(network.signal_strength)}`}>
                          <Signal className="w-4 h-4" />
                          <span className="text-sm font-medium">{network.signal_strength} dBm</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {network.saved && !network.connected && (
                          <button className="p-2 text-yellow-400 hover:bg-gray-700 rounded transition-colors">
                            <Key className="w-4 h-4" />
                          </button>
                        )}
                        {network.connected ? (
                          <span className="text-sm text-green-500">Connected</span>
                        ) : (
                          <button
                            onClick={() => {
                              if (network.security && network.security !== 'Open') {
                                setWifiPassword('');
                                setSelectedVpnProvider(network.ssid);
                              } else {
                                connectToWiFi(network);
                              }
                            }}
                            disabled={connectingToNetwork === network.ssid}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg transition-colors"
                          >
                            {connectingToNetwork === network.ssid ? 'Connecting...' : 'Connect'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VPN Tab */}
        {activeTab === 'vpn' && (
          <div className="space-y-6">
            {/* VPN Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vpnProviders.map(provider => (
                <div
                  key={provider.id}
                  className={`bg-gray-800 rounded-lg p-6 border ${
                    provider.connected ? 'border-green-500' : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{provider.name}</h3>
                    <div className={`w-3 h-3 rounded-full ${
                      provider.connected ? 'bg-green-500' : 'bg-gray-600'
                    }`} />
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Protocol:</span>
                      <span className="capitalize">{provider.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Servers:</span>
                      <span>{provider.servers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Kill Switch:</span>
                      <span>{provider.kill_switch ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>

                  {!provider.connected ? (
                    <div className="space-y-2">
                      <select
                        value={selectedVpnServer}
                        onChange={(e) => setSelectedVpnServer(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                      >
                        <option value="">Select server...</option>
                        {provider.servers.map(server => (
                          <option key={server.id} value={server.id}>
                            {server.flag_emoji} {server.name} ({server.ping}ms)
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => connectToVPN(provider.id, selectedVpnServer)}
                        disabled={!selectedVpnServer}
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded-lg transition-colors"
                      >
                        Connect
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                        const connection = vpnConnections.find(c => c.provider_id === provider.id);
                        const server = provider.servers.find(s => s.id === connection?.server_id);
                        return (
                          <>
                            <div className="text-sm text-gray-400">
                              Connected to: {server?.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              IP: {connection?.public_ip}
                            </div>
                            <div className="text-sm text-gray-400">
                              Location: {connection?.location}
                            </div>
                            <button
                              onClick={() => disconnectFromVPN(connection!.id)}
                              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                            >
                              Disconnect
                            </button>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Active Connections */}
            {vpnConnections.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Active Connections</h3>
                <div className="space-y-3">
                  {vpnConnections.map(connection => {
                    const provider = vpnProviders.find(p => p.id === connection.provider_id);
                    const server = provider?.servers.find(s => s.id === connection.server_id);

                    return (
                      <div key={connection.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Shield className="w-5 h-5 text-green-500" />
                            <div>
                              <div className="font-medium">{provider?.name}</div>
                              <div className="text-sm text-gray-400">
                                {server?.flag_emoji} {server?.name}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">
                              Up: {formatBytes(connection.bytes_sent)}
                            </div>
                            <div className="text-sm text-gray-400">
                              Down: {formatBytes(connection.bytes_received)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Proxy Tab */}
        {activeTab === 'proxy' && proxyConfig && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Proxy Configuration</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Enable Proxy</div>
                    <div className="text-sm text-gray-400">Route traffic through proxy server</div>
                  </div>
                  <button
                    onClick={() => updateProxyConfig({ ...proxyConfig, enabled: !proxyConfig.enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      proxyConfig.enabled ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        proxyConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Proxy Type</label>
                  <select
                    value={proxyConfig.type}
                    onChange={(e) => updateProxyConfig({ ...proxyConfig, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="socks4">SOCKS4</option>
                    <option value="socks5">SOCKS5</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Host</label>
                    <input
                      type="text"
                      value={proxyConfig.host}
                      onChange={(e) => updateProxyConfig({ ...proxyConfig, host: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Port</label>
                    <input
                      type="number"
                      value={proxyConfig.port}
                      onChange={(e) => updateProxyConfig({ ...proxyConfig, port: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Authentication</label>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={proxyConfig.authentication}
                      onChange={(e) => updateProxyConfig({ ...proxyConfig, authentication: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Enable username/password authentication</span>
                  </div>

                  {proxyConfig.authentication && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Username</label>
                        <input
                          type="text"
                          value={proxyConfig.username || ''}
                          onChange={(e) => updateProxyConfig({ ...proxyConfig, username: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Password</label>
                        <input
                          type="password"
                          value={proxyConfig.password || ''}
                          onChange={(e) => updateProxyConfig({ ...proxyConfig, password: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bypass List (one per line)</label>
                  <textarea
                    value={proxyConfig.bypass_list.join('\n')}
                    onChange={(e) => updateProxyConfig({ ...proxyConfig, bypass_list: e.target.value.split('\n').filter(s => s.trim()) })}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="localhost\n127.0.0.1\n192.168.*"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={proxyConfig.ssl_verification}
                    onChange={(e) => updateProxyConfig({ ...proxyConfig, ssl_verification: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Verify SSL certificates</span>
                </div>

                <button
                  onClick={() => updateProxyConfig(proxyConfig)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Network Devices</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search devices..."
                    className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDevices.map(device => {
                const Icon = getDeviceIcon(device.device_type);
                return (
                  <div key={device.ip_address} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6 text-blue-500" />
                        <div>
                          <div className="font-medium">{device.hostname || 'Unknown'}</div>
                          <div className="text-sm text-gray-400">{device.vendor || 'Unknown vendor'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {device.trusted && (
                          <ShieldCheck className="w-4 h-4 text-green-500" />
                        )}
                        {device.blocked && (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-400 mb-3">
                      <div>IP: {device.ip_address}</div>
                      <div>MAC: {device.mac_address}</div>
                      <div>Type: {device.device_type}</div>
                      {device.os && <div>OS: {device.os}</div>}
                      <div>Open ports: {device.open_ports.length}</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => blockDevice(device.ip_address, !device.blocked)}
                        className={`flex-1 px-3 py-1 rounded text-sm transition-colors ${
                          device.blocked
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {device.blocked ? 'Unblock' : 'Block'}
                      </button>
                      <button
                        onClick={() => scanPorts(device.ip_address, '22,80,443,8080')}
                        className="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                      >
                        Scan Ports
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            {/* Current Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-400">Download</span>
                </div>
                <div className="text-xl font-bold">
                  {networkStats.length > 0 ? formatSpeed(networkStats[networkStats.length - 1].download_speed) : '0 B/s'}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-400">Upload</span>
                </div>
                <div className="text-xl font-bold">
                  {networkStats.length > 0 ? formatSpeed(networkStats[networkStats.length - 1].upload_speed) : '0 B/s'}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm text-gray-400">Ping</span>
                </div>
                <div className="text-xl font-bold">
                  {networkStats.length > 0 ? networkStats[networkStats.length - 1].ping + ' ms' : 'N/A'}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-gray-400">Connections</span>
                </div>
                <div className="text-xl font-bold">
                  {networkStats.length > 0 ? networkStats[networkStats.length - 1].active_connections : 0}
                </div>
              </div>
            </div>

            {/* Bandwidth Usage Chart */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Bandwidth Usage</h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <LineChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Bandwidth usage chart coming soon</p>
                </div>
              </div>
            </div>

            {/* Recent Stats Table */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Network Activity</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2">Time</th>
                      <th className="text-left py-2">Download</th>
                      <th className="text-left py-2">Upload</th>
                      <th className="text-left py-2">Ping</th>
                      <th className="text-left py-2">Packet Loss</th>
                      <th className="text-left py-2">Jitter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networkStats.slice(-10).reverse().map((stat, index) => (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="py-2">{new Date(stat.timestamp).toLocaleTimeString()}</td>
                        <td className="py-2 text-green-500">{formatSpeed(stat.download_speed)}</td>
                        <td className="py-2 text-blue-500">{formatSpeed(stat.upload_speed)}</td>
                        <td className="py-2">{stat.ping} ms</td>
                        <td className="py-2">{stat.packet_loss}%</td>
                        <td className="py-2">{stat.jitter} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Firewall Rules</h3>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>

            <div className="space-y-3">
              {networkRules.map(rule => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-lg border ${
                    rule.enabled
                      ? 'bg-green-600/10 border-green-500'
                      : 'bg-gray-800 border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        rule.type === 'allow' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-sm text-gray-400">
                          {rule.direction} • {rule.protocol.toUpperCase()} • {rule.type.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">
                        {rule.hit_count} hits
                      </span>
                      <button
                        onClick={() => updateFirewallRule(rule.id, !rule.enabled)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          rule.enabled
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {rule.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Port Scan Results */}
            {scanResults.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Port Scan Results</h3>
                <div className="space-y-4">
                  {scanResults.map((result, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium">{result.host}</div>
                        <div className="text-sm text-gray-400">
                          Scanned in {result.scan_duration}s
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {result.open_ports.map(port => (
                          <div key={port.port} className="bg-green-600/20 border border-green-500 rounded p-2">
                            <div className="font-medium">{port.port}/{port.protocol}</div>
                            <div className="text-xs text-gray-400">{port.service}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Port Scanner */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Port Scanner</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Host</label>
                    <input
                      type="text"
                      value={scanTarget}
                      onChange={(e) => setScanTarget(e.target.value)}
                      placeholder="192.168.1.1 or example.com"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Ports</label>
                    <input
                      type="text"
                      placeholder="80,443,8080 or 1-1000"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => scanTarget && scanPorts(scanTarget)}
                    disabled={scanInProgress || !scanTarget}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg transition-colors"
                  >
                    {scanInProgress ? 'Scanning...' : 'Start Scan'}
                  </button>
                </div>
              </div>

              {/* Network Diagnostics */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Network Diagnostics</h3>
                <div className="space-y-3">
                  <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                    <div className="font-medium">Ping Test</div>
                    <div className="text-sm text-gray-400">Test connectivity to a host</div>
                  </button>
                  <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                    <div className="font-medium">Traceroute</div>
                    <div className="text-sm text-gray-400">Trace network path to host</div>
                  </button>
                  <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                    <div className="font-medium">DNS Lookup</div>
                    <div className="text-sm text-gray-400">Query DNS records</div>
                  </button>
                  <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                    <div className="font-medium">Speed Test</div>
                    <div className="text-sm text-gray-400">Test network bandwidth</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Network Utilities */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Network Utilities</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-center">
                  <Terminal className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="font-medium">SSH Client</div>
                </button>
                <button className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-center">
                  <Code className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="font-medium">API Tester</div>
                </button>
                <button className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <div className="font-medium">Packet Capture</div>
                </button>
                <button className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-center">
                  <Database className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <div className="font-medium">Network Logs</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkHub;