import React, { useState, useEffect, useCallback } from 'react';
import { Play, Film, Tv, Download, Settings, Wifi, WifiOff, CheckCircle, Clock, RefreshCw, PlayCircle, Pause, Zap, Monitor, Activity, Plus, X } from 'lucide-react';

interface MediaServerConfig {
  jellyfin: {
    url: string;
    apiKey: string;
    enabled: boolean;
  };
  emby: {
    url: string;
    apiKey: string;
    enabled: boolean;
  };
  sonarr: {
    url: string;
    apiKey: string;
    enabled: boolean;
  };
  radarr: {
    url: string;
    apiKey: string;
    enabled: boolean;
  };
  sabnzbd: {
    url: string;
    apiKey: string;
    enabled: boolean;
  };
  transcoding: {
    enabled: boolean;
    hardwareAcceleration: boolean;
    defaultQuality: string;
    outputPath: string;
    ffmpegPath: string;
    handbrakePath: string;
    defaultEngine: 'ffmpeg' | 'handbrake';
  };
  libraries: MediaLibrary[];
}

interface MediaLibrary {
  id: string;
  name: string;
  type: 'movies' | 'tvshows' | 'music' | 'photos' | 'books';
  path: string;
  server: 'jellyfin' | 'emby';
  libraryId?: string;
  scanInterval: number;
  autoScan: boolean;
}

interface MediaItem {
  id: string;
  name: string;
  type: 'movie' | 'episode' | 'album' | 'track';
  server: 'jellyfin' | 'emby';
  libraryId: string;
  parentId?: string;
  path: string;
  size: number;
  duration?: number;
  quality: {
    width: number;
    height: number;
    bitrate?: number;
    codec?: string;
    container?: string;
  };
  metadata: {
    year?: number;
    genre?: string[];
    rating?: number;
    director?: string[];
    cast?: string[];
    overview?: string;
    poster?: string;
    backdrop?: string;
  };
  transcodingStatus?: 'none' | 'in_progress' | 'completed' | 'failed';
  transcodingJob?: TranscodingJob;
}

