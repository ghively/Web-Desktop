import { useState, useEffect, useRef } from 'react';
import { Play, Square, Trash2, RefreshCw, Monitor, Copy, Eye, EyeOff } from 'lucide-react';
import { API_CONFIG } from '../config/api';

interface VNCClientProps {
  windowId: string;
}

interface VNCSession {
  id: string;
  display: number;
  websockifyPort: number;
  resolution: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  websocketUrl: string;
  createdAt: number;
  lastAccess: number;
}

export const VNCClient: React.FC<VNCClientProps> = ({ windowId }) => {
  const [sessions, setSessions] = useState<VNCSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [newSessionResolution, setNewSessionResolution] = useState('1280x720');
  const [showPassword, setShowPassword] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const API_BASE = API_CONFIG.getEndpointUrl('vnc');

  const loadSessions = async () => {
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
  };

  const createSession = async () => {
    const [width, height] = newSessionResolution.split('x').map(Number);

    if (!width || !height || width < 640 || height < 480) {
      setError('Invalid resolution. Minimum is 640x480');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ width, height })
      });

      if (!response.ok) throw new Error('Failed to create session');
      const data = await response.json();

      if (data.session) {
        setSelectedSession(data.session.id);
        loadSessions();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async (id: string) => {
    if (!confirm('Stop this VNC session?')) return;

    try {
      const response = await fetch(`${API_BASE}/session/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to stop session');

      if (selectedSession === id) setSelectedSession(null);
      loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(`${type} copied!`);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentSession = sessions.find(s => s.id === selectedSession);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          VNC Client
        </h2>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-64 border-r border-gray-700 overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold text-sm mb-3">Create New Session</h3>
            <div className="space-y-2">
              <input
                type="text"
                value={newSessionResolution}
                onChange={(e) => setNewSessionResolution(e.target.value)}
                placeholder="1280x720"
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
              />
              <button
                onClick={createSession}
                disabled={loading}
                className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Session
              </button>
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
                <p className="text-gray-400 text-xs">No sessions</p>
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
                      <p className="text-xs font-semibold truncate">Display :{session.display}</p>
                      <p className="text-xs text-gray-400">{session.resolution}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          session.status === 'running' ? 'bg-green-500' :
                          session.status === 'starting' ? 'bg-yellow-500' :
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
                        Stop
                      </button>
                    </div>
                  ))}
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
              <p className="text-sm">Create or select a session to view details</p>
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
                    <p className="text-gray-400">Display</p>
                    <p className="font-mono">:{currentSession.display}</p>
                  </div>

                  <div>
                    <p className="text-gray-400">Resolution</p>
                    <p>{currentSession.resolution}</p>
                  </div>

                  <div>
                    <p className="text-gray-400">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        currentSession.status === 'running' ? 'bg-green-500' :
                        currentSession.status === 'starting' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                      <span className="capitalize">{currentSession.status}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-400">Websockify Port</p>
                    <p className="font-mono">{currentSession.websockifyPort}</p>
                  </div>

                  <div>
                    <p className="text-gray-400">Created</p>
                    <p className="text-xs">
                      {new Date(currentSession.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {currentSession.status === 'running' && (
                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                  <h3 className="font-semibold mb-3 text-sm">Connection Info</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">WebSocket URL</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-900 px-2 py-1 rounded text-xs flex-1 break-all">
                          {currentSession.websocketUrl}
                        </code>
                        <button
                          onClick={() => copyToClipboard(currentSession.websocketUrl, 'URL')}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 bg-gray-900 p-2 rounded">
                      You can use a VNC viewer to connect to this session via localhost:
                      {currentSession.websockifyPort}. For web access, use noVNC at the WebSocket URL above.
                    </p>
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