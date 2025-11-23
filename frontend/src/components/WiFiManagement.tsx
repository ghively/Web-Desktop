import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Scan, Settings, Lock, Signal, AlertCircle, CheckCircle, RefreshCw, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';

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

interface NetworkInterface {
  name: string;
  type: 'ethernet' | 'wifi' | 'loopback';
  state: 'up' | 'down';
  ipv4: string[];
  ipv6: string[];
  mac: string;
}

export default function WiFiManagement() {
  const [activeTab, setActiveTab] = useState<'networks' | 'status' | 'configs'>('networks');
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false, interface: '' });
  const [savedConfigs, setSavedConfigs] = useState<WiFiConfig[]>([]);
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [showPassword, setShowPassword] = useState<string>('');
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null);
  const [connectPassword, setConnectPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWiFiEnabled, setIsWiFiEnabled] = useState(true);

  // Fetch WiFi networks
  const fetchNetworks = async () => {
    setIsScanning(true);
    try {
      const response = await fetch(`/api/wifi-management/scan${selectedInterface ? `?interface=${selectedInterface}` : ''}`);
      const data = await response.json();
      setNetworks(data);
    } catch (error) {
      console.error('Failed to scan networks:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Fetch connection status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/wifi-management/status');
      const data = await response.json();
      setConnectionStatus(data);
    } catch (error) {
      console.error('Failed to get status:', error);
    }
  };

  // Fetch saved configurations
  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/wifi-management/configs');
      const data = await response.json();
      setSavedConfigs(data);
    } catch (error) {
      console.error('Failed to get configs:', error);
    }
  };

  // Fetch interfaces
  const fetchInterfaces = async () => {
    try {
      const response = await fetch('/api/wifi-management/interfaces');
      const data = await response.json();
      setInterfaces(data.all);
    } catch (error) {
      console.error('Failed to get interfaces:', error);
    }
  };

  // Connect to network
  const connectToNetwork = async (network: WiFiNetwork, password?: string) => {
    setIsConnecting(true);
    try {
      const config: WiFiConfig = {
        interfaceName: selectedInterface || interfaces.find(i => i.type === 'wifi')?.name || '',
        ssid: network.ssid,
        password: password || '',
        security: network.security,
        mode: network.mode,
        autoConnect: true,
        priority: 1,
        hidden: false,
        band: 'auto'
      };

      const response = await fetch('/api/wifi-management/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setShowConnectDialog(false);
        setConnectPassword('');
        setSelectedNetwork(null);
        await fetchStatus();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from network
  const disconnectFromNetwork = async () => {
    try {
      const response = await fetch('/api/wifi-management/disconnect', { method: 'POST' });
      if (response.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  // Toggle WiFi
  const toggleWiFi = async (enable: boolean) => {
    try {
      const response = await fetch('/api/wifi-management/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable })
      });
      if (response.ok) {
        setIsWiFiEnabled(enable);
        await fetchInterfaces();
        await fetchStatus();
      }
    } catch (error) {
      console.error('Failed to toggle WiFi:', error);
    }
  };

  // Forget network
  const forgetNetwork = async (ssid: string) => {
    try {
      const response = await fetch('/api/wifi-management/forget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid })
      });
      if (response.ok) {
        await fetchConfigs();
        await fetchStatus();
      }
    } catch (error) {
      console.error('Failed to forget network:', error);
    }
  };

  useEffect(() => {
    fetchNetworks();
    fetchStatus();
    fetchConfigs();
    fetchInterfaces();

    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedInterface]);

  const getSignalIcon = (signalStrength: number) => {
    if (signalStrength > -50) return Signal;
    if (signalStrength > -60) return Signal;
    if (signalStrength > -70) return Signal;
    return Signal;
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-green-400';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-3">
          <Wifi className="w-6 h-6" />
          WiFi Management
        </h1>

        {/* Status Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {connectionStatus.connected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <span className="text-sm">
                {connectionStatus.connected
                  ? `Connected to ${connectionStatus.ssid}`
                  : 'Not connected'
                }
              </span>
            </div>

            {connectionStatus.ip && (
              <span className="text-sm text-gray-400">IP: {connectionStatus.ip}</span>
            )}
          </div>

          <button
            onClick={() => toggleWiFi(!isWiFiEnabled)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              isWiFiEnabled
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isWiFiEnabled ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            {isWiFiEnabled ? 'Disable WiFi' : 'Enable WiFi'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('networks')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'networks'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Scan className="w-4 h-4" />
            Networks
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'status'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Status
          </button>
          <button
            onClick={() => setActiveTab('configs')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'configs'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Saved Networks
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Networks Tab */}
        {activeTab === 'networks' && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-4 mb-6">
              <select
                value={selectedInterface}
                onChange={(e) => setSelectedInterface(e.target.value)}
                className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Auto-detect</option>
                {interfaces
                  .filter(i => i.type === 'wifi')
                  .map(iface => (
                    <option key={iface.name} value={iface.name}>{iface.name}</option>
                  ))}
              </select>

              <button
                onClick={fetchNetworks}
                disabled={isScanning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                {isScanning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Scan className="w-4 h-4" />
                )}
                {isScanning ? 'Scanning...' : 'Scan Networks'}
              </button>
            </div>

            {/* Network List */}
            <div className="space-y-2">
              {networks.map(network => {
                const SignalIcon = getSignalIcon(network.signalStrength);
                const isCurrentNetwork = connectionStatus.ssid === network.ssid;

                return (
                  <div
                    key={network.bssid}
                    className={`p-4 rounded-lg border transition-all ${
                      isCurrentNetwork
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`relative ${getQualityColor(network.quality)}`}>
                          <SignalIcon className="w-5 h-5" />
                          {network.security.length > 0 && (
                            <Lock className="w-3 h-3 absolute -top-1 -right-1" />
                          )}
                        </div>

                        <div>
                          <div className="font-semibold">
                            {network.ssid || '(Hidden Network)'}
                            {isCurrentNetwork && (
                              <span className="ml-2 text-xs bg-blue-600 px-2 py-1 rounded">Connected</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            {network.frequency} GHz • Channel {network.channel} • {network.signalStrength} dBm
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          network.quality === 'excellent' ? 'bg-green-600' :
                          network.quality === 'good' ? 'bg-green-500' :
                          network.quality === 'fair' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}>
                          {network.quality}
                        </span>

                        {isCurrentNetwork ? (
                          <button
                            onClick={disconnectFromNetwork}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedNetwork(network);
                              setShowConnectDialog(true);
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {networks.length === 0 && !isScanning && (
                <div className="text-center text-gray-500 py-8">
                  <WifiOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No networks found. Try scanning again.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Tab */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            {/* Connection Details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Connection Status</h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={connectionStatus.connected ? 'text-green-500' : 'text-yellow-500'}>
                    {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                {connectionStatus.ssid && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">SSID:</span>
                    <span>{connectionStatus.ssid}</span>
                  </div>
                )}

                {connectionStatus.interface && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Interface:</span>
                    <span>{connectionStatus.interface}</span>
                  </div>
                )}

                {connectionStatus.ip && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">IP Address:</span>
                    <span>{connectionStatus.ip}</span>
                  </div>
                )}

                {connectionStatus.gateway && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gateway:</span>
                    <span>{connectionStatus.gateway}</span>
                  </div>
                )}

                {connectionStatus.signalStrength && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Signal Strength:</span>
                    <span>{connectionStatus.signalStrength} dBm</span>
                  </div>
                )}

                {connectionStatus.speed && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Speed:</span>
                    <span>{connectionStatus.speed} Mbps</span>
                  </div>
                )}

                {connectionStatus.dns && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">DNS Servers:</span>
                    <span>{connectionStatus.dns.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* WiFi Statistics */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">WiFi Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{networks.length}</div>
                  <div className="text-sm text-gray-400">Available Networks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{savedConfigs.length}</div>
                  <div className="text-sm text-gray-400">Saved Networks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">
                    {interfaces.filter(i => i.type === 'wifi').length}
                  </div>
                  <div className="text-sm text-gray-400">WiFi Interfaces</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">
                    {connectionStatus.connected ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-sm text-gray-400">Connection Status</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Saved Networks Tab */}
        {activeTab === 'configs' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {savedConfigs.map((config, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wifi className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="font-semibold">{config.ssid}</div>
                        <div className="text-sm text-gray-400">
                          {config.interfaceName} • {config.band} • {config.security.join(', ') || 'Open'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {config.autoConnect && (
                        <span className="text-xs bg-blue-600 px-2 py-1 rounded">Auto</span>
                      )}

                      <button
                        onClick={() => forgetNetwork(config.ssid)}
                        className="p-2 text-red-500 hover:bg-red-600/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {savedConfigs.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No saved networks found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Connect Dialog */}
      {showConnectDialog && selectedNetwork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Connect to {selectedNetwork.ssid}</h3>

            {selectedNetwork.security.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword === selectedNetwork.bssid ? 'text' : 'password'}
                    value={connectPassword}
                    onChange={(e) => setConnectPassword(e.target.value)}
                    placeholder="Enter WiFi password"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none pr-10"
                  />
                  <button
                    onClick={() => setShowPassword(
                      showPassword === selectedNetwork.bssid ? '' : selectedNetwork.bssid
                    )}
                    className="absolute right-2 top-2.5 text-gray-400 hover:text-white"
                  >
                    {showPassword === selectedNetwork.bssid ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="mb-4 text-sm text-gray-400">
              <div>Security: {selectedNetwork.security.join(', ') || 'Open'}</div>
              <div>Frequency: {selectedNetwork.frequency} GHz</div>
              <div>Signal: {selectedNetwork.signalStrength} dBm ({selectedNetwork.quality})</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConnectDialog(false);
                  setSelectedNetwork(null);
                  setConnectPassword('');
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => connectToNetwork(selectedNetwork, connectPassword)}
                disabled={isConnecting}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}