interface TranscodingJob {
  id: string;
  itemId: string;
  inputPath: string;
  outputPath: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  settings: TranscodingSettings;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

interface TranscodingSettings {
  videoCodec: string;
  audioCodec: string;
  quality: string;
  resolution: string;
  bitrate: number;
  hardwareAcceleration: boolean;
  customArgs?: string[];
  engine: 'ffmpeg' | 'handbrake';
  preset?: string;
  tune?: string;
  format?: string;
}

interface Series {
  id: number;
  title: string;
  year?: number;
  path: string;
  qualityProfileId: number;
  monitored: boolean;
  seasonFolder: boolean;
  addDate: string;
  statistics?: {
    seasonCount: number;
    episodeFileCount: number;
    episodeMissingCount: number;
    totalEpisodeCount: number;
  };
  images?: {
    poster: string[];
    banner: string[];
  };
}

interface Movie {
  id: number;
  title: string;
  year?: number;
  path: string;
  qualityProfileId: number;
  monitored: boolean;
  minimumAvailability: string;
  hasFile: boolean;
  isAvailable: boolean;
  addDate: string;
  statistics?: {
    movieFileCount: number;
    sizeOnDisk: number;
  };
  images?: {
    poster: string[];
  };
}

interface QueueItem {
  id: number;
  filename: string;
  status: string;
  progress: number;
  size: number;
  sizeleft: number;
  timeleft: number;
  eta: number;
  category: string;
  priority: number;
  script: string;
  download_speed: number;
  avg_speed: number;
  mtime: number;
}

export default function MediaServer() {
  const [activeTab, setActiveTab] = useState<'overview' | 'libraries' | 'transcoding' | 'sonarr' | 'radarr' | 'sabnzbd' | 'settings'>('overview');
  const [config, setConfig] = useState<MediaServerConfig | null>(null);
  const [libraries, setLibraries] = useState<unknown[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<unknown>(null);
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  const [transcodingQueue, setTranscodingQueue] = useState<TranscodingJob[]>([]);
  const [activeTranscoding, setActiveTranscoding] = useState<TranscodingJob[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [sabnzbdQueue, setSabnzbdQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedServer] = useState<'jellyfin' | 'emby' | 'sonarr' | 'radarr' | 'sabnzbd'>('jellyfin');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [configForm, setConfigForm] = useState({
    jellyfin: { url: '', apiKey: '', enabled: false },
    emby: { url: '', apiKey: '', enabled: false },
    sonarr: { url: '', apiKey: '', enabled: false },
    radarr: { url: '', apiKey: '', enabled: false },
    sabnzbd: { url: '', apiKey: '', enabled: false }
  });
  const [showTranscodingDialog, setShowTranscodingDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [transcodingSettings, setTranscodingSettings] = useState<TranscodingSettings>({
    videoCodec: 'h264',
    audioCodec: 'aac',
    quality: '1080p',
    resolution: '1920x1080',
    bitrate: 2000,
    hardwareAcceleration: false,
    engine: 'ffmpeg',
    preset: '',
    tune: '',
    format: 'mp4'
  });
  const [handbrakePresets, setHandbrakePresets] = useState<Array<{ name: string; description: string }>>([]);
  const [handbrakeAvailable, setHandbrakeAvailable] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config) {
      if (activeTab === 'libraries') fetchLibraries();
      if (activeTab === 'transcoding') fetchTranscodingStatus();
      if (activeTab === 'sonarr' && config.sonarr.enabled) fetchSeries();
      if (activeTab === 'radarr' && config.radarr.enabled) fetchMovies();
      if (activeTab === 'sabnzbd' && config.sabnzbd.enabled) fetchSabnzbdQueue();
    }
  }, [activeTab, config]);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/media-server/config');
      const data = await response.json();
      setConfig(data);
      setConfigForm({
        jellyfin: data.jellyfin || { url: '', apiKey: '', enabled: false },
        emby: data.emby || { url: '', apiKey: '', enabled: false },
        sonarr: data.sonarr || { url: '', apiKey: '', enabled: false },
        radarr: data.radarr || { url: '', apiKey: '', enabled: false },
        sabnzbd: data.sabnzbd || { url: '', apiKey: '', enabled: false }
      });

      // Test HandBrake availability
      try {
        const handbrakeTest = await fetch('/api/media-server/handbrake/test');
        const handbrakeData = await handbrakeTest.json();
        setHandbrakeAvailable(handbrakeData.success);
      } catch {
        setHandbrakeAvailable(false);
      }

      // Fetch HandBrake presets if available
      if (handbrakeAvailable) {
        try {
          const presetsResponse = await fetch('/api/media-server/handbrake/presets');
          const presetsData = await presetsResponse.json();
          setHandbrakePresets(presetsData);
        } catch (error) {
          console.error('Failed to fetch HandBrake presets:', error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch media server config:', error);
    }
  }, [handbrakeAvailable]);

  const fetchLibraries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/media-server/libraries');
      const data = await response.json();
      setLibraries(data);
    } catch (error) {
      console.error('Failed to fetch libraries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLibraryItems = async (library: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/media-server/libraries/${library.libraryId}/items?server=${library.server}`);
      const data = await response.json();
      setLibraryItems(data);
      setSelectedLibrary(library);
    } catch (error) {
      console.error('Failed to fetch library items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTranscodingStatus = async () => {
    try {
      const response = await fetch('/api/media-server/transcoding/queue');
      const data = await response.json();
      setTranscodingQueue(data.queue);
      setActiveTranscoding(data.active);
    } catch (error) {
      console.error('Failed to fetch transcoding status:', error);
    }
  };

  const fetchSeries = async () => {
    try {
      const response = await fetch('/api/media-server/sonarr/series');
      const data = await response.json();
      setSeries(data);
    } catch (error) {
      console.error('Failed to fetch Sonarr series:', error);
    }
  };

  const fetchMovies = async () => {
    try {
      const response = await fetch('/api/media-server/radarr/movies');
      const data = await response.json();
      setMovies(data);
    } catch (error) {
      console.error('Failed to fetch Radarr movies:', error);
    }
  };

  const fetchSabnzbdQueue = async () => {
    try {
      const response = await fetch('/api/media-server/sabnzbd/queue');
      const data = await response.json();
      setSabnzbdQueue(data);
    } catch (error) {
      console.error('Failed to fetch Sabnzbd queue:', error);
    }
  };

  const testConnection = async () => {
    setTestResult(null);
    const serverConfig = configForm[selectedServer];
    if (!serverConfig.url || !serverConfig.apiKey) {
      setTestResult({ success: false, message: 'URL and API Key are required' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/media-server/test/${selectedServer}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverConfig)
      });
      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.success ? `Connected successfully! Version: ${data.version}` : data.error
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/media-server/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      await fetchConfig();
      setShowConfigDialog(false);
      setTestResult(null);
    } catch (error) {
      setTestResult({
        success: false,
        message: `Failed to save configuration: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startTranscoding = async (item: MediaItem, settings?: TranscodingSettings) => {
    try {
      const response = await fetch(`/api/media-server/transcode/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings || transcodingSettings)
      });
      const data = await response.json();

      if (data.jobId) {
        await fetchTranscodingStatus();
      }
    } catch (error) {
      alert(`Failed to start transcoding: ${error.message}`);
    }
  };

