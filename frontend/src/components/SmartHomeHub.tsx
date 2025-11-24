import React, { useState, useEffect, useRef } from 'react';
import {
  Home, Power, Lightbulb, Thermometer, DoorOpen, Camera, Lock, Wind, Settings, Play, Pause, AlertTriangle,
  CheckCircle, Wifi, WifiOff, RefreshCw, MapPin, Clock, Activity, Code, Zap, Droplets, Sun, Cloud, Shield,
  Bell, Speaker, Tv, Sofa, Bed, ChefHat, Bath, Car, Trees, Waves, Flame, Gauge, TrendingUp, Calendar, Users,
  Edit, Plus, Trash2, Copy, Save, Eye, EyeOff, Search, Filter, Grid, List, Maximize2, Volume2, VolumeX
} from 'lucide-react';

interface SmartHomeDevice {
  id: string;
  name: string;
  type: 'light' | 'switch' | 'sensor' | 'camera' | 'lock' | 'climate' | 'cover' | 'media_player' | 'fan';
  state: string;
  attributes: Record<string, any>;
  area?: string;
  room?: string;
  floor?: string;
  manufacturer?: string;
  model?: string;
  icon?: string;
  battery_level?: number;
  last_updated: string;
}

interface Room {
  id: string;
  name: string;
  area: string;
  devices: string[];
  icon?: string;
  temperature?: number;
  humidity?: number;
  light_level?: number;
  occupancy?: boolean;
}

interface Floor {
  id: string;
  name: string;
  level: number;
  rooms: string[];
  total_devices: number;
  active_devices: number;
}

interface Scene {
  id: string;
  name: string;
  description: string;
  icon: string;
  devices: Array<{
    device_id: string;
    state: string;
    attributes?: Record<string, any>;
  }>;
  favorite: boolean;
  usage_count: number;
  last_used?: string;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggers: Array<{
    type: string;
    device_id?: string;
    condition?: string;
    value?: any;
  }>;
  conditions: Array<{
    type: string;
    device_id?: string;
    operator?: string;
    value?: any;
  }>;
  actions: Array<{
    type: string;
    device_id?: string;
    state?: string;
    parameters?: Record<string, any>;
  }>;
  last_triggered?: string;
  next_run?: string;
}

interface EnergyUsage {
  total_kwh: number;
  cost: number;
  devices: Array<{
    device_id: string;
    name: string;
    kwh: number;
    cost: number;
    percentage: number;
  }>;
  period: 'day' | 'week' | 'month' | 'year';
}

interface SecurityStatus {
  armed: boolean;
  mode: 'home' | 'away' | 'night' | 'vacation';
  sensors: Array<{
    id: string;
    name: string;
    type: string;
    state: string;
    last_triggered?: string;
  }>;
  cameras: Array<{
    id: string;
    name: string;
    recording: boolean;
    motion_detected: boolean;
    last_motion?: string;
  }>;
}

export const SmartHomeHub: React.FC<{ windowId?: string }> = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'devices' | 'rooms' | 'scenes' | 'automation' | 'energy' | 'security' | 'settings'>('dashboard');
  const [devices, setDevices] = useState<SmartHomeDevice[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [energyUsage, setEnergyUsage] = useState<EnergyUsage | null>(null);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Device type icons
  const deviceIcons = {
    light: Lightbulb,
    switch: Power,
    sensor: Activity,
    camera: Camera,
    lock: Lock,
    climate: Thermometer,
    cover: DoorOpen,
    media_player: Tv,
    fan: Wind
  };

  // Room icons
  const roomIcons = {
    living_room: Sofa,
    bedroom: Bed,
    kitchen: ChefHat,
    bathroom: Bath,
    garage: Car,
    garden: Trees,
    pool: Waves,
    office: Tv,
    dining: ChefHat
  };

  useEffect(() => {
    loadSmartHomeData();
    const interval = setInterval(loadSmartHomeData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSmartHomeData = async () => {
    try {
      const [devicesRes, roomsRes, scenesRes, automationsRes, energyRes, securityRes] = await Promise.all([
        fetch('/api/smart-home/devices'),
        fetch('/api/smart-home/rooms'),
        fetch('/api/smart-home/scenes'),
        fetch('/api/smart-home/automations'),
        fetch('/api/smart-home/energy'),
        fetch('/api/smart-home/security')
      ]);

      if (devicesRes.ok) setDevices(await devicesRes.json());
      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (scenesRes.ok) setScenes(await scenesRes.json());
      if (automationsRes.ok) setAutomations(await automationsRes.json());
      if (energyRes.ok) setEnergyUsage(await energyRes.json());
      if (securityRes.ok) setSecurityStatus(await securityRes.json());

      setIsConnected(true);
    } catch (error) {
      console.error('Failed to load smart home data:', error);
      setIsConnected(false);
    }
  };

  const controlDevice = async (deviceId: string, action: string, parameters?: Record<string, any>) => {
    setIsLoading(true);
    try {
      await fetch(`/api/smart-home/devices/${deviceId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, parameters })
      });
      await loadSmartHomeData();
    } catch (error) {
      console.error('Failed to control device:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activateScene = async (sceneId: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/smart-home/scenes/${sceneId}/activate`, {
        method: 'POST'
      });
      await loadSmartHomeData();
    } catch (error) {
      console.error('Failed to activate scene:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutomation = async (automationId: string, enabled: boolean) => {
    setIsLoading(true);
    try {
      await fetch(`/api/smart-home/automations/${automationId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      await loadSmartHomeData();
    } catch (error) {
      console.error('Failed to toggle automation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSecurityMode = async (mode: string, armed: boolean) => {
    setIsLoading(true);
    try {
      await fetch('/api/smart-home/security/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, armed })
      });
      await loadSmartHomeData();
    } catch (error) {
      console.error('Failed to update security:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDevicesByRoom = (roomId: string) => {
    return devices.filter(device => device.room === roomId);
  };

  const getDevicesByType = (type: string) => {
    return devices.filter(device => device.type === type);
  };

  const getDeviceIcon = (device: SmartHomeDevice) => {
    const IconComponent = deviceIcons[device.type] || Power;
    return IconComponent;
  };

  const getRoomIcon = (room: Room) => {
    const IconComponent = roomIcons[room.icon as keyof typeof roomIcons] || Home;
    return IconComponent;
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || device.type === filterType;
    const matchesRoom = !selectedRoom || device.room === selectedRoom;
    return matchesSearch && matchesType && matchesRoom;
  });

  const activeDevicesCount = devices.filter(d => d.state === 'on').length;
  const totalDevicesCount = devices.length;
  const averageTemperature = rooms.reduce((sum, room) => sum + (room.temperature || 0), 0) / rooms.length;

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Home className="w-8 h-8 text-green-600" />
            <h1 className="text-2xl font-bold">Smart Home Hub</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <button
              onClick={loadSmartHomeData}
              disabled={isLoading}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-lg font-bold text-blue-500">{activeDevicesCount}/{totalDevicesCount}</div>
            <div className="text-xs text-gray-400">Active Devices</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-lg font-bold text-green-500">{rooms.length}</div>
            <div className="text-xs text-gray-400">Rooms</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-lg font-bold text-yellow-500">{averageTemperature.toFixed(1)}°C</div>
            <div className="text-xs text-gray-400">Avg Temperature</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-lg font-bold text-purple-500">{energyUsage?.total_kwh.toFixed(1) || 0} kWh</div>
            <div className="text-xs text-gray-400">Today's Usage</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'devices', label: 'Devices', icon: Power },
            { id: 'rooms', label: 'Rooms', icon: Home },
            { id: 'scenes', label: 'Scenes', icon: Sun },
            { id: 'automation', label: 'Automation', icon: Zap },
            { id: 'energy', label: 'Energy', icon: TrendingUp },
            { id: 'security', label: 'Security', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-green-600 text-white'
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
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => activateScene('good_morning')}
                  className="p-4 bg-yellow-600/20 border border-yellow-500/30 rounded-lg hover:bg-yellow-600/30 transition-colors"
                >
                  <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                  <div className="text-sm">Good Morning</div>
                </button>
                <button
                  onClick={() => activateScene('good_night')}
                  className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors"
                >
                  <Cloud className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-sm">Good Night</div>
                </button>
                <button
                  onClick={() => activateScene('movie_time')}
                  className="p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-colors"
                >
                  <Tv className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <div className="text-sm">Movie Time</div>
                </button>
                <button
                  onClick={() => activateScene('away')}
                  className="p-4 bg-red-600/20 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-colors"
                >
                  <Lock className="w-6 h-6 mx-auto mb-2 text-red-500" />
                  <div className="text-sm">Away Mode</div>
                </button>
              </div>
            </div>

            {/* Room Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.slice(0, 6).map(room => {
                const Icon = getRoomIcon(room);
                const roomDevices = getDevicesByRoom(room.id);
                const activeDevices = roomDevices.filter(d => d.state === 'on').length;

                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      setSelectedRoom(room.id);
                      setActiveTab('rooms');
                    }}
                    className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6 text-blue-500" />
                        <h4 className="font-semibold">{room.name}</h4>
                      </div>
                      <div className="text-sm text-gray-400">
                        {activeDevices}/{roomDevices.length}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {room.temperature && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Temperature</span>
                          <span>{room.temperature}°C</span>
                        </div>
                      )}
                      {room.humidity && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Humidity</span>
                          <span>{room.humidity}%</span>
                        </div>
                      )}
                      {room.occupancy && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Occupancy</span>
                          <span className="text-green-500">Occupied</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {devices.slice(0, 5).map(device => {
                  const Icon = getDeviceIcon(device);
                  const isActive = device.state === 'on';

                  return (
                    <div key={device.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-green-500' : 'text-gray-500'}`} />
                        <div>
                          <div className="font-medium">{device.name}</div>
                          <div className="text-xs text-gray-400">{device.room}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isActive ? 'text-green-500' : 'text-gray-400'}`}>
                          {device.state}
                        </span>
                        <button
                          onClick={() => controlDevice(device.id, 'toggle')}
                          className={`p-1 rounded transition-colors ${
                            isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          <Power className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search devices..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="light">Lights</option>
                <option value="switch">Switches</option>
                <option value="sensor">Sensors</option>
                <option value="camera">Cameras</option>
                <option value="climate">Climate</option>
                <option value="lock">Locks</option>
              </select>

              <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Devices Grid/List */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
              {filteredDevices.map(device => {
                const Icon = getDeviceIcon(device);
                const isActive = device.state === 'on';

                return viewMode === 'grid' ? (
                  <div key={device.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <Icon className={`w-6 h-6 ${isActive ? 'text-green-500' : 'text-gray-500'}`} />
                      <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-600'}`} />
                    </div>
                    <h4 className="font-medium mb-1">{device.name}</h4>
                    <p className="text-sm text-gray-400 mb-3">{device.room}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isActive ? 'text-green-500' : 'text-gray-400'}`}>
                        {device.state}
                      </span>
                      <button
                        onClick={() => controlDevice(device.id, 'toggle')}
                        className={`p-2 rounded transition-colors ${
                          isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        <Power className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={device.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-green-500' : 'text-gray-500'}`} />
                      <div>
                        <div className="font-medium">{device.name}</div>
                        <div className="text-sm text-gray-400">{device.room}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${isActive ? 'text-green-500' : 'text-gray-400'}`}>
                        {device.state}
                      </span>
                      {device.battery_level && (
                        <span className="text-xs text-gray-400">
                          {device.battery_level}%
                        </span>
                      )}
                      <button
                        onClick={() => controlDevice(device.id, 'toggle')}
                        className={`p-2 rounded transition-colors ${
                          isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        <Power className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rooms Tab */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map(room => {
                const Icon = getRoomIcon(room);
                const roomDevices = getDevicesByRoom(room.id);
                const activeDevices = roomDevices.filter(d => d.state === 'on').length;

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all border ${
                      selectedRoom === room.id
                        ? 'border-green-500 bg-green-600/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6 text-blue-500" />
                        <h4 className="font-semibold text-lg">{room.name}</h4>
                      </div>
                      <div className="text-sm text-gray-400">
                        {activeDevices}/{roomDevices.length}
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      {room.temperature && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 flex items-center gap-2">
                            <Thermometer className="w-4 h-4" />
                            Temperature
                          </span>
                          <span className="font-medium">{room.temperature}°C</span>
                        </div>
                      )}
                      {room.humidity && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 flex items-center gap-2">
                            <Droplets className="w-4 h-4" />
                            Humidity
                          </span>
                          <span className="font-medium">{room.humidity}%</span>
                        </div>
                      )}
                      {room.light_level && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            Light Level
                          </span>
                          <span className="font-medium">{room.light_level}%</span>
                        </div>
                      )}
                      {room.occupancy && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Occupancy
                          </span>
                          <span className="text-green-500">Occupied</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-700 pt-3">
                      <div className="text-sm text-gray-400 mb-2">Devices</div>
                      <div className="flex flex-wrap gap-2">
                        {roomDevices.slice(0, 4).map(device => {
                          const DeviceIcon = getDeviceIcon(device);
                          return (
                            <div
                              key={device.id}
                              className={`p-1.5 rounded border ${device.state === 'on'
                                ? 'bg-green-600/20 border-green-500'
                                : 'bg-gray-700 border-gray-600'
                              }`}
                            >
                              <DeviceIcon className="w-3 h-3" />
                            </div>
                          );
                        })}
                        {roomDevices.length > 4 && (
                          <div className="p-1.5 bg-gray-700 border border-gray-600 rounded">
                            <span className="text-xs">+{roomDevices.length - 4}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Room Details */}
            {selectedRoom && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {rooms.find(r => r.id === selectedRoom)?.name} - Device Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getDevicesByRoom(selectedRoom).map(device => {
                    const Icon = getDeviceIcon(device);
                    const isActive = device.state === 'on';

                    return (
                      <div key={device.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-green-500' : 'text-gray-500'}`} />
                            <span className="font-medium">{device.name}</span>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-600'}`} />
                        </div>
                        <div className="text-sm text-gray-400">{device.state}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Last updated: {new Date(device.last_updated).toLocaleTimeString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scenes Tab */}
        {activeTab === 'scenes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Scenes</h3>
              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" />
                Create Scene
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scenes.map(scene => (
                <div key={scene.id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600/20 rounded-lg">
                        <Sun className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{scene.name}</h4>
                        <p className="text-sm text-gray-400">{scene.description}</p>
                      </div>
                    </div>
                    <button
                      className={`p-1 rounded transition-colors ${
                        scene.favorite ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'
                      }`}
                    >
                      <Star className="w-4 h-4" fill={scene.favorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-400">
                      {scene.devices.length} devices
                    </span>
                    <span className="text-sm text-gray-400">
                      {scene.usage_count} uses
                    </span>
                  </div>

                  {scene.last_used && (
                    <div className="text-xs text-gray-500 mb-4">
                      Last used: {new Date(scene.last_used).toLocaleDateString()}
                    </div>
                  )}

                  <button
                    onClick={() => activateScene(scene.id)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Activate Scene
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Automation Tab */}
        {activeTab === 'automation' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Automation Rules</h3>
              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" />
                Create Rule
              </button>
            </div>

            <div className="space-y-4">
              {automations.map(automation => (
                <div
                  key={automation.id}
                  className={`p-4 rounded-lg border transition-all ${
                    automation.enabled
                      ? 'bg-green-600/10 border-green-500'
                      : 'bg-gray-800 border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Zap className={`w-5 h-5 ${automation.enabled ? 'text-green-500' : 'text-gray-400'}`} />
                      <div>
                        <h4 className="font-semibold">{automation.name}</h4>
                        <p className="text-sm text-gray-400">{automation.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {automation.last_triggered && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(automation.last_triggered).toLocaleTimeString()}
                        </span>
                      )}

                      <button
                        onClick={() => toggleAutomation(automation.id, !automation.enabled)}
                        className={`p-2 rounded transition-colors ${
                          automation.enabled
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {automation.enabled ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">Triggers ({automation.triggers.length})</div>
                      <div className="text-gray-300">
                        {automation.triggers.slice(0, 2).map((trigger, i) => (
                          <div key={i}>{trigger.type}</div>
                        ))}
                        {automation.triggers.length > 2 && (
                          <div className="text-gray-500">+{automation.triggers.length - 2} more</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Conditions ({automation.conditions.length})</div>
                      <div className="text-gray-300">
                        {automation.conditions.slice(0, 2).map((condition, i) => (
                          <div key={i}>{condition.type}</div>
                        ))}
                        {automation.conditions.length > 2 && (
                          <div className="text-gray-500">+{automation.conditions.length - 2} more</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Actions ({automation.actions.length})</div>
                      <div className="text-gray-300">
                        {automation.actions.slice(0, 2).map((action, i) => (
                          <div key={i}>{action.type}</div>
                        ))}
                        {automation.actions.length > 2 && (
                          <div className="text-gray-500">+{automation.actions.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Energy Tab */}
        {activeTab === 'energy' && energyUsage && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-500">
                  {energyUsage.total_kwh.toFixed(1)} kWh
                </div>
                <div className="text-sm text-gray-400">Total Usage</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-500">
                  ${energyUsage.cost.toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">Estimated Cost</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-500">
                  {(energyUsage.total_kwh * 0.23).toFixed(1)} kg
                </div>
                <div className="text-sm text-gray-400">CO₂ Emissions</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-500">
                  {energyUsage.devices.length}
                </div>
                <div className="text-sm text-gray-400">Active Devices</div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Device Usage Breakdown</h3>
              <div className="space-y-3">
                {energyUsage.devices.map((device, index) => (
                  <div key={device.device_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 bg-gray-700 rounded-lg p-2 text-center">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{device.name}</div>
                        <div className="text-sm text-gray-400">{device.kwh.toFixed(2)} kWh</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${device.cost.toFixed(2)}</div>
                      <div className="text-sm text-gray-400">{device.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Usage Trends</h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Energy usage chart coming soon</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && securityStatus && (
          <div className="space-y-6">
            {/* Security Status */}
            <div className={`rounded-lg p-6 border ${
              securityStatus.armed
                ? 'bg-green-600/10 border-green-500'
                : 'bg-gray-800 border-gray-700'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Shield className={`w-6 h-6 ${securityStatus.armed ? 'text-green-500' : 'text-gray-400'}`} />
                  <div>
                    <h3 className="text-lg font-semibold">Security System</h3>
                    <p className="text-sm text-gray-400">
                      Mode: {securityStatus.mode.charAt(0).toUpperCase() + securityStatus.mode.slice(1)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => updateSecurityMode(securityStatus.mode, !securityStatus.armed)}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    securityStatus.armed
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {securityStatus.armed ? 'Disarm' : 'Arm'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Sensors ({securityStatus.sensors.length})</h4>
                  <div className="space-y-2">
                    {securityStatus.sensors.map(sensor => (
                      <div key={sensor.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Activity className={`w-4 h-4 ${
                            sensor.state === 'triggered' ? 'text-red-500' : 'text-gray-400'
                          }`} />
                          <span className="text-sm">{sensor.name}</span>
                        </div>
                        <span className={`text-sm ${
                          sensor.state === 'triggered' ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {sensor.state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Cameras ({securityStatus.cameras.length})</h4>
                  <div className="space-y-2">
                    {securityStatus.cameras.map(camera => (
                      <div key={camera.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Camera className={`w-4 h-4 ${
                            camera.recording ? 'text-red-500' : 'text-gray-400'
                          }`} />
                          <span className="text-sm">{camera.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {camera.motion_detected && (
                            <span className="text-xs text-yellow-500">Motion</span>
                          )}
                          <span className={`text-sm ${
                            camera.recording ? 'text-red-500' : 'text-gray-400'
                          }`}>
                            {camera.recording ? 'Recording' : 'Idle'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Security Events */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Events</h3>
              <div className="space-y-3">
                {securityStatus.sensors
                  .filter(s => s.last_triggered)
                  .map(sensor => (
                    <div key={sensor.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span>{sensor.name} triggered</span>
                      </div>
                      <span className="text-gray-400">
                        {sensor.last_triggered && new Date(sensor.last_triggered).toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartHomeHub;