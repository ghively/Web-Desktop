import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, RefreshCw, Monitor, Copy, Eye, EyeOff, Server, User, Lock, Globe, Save, TestTube } from 'lucide-react';
import { API_CONFIG } from '../config/api';

interface RDPClientProps {
  windowId: string;
}

interface RDPSession {
  id: string;
  host: string;
  port: number;
  username?: string;
  domain?: string;
  resolution: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  websocketUrl: string;
  profile?: string;
  bpp?: number;
  consoleSession?: boolean;
  createdAt: number;
  lastAccess: number;
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const RDPClient: React.FC<RDPClientProps> = ({ windowId: _windowId }) => {
  const [sessions, setSessions] = useState<RDPSession[]>([]);
  const [profiles, setProfiles] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Form states for new connection
  const [connectionForm, setConnectionForm] = useState({
    host: '',
    port: '3389',
    username: '',
    password: '',
    domain: '',
    width: '1280',
    height: '720',
    bpp: '32',
    profile: 'windows-desktop',
    consoleSession: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showSavedProfiles, setShowSavedProfiles] = useState(false);

  const API_BASE = API_CONFIG.getEndpointUrl('rdp');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/sessions`);
      if (!response.ok) throw new Error('Failed to load sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const loadProfiles = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/profiles`);
      if (!response.ok) throw new Error('Failed to load profiles');
      const data = await response.json();
      setProfiles(data.profiles || {});
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  }, [API_BASE]);

  const testConnection = async () => {
    if (!connectionForm.host) {
      setError('Host is required for connection test');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: connectionForm.host,
          port: parseInt(connectionForm.port, 10)
        })
      });

      if (!response.ok) throw new Error('Connection test failed');
      const data = await response.json();

      if (data.success) {
        setCopyFeedback('Connection successful!');
      } else {
        setError('Connection failed: ' + data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setLoading(false);
      if (copyFeedback) {
        setTimeout(() => setCopyFeedback(null), 3000);
      }
    }
  };

  const createSession = async () => {
    if (!connectionForm.host) {
      setError('Host is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: connectionForm.host,
          port: parseInt(connectionForm.port, 10),
          username: connectionForm.username || undefined,
          password: connectionForm.password || undefined,
          domain: connectionForm.domain || undefined,
          width: parseInt(connectionForm.width, 10),
          height: parseInt(connectionForm.height, 10),
          bpp: parseInt(connectionForm.bpp, 10),
          profile: connectionForm.profile,
          consoleSession: connectionForm.consoleSession
        })
      });

      if (!response.ok) throw new Error('Failed to create session');
      const data = await response.json();

      if (data.session) {
        setSelectedSession(data.session.id);
        loadSessions();
        // Clear form after successful creation
        setConnectionForm({
          host: '',
          port: '3389',
          username: '',
          password: '',
          domain: '',
          width: '1280',
          height: '720',
          bpp: '32',
          profile: 'windows-desktop',
          consoleSession: false
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async (id: string) => {
    if (!confirm('Disconnect this RDP session?')) return;

    try {
      const response = await fetch(`${API_BASE}/session/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to stop session');

      if (selectedSession === id) setSelectedSession(null);
      loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const saveProfile = async () => {
    if (!connectionForm.host) {
      setError('Host is required to save profile');
      return;
    }

    const profileName = prompt('Enter a name for this connection profile:');
    if (!profileName) return;

    try {
      const response = await fetch(`${API_BASE}/save-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          host: connectionForm.host,
          port: parseInt(connectionForm.port, 10),
          username: connectionForm.username,
          domain: connectionForm.domain,
          profile: connectionForm.profile
        })
      });

      if (!response.ok) throw new Error('Failed to save profile');

      setCopyFeedback('Profile saved successfully!');
      setTimeout(() => setCopyFeedback(null), 3000);
      loadProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    }
  };

  const loadProfile = (profileName: string) => {
    const profile = profiles[profileName];
    if (profile) {
      setConnectionForm({
        host: profile.name.includes('localhost') ? 'localhost' : profile.name.split(' - ')[0] || '',
        port: profile.defaultPort?.toString() || '3389',
        username: '',
        password: '',
        domain: '',
        width: '1280',
        height: '720',
        bpp: profile.bpp?.[0]?.toString() || '32',
        profile: profileName,
        consoleSession: false
      });
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(`${type} copied!`);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  useEffect(() => {
    loadSessions();
    loadProfiles();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, [loadProfiles, loadSessions]);

  const currentSession = sessions.find(s => s.id === selectedSession);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          RDP Client
        </h2>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-80 border-r border-gray-700 overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Server className="w-4 h-4" />
              New Connection
            </h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-400">Host</label>
                <input
                  type="text"
                  value={connectionForm.host}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="192.168.1.100 or windows-pc.local"
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Port</label>
                  <input
                    type="text"
                    value={connectionForm.port}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, port: e.target.value }))}
                    placeholder="3389"
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Profile</label>
                  <select
                    value={connectionForm.profile}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, profile: e.target.value }))}
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                  >
                    <option value="windows-desktop">Windows Desktop</option>
                    <option value="windows-server">Windows Server</option>
                    <option value="linux-xrdp">Linux XRDP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Username
                  </label>
                  <input
                    type="text"
                    value={connectionForm.username}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={connectionForm.password}
                      onChange={(e) => setConnectionForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Optional"
                      className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 pr-6"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Domain (optional)
                </label>
                <input
                  type="text"
                  value={connectionForm.domain}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="WORKGROUP or company.com"
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Width</label>
                  <input
                    type="text"
                    value={connectionForm.width}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, width: e.target.value }))}
                    placeholder="1280"
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Height</label>
                  <input
                    type="text"
                    value={connectionForm.height}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, height: e.target.value }))}
                    placeholder="720"
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">BPP</label>
                  <select
                    value={connectionForm.bpp}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, bpp: e.target.value }))}
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                  >
                    <option value="16">16</option>
                    <option value="24">24</option>
                    <option value="32">32</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="console"
                  checked={connectionForm.consoleSession}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, consoleSession: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="console" className="text-xs text-gray-400">
                  Console Session (Admin)
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={testConnection}
                  disabled={loading || !connectionForm.host}
                  className="flex-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded text-xs flex items-center justify-center gap-1"
                >
                  <TestTube className="w-3 h-3" />
                  Test
                </button>
                <button
                  onClick={saveProfile}
                  disabled={loading || !connectionForm.host}
                  className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-xs flex items-center justify-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={createSession}
                  disabled={loading || !connectionForm.host}
                  className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-xs flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  Connect
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Sessions ({sessions.length})</h3>
                <button
                  onClick={loadSessions}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {sessions.length === 0 ? (
                <p className="text-gray-400 text-xs">No active sessions</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSession(session.id)}
                      className={`p-2 rounded border cursor-pointer transition ${
                        selectedSession === session.id
                          ? 'border-blue-500 bg-blue-900'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <p className="text-xs font-semibold truncate">{session.host}:{session.port}</p>
                      <p className="text-xs text-gray-400">{session.resolution}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          session.status === 'connected' ? 'bg-green-500' :
                          session.status === 'connecting' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                        <span className="text-xs text-gray-400">{session.status}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          stopSession(session.id);
                        }}
                        className="mt-2 w-full px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-xs flex items-center justify-center gap-1"
                      >
                        <Square className="w-3 h-3" />
                        Disconnect
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {Object.keys(profiles).length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowSavedProfiles(!showSavedProfiles)}
                    className="w-full text-left font-semibold text-xs mb-2 flex items-center justify-between"
                  >
                    Saved Profiles
                    <span className="text-gray-400">{showSavedProfiles ? '▲' : '▼'}</span>
                  </button>
                  {showSavedProfiles && (
                    <div className="space-y-1">
                      {Object.entries(profiles).map(([key, profile]) => (
                        <button
                          key={key}
                          onClick={() => loadProfile(key)}
                          className="w-full text-left px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                        >
                          {profile.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-900 border border-red-700 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {copyFeedback && (
            <div className="bg-green-900 border border-green-700 p-3 rounded mb-4 text-sm">
              {copyFeedback}
            </div>
          )}

          {!currentSession ? (
            <div className="text-center text-gray-400 py-8">
              <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Create a new RDP connection or select an active session</p>
              <p className="text-xs mt-2">Connect to Windows, Linux with XRDP, or other RDP-enabled systems</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded border border-gray-700">
                <h3 className="font-semibold mb-3 text-sm">Session Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-400">Session ID</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-gray-900 px-2 py-1 rounded text-xs flex-1 break-all">
                        {currentSession.id}
                      </code>
                      <button
                        onClick={() => copyToClipboard(currentSession.id, 'Session ID')}
                        className="p-1 hover:bg-gray-700 rounded"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-400">Remote Host</p>
                    <p className="font-mono">{currentSession.host}:{currentSession.port}</p>
                  </div>

                  {currentSession.username && (
                    <div>
                      <p className="text-gray-400">Username</p>
                      <p>{currentSession.username}</p>
                    </div>
                  )}

                  {currentSession.domain && (
                    <div>
                      <p className="text-gray-400">Domain</p>
                      <p>{currentSession.domain}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-gray-400">Resolution</p>
                    <p>{currentSession.resolution}</p>
                  </div>

                  {currentSession.bpp && (
                    <div>
                      <p className="text-gray-400">Color Depth</p>
                      <p>{currentSession.bpp} bit</p>
                    </div>
                  )}

                  <div>
                    <p className="text-gray-400">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        currentSession.status === 'connected' ? 'bg-green-500' :
                        currentSession.status === 'connecting' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                      <span className="capitalize">{currentSession.status}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-400">WebSocket Port</p>
                    <p className="font-mono">{currentSession.websocketUrl.split(':').pop()}</p>
                  </div>

                  <div>
                    <p className="text-gray-400">Created</p>
                    <p className="text-xs">
                      {new Date(currentSession.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {currentSession.status === 'connected' && (
                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                  <h3 className="font-semibold mb-3 text-sm">RDP Viewer</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">WebSocket URL</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-900 px-2 py-1 rounded text-xs flex-1 break-all">
                          {currentSession.websocketUrl}
                        </code>
                        <button
                          onClick={() => copyToClipboard(currentSession.websocketUrl, 'WebSocket URL')}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-900 p-3 rounded">
                      <p className="text-xs text-gray-400 mb-2">Connection Instructions:</p>
                      <ul className="text-xs space-y-1">
                        <li>• Use the WebSocket URL above for web-based RDP clients</li>
                        <li>• For standalone clients, connect to localhost:{currentSession.websocketUrl.split(':').pop()}</li>
                        <li>• RDP over WebSocket provides better performance over networks</li>
                        <li>• Session will remain active for 30 minutes of inactivity</li>
                      </ul>
                    </div>

                    <div className="bg-yellow-900 border border-yellow-700 p-3 rounded">
                      <p className="text-xs">
                        <strong>Note:</strong> This implementation uses a WebSocket proxy for RDP connections.
                        For production use, consider installing wfreerdp or implementing a full RDP WebSocket gateway.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};