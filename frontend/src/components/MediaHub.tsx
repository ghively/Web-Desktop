import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2, Minimize2, Settings,
  Music, Film, Tv, Radio, Podcast, Mic, Camera, Upload, Download, Search, Filter,
  Grid, List, Heart, Star, Clock, TrendingUp, Users, Wifi, Server, Cpu, HardDrive,
  Monitor, Speakers, Headphones, Shuffle, Repeat, Playlist, Plus, Edit, Trash2,
  Save, Eye, EyeOff, RefreshCw, Globe, Home, Library, Radio as RadioIcon, Tv as TvIcon
} from 'lucide-react';

interface MediaServer {
  id: string;
  name: string;
  type: 'plex' | 'jellyfin' | 'emby' | 'kodi' | 'local';
  url: string;
  version: string;
  online: boolean;
  libraries: MediaLibrary[];
  sessions: PlaybackSession[];
  bandwidth: number;
  cpu_usage: number;
  memory_usage: number;
}

interface MediaLibrary {
  id: string;
  name: string;
  type: 'movies' | 'tv_shows' | 'music' | 'photos' | 'podcasts' | 'audiobooks';
  size: number;
  count: number;
  last_scanned: string;
  thumbnail_url?: string;
}

interface MediaItem {
  id: string;
  title: string;
  type: 'movie' | 'episode' | 'track' | 'album' | 'artist' | 'photo' | 'podcast';
  library_id: string;
  library_type: string;
  duration?: number;
  size?: number;
  quality?: string;
  resolution?: string;
  audio_codec?: string;
  video_codec?: string;
  bitrate?: number;
  rating?: number;
  year?: number;
  genre?: string[];
  artist?: string;
  album?: string;
  season?: number;
  episode?: number;
  thumbnail_url?: string;
  backdrop_url?: string;
  file_path?: string;
  added_date: string;
  played_count: number;
  last_played?: string;
  favorite: boolean;
  watch_progress?: number;
}

interface PlaybackSession {
  id: string;
  user: string;
  device: string;
  media_item: MediaItem;
  state: 'playing' | 'paused' | 'stopped' | 'buffering';
  position: number;
  duration: number;
  quality: string;
  bandwidth: number;
  transcoding: boolean;
  started_at: string;
}

interface StreamingConfig {
  enabled: boolean;
  platform: 'youtube' | 'twitch' | 'facebook' | 'custom_rtmp';
  title: string;
  description: string;
  quality: '720p' | '1080p' | '4k';
  bitrate: number;
  fps: number;
  audio_bitrate: number;
  rtmp_url?: string;
  stream_key?: string;
  viewers: number;
  start_time?: string;
  chat_enabled: boolean;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  items: MediaItem[];
  duration: number;
  created: string;
  modified: string;
  public: boolean;
  collaborative: boolean;
}

interface AudioDevice {
  id: string;
  name: string;
  type: 'speakers' | 'headphones' | 'bluetooth' | 'hdmi' | 'usb';
  output: boolean;
  input: boolean;
  volume: number;
  muted: boolean;
  default_output: boolean;
  default_input: boolean;
}

