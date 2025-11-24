import React, { useState, useEffect } from 'react';
import { HardDrive, Plus, RefreshCw, Trash2, CheckCircle, XCircle, AlertTriangle, Server, Cloud, Wifi, Folder, Edit, Save, Eye, EyeOff, Upload, Download, Scan, Lock, Unlock } from 'lucide-react';

interface StoragePool {
  id: string;
  name: string;
  type: 'local' | 'webdav' | 'smb' | 'ftp' | 'sftp' | 'nfs';
  path: string;
  mountPoint?: string;
  device?: string;
  autoMount: boolean;
  accessMode: 'read' | 'write' | 'read-write';
  permissions: {
    owner: string;
    group: string;
    mode: string;
  };
  credentials?: {
    username?: string;
    password?: string;
    domain?: string;
    keyPath?: string;
  };
  options: Record<string, string>;
  status: 'connected' | 'disconnected' | 'error';
  size: {
    total: number;
    used: number;
    available: number;
  };
  usage: {
    fileCount: number;
    lastModified: Date;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    description?: string;
    tags: string[];
  };
}

interface StorageStats {
  totalPools: number;
  connectedPools: number;
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
  pools: StoragePool[];
}

interface LocalDisk {
  name: string;
  size: string;
  model: string;
  partitions: Array<{
    name: string;
    size: string;
    fstype: string;
    mountpoint: string;
    type: string;
  }>;
}

const StoragePools: React.FC<{ windowId?: string }> = () => {
  const [activeTab, setActiveTab] = useState('pools');
  const [pools, setPools] = useState<StoragePool[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [localDisks, setLocalDisks] = useState<LocalDisk[]>([]);
  const [, setSelectedPool] = useState<StoragePool | null>(null);
  const [, setIsCreating] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [newPool, setNewPool] = useState({
    name: '',
    type: 'local' as StoragePool['type'],
    path: '',
    device: '',
    autoMount: true,
    accessMode: 'read-write' as StoragePool['accessMode'],
    credentials: {
      username: '',
      password: '',
      domain: '',
      keyPath: ''
    },
    options: {},
    description: '',
    tags: [] as string[]
  });

  useEffect(() => {
    loadPools();
    loadStats();
    loadLocalDisks();
  }, []);

  const loadPools = async () => {
    try {
      const response = await fetch('/api/storage-pools/pools');
      const data = await response.json();
      setPools(data);
    } catch (error) {
      console.error('Failed to load storage pools:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/storage-pools/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const loadLocalDisks = async () => {
    try {
      const response = await fetch('/api/storage-pools/scan/local');
      const data = await response.json();
      setLocalDisks(data);
    } catch (error) {
      console.error('Failed to scan local disks:', error);
    }
  };

  const createPool = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/storage-pools/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPool),
      });

      if (response.ok) {
        await loadPools();
        await loadStats();
        setIsCreating(false);
        setNewPool({
          name: '',
          type: 'local',
          path: '',
          device: '',
          autoMount: true,
          accessMode: 'read-write',
          credentials: { username: '', password: '', domain: '', keyPath: '' },
          options: {},
          description: '',
          tags: []
        });
      }
    } catch (error) {
      console.error('Failed to create pool:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const mountPool = async (poolId: string) => {
    try {
      const response = await fetch(`/api/storage-pools/pools/${poolId}/mount`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadPools();
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to mount pool:', error);
    }
  };

  const unmountPool = async (poolId: string) => {
    try {
      const response = await fetch(`/api/storage-pools/pools/${poolId}/unmount`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadPools();
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to unmount pool:', error);
    }
  };

  const deletePool = async (poolId: string) => {
    if (!confirm('Are you sure you want to delete this storage pool?')) return;

    try {
      const response = await fetch(`/api/storage-pools/pools/${poolId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadPools();
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to delete pool:', error);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/storage-pools/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newPool.type,
          path: newPool.path,
          credentials: newPool.credentials
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('Connection test successful!');
      } else {
        alert(`Connection test failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Connection test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'local': return <HardDrive className="w-4 h-4" />;
      case 'webdav': return <Cloud className="w-4 h-4" />;
      case 'smb': return <Server className="w-4 h-4" />;
      case 'ftp':
      case 'sftp': return <Wifi className="w-4 h-4" />;
      case 'nfs': return <Folder className="w-4 h-4" />;
      default: return <HardDrive className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disconnected': return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <HardDrive className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Storage Pools</h1>
        </div>
        <p className="text-gray-400">
          Manage multiple disks and remote storage with unified access
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Total Pools</h3>
                <Server className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-500">{stats.totalPools}</div>
              <div className="text-xs text-gray-500">{stats.connectedPools} connected</div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Total Space</h3>
                <HardDrive className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-500">{formatFileSize(stats.totalSpace)}</div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Used Space</h3>
                <Upload className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-orange-500">{formatFileSize(stats.usedSpace)}</div>
              <div className="text-xs text-gray-500">
                {stats.totalSpace > 0 ? Math.round((stats.usedSpace / stats.totalSpace) * 100) : 0}% used
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Available Space</h3>
                <Download className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-500">{formatFileSize(stats.availableSpace)}</div>
            </div>
          </div>
        )}

          {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('pools')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'pools'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Server className="w-4 h-4" />
            Pools
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Pool
          </button>
          <button
            onClick={() => setActiveTab('disks')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'disks'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Scan className="w-4 h-4" />
            Disks
          </button>
        </div>

        {/* Storage Pools Tab */}
        {activeTab === 'pools' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">
                Storage Pools ({pools.length})
              </h3>
              <button
                onClick={() => { loadPools(); loadStats(); }}
                className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-gray-100 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {pools.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                <Server className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 mb-4">No storage pools configured</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  Add First Storage Pool
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {pools.map((pool) => (
                  <div key={pool.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-blue-400">
                          {getTypeIcon(pool.type)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-100">{pool.name}</h4>
                          <p className="text-sm text-gray-400">{pool.type.toUpperCase()} • {pool.accessMode}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(pool.status)}
                        <button
                          onClick={() => setSelectedPool(pool)}
                          className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePool(pool.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-400 mb-3 space-y-1">
                      <div>Path: <span className="text-gray-300">{pool.path}</span></div>
                      {pool.mountPoint && <div>Mount: <span className="text-gray-300">{pool.mountPoint}</span></div>}
                      {pool.device && <div>Device: <span className="text-gray-300">{pool.device}</span></div>}
                    </div>

                    {pool.size.total > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Usage</span>
                          <span className="text-gray-300">{formatFileSize(pool.size.used)} / {formatFileSize(pool.size.total)}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${(pool.size.used / pool.size.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {pool.status === 'connected' ? (
                        <button
                          onClick={() => unmountPool(pool.id)}
                          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-2 transition-all"
                        >
                          <Unlock className="w-4 h-4" />
                          Unmount
                        </button>
                      ) : (
                        <button
                          onClick={() => mountPool(pool.id)}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-2 transition-all"
                        >
                          <Lock className="w-4 h-4" />
                          Mount
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Pool Tab */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-100">Add Storage Pool</h3>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pool Name
                  </label>
                  <input
                    type="text"
                    value={newPool.name}
                    onChange={(e) => setNewPool({ ...newPool, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="e.g., Media Storage"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={newPool.type}
                    onChange={(e) => setNewPool({ ...newPool, type: e.target.value as StoragePool['type'] })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="local">Local Disk</option>
                    <option value="webdav">WebDAV</option>
                    <option value="smb">SMB/CIFS</option>
                    <option value="ftp">FTP</option>
                    <option value="sftp">SFTP</option>
                    <option value="nfs">NFS</option>
                  </select>
                </div>

                {newPool.type === 'local' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Device
                    </label>
                    <select
                      value={newPool.device}
                      onChange={(e) => setNewPool({ ...newPool, device: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select device...</option>
                      {localDisks.map((disk) => (
                        <optgroup key={disk.name} label={disk.name}>
                          {disk.partitions.map((part) => (
                            <option key={part.name} value={`/dev/${part.name}`}>
                              {part.name} ({part.size}) {part.fstype}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Path/URL
                    </label>
                    <input
                      type="text"
                      value={newPool.path}
                      onChange={(e) => setNewPool({ ...newPool, path: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder={
                        newPool.type === 'webdav' ? 'https://example.com/webdav' :
                        newPool.type === 'smb' ? '//server/share' :
                        newPool.type === 'ftp' || newPool.type === 'sftp' ? 'ftp.example.com' :
                        newPool.type === 'nfs' ? 'server:/export/path' : ''
                      }
                    />
                  </div>
                )}

                {(newPool.type === 'webdav' || newPool.type === 'smb' || newPool.type === 'ftp' || newPool.type === 'sftp') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newPool.credentials.username}
                      onChange={(e) => setNewPool({
                        ...newPool,
                        credentials: { ...newPool.credentials, username: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="flex gap-2">
                      <input
                        type={showPasswords.password ? "text" : "password"}
                        value={newPool.credentials.password}
                        onChange={(e) => setNewPool({
                          ...newPool,
                          credentials: { ...newPool.credentials, password: e.target.value }
                        })}
                        className="flex-1 px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                      <button
                        onClick={() => setShowPasswords({ ...showPasswords, password: !showPasswords.password })}
                        className="px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 hover:bg-gray-600 transition-all"
                      >
                        {showPasswords.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

                <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Access Mode
                </label>
                <select
                  value={newPool.accessMode}
                  onChange={(e) => setNewPool({ ...newPool, accessMode: e.target.value as StoragePool['accessMode'] })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="read">Read Only</option>
                  <option value="write">Write Only</option>
                  <option value="read-write">Read & Write</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoMount"
                  checked={newPool.autoMount}
                  onChange={(e) => setNewPool({ ...newPool, autoMount: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="autoMount" className="text-sm text-gray-300">
                  Auto-mount on startup
                </label>
              </div>
            </div>
          </div>

            <div className="flex gap-3">
              <button
                onClick={createPool}
                disabled={isLoading || !newPool.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                {isLoading ? 'Creating...' : 'Create Pool'}
              </button>
              {newPool.type !== 'local' && (
                <button
                  onClick={testConnection}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Test Connection
                </button>
              )}
              <button
                onClick={() => setActiveTab('pools')}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Local Disks Tab */}
        {activeTab === 'disks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">
                Available Local Disks
              </h3>
              <button
                onClick={loadLocalDisks}
                className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-gray-100 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Scan
              </button>
            </div>

            {localDisks.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                <HardDrive className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">No local disks found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {localDisks.map((disk) => (
                  <div key={disk.name} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-blue-400">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-100">{disk.name}</h4>
                        <p className="text-sm text-gray-400">{disk.size} • {disk.model}</p>
                      </div>
                    </div>

                    {disk.partitions.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-300">Partitions:</h5>
                        {disk.partitions.map((partition) => (
                          <div key={partition.name} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                            <span className="text-sm font-medium text-gray-200">{partition.name}</span>
                            <div className="text-right">
                              <div className="text-sm text-gray-300">{partition.size}</div>
                              <div className="text-xs text-gray-500">
                                {partition.fstype} {partition.mountpoint && `• ${partition.mountpoint}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoragePools;
