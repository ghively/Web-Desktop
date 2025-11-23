import React, { useState, useEffect } from 'react';
import { Server, Play, Square, Settings, Copy, Trash2, Plus, Activity, Clock, Users, Shield, Globe, Folder } from 'lucide-react';

interface FileServer {
  id: string;
  type: 'ftp' | 'sftp' | 'webdav';
  name: string;
  status: 'running' | 'stopped';
  port: number;
  connections: number;
  startTime: string;
  uptime?: number;
}

interface ServerConfig {
  port: number;
  host?: string;
  rootPath?: string;
  anonymous?: boolean;
  requirePassword?: boolean;
  readOnly?: boolean;
  maxConnections?: number;
  greeting?: string;
  allowedUsers?: Array<{ username: string; password: string; home: string }>;
}

const FileServers: React.FC = () => {
  const [servers, setServers] = useState<FileServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState<FileServer | null>(null);
  const [serverLogs, setServerLogs] = useState<Array<{ timestamp: string; message: string; type: string }>>([]);
  const [newServerType, setNewServerType] = useState<'ftp' | 'sftp' | 'webdav'>('ftp');
  const [newServerName, setNewServerName] = useState('');
  const [newServerConfig, setNewServerConfig] = useState<ServerConfig>({
    port: 2121,
    host: '0.0.0.0',
    rootPath: process.env.HOME || '/home/user',
    anonymous: true,
    maxConnections: 10
  });

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/file-servers');
      if (response.ok) {
        const data = await response.json();
        setServers(data);
      }
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const createServer = async () => {
    try {
      const response = await fetch('/api/file-servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newServerType,
          name: newServerName || `${newServerType.toUpperCase()} Server`,
          config: newServerConfig
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        fetchServers();
        resetCreateForm();
      } else {
        const error = await response.json();
        alert(`Failed to create server: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to create server');
    }
  };

  const stopServer = async (id: string) => {
    try {
      const response = await fetch(`/api/file-servers/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchServers();
        if (selectedServer?.id === id) {
          setSelectedServer(null);
        }
      }
    } catch (error) {
      alert('Failed to stop server');
    }
  };

  const testServer = async (id: string) => {
    try {
      const response = await fetch(`/api/file-servers/${id}/test`, { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        alert(`Server test result:\nListening: ${result.listening}\nPort: ${result.port}\nReachable: ${result.reachable}`);
      }
    } catch (error) {
      alert('Failed to test server');
    }
  };

  const fetchServerLogs = async (id: string) => {
    try {
      const response = await fetch(`/api/file-servers/${id}/logs`);
      if (response.ok) {
        const data = await response.json();
        setServerLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const resetCreateForm = () => {
    setNewServerName('');
    setNewServerConfig({
      port: 2121,
      host: '0.0.0.0',
      rootPath: process.env.HOME || '/home/user',
      anonymous: true,
      maxConnections: 10
    });
  };

  const getServerIcon = (type: string) => {
    switch (type) {
      case 'ftp': return <Globe className="w-5 h-5" />;
      case 'sftp': return <Shield className="w-5 h-5" />;
      case 'webdav': return <Folder className="w-5 h-5" />;
      default: return <Server className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'running' ? 'text-green-500' : 'text-gray-400';
  };

  const formatUptime = (uptime?: number) => {
    if (!uptime) return 'N/A';
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-900">
      {/* Servers List */}
      <div className="w-80 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">File Servers</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {servers.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No file servers configured</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-blue-400 hover:text-blue-300"
              >
                Create your first server
              </button>
            </div>
          ) : (
            servers.map((server) => (
              <div
                key={server.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedServer?.id === server.id
                    ? 'bg-gray-700 border-blue-500'
                    : 'bg-gray-800 border-gray-600 hover:bg-gray-750'
                }`}
                onClick={() => {
                  setSelectedServer(server);
                  fetchServerLogs(server.id);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getServerIcon(server.type)}
                    <span className="text-white font-medium">{server.name}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(server.status)}`}></div>
                </div>
                <div className="text-sm text-gray-400">
                  <div className="flex justify-between">
                    <span>Port {server.port}</span>
                    <span className={getStatusColor(server.status)}>
                      {server.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{server.connections} connections</span>
                    <span>{formatUptime(server.uptime)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Server Details */}
      <div className="flex-1 flex flex-col">
        {selectedServer ? (
          <>
            {/* Server Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getServerIcon(selectedServer.type)}
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedServer.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className={`flex items-center space-x-1 ${getStatusColor(selectedServer.status)}`}>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedServer.status)}`}></div>
                        <span>{selectedServer.status.toUpperCase()}</span>
                      </span>
                      <span>{selectedServer.type.toUpperCase()}</span>
                      <span>Port {selectedServer.port}</span>
                      <span>{selectedServer.connections} connections</span>
                      <span>{formatUptime(selectedServer.uptime)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testServer(selectedServer.id)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Test</span>
                  </button>
                  <button
                    onClick={() => stopServer(selectedServer.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Square className="w-4 h-4" />
                    <span>Stop</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Server Info */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h4 className="text-white font-medium">Connections</h4>
                  </div>
                  <div className="text-2xl font-bold text-white">{selectedServer.connections}</div>
                  <div className="text-sm text-gray-400">Active connections</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock className="w-5 h-5 text-green-400" />
                    <h4 className="text-white font-medium">Uptime</h4>
                  </div>
                  <div className="text-2xl font-bold text-white">{formatUptime(selectedServer.uptime)}</div>
                  <div className="text-sm text-gray-400">Server running time</div>
                </div>
              </div>

              {/* Server Logs */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-yellow-400" />
                  <span>Server Logs</span>
                </h4>
                <div className="bg-gray-900 rounded p-3 h-64 overflow-y-auto font-mono text-sm">
                  {serverLogs.length === 0 ? (
                    <div className="text-gray-500">No logs available</div>
                  ) : (
                    serverLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`mb-1 ${
                          log.type === 'error' ? 'text-red-400' :
                          log.type === 'warning' ? 'text-yellow-400' :
                          'text-gray-300'
                        }`}
                      >
                        <span className="text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        {' '}
                        {log.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Server className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Select a server to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Server Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Create File Server</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Server Type</label>
                <select
                  value={newServerType}
                  onChange={(e) => setNewServerType(e.target.value as 'ftp' | 'sftp' | 'webdav')}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                >
                  <option value="ftp">FTP</option>
                  <option value="sftp">SFTP</option>
                  <option value="webdav">WebDAV</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Server Name</label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder={`${newServerType.toUpperCase()} Server`}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Port</label>
                  <input
                    type="number"
                    value={newServerConfig.port}
                    onChange={(e) => setNewServerConfig({
                      ...newServerConfig,
                      port: parseInt(e.target.value) || 2121
                    })}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Host</label>
                  <input
                    type="text"
                    value={newServerConfig.host}
                    onChange={(e) => setNewServerConfig({
                      ...newServerConfig,
                      host: e.target.value
                    })}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Root Path</label>
                <input
                  type="text"
                  value={newServerConfig.rootPath}
                  onChange={(e) => setNewServerConfig({
                    ...newServerConfig,
                    rootPath: e.target.value
                  })}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Max Connections</label>
                <input
                  type="number"
                  value={newServerConfig.maxConnections}
                  onChange={(e) => setNewServerConfig({
                    ...newServerConfig,
                    maxConnections: parseInt(e.target.value) || 10
                  })}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                />
              </div>

              {newServerType === 'ftp' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={newServerConfig.anonymous}
                    onChange={(e) => setNewServerConfig({
                      ...newServerConfig,
                      anonymous: e.target.checked
                    })}
                    className="rounded bg-gray-700 border-gray-600"
                  />
                  <label htmlFor="anonymous" className="text-sm text-gray-300">
                    Allow anonymous access
                  </label>
                </div>
              )}

              {newServerType === 'webdav' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="readOnly"
                    checked={newServerConfig.readOnly}
                    onChange={(e) => setNewServerConfig({
                      ...newServerConfig,
                      readOnly: e.target.checked
                    })}
                    className="rounded bg-gray-700 border-gray-600"
                  />
                  <label htmlFor="readOnly" className="text-sm text-gray-300">
                    Read-only mode
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createServer}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create Server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileServers;