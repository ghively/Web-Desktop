import { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, RefreshCw, Lock, ArrowRight, Radio } from 'lucide-react';

interface NginxProxyManagerProps {
  windowId: string;
}

interface ProxyHost {
  id: number;
  domain_names: string[];
  forward_host: string;
  forward_port: number;
  enabled: boolean;
  ssl_forced: boolean;
}

interface Certificate {
  id: number;
  domain_names: string[];
  provider: string;
  meta?: any;
}

interface Redirect {
  id: number;
  domain_names: string[];
  forward_domain_name: string;
}

interface Stream {
  id: number;
  incoming_port: number;
  forwarding_host: string;
  forwarding_port: number;
}

export const NginxProxyManager: React.FC<NginxProxyManagerProps> = ({ windowId }) => {
  const [activeTab, setActiveTab] = useState<'hosts' | 'certificates' | 'redirects' | 'streams'>('hosts');
  const [hosts, setHosts] = useState<ProxyHost[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = `http://${window.location.hostname}:3001/api/nginx-proxy`;

  const loadHosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/hosts`);
      if (!response.ok) throw new Error('Failed to load proxy hosts');
      const data = await response.json();
      setHosts(data.hosts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadCertificates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/certificates`);
      if (!response.ok) throw new Error('Failed to load certificates');
      const data = await response.json();
      setCertificates(data.certificates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadRedirects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/redirects`);
      if (!response.ok) throw new Error('Failed to load redirects');
      const data = await response.json();
      setRedirects(data.redirects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadStreams = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/streams`);
      if (!response.ok) throw new Error('Failed to load streams');
      const data = await response.json();
      setStreams(data.streams || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const deleteHost = async (id: number) => {
    if (!confirm('Delete this proxy host?')) return;
    try {
      const response = await fetch(`${API_BASE}/hosts/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete host');
      loadHosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const deleteCertificate = async (id: number) => {
    if (!confirm('Delete this certificate?')) return;
    try {
      const response = await fetch(`${API_BASE}/certificates/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete certificate');
      loadCertificates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const deleteRedirect = async (id: number) => {
    if (!confirm('Delete this redirect?')) return;
    try {
      const response = await fetch(`${API_BASE}/redirects/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete redirect');
      loadRedirects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const deleteStream = async (id: number) => {
    if (!confirm('Delete this stream?')) return;
    try {
      const response = await fetch(`${API_BASE}/streams/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete stream');
      loadStreams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    if (activeTab === 'hosts') loadHosts();
    else if (activeTab === 'certificates') loadCertificates();
    else if (activeTab === 'redirects') loadRedirects();
    else if (activeTab === 'streams') loadStreams();
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Nginx Proxy Manager
        </h2>

        <div className="flex gap-2 flex-wrap">
          {['hosts', 'certificates', 'redirects', 'streams'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="bg-red-900 border border-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : activeTab === 'hosts' ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Proxy Hosts ({hosts.length})</h3>
              <button
                onClick={loadHosts}
                className="p-2 hover:bg-gray-700 rounded"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {hosts.length === 0 ? (
              <p className="text-gray-400 text-sm">No proxy hosts configured</p>
            ) : (
              <div className="space-y-3">
                {hosts.map(host => (
                  <div key={host.id} className="bg-gray-800 p-3 rounded border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{host.domain_names.join(', ')}</p>
                        <p className="text-gray-400 text-xs">
                          → {host.forward_host}:{host.forward_port}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {host.enabled && <span className="text-xs bg-green-900 px-2 py-0.5 rounded">Active</span>}
                          {host.ssl_forced && <span className="text-xs bg-blue-900 px-2 py-0.5 rounded flex items-center gap-1"><Lock className="w-3 h-3" /> SSL Forced</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteHost(host.id)}
                        className="p-1 hover:bg-red-900 rounded text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'certificates' ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">SSL Certificates ({certificates.length})</h3>
              <button
                onClick={loadCertificates}
                className="p-2 hover:bg-gray-700 rounded"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {certificates.length === 0 ? (
              <p className="text-gray-400 text-sm">No certificates found</p>
            ) : (
              <div className="space-y-3">
                {certificates.map(cert => (
                  <div key={cert.id} className="bg-gray-800 p-3 rounded border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          <Lock className="w-4 h-4 text-yellow-500" />
                          {cert.domain_names.join(', ')}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">Provider: {cert.provider}</p>
                      </div>
                      <button
                        onClick={() => deleteCertificate(cert.id)}
                        className="p-1 hover:bg-red-900 rounded text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'redirects' ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Redirections ({redirects.length})</h3>
              <button
                onClick={loadRedirects}
                className="p-2 hover:bg-gray-700 rounded"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {redirects.length === 0 ? (
              <p className="text-gray-400 text-sm">No redirects configured</p>
            ) : (
              <div className="space-y-3">
                {redirects.map(redirect => (
                  <div key={redirect.id} className="bg-gray-800 p-3 rounded border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          {redirect.domain_names.join(', ')}
                          <ArrowRight className="w-4 h-4 text-gray-500" />
                          {redirect.forward_domain_name}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteRedirect(redirect.id)}
                        className="p-1 hover:bg-red-900 rounded text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Streams ({streams.length})</h3>
              <button
                onClick={loadStreams}
                className="p-2 hover:bg-gray-700 rounded"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {streams.length === 0 ? (
              <p className="text-gray-400 text-sm">No streams configured</p>
            ) : (
              <div className="space-y-3">
                {streams.map(stream => (
                  <div key={stream.id} className="bg-gray-800 p-3 rounded border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          <Radio className="w-4 h-4 text-blue-500" />
                          Port {stream.incoming_port}
                        </p>
                        <p className="text-gray-400 text-xs">
                          → {stream.forwarding_host}:{stream.forwarding_port}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteStream(stream.id)}
                        className="p-1 hover:bg-red-900 rounded text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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