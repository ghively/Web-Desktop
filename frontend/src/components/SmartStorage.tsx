import React, { useState, useEffect } from 'react';
import { HardDrive, Search, Filter, Trash2, Download, Upload, AlertTriangle, CheckCircle, Clock, Database, FileText, Music, Film, Tv, ImageIcon, Settings, RefreshCw, FolderOpen, Shield, Zap, TrendingUp } from 'lucide-react';

interface StorageStats {
  totalSpace: number;
  usedSpace: number;
  freeSpace: number;
  duplicateFiles: number;
  duplicateSpace: number;
  totalFiles: number;
  mediaFiles: {
    music: number;
    movies: number;
    tvShows: number;
    photos: number;
  };
}

interface Duplicate {
  id: string;
  hash: string;
  files: Array<{
    path: string;
    size: number;
    modified: Date;
    mediaInfo?: {
      type: 'movie' | 'tv' | 'music' | 'photo';
      title?: string;
      artist?: string;
      album?: string;
      season?: number;
      episode?: number;
      year?: number;
      resolution?: string;
      quality?: string;
    };
  }>;
  spaceSavings: number;
  confidence: number;
  recommendation: 'keep-all' | 'keep-highest-quality' | 'keep-most-recent' | 'manual-review';
}

interface StoragePool {
  id: string;
  name: string;
  path: string;
  totalSpace: number;
  usedSpace: number;
  enabled: boolean;
  cleanupPolicy: 'none' | 'temp-files' | 'duplicates' | 'aggressive';
}

const SmartStorage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [storagePools, setStoragePools] = useState<StoragePool[]>([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('size');

  useEffect(() => {
    loadStorageStats();
    loadStoragePools();
    loadDuplicates();
  }, []);

  const loadStorageStats = async () => {
    try {
      const response = await fetch('/api/smart-storage/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const loadStoragePools = async () => {
    try {
      const response = await fetch('/api/smart-storage/pools');
      const data = await response.json();
      setStoragePools(data);
    } catch (error) {
      console.error('Failed to load storage pools:', error);
    }
  };

  const loadDuplicates = async () => {
    try {
      const response = await fetch('/api/smart-storage/duplicates');
      const data = await response.json();
      setDuplicates(data);
    } catch (error) {
      console.error('Failed to load duplicates:', error);
    }
  };

  const startScan = async () => {
    setIsScanning(true);
    setScanProgress(0);

    try {
      const response = await fetch('/api/smart-storage/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: process.env.HOME }),
      });

      const result = await response.json();

      // Update progress
      for (let i = 0; i <= 100; i += 10) {
        setScanProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      loadStorageStats();
      loadDuplicates();
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const resolveDuplicate = async (duplicateId: string, filesToDelete: string[]) => {
    try {
      const response = await fetch('/api/smart-storage/resolve-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ duplicateId, filesToDelete }),
      });

      if (response.ok) {
        loadStorageStats();
        loadDuplicates();
        setSelectedDuplicates(selectedDuplicates.filter(id => id !== duplicateId));
      }
    } catch (error) {
      console.error('Failed to resolve duplicate:', error);
    }
  };

  const getMediaIcon = (mediaType?: string) => {
    switch (mediaType) {
      case 'music': return <Music className="w-4 h-4" />;
      case 'movie': return <Film className="w-4 h-4" />;
      case 'tv': return <Tv className="w-4 h-4" />;
      case 'photo': return <ImageIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const filteredDuplicates = duplicates.filter(duplicate => {
    const matchesSearch = searchQuery === '' ||
      duplicate.files.some(file =>
        file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.mediaInfo?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.mediaInfo?.artist?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesFilter = filter === 'all' ||
      duplicate.files.some(file => {
        if (filter === 'media') return file.mediaInfo;
        if (filter === 'documents') return !file.mediaInfo;
        return file.mediaInfo?.type === filter;
      });

    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'size': return b.spaceSavings - a.spaceSavings;
      case 'count': return b.files.length - a.files.length;
      case 'confidence': return b.confidence - a.confidence;
      default: return 0;
    }
  });

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          Smart Storage
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          AI-powered storage deduplication and management system
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Storage</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatFileSize(stats.totalSpace)}
                </p>
              </div>
              <HardDrive className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Used Space</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatFileSize(stats.usedSpace)}
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(stats.usedSpace / stats.totalSpace) * 100}%` }}
                  />
                </div>
              </div>
              <Database className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Duplicate Files</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.duplicateFiles}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {formatFileSize(stats.duplicateSpace)} wasted
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Media Files</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.mediaFiles.music + stats.mediaFiles.movies + stats.mediaFiles.tvShows + stats.mediaFiles.photos}
                </p>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <Music className="w-3 h-3" /> {stats.mediaFiles.music}
                  </span>
                  <span className="flex items-center gap-1">
                    <Film className="w-3 h-3" /> {stats.mediaFiles.movies}
                  </span>
                  <span className="flex items-center gap-1">
                    <Tv className="w-3 h-3" /> {stats.mediaFiles.tvShows}
                  </span>
                </div>
              </div>
              <Zap className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={startScan}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Scanning... {scanProgress}%
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Scan for Duplicates
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'overview' ? 'duplicates' : 'overview')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <Shield className="w-4 h-4" />
              {activeTab === 'overview' ? 'View Duplicates' : 'Back to Overview'}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search duplicates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Files</option>
              <option value="media">Media Files</option>
              <option value="music">Music</option>
              <option value="movie">Movies</option>
              <option value="tv">TV Shows</option>
              <option value="photo">Photos</option>
              <option value="documents">Documents</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="size">Sort by Size</option>
              <option value="count">Sort by Count</option>
              <option value="confidence">Sort by Confidence</option>
            </select>
          </div>
        </div>
      </div>

      {/* Duplicate Files List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Duplicate Files ({filteredDuplicates.length})
          </h2>
        </div>

        {filteredDuplicates.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No duplicate files found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredDuplicates.map((duplicate) => (
              <div key={duplicate.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {duplicate.files.length} duplicates
                      </h3>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                        Save {formatFileSize(duplicate.spaceSavings)}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                        {Math.round(duplicate.confidence * 100)}% match
                      </span>
                    </div>

                    <div className="space-y-2">
                      {duplicate.files.map((file, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            index === 0
                              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {getMediaIcon(file.mediaInfo?.type)}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {file.path.split('/').pop()}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {file.path}
                              </div>
                              {file.mediaInfo && (
                                <div className="flex items-center gap-2 mt-1">
                                  {file.mediaInfo.title && (
                                    <span className="text-xs text-blue-600 dark:text-blue-400">
                                      {file.mediaInfo.title}
                                    </span>
                                  )}
                                  {file.mediaInfo.artist && (
                                    <span className="text-xs text-purple-600 dark:text-purple-400">
                                      {file.mediaInfo.artist}
                                    </span>
                                  )}
                                  {file.mediaInfo.year && (
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      ({file.mediaInfo.year})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatFileSize(file.size)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {formatDate(file.modified)}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded">
                                Keep
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Recommendation:
                        </span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                          {duplicate.replacementItem?.replace(/-/g, ' ')}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => resolveDuplicate(duplicate.id, duplicate.files.slice(1).map(f => f.path))}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Apply Recommendation
                        </button>
                        <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                          Manual Review
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartStorage;