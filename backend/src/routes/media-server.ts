import express from 'express';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);
const router = express.Router();

// Configuration storage
const CONFIG_FILE = path.join(process.env.HOME || '', '.web-desktop', 'media-server.json');

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
  scanInterval: number; // minutes
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
  preset?: string; // HandBrake preset
  tune?: string; // HandBrake tune
  format?: string; // Output container format
}

interface DownloadItem {
  id: string;
  name: string;
  type: 'movie' | 'episode';
  server: 'sonarr' | 'radarr';
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  progress: number;
  size: number;
  downloaded: number;
  speed: number;
  eta?: number;
  path?: string;
}

class MediaServerManager extends EventEmitter {
  private config: MediaServerConfig;
  private transcodingQueue: TranscodingJob[] = [];
  private activeTranscodingJobs: Map<string, any> = new Map();
  private queueProcessing: boolean = false;

  constructor() {
    super();
    this.config = {
      jellyfin: { url: '', apiKey: '', enabled: false },
      emby: { url: '', apiKey: '', enabled: false },
      sonarr: { url: '', apiKey: '', enabled: false },
      radarr: { url: '', apiKey: '', enabled: false },
      sabnzbd: { url: '', apiKey: '', enabled: false },
      transcoding: {
        enabled: false,
        hardwareAcceleration: false,
        defaultQuality: '1080p',
        outputPath: '/tmp/media-transcode',
        ffmpegPath: 'ffmpeg',
        handbrakePath: 'HandBrakeCLI',
        defaultEngine: 'ffmpeg'
      },
      libraries: []
    };
    this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf8');
      this.config = { ...this.config, ...JSON.parse(data) };
    } catch (error) {
      await this.saveConfig();
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
      await fs.writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save media server config: ${error}`);
    }
  }

  async updateConfig(updates: Partial<MediaServerConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
    this.emit('configUpdated', this.config);
  }

  getConfig(): MediaServerConfig {
    return this.config;
  }

  async testConnection(server: 'jellyfin' | 'emby' | 'sonarr' | 'radarr' | 'sabnzbd', url: string, apiKey: string): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      let endpoint: string;
      let headers: Record<string, string> = {};

      switch (server) {
        case 'jellyfin':
          endpoint = `${url}/System/Public`;
          headers = { 'Authorization': `Bearer ${apiKey}` };
          break;
        case 'emby':
          endpoint = `${url}/System/Public`;
          headers = { 'Authorization': `Bearer ${apiKey}` };
          break;
        case 'sonarr':
          endpoint = `${url}/api/v3/system/status`;
          headers = { 'X-Api-Key': apiKey };
          break;
        case 'radarr':
          endpoint = `${url}/api/v3/system/status`;
          headers = { 'X-Api-Key': apiKey };
          break;
        case 'sabnzbd':
          endpoint = `${url}/api/v2/status`;
          headers = { 'X-Api-Key': apiKey };
          break;
      }

      const response = await axios.get(endpoint, { headers, timeout: 10000 });

      if (response.status === 200) {
        return {
          success: true,
          version: response.data?.Version || response.data?.version || 'unknown'
        };
      }

      return { success: false, error: 'Invalid response from server' };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Connection failed'
      };
    }
  }

  // Jellyfin/Emby API methods
  async getJellyfinLibraries(): Promise<any[]> {
    if (!this.config.jellyfin.enabled) throw new Error('Jellyfin not configured');

    try {
      const response = await axios.get(`${this.config.jellyfin.url}/Users`, {
        headers: { 'Authorization': `Bearer ${this.config.jellyfin.apiKey}` }
      });

      if (response.data.length === 0) {
        throw new Error('No users found');
      }

      const userId = response.data[0].Id;
      const librariesResponse = await axios.get(`${this.config.jellyfin.url}/Users/${userId}/Views`, {
        headers: { 'Authorization': `Bearer ${this.config.jellyfin.apiKey}` }
      });

      return librariesResponse.data.Items || [];
    } catch (error: any) {
      throw new Error(`Failed to get Jellyfin libraries: ${error.message}`);
    }
  }

  async getEmbyLibraries(): Promise<any[]> {
    if (!this.config.emby.enabled) throw new Error('Emby not configured');

    try {
      const response = await axios.get(`${this.config.emby.url}/Users`, {
        headers: { 'Authorization': `Bearer ${this.config.emby.apiKey}` }
      });

      if (response.data.length === 0) {
        throw new Error('No users found');
      }

      const userId = response.data[0].Id;
      const librariesResponse = await axios.get(`${this.config.emby.url}/Users/${userId}/Views`, {
        headers: { 'Authorization': `Bearer ${this.config.emby.apiKey}` }
      });

      return librariesResponse.data.Items || [];
    } catch (error: any) {
      throw new Error(`Failed to get Emby libraries: ${error.message}`);
    }
  }

  async getLibraryItems(libraryId: string, server: 'jellyfin' | 'emby'): Promise<MediaItem[]> {
    const serverConfig = server === 'jellyfin' ? this.config.jellyfin : this.config.emby;
    if (!serverConfig.enabled) throw new Error(`${server} not configured`);

    try {
      const response = await axios.get(`${serverConfig.url}/Users/`, {
        headers: { 'Authorization': `Bearer ${serverConfig.apiKey}` }
      });

      if (response.data.length === 0) {
        throw new Error('No users found');
      }

      const userId = response.data[0].Id;
      const itemsResponse = await axios.get(`${serverConfig.url}/Users/${userId}/Items`, {
        headers: { 'Authorization': `Bearer ${serverConfig.apiKey}` },
        params: { ParentId: libraryId, Recursive: true, Fields: 'MediaStreams,Overview' }
      });

      return itemsResponse.data.Items?.map((item: any) => ({
        id: item.Id,
        name: item.Name,
        type: item.Type.toLowerCase(),
        server,
        libraryId,
        parentId: item.ParentId,
        path: item.Path,
        size: item.Size || 0,
        duration: item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000000) : undefined,
        quality: this.extractQualityInfo(item),
        metadata: {
          year: item.ProductionYear,
          genre: item.Genres,
          rating: item.CommunityRating,
          director: item.People?.filter((p: any) => p.Type === 'Director').map((p: any) => p.Name),
          cast: item.People?.filter((p: any) => p.Type === 'Actor').slice(0, 5).map((p: any) => p.Name),
          overview: item.Overview,
          poster: item.ImageTags?.Primary ? `${serverConfig.url}/Items/${item.Id}/Images/Primary` : undefined,
          backdrop: item.ImageTags?.Backdrop ? `${serverConfig.url}/Items/${item.Id}/Images/Backdrop` : undefined
        }
      })) || [];
    } catch (error: any) {
      throw new Error(`Failed to get library items: ${error.message}`);
    }
  }

  private extractQualityInfo(item: any): MediaItem['quality'] {
    const mediaStreams = item.MediaStreams || [];
    const videoStream = mediaStreams.find((s: any) => s.Type === 'Video');

    return {
      width: videoStream?.Width || 0,
      height: videoStream?.Height || 0,
      bitrate: videoStream?.BitRate,
      codec: videoStream?.Codec,
      container: item.Container
    };
  }

  // Transcoding methods
  async startTranscoding(itemId: string, settings: TranscodingSettings): Promise<string> {
    const job: TranscodingJob = {
      id: crypto.randomUUID(),
      itemId,
      inputPath: '', // Will be set when job starts
      outputPath: path.join(this.config.transcoding.outputPath, `transcode_${itemId}_${Date.now()}.mp4`),
      status: 'queued',
      progress: 0,
      settings,
      startTime: new Date()
    };

    this.transcodingQueue.push(job);
    this.emit('transcodingJobQueued', job);
    this.processQueue();

    return job.id;
  }

  private async processQueue(): Promise<void> {
    if (this.queueProcessing || this.transcodingQueue.length === 0) return;

    this.queueProcessing = true;

    while (this.transcodingQueue.length > 0) {
      const job = this.transcodingQueue.shift()!;

      try {
        await this.processTranscodingJob(job);
      } catch (error) {
        console.error(`Transcoding job failed: ${error}`);
        job.status = 'failed';
        job.error = String(error);
        this.emit('transcodingJobFailed', job);
      }
    }

    this.queueProcessing = false;
  }

  private async processTranscodingJob(job: TranscodingJob): Promise<void> {
    job.status = 'processing';
    this.emit('transcodingJobStarted', job);

    try {
      // Find the media item
      const item = await this.findMediaItem(job.itemId);
      if (!item) throw new Error('Media item not found');

      job.inputPath = item.path;

      // Build command based on engine
      const cmd = job.settings.engine === 'handbrake'
        ? this.buildHandBrakeCommand(job)
        : this.buildFFmpegCommand(job);

      // Execute transcoding
      await execAsync(cmd);

      job.status = 'completed';
      job.endTime = new Date();
      this.emit('transcodingJobCompleted', job);

    } catch (error) {
      job.status = 'failed';
      job.error = String(error);
      this.emit('transcodingJobFailed', job);
      throw error;
    }
  }

  private async findMediaItem(itemId: string): Promise<MediaItem | null> {
    // Search through all libraries for the item
    for (const library of this.config.libraries) {
      try {
        const items = await this.getLibraryItems(library.libraryId!, library.server);
        const item = items.find(i => i.id === itemId);
        if (item) return item;
      } catch (error) {
        console.error(`Error searching library ${library.name}: ${error}`);
      }
    }
    return null;
  }

  private buildFFmpegCommand(job: TranscodingJob): string {
    const { settings } = job;
    const args = [
      '-i', job.inputPath,
      '-c:v', settings.videoCodec,
      '-c:a', settings.audioCodec,
      '-b:v', `${settings.bitrate}k`,
      '-vf', `scale=${this.getScaleFilter(settings.resolution)}`,
      '-progress',
      '-y',
      job.outputPath
    ];

    if (settings.hardwareAcceleration) {
      args.unshift('-hwaccel', 'auto');
    }

    if (settings.customArgs) {
      args.push(...settings.customArgs);
    }

    return `${this.config.transcoding.ffmpegPath} ${args.join(' ')}`;
  }

  private buildHandBrakeCommand(job: TranscodingJob): string {
    const { settings } = job;
    const args = [
      '-i', job.inputPath,
      '-o', job.outputPath,
      '--encoder', settings.videoCodec,
      '--audio-codec', settings.audioCodec,
      '--quality', String(Math.floor(settings.bitrate / 1000)), // Convert kbps to HandBrake quality scale
      '--width', this.getResolutionWidth(settings.resolution),
      '--height', this.getResolutionHeight(settings.resolution)
    ];

    if (settings.hardwareAcceleration) {
      args.unshift('--hwaccel');
    }

    if (settings.preset) {
      args.push('--preset', settings.preset);
    }

    if (settings.tune) {
      args.push('--tune', settings.tune);
    }

    if (settings.format) {
      args.push('--format', settings.format);
    }

    if (settings.customArgs) {
      args.push(...settings.customArgs);
    }

    return `${this.config.transcoding.handbrakePath} ${args.join(' ')}`;
  }

  private getResolutionWidth(resolution: string): string {
    const widths: Record<string, string> = {
      '4k': '3840',
      '1080p': '1920',
      '720p': '1280',
      '480p': '854'
    };
    return widths[resolution] || '1280';
  }

  private getResolutionHeight(resolution: string): string {
    const heights: Record<string, string> = {
      '4k': '2160',
      '1080p': '1080',
      '720p': '720',
      '480p': '480'
    };
    return heights[resolution] || '720';
  }

  private getScaleFilter(resolution: string): string {
    const scales: Record<string, string> = {
      '4k': '3840:2160',
      '1080p': '1920:1080',
      '720p': '1280:720',
      '480p': '854:480'
    };
    return scales[resolution] || '1280:720';
  }

  getTranscodingQueue(): TranscodingJob[] {
    return [...this.transcodingQueue];
  }

  getActiveTranscodingJobs(): TranscodingJob[] {
    return Array.from(this.activeTranscodingJobs.values());
  }

  // Sonarr/Radarr/Sabnzbd integration
  async getSonarrSeries(): Promise<any[]> {
    if (!this.config.sonarr.enabled) throw new Error('Sonarr not configured');

    try {
      const response = await axios.get(`${this.config.sonarr.url}/api/v3/series`, {
        headers: { 'X-Api-Key': this.config.sonarr.apiKey }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get Sonarr series: ${error.message}`);
    }
  }

  async getRadarrMovies(): Promise<any[]> {
    if (!this.config.radarr.enabled) throw new Error('Radarr not configured');

    try {
      const response = await axios.get(`${this.config.radarr.url}/api/v3/movie`, {
        headers: { 'X-Api-Key': this.config.radarr.apiKey }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get Radarr movies: ${error.message}`);
    }
  }

  async getSabnzbdQueue(): Promise<any[]> {
    if (!this.config.sabnzbd.enabled) throw new Error('Sabnzbd not configured');

    try {
      const response = await axios.get(`${this.config.sabnzbd.url}/api/v2/queue`, {
        headers: { 'X-Api-Key': this.config.sabnzbd.apiKey }
      });
      return response.data.slots || [];
    } catch (error: any) {
      throw new Error(`Failed to get Sabnzbd queue: ${error.message}`);
    }
  }

  async triggerSonarrRefresh(seriesId: number): Promise<void> {
    if (!this.config.sonarr.enabled) throw new Error('Sonarr not configured');

    try {
      await axios.post(`${this.config.sonarr.url}/api/v3/command`, {
        name: 'RefreshSeries',
        seriesId
      }, {
        headers: { 'X-Api-Key': this.config.sonarr.apiKey }
      });
    } catch (error: any) {
      throw new Error(`Failed to trigger Sonarr refresh: ${error.message}`);
    }
  }

  async triggerRadarrRefresh(movieId: number): Promise<void> {
    if (!this.config.radarr.enabled) throw new Error('Radarr not configured');

    try {
      await axios.post(`${this.config.radarr.url}/api/v3/command`, {
        name: 'RefreshMovie',
        movieId
      }, {
        headers: { 'X-Api-Key': this.config.radarr.apiKey }
      });
    } catch (error: any) {
      throw new Error(`Failed to trigger Radarr refresh: ${error.message}`);
    }
  }
}

// Global instance
const mediaServerManager = new MediaServerManager();

// Routes

// Get configuration
router.get('/config', async (req, res) => {
  try {
    const config = mediaServerManager.getConfig();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update configuration
router.post('/config', async (req, res) => {
  try {
    await mediaServerManager.updateConfig(req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test connection
router.post('/test/:server', async (req, res) => {
  try {
    const { server } = req.params;
    const { url, apiKey } = req.body;
    const result = await mediaServerManager.testConnection(server as any, url, apiKey);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get libraries
router.get('/libraries', async (req, res) => {
  try {
    const config = mediaServerManager.getConfig();
    const libraries: any[] = [];

    if (config.jellyfin.enabled) {
      try {
        const jellyfinLibs = await mediaServerManager.getJellyfinLibraries();
        libraries.push(...jellyfinLibs.map((lib: any) => ({ ...lib, server: 'jellyfin' })));
      } catch (error) {
        console.error('Failed to get Jellyfin libraries:', error);
      }
    }

    if (config.emby.enabled) {
      try {
        const embyLibs = await mediaServerManager.getEmbyLibraries();
        libraries.push(...embyLibs.map((lib: any) => ({ ...lib, server: 'emby' })));
      } catch (error) {
        console.error('Failed to get Emby libraries:', error);
      }
    }

    res.json(libraries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get library items
router.get('/libraries/:libraryId/items', async (req, res) => {
  try {
    const { libraryId } = req.params;
    const { server } = req.query as { server: 'jellyfin' | 'emby' };

    if (!server) {
      return res.status(400).json({ error: 'Server parameter is required' });
    }

    const items = await mediaServerManager.getLibraryItems(libraryId, server);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Transcoding
router.post('/transcode/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const settings = req.body as TranscodingSettings;

    const jobId = await mediaServerManager.startTranscoding(itemId, settings);
    res.json({ jobId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transcoding/queue', async (req, res) => {
  try {
    const queue = mediaServerManager.getTranscodingQueue();
    const active = mediaServerManager.getActiveTranscodingJobs();
    res.json({ queue, active });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sonarr
router.get('/sonarr/series', async (req, res) => {
  try {
    const series = await mediaServerManager.getSonarrSeries();
    res.json(series);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sonarr/refresh/:seriesId', async (req, res) => {
  try {
    const { seriesId } = req.params;
    await mediaServerManager.triggerSonarrRefresh(parseInt(seriesId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Radarr
router.get('/radarr/movies', async (req, res) => {
  try {
    const movies = await mediaServerManager.getRadarrMovies();
    res.json(movies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/radarr/refresh/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;
    await mediaServerManager.triggerRadarrRefresh(parseInt(movieId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sabnzbd
router.get('/sabnzbd/queue', async (req, res) => {
  try {
    const queue = await mediaServerManager.getSabnzbdQueue();
    res.json(queue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get available HandBrake presets
router.get('/handbrake/presets', async (req, res) => {
  try {
    const { handbrakePath } = mediaServerManager.getConfig().transcoding;

    try {
      const { stdout } = await execAsync(`${handbrakePath} --preset-list`);
      const presets = parseHandBrakePresets(stdout);
      res.json(presets);
    } catch (error) {
      // Fallback to common presets if command fails
      const commonPresets = [
        { name: 'Very Fast 1080p30', description: 'Fast encoding, good quality' },
        { name: 'Fast 1080p30', description: 'Balanced speed and quality' },
        { name: 'HQ 1080p30 Surround', description: 'High quality with surround audio' },
        { name: 'Super HQ 1080p30 Surround', description: 'Best quality with surround audio' },
        { name: 'Mobile 480p30', description: 'Optimized for mobile devices' }
      ];
      res.json(commonPresets);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test HandBrake availability
router.get('/handbrake/test', async (req, res) => {
  try {
    const { handbrakePath } = mediaServerManager.getConfig().transcoding;
    const { stdout } = await execAsync(`${handbrakePath} --version`);
    res.json({
      success: true,
      version: stdout.split('\n')[0] || 'unknown',
      path: handbrakePath
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message,
      path: mediaServerManager.getConfig().transcoding.handbrakePath
    });
  }
});

function parseHandBrakePresets(output: string): Array<{ name: string; description: string }> {
  const lines = output.split('\n');
  const presets: Array<{ name: string; description: string }> = [];

  for (const line of lines) {
    if (line.includes('+') && !line.includes('Favorites')) {
      const match = line.match(/^\s*\+\s*([^:]+):\s*(.+)$/);
      if (match) {
        presets.push({
          name: match[1].trim(),
          description: match[2].trim()
        });
      }
    }
  }

  return presets;
}

export default router;