export const MediaHub: React.FC<{ windowId?: string }> = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'player' | 'streaming' | 'servers' | 'playlists' | 'devices'>('library');
  const [servers, setServers] = useState<MediaServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [libraries, setLibraries] = useState<MediaLibrary[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [currentSession, setCurrentSession] = useState<PlaybackSession | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [streamingConfig, setStreamingConfig] = useState<StreamingConfig | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('added_date');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showStreamDialog, setShowStreamDialog] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadMediaData();
    const interval = setInterval(loadMediaData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const loadMediaData = async () => {
    try {
      const [serversRes, devicesRes, streamingRes] = await Promise.all([
        fetch('/api/media/servers'),
        fetch('/api/media/devices'),
        fetch('/api/media/streaming/config')
      ]);

      if (serversRes.ok) {
        const serversData = await serversRes.json();
        setServers(serversData);
        if (serversData.length > 0 && !selectedServer) {
          setSelectedServer(serversData[0].id);
          loadServerData(serversData[0].id);
        }
      }
      if (devicesRes.ok) setAudioDevices(await devicesRes.json());
      if (streamingRes.ok) setStreamingConfig(await streamingRes.json());
    } catch (error) {
      console.error('Failed to load media data:', error);
    }
  };

  const loadServerData = async (serverId: string) => {
    try {
      const [librariesRes, mediaRes, sessionsRes] = await Promise.all([
        fetch(`/api/media/servers/${serverId}/libraries`),
        fetch(`/api/media/servers/${serverId}/items`),
        fetch(`/api/media/servers/${serverId}/sessions`)
      ]);

      if (librariesRes.ok) setLibraries(await librariesRes.json());
      if (mediaRes.ok) setMediaItems(await mediaRes.json());
      if (sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        setCurrentSession(sessions.find((s: PlaybackSession) => s.state === 'playing' || s.state === 'paused') || null);
      }
    } catch (error) {
      console.error('Failed to load server data:', error);
    }
  };

  const playMediaItem = async (item: MediaItem) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/media/items/${item.id}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quality: 'auto',
          transcode: false,
          device: 'web'
        })
      });

      if (response.ok) {
        const session = await response.json();
        setCurrentSession(session);
        setSelectedItem(item);
        setActiveTab('player');
        setIsPlaying(true);
        setDuration(item.duration || 0);
        setCurrentTime(0);
      }
    } catch (error) {
      console.error('Failed to play media item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const controlPlayback = async (action: string, parameters?: any) => {
    if (!currentSession) return;

    try {
      await fetch(`/api/media/sessions/${currentSession.id}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, parameters })
      });

      switch (action) {
        case 'play':
          setIsPlaying(true);
          break;
        case 'pause':
          setIsPlaying(false);
          break;
        case 'stop':
          setIsPlaying(false);
          setCurrentSession(null);
          setSelectedItem(null);
          break;
      }
    } catch (error) {
      console.error('Failed to control playback:', error);
    }
  };

  const startStream = async (config: StreamingConfig) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/media/streaming/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        const streamConfig = await response.json();
        setStreamingConfig(streamConfig);
        setShowStreamDialog(false);
        setActiveTab('streaming');
      }
    } catch (error) {
      console.error('Failed to start stream:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopStream = async () => {
    try {
      await fetch('/api/media/streaming/stop', { method: 'POST' });
      setStreamingConfig(null);
    } catch (error) {
      console.error('Failed to stop stream:', error);
    }
  };

  const createPlaylist = async (name: string, description: string) => {
    try {
      const response = await fetch('/api/media/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });

      if (response.ok) {
        const playlist = await response.json();
        setPlaylists(prev => [playlist, ...prev]);
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
    }
  };

  const addToPlaylist = async (playlistId: string, itemId: string) => {
    try {
      await fetch(`/api/media/playlists/${playlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId })
      });
    } catch (error) {
      console.error('Failed to add to playlist:', error);
    }
  };

  const toggleFavorite = async (item: MediaItem) => {
    try {
      await fetch(`/api/media/items/${item.id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: !item.favorite })
      });
      setMediaItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, favorite: !i.favorite } : i)
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'movie': return Film;
      case 'episode': return TvIcon;
      case 'track': case 'album': case 'artist': return Music;
      case 'podcast': return RadioIcon;
      case 'photo': return Camera;
      default: return Monitor;
    }
  };

  const filteredItems = mediaItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold">Media Hub</h1>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={selectedServer || ''}
              onChange={(e) => {
                setSelectedServer(e.target.value);
                loadServerData(e.target.value);
              }}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              {servers.map(server => (
                <option key={server.id} value={server.id}>
                  {server.name} {server.online ? '✓' : '✗'}
                </option>
              ))}
            </select>

            <button
              onClick={loadMediaData}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1 overflow-x-auto">
          {[
            { id: 'library', label: 'Library', icon: Library },
            { id: 'player', label: 'Player', icon: Play },
            { id: 'streaming', label: 'Streaming', icon: Radio },
            { id: 'servers', label: 'Servers', icon: Server },
            { id: 'playlists', label: 'Playlists', icon: Playlist },
            { id: 'devices', label: 'Devices', icon: Speakers }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
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
      <div className="flex-1 overflow-hidden">
        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="h-full flex flex-col">
            {/* Library Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-gray-800">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-lg font-bold text-blue-500">{mediaItems.length}</div>
                <div className="text-xs text-gray-400">Total Items</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-lg font-bold text-green-500">{libraries.length}</div>
                <div className="text-xs text-gray-400">Libraries</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-lg font-bold text-purple-500">
                  {servers.filter(s => s.online).length}
                </div>
                <div className="text-xs text-gray-400">Online Servers</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-lg font-bold text-yellow-500">
                  {servers.reduce((sum, s) => sum + s.sessions.length, 0)}
                </div>
                <div className="text-xs text-gray-400">Active Streams</div>
              </div>
            </div>

            {/* Filters and Controls */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search media..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="movie">Movies</option>
                  <option value="episode">TV Shows</option>
                  <option value="track">Music</option>
                  <option value="album">Albums</option>
                  <option value="podcast">Podcasts</option>
                  <option value="photo">Photos</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="added_date">Recently Added</option>
                  <option value="title">Title</option>
                  <option value="year">Year</option>
                  <option value="rating">Rating</option>
                  <option value="played_count">Most Played</option>
                </select>

                <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Media Grid/List */}
            <div className="flex-1 p-6 overflow-y-auto">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredItems.map(item => {
                    const Icon = getMediaIcon(item.type);
                    return (
                      <div
                        key={item.id}
                        className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-all cursor-pointer group"
                      >
                        <div className="relative aspect-video bg-gray-700 flex items-center justify-center">
                          {item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Icon className="w-12 h-12 text-gray-500" />
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playMediaItem(item);
                              }}
                              className="p-3 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors"
                            >
                              <Play className="w-6 h-6" />
                            </button>
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-sm truncate mb-1">{item.title}</h4>
                          <div className="text-xs text-gray-400 mb-2">
                            {item.year && `${item.year} • `}
                            {item.genre?.slice(0, 2).join(', ')}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {item.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-500" fill="currentColor" />
                                  <span className="text-xs">{item.rating}</span>
                                </div>
                              )}
                              {item.duration && (
                                <span className="text-xs text-gray-400">
                                  {formatDuration(item.duration)}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item);
                              }}
                              className={`p-1 rounded transition-colors ${
                                item.favorite ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'
                              }`}
                            >
                              <Star className="w-3 h-3" fill={item.favorite ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map(item => {
                    const Icon = getMediaIcon(item.type);
                    return (
                      <div
                        key={item.id}
                        className="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-750 transition-all cursor-pointer"
                        onClick={() => playMediaItem(item)}
                      >
                        <div className="flex items-center gap-4">
                          {item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.title}
                              className="w-16 h-16 rounded object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded bg-gray-700 flex items-center justify-center">
                              <Icon className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium">{item.title}</h4>
                            <div className="text-sm text-gray-400">
                              {item.year && `${item.year} • `}
                              {item.genre?.slice(0, 3).join(', ')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.size && `${formatFileSize(item.size)} • `}
                              {item.quality && `${item.quality} • `}
                              {item.duration && formatDuration(item.duration)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {item.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                              <span className="text-sm">{item.rating}</span>
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(item);
                            }}
                            className={`p-2 rounded transition-colors ${
                              item.favorite ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'
                            }`}
                          >
                            <Star className="w-4 h-4" fill={item.favorite ? 'currentColor' : 'none'} />
                          </button>
                          <button className="p-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
                            <Play className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Player Tab */}
        {activeTab === 'player' && selectedItem && (
          <div className="h-full flex flex-col">
            {/* Video/Visual Player */}
            <div className="flex-1 bg-black flex items-center justify-center relative">
              {selectedItem.type === 'movie' || selectedItem.type === 'episode' ? (
                <video
                  ref={videoRef}
                  className="w-full h-full max-h-screen"
                  poster={selectedItem.backdrop_url}
                >
                  <source src={selectedItem.file_path} />
                </video>
              ) : (
                <div className="text-center">
                  <div className="w-32 h-32 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    {React.createElement(getMediaIcon(selectedItem.type), { className: 'w-16 h-16' })}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{selectedItem.title}</h2>
                  {selectedItem.artist && <p className="text-gray-400 mb-2">{selectedItem.artist}</p>}
                  {selectedItem.album && <p className="text-gray-400">{selectedItem.album}</p>}
                </div>
              )}
            </div>

            {/* Playback Controls */}
            <div className="bg-gray-800 p-6 border-t border-gray-700">
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
                <div className="relative">
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 transition-all"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => controlPlayback('previous')}
                    className="p-2 hover:bg-gray-700 rounded transition-colors"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => controlPlayback(isPlaying ? 'pause' : 'play')}
                    className="p-3 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => controlPlayback('next')}
                    className="p-2 hover:bg-gray-700 rounded transition-colors"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 hover:bg-gray-700 rounded transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(parseInt(e.target.value))}
                      className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-700 rounded transition-colors">
                    <Shuffle className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-gray-700 rounded transition-colors">
                    <Repeat className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-gray-700 rounded transition-colors">
                    <Playlist className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Streaming Tab */}
        {activeTab === 'streaming' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              {streamingConfig ? (
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{streamingConfig.title}</h3>
                      <p className="text-gray-400">{streamingConfig.description}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-500">{streamingConfig.viewers}</div>
                      <div className="text-sm text-gray-400">Viewers</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Stream Settings</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Quality:</span>
                          <span>{streamingConfig.quality}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Bitrate:</span>
                          <span>{streamingConfig.bitrate} kbps</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">FPS:</span>
                          <span>{streamingConfig.fps}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Audio Settings</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Audio Bitrate:</span>
                          <span>{streamingConfig.audio_bitrate} kbps</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Chat:</span>
                          <span>{streamingConfig.chat_enabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Stream Info</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Platform:</span>
                          <span>{streamingConfig.platform}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Started:</span>
                          <span>{streamingConfig.start_time && new Date(streamingConfig.start_time).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={stopStream}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      End Stream
                    </button>
                    <button
                      onClick={() => setShowStreamDialog(true)}
                      className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Edit Settings
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Radio className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Start Streaming</h3>
                  <p className="text-gray-400 mb-6">Configure and start your live stream</p>
                  <button
                    onClick={() => setShowStreamDialog(true)}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    Start New Stream
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Servers Tab */}
        {activeTab === 'servers' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servers.map(server => (
                <div
                  key={server.id}
                  className={`bg-gray-800 rounded-lg p-6 border ${
                    server.online ? 'border-green-500' : 'border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{server.name}</h3>
                    <div className={`w-3 h-3 rounded-full ${
                      server.online ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Type:</span>
                      <span className="capitalize">{server.type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Version:</span>
                      <span>{server.version}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Libraries:</span>
                      <span>{server.libraries.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Active Sessions:</span>
                      <span>{server.sessions.length}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">CPU Usage:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${server.cpu_usage}%` }}
                          />
                        </div>
                        <span>{server.cpu_usage}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Memory:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${server.memory_usage}%` }}
                          />
                        </div>
                        <span>{server.memory_usage}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Bandwidth:</span>
                      <span>{server.bandwidth} Mbps</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
                      Configure
                    </button>
                    <button className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
                      Refresh
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Playlists Tab */}
        {activeTab === 'playlists' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Playlists</h3>
              <button
                onClick={() => createPlaylist('New Playlist', 'Description')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Playlist
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playlists.map(playlist => (
                <div key={playlist.id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-1">{playlist.name}</h4>
                      <p className="text-sm text-gray-400">{playlist.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {playlist.public && (
                        <Globe className="w-4 h-4 text-blue-500" />
                      )}
                      {playlist.collaborative && (
                        <Users className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Items:</span>
                      <span>{playlist.items.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Duration:</span>
                      <span>{formatDuration(playlist.duration)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Created:</span>
                      <span>{new Date(playlist.created).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors">
                      Play
                    </button>
                    <button className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Output Devices</h3>
                <div className="space-y-3">
                  {audioDevices.filter(d => d.output).map(device => (
                    <div
                      key={device.id}
                      className={`bg-gray-800 rounded-lg p-4 border ${
                        device.default_output ? 'border-green-500' : 'border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {device.type === 'speakers' && <Speakers className="w-5 h-5 text-blue-500" />}
                          {device.type === 'headphones' && <Headphones className="w-5 h-5 text-green-500" />}
                          {device.type === 'bluetooth' && <Wifi className="w-5 h-5 text-purple-500" />}
                          <div>
                            <div className="font-medium">{device.name}</div>
                            <div className="text-sm text-gray-400 capitalize">{device.type}</div>
                          </div>
                        </div>
                        {device.default_output && (
                          <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {/* Toggle mute */}}
                          className={`p-2 rounded transition-colors ${
                            device.muted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                        >
                          {device.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <div className="flex-1">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={device.volume}
                            onChange={(e) => {/* Update volume */}}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <span className="text-sm text-gray-400 w-10">{device.volume}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Input Devices</h3>
                <div className="space-y-3">
                  {audioDevices.filter(d => d.input).map(device => (
                    <div
                      key={device.id}
                      className={`bg-gray-800 rounded-lg p-4 border ${
                        device.default_input ? 'border-green-500' : 'border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mic className="w-5 h-5 text-red-500" />
                          <div>
                            <div className="font-medium">{device.name}</div>
                            <div className="text-sm text-gray-400 capitalize">{device.type}</div>
                          </div>
                        </div>
                        {device.default_input && (
                          <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stream Configuration Dialog */}
      {showStreamDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Configure Stream</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  placeholder="Stream title..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  placeholder="Stream description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Platform</label>
                  <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none">
                    <option value="youtube">YouTube</option>
                    <option value="twitch">Twitch</option>
                    <option value="facebook">Facebook</option>
                    <option value="custom_rtmp">Custom RTMP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Quality</label>
                  <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none">
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                    <option value="4k">4K</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Bitrate (kbps)</label>
                  <input
                    type="number"
                    placeholder="5000"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">FPS</label>
                  <input
                    type="number"
                    placeholder="30"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Audio Bitrate (kbps)</label>
                  <input
                    type="number"
                    placeholder="128"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Enable chat</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStreamDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  startStream({
                    enabled: true,
                    platform: 'youtube',
                    title: 'Test Stream',
                    description: 'Test description',
                    quality: '1080p',
                    bitrate: 5000,
                    fps: 30,
                    audio_bitrate: 128,
                    viewers: 0,
                    chat_enabled: true
                  });
                }}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Start Stream
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaHub;