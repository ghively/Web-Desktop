import React, { useState, useEffect } from 'react';
import { Share2, Trash2, RefreshCw, HardDrive, Users } from 'lucide-react';
import { API_CONFIG } from '../config/api';

interface ShareManagerProps {
  windowId: string;
}

interface NFSShare {
  id: string;
  path: string;
  clients: string;
  options: string;
}

interface SMBShare {
  id: string;
  name: string;
  path: string;
  comment?: string;
  browseable?: string;
  writable?: string;
}

interface SMBUser {
  username: string;
  uid: string;
}

export const ShareManager: React.FC<ShareManagerProps> = ({ windowId }) => {
  const [activeTab, setActiveTab] = useState<'nfs' | 'smb' | 'smbusers'>('nfs');
  const [nfsShares, setNfsShares] = useState<NFSShare[]>([]);
  const [smbShares, setSmbShares] = useState<SMBShare[]>([]);
  const [smbUsers, setSmbUsers] = useState<SMBUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = API_CONFIG.getEndpointUrl('shares');

  const loadNfsShares = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/nfs`);
      if (!response.ok) throw new Error('Failed to load NFS shares');
      const data = await response.json();
      setNfsShares(data.shares || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadSmbShares = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/smb`);
      if (!response.ok) throw new Error('Failed to load SMB shares');
      const data = await response.json();
      setSmbShares(data.shares || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadSmbUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/smb/users`);
      if (!response.ok) throw new Error('Failed to load SMB users');
      const data = await response.json();
      setSmbUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const deleteNfsShare = async (id: string) => {
    if (!confirm('Delete this NFS share?')) return;
    try {
      const response = await fetch(`${API_BASE}/nfs/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete NFS share');
      loadNfsShares();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const deleteSmbShare = async (id: string) => {
    if (!confirm('Delete this SMB share?')) return;
    try {
      const response = await fetch(`${API_BASE}/smb/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete SMB share');
      loadSmbShares();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    if (activeTab === 'nfs') loadNfsShares();
    else if (activeTab === 'smb') loadSmbShares();
    else if (activeTab === 'smbusers') loadSmbUsers();
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Share Manager
        </h2>

        <div className="flex gap-2 flex-wrap">
          {['nfs', 'smb', 'smbusers'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab === 'nfs' && 'NFS Shares'}
              {tab === 'smb' && 'SMB Shares'}
              {tab === 'smbusers' && 'SMB Users'}
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
        ) : activeTab === 'nfs' ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">NFS Shares ({nfsShares.length})</h3>
              <button
                onClick={loadNfsShares}
                className="p-2 hover:bg-gray-700 rounded"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {nfsShares.length === 0 ? (
              <p className="text-gray-400 text-sm">No NFS shares configured</p>
            ) : (
              <div className="space-y-3">
                {nfsShares.map(share => (
                  <div key={share.id} className="bg-gray-800 p-3 rounded border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-blue-400" />
                          {share.path}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">Clients: {share.clients}</p>
                        <p className="text-gray-400 text-xs">Options: {share.options}</p>
                      </div>
                      <button
                        onClick={() => deleteNfsShare(share.id)}
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
        ) : activeTab === 'smb' ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">SMB Shares ({smbShares.length})</h3>
              <button
                onClick={loadSmbShares}
                className="p-2 hover:bg-gray-700 rounded"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {smbShares.length === 0 ? (
              <p className="text-gray-400 text-sm">No SMB shares configured</p>
            ) : (
              <div className="space-y-3">
                {smbShares.map(share => (
                  <div key={share.id} className="bg-gray-800 p-3 rounded border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{share.name}</p>
                        <p className="text-gray-400 text-xs mt-1">Path: {share.path}</p>
                        {share.comment && (
                          <p className="text-gray-400 text-xs">Description: {share.comment}</p>
                        )}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {share.browseable === 'yes' && (
                            <span className="text-xs bg-green-900 px-2 py-0.5 rounded">Browseable</span>
                          )}
                          {share.writable === 'yes' && (
                            <span className="text-xs bg-yellow-900 px-2 py-0.5 rounded">Writable</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteSmbShare(share.id)}
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
              <h3 className="font-semibold">SMB Users ({smbUsers.length})</h3>
              <button
                onClick={loadSmbUsers}
                className="p-2 hover:bg-gray-700 rounded"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {smbUsers.length === 0 ? (
              <p className="text-gray-400 text-sm">No SMB users found</p>
            ) : (
              <div className="space-y-3">
                {smbUsers.map(user => (
                  <div key={user.username} className="bg-gray-800 p-3 rounded border border-gray-700">
                    <p className="font-semibold text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-400" />
                      {user.username}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">UID: {user.uid}</p>
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