  const refreshSonarrSeries = async (seriesId: number) => {
    try {
      await fetch(`/api/media-server/sonarr/refresh/${seriesId}`, {
        method: 'POST'
      });
      await fetchSeries();
    } catch (error) {
      alert(`Failed to refresh series: ${error.message}`);
    }
  };

  const refreshRadarrMovie = async (movieId: number) => {
    try {
      await fetch(`/api/media-server/radarr/refresh/${movieId}`, {
        method: 'POST'
      });
      await fetchMovies();
    } catch (error) {
      alert(`Failed to refresh movie: ${error.message}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getServerIcon = (server: string, enabled: boolean) => {
    const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
      jellyfin: Play,
      emby: Tv,
      sonarr: Download,
      radarr: Film,
      sabnzbd: Wifi
    };

    const Icon = iconMap[server] || Settings;
    return enabled ? Icon : WifiOff;
  };

  const getServerStatus = (serverConfig: Record<string, unknown>) => {
    if (!serverConfig.url || !serverConfig.apiKey) return 'Not configured';
    if (serverConfig.enabled) return 'Connected';
    return 'Disabled';
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-3">
          <Film className="w-6 h-6" />
          Media Server Management
        </h1>

        {/* Server Status */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          {['jellyfin', 'emby', 'sonarr', 'radarr', 'sabnzbd'].map((server: string) => {
            const serverConfig = config?.[server] || { enabled: false };
            const Icon = getServerIcon(server, serverConfig.enabled);
            const status = getServerStatus(serverConfig);

            return (
              <div key={server} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`w-5 h-5 ${serverConfig.enabled ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="font-medium capitalize">{server}</span>
                </div>
                <div className={`text-xs ${
                  status === 'Connected' ? 'text-green-500' :
                  status === 'Disabled' ? 'text-gray-400' : 'text-red-500'
                }`}>
                  {status}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('libraries')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'libraries'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Libraries
          </button>
          <button
            onClick={() => setActiveTab('transcoding')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'transcoding'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            Transcoding
          </button>
          <button
            onClick={() => setActiveTab('sonarr')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'sonarr'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Download className="w-4 h-4" />
            Sonarr
          </button>
          <button
            onClick={() => setActiveTab('radarr')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'radarr'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Film className="w-4 h-4" />
            Radarr
          </button>
          <button
            onClick={() => setActiveTab('sabnzbd')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'sabnzbd'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Wifi className="w-4 h-4" />
            Sabnzbd
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {!config ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Film className="w-16 h-16 text-gray-600 mx-auto mb-4 animate-pulse" />
              <p>Loading media server configuration...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Film className="w-5 h-5" />
                      Media Server Status
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Jellyfin:</span>
                        <span className={config.jellyfin.enabled ? 'text-green-500' : 'text-red-500'}>
                          {config.jellyfin.enabled ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Emby:</span>
                        <span className={config.emby.enabled ? 'text-green-500' : 'text-red-500'}>
                          {config.emby.enabled ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Transcoding:</span>
                        <span className={config.transcoding.enabled ? 'text-green-500' : 'text-red-500'}>
                          {config.transcoding.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Download className="w-5 h-5" />
                      Media Management
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sonarr:</span>
                        <span className={config.sonarr.enabled ? 'text-green-500' : 'text-red-500'}>
                          {config.sonarr.enabled ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Radarr:</span>
                        <span className={config.radarr.enabled ? 'text-green-500' : 'text-red-500'}>
                          {config.radarr.enabled ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sabnzbd:</span>
                        <span className={config.sabnzbd.enabled ? 'text-green-500' : 'text-red-500'}>
                          {config.sabnzbd.enabled ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Monitor className="w-5 h-5" />
                      Libraries
                    </h3>
                    <div className="text-2xl font-bold text-blue-500">
                      {libraries.length}
                    </div>
                    <div className="text-sm text-gray-400">
      Total media libraries configured
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setShowConfigDialog(true)}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Configure Servers
                    </button>
                    <button
                      onClick={() => fetchLibraries()}
                      className="px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh Libraries
                    </button>
                  </div>
                </div>

                {/* Statistics */}
                {transcodingQueue.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Transcoding Activity
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Queued Jobs:</span>
                        <span className="text-yellow-500">{transcodingQueue.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Jobs:</span>
                        <span className="text-green-500">{activeTranscoding.length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {(series.length > 0 || movies.length > 0 || sabnzbdQueue.length > 0) && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Download Activity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-500">{series.length}</div>
                        <div className="text-sm text-gray-400">TV Series</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-500">{movies.length}</div>
                        <div className="text-sm text-gray-400">Movies</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-500">{sabnzbdQueue.length}</div>
                        <div className="text-sm text-gray-400">Downloads</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Libraries Tab */}
            {activeTab === 'libraries' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Media Libraries</h3>
                  <button
                    onClick={fetchLibraries}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                {(() => {
                  if (isLoading && !selectedLibrary) {
                    return (
                      <div className="text-center py-8">
                        <Activity className="w-8 h-8 text-gray-600 mx-auto animate-spin" />
                        <p>Loading libraries...</p>
                      </div>
                    );
                  }

                  if (selectedLibrary) {
                    if (isLoading) {
                      return (
                        <div className="text-center py-8">
                          <Activity className="w-8 h-8 text-gray-600 mx-auto animate-spin" />
                          <p>Loading items...</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        <div className="mb-4 p-4 bg-gray-800 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="font-semibold">{selectedLibrary.name}</span>
                            <span className="text-sm text-gray-400 ml-2">
                              ({selectedLibrary.server} • {selectedLibrary.type})
                            </span>
                          </div>
                          <button
                            onClick={() => setSelectedLibrary(null)}
                            className="p-2 text-gray-400 hover:text-white"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {libraryItems.map((item) => (
                            <div key={item.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                              <div className="flex items-start gap-3">
                                {item.metadata.poster ? (
                                  <img
                                    src={item.metadata.poster}
                                    alt={item.name}
                                    className="w-12 h-16 rounded object-cover"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-12 h-16 bg-gray-700 rounded flex items-center justify-center">
                                    <Film className="w-6 h-6 text-gray-500" />
                                  </div>
                                )}

                                <div className="flex-1">
                                  <h4 className="font-medium truncate">{item.name}</h4>
                                  <div className="text-sm text-gray-400">
                                    {item.type} • {formatFileSize(item.size)}
                                  </div>
                                  {item.duration && (
                                    <div className="text-sm text-gray-400">
                                      {formatDuration(item.duration)}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500 mt-1">
                                    {item.quality.width}x{item.quality.height}
                                    {item.quality.codec && ` • ${item.quality.codec}`}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mt-3">
                                {item.transcodingStatus === 'none' && (
                                  <button
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setShowTranscodingDialog(true);
                                    }}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors flex items-center gap-1"
                                  >
                                    <Zap className="w-3 h-3" />
                                    Transcode
                                  </button>
                                )}

                                {item.transcodingStatus === 'in_progress' && (
                                  <div className="flex items-center gap-2 text-yellow-500">
                                    <Clock className="w-4 h-4 animate-pulse" />
                                    <span className="text-sm">Processing...</span>
                                  </div>
                                )}

                                {item.transcodingStatus === 'completed' && (
                                  <div className="flex items-center gap-2 text-green-500">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-sm">Completed</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {libraries.map((library) => (
                        <button
                          key={library.id}
                          onClick={() => fetchLibraryItems(library)}
                          className="p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <Monitor className="w-8 h-8 text-blue-500" />
                            <div>
                              <h4 className="font-semibold">{library.name}</h4>
                              <div className="text-sm text-gray-400">
                                {library.server} • {library.type}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Path: {library.path}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Transcoding Tab */}
            {activeTab === 'transcoding' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Transcoding Queue</h3>
                  <button
                    onClick={fetchTranscodingStatus}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Active Jobs */}
                  {activeTranscoding.length > 0 && (
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h4 className="font-semibold mb-4 text-green-500">Active Jobs</h4>
                      <div className="space-y-3">
                        {activeTranscoding.map((job) => (
                          <div key={job.id} className="bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{job.itemId}</span>
                              <span className="text-yellow-500 flex items-center gap-1">
                                <Clock className="w-4 h-4 animate-pulse" />
                                {job.progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-yellow-500 h-2 rounded-full transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Queued Jobs */}
                  {transcodingQueue.length > 0 && (
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h4 className="font-semibold mb-4 text-blue-500">Queued Jobs</h4>
                      <div className="space-y-3">
                        {transcodingQueue.map((job) => (
                          <div key={job.id} className="bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{job.itemId}</span>
                              <span className="text-blue-500">Queued</span>
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              {job.settings.videoCodec} → {job.settings.resolution}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {transcodingQueue.length === 0 && activeTranscoding.length === 0 && (
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                      <Zap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Active Transcoding</h3>
                      <p className="text-gray-400">
                        Start transcoding media items to convert them to different formats.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sonarr Tab */}
            {activeTab === 'sonarr' && (
              <div className="space-y-6">
                {config.sonarr.enabled ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">TV Series</h3>
                      <button
                        onClick={fetchSeries}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {series.map((s) => (
                        <div key={s.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                          <div className="flex items-start gap-3">
                            {s.images?.poster && s.images.poster.length > 0 ? (
                              <img
                                src={s.images.poster[0]}
                                alt={s.title}
                                className="w-12 h-16 rounded object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).className = 'w-12 h-16 bg-gray-700 rounded flex items-center justify-center';
                                  (e.target as HTMLImageElement).innerHTML = '<Tv className="w-6 h-6 text-gray-500" />';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-16 bg-gray-700 rounded flex items-center justify-center">
                                <Tv className="w-6 h-6 text-gray-500" />
                              </div>
                            )}

                            <div className="flex-1">
                              <h4 className="font-medium truncate">{s.title}</h4>
                              {s.year && (
                                <div className="text-sm text-gray-400">{s.year}</div>
                              )}
                              <div className="text-sm text-gray-400">
                                {s.statistics?.seasonCount || 0} seasons •
                                {s.statistics?.episodeFileCount || 0} episodes
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {s.monitored ? 'Monitored' : 'Not monitored'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => refreshSonarrSeries(s.id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            {s.monitored ? (
                              <button
                                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm transition-colors"
                              >
                                <Pause className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                              >
                                <PlayCircle className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <Download className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Sonarr Not Configured</h3>
                    <p className="text-gray-400">
                      Configure Sonarr in settings to manage TV series.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Radarr Tab */}
            {activeTab === 'radarr' && (
              <div className="space-y-6">
                {config.radarr.enabled ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Movies</h3>
                      <button
                        onClick={fetchMovies}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {movies.map((m) => (
                        <div key={m.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                          <div className="flex items-start gap-3">
                            {m.images?.poster && m.images.poster.length > 0 ? (
                              <img
                                src={m.images.poster[0]}
                                alt={m.title}
                                className="w-12 h-16 rounded object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).className = 'w-12 h-16 bg-gray-700 rounded flex items-center justify-center';
                                  (e.target as HTMLImageElement).innerHTML = '<Film className="w-6 h-6 text-gray-500" />';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-16 bg-gray-700 rounded flex items-center justify-center">
                                <Film className="w-6 h-6 text-gray-500" />
                              </div>
                            )}

                            <div className="flex-1">
                              <h4 className="font-medium truncate">{m.title}</h4>
                              {m.year && (
                                <div className="text-sm text-gray-400">{m.year}</div>
                              )}
                              <div className="text-sm text-gray-400">
                                {m.statistics?.movieFileCount || 0} files
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {m.monitored ? 'Monitored' : 'Not monitored'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => refreshRadarrMovie(m.id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            {m.monitored ? (
                              <button
                                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm transition-colors"
                              >
                                <Pause className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Radarr Not Configured</h3>
                    <p className="text-gray-400">
                      Configure Radarr in settings to manage movies.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Sabnzbd Tab */}
            {activeTab === 'sabnzbd' && (
              <div className="space-y-6">
                {config.sabnzbd.enabled ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Download Queue</h3>
                      <button
                        onClick={fetchSabnzbdQueue}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </button>
                    </div>

                    <div className="space-y-4">
                      {sabnzbdQueue.map((item) => (
                        <div key={item.id} className="bg-gray-800 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium truncate flex-1">{item.filename}</span>
                            <span className={`text-sm px-2 py-1 rounded ${
                              item.status === 'downloading' ? 'text-blue-500' :
                              item.status === 'paused' ? 'text-yellow-500' :
                              item.status === 'completed' ? 'text-green-500' :
                              item.status === 'failed' ? 'text-red-500' :
                              'text-gray-400'
                            }`}>
                              {item.status}
                            </span>
                          </div>

                          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-sm text-gray-400">
                            <span>{formatFileSize(item.sizeleft)} left</span>
                            <span>{formatFileSize(item.size)}</span>
                            <span>{formatFileSize(item.download_speed)}/s</span>
                          </div>

                          {item.eta > 0 && (
                            <div className="text-xs text-gray-500">
                              ETA: {formatDuration(item.eta)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {sabnzbdQueue.length === 0 && (
                      <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <Wifi className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Downloads</h3>
                        <p className="text-gray-400">
                          The download queue is currently empty.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <Wifi className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Sabnzbd Not Configured</h3>
                    <p className="text-gray-400">
                      Configure Sabnzbd in settings to manage downloads.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Server Configuration</h3>
                  <button
                    onClick={() => setShowConfigDialog(true)}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configure All Servers
                  </button>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Transcoding Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Hardware Acceleration:</span>
                      <span className={config.transcoding.hardwareAcceleration ? 'text-green-500' : 'text-red-500'}>
                        {config.transcoding.hardwareAcceleration ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Default Quality:</span>
                      <span className="text-blue-500">{config.transcoding.defaultQuality}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Output Path:</span>
                      <span className="text-blue-500">{config.transcoding.outputPath}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Configuration Dialog */}
      {showConfigDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              Configure {selectedServer.charAt(0).toUpperCase() + selectedServer.slice(1)}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Server URL</label>
                <input
                  type="url"
                  value={configForm[selectedServer].url}
                  onChange={(e) => setConfigForm({
                    ...configForm,
                    [selectedServer]: {
                      ...configForm[selectedServer],
                      url: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder={`http://${selectedServer}.local:8096`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">API Key</label>
                <input
                  type="password"
                  value={configForm[selectedServer].apiKey}
                  onChange={(e) => setConfigForm({
                    ...configForm,
                    [selectedServer]: {
                      ...configForm[selectedServer],
                      apiKey: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Your API key"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={configForm[selectedServer].enabled}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      [selectedServer]: {
                        ...configForm[selectedServer],
                        enabled: e.target.checked
                      }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Enable {selectedServer}</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={testConnection}
                disabled={isLoading || !configForm[selectedServer].url || !configForm[selectedServer].apiKey}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 rounded-lg transition-colors"
              >
                Test Connection
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg mb-4 ${
                testResult.success ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
              }`}>
                {testResult.message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfigDialog(false);
                  setTestResult(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveConfig}
                disabled={isLoading || !configForm[selectedServer].url || !configForm[selectedServer].apiKey}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transcoding Dialog */}
      {showTranscodingDialog && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Transcode Media</h3>

            <div className="space-y-4">
              <div className="text-sm text-gray-400">
                <div className="font-medium">{selectedItem.name}</div>
                <div>Current: {selectedItem.quality.width}x{selectedItem.quality.height}</div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Transcoding Engine</label>
                <select
                  value={transcodingSettings.engine}
                  onChange={(e) => setTranscodingSettings({
                    ...transcodingSettings,
                    engine: e.target.value as 'ffmpeg' | 'handbrake'
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="ffmpeg">FFmpeg</option>
                  <option value="handbrake" disabled={!handbrakeAvailable}>
                    HandBrake {!handbrakeAvailable && '(not available)'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Video Codec</label>
                <select
                  value={transcodingSettings.videoCodec}
                  onChange={(e) => setTranscodingSettings({
                    ...transcodingSettings,
                    videoCodec: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="h264">H.264</option>
                  <option value="h265">H.265</option>
                  <option value="vp9">VP9</option>
                  <option value="av1">AV1</option>
                </select>
              </div>

              {transcodingSettings.engine === 'handbrake' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">HandBrake Preset</label>
                    <select
                      value={transcodingSettings.preset}
                      onChange={(e) => setTranscodingSettings({
                        ...transcodingSettings,
                        preset: e.target.value
                      })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select preset...</option>
                      {handbrakePresets.map((preset) => (
                        <option key={preset.name} value={preset.name}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Format</label>
                    <select
                      value={transcodingSettings.format}
                      onChange={(e) => setTranscodingSettings({
                        ...transcodingSettings,
                        format: e.target.value
                      })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      <option value="mp4">MP4</option>
                      <option value="mkv">MKV</option>
                      <option value="webm">WebM</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Audio Codec</label>
                <select
                  value={transcodingSettings.audioCodec}
                  onChange={(e) => setTranscodingSettings({
                    ...transcodingSettings,
                    audioCodec: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="aac">AAC</option>
                  <option value="mp3">MP3</option>
                  <option value="ac3">AC3</option>
                  <option value="opus">Opus</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Quality</label>
                <select
                  value={transcodingSettings.quality}
                  onChange={(e) => setTranscodingSettings({
                    ...transcodingSettings,
                    quality: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="480p">480p</option>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                  <option value="4k">4K</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Resolution</label>
                <select
                  value={transcodingSettings.resolution}
                  onChange={(e) => setTranscodingSettings({
                    ...transcodingSettings,
                    resolution: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="854x480">480p</option>
                  <option value="1280x720">720p</option>
                  <option value="1920x1080">1080p</option>
                  <option value="3840x2160">4K</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bitrate (kbps)</label>
                <input
                  type="number"
                  value={transcodingSettings.bitrate}
                  onChange={(e) => setTranscodingSettings({
                    ...transcodingSettings,
                    bitrate: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="2000"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={transcodingSettings.hardwareAcceleration}
                    onChange={(e) => setTranscodingSettings({
                      ...transcodingSettings,
                      hardwareAcceleration: e.target.checked
                    })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Hardware Acceleration</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTranscodingDialog(false);
                  setSelectedItem(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  startTranscoding(selectedItem, transcodingSettings);
                  setShowTranscodingDialog(false);
                  setSelectedItem(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Start Transcoding
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
