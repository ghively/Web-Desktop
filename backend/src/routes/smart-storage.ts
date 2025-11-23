import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Worker } from 'worker_threads';
import { createReadStream, createWriteStream } from 'fs';
import { promisify } from 'util';

const router = express.Router();

// File deduplication interfaces
interface FileHash {
  path: string;
  hash: string;
  size: number;
  mtime: Date;
  category: string;
  metadata: MediaMetadata;
}

interface MediaMetadata {
  type: 'music' | 'movie' | 'tv' | 'photo' | 'document' | 'archive' | 'other';
  fingerprint?: {
    duration?: number;
    resolution?: { width: number; height: number };
    bitrate?: number;
    codec?: string;
    format?: string;
    artist?: string;
    album?: string;
    title?: string;
    year?: number;
    genre?: string;
    episode?: number;
    season?: number;
    show?: string;
  };
  extracted: boolean;
  confidence: number;
}

interface DeduplicationResult {
  originalFiles: string[];
  duplicateFiles: string[];
  spaceSaved: number;
  duplicatesRemoved: number;
  categories: Record<string, number>;
}

interface StoragePool {
  id: string;
  name: string;
  paths: string[];
  deduplication: boolean;
  mediaRecognition: boolean;
  autoCleanup: boolean;
  maxFileAge: number;
  minFileSize: number;
  createdAt: Date;
  lastScan: Date;
}

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  duplicateFiles: number;
  duplicateSize: number;
  categories: Record<string, { count: number; size: number }>;
  pools: StoragePool[];
}

// In-memory storage for development
const fileHashes = new Map<string, FileHash>();
const storagePools = new Map<string, StoragePool>();
const scanResults = new Map<string, any>();

// Helper function to calculate file hash
async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (data) => {
      hash.update(data);
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', (error) => {
      reject(error);
    });
  });
}

// AI-powered media fingerprinting
async function extractMediaFingerprint(filePath: string): Promise<MediaMetadata> {
  const ext = path.extname(filePath).toLowerCase();
  const stat = fs.statSync(filePath);

  const metadata: MediaMetadata = {
    type: categorizeFile(filePath, ext),
    extracted: false,
    confidence: 0.5
  };

  // Basic metadata extraction
  try {
    switch (metadata.type) {
      case 'music':
        metadata.fingerprint = await extractMusicMetadata(filePath);
        break;
      case 'movie':
        metadata.fingerprint = await extractVideoMetadata(filePath);
        break;
      case 'photo':
        metadata.fingerprint = await extractImageMetadata(filePath);
        break;
      case 'tv':
        metadata.fingerprint = await extractTVMetadata(filePath);
        break;
      default:
        metadata.fingerprint = extractGenericMetadata(filePath, stat);
    }
    metadata.extracted = true;
    metadata.confidence = calculateConfidence(metadata);
  } catch (error) {
    console.error(`Failed to extract metadata for ${filePath}:`, error);
  }

  return metadata;
}

function categorizeFile(filePath: string, ext: string): MediaMetadata['type'] {
  const fileName = path.basename(filePath).toLowerCase();

  // Music files
  const musicExts = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma'];
  if (musicExts.includes(ext)) {
    return 'music';
  }

  // Video files
  const videoExts = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
  if (videoExts.includes(ext)) {
    // Check if it's a TV show based on filename patterns
    if (/[Ss]\d{1,2}[Ee]\d{1,2}/.test(fileName) || /\d+x\d+/.test(fileName)) {
      return 'tv';
    }
    return 'movie';
  }

  // Image files
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.heic'];
  if (imageExts.includes(ext)) {
    return 'photo';
  }

  // Archives
  const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'];
  if (archiveExts.includes(ext)) {
    return 'archive';
  }

  // Documents
  const docExts = ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'];
  if (docExts.includes(ext)) {
    return 'document';
  }

  return 'other';
}

async function extractMusicMetadata(filePath: string): Promise<MediaMetadata['fingerprint']> {
  // This is a simplified implementation
  // In production, you would use libraries like node-ffprobe or music-metadata
  const fileName = path.basename(filePath);
  const parsed = parseMediaFileName(fileName);

  return {
    format: path.extname(filePath).substring(1),
    artist: parsed.artist || 'Unknown Artist',
    title: parsed.title || fileName,
    album: parsed.album,
    year: parsed.year,
    genre: 'Unknown',
    duration: 0, // Would be extracted with ffprobe
    bitrate: 128,
    codec: 'Unknown'
  };
}

async function extractVideoMetadata(filePath: string): Promise<MediaMetadata['fingerprint']> {
  const fileName = path.basename(filePath);
  const parsed = parseMediaFileName(fileName);

  return {
    format: path.extname(filePath).substring(1),
    resolution: { width: 1920, height: 1080 }, // Default
    duration: 0,
    bitrate: 1000,
    codec: 'h264',
    title: parsed.title || fileName,
    year: parsed.year
  };
}

async function extractImageMetadata(filePath: string): Promise<MediaMetadata['fingerprint']> {
  const fileName = path.basename(filePath);
  const parsed = parseMediaFileName(fileName);

  return {
    format: path.extname(filePath).substring(1),
    resolution: { width: 1920, height: 1080 }, // Would be extracted with sharp or similar
    title: parsed.title || fileName
  };
}

async function extractTVMetadata(filePath: string): Promise<MediaMetadata['fingerprint']> {
  const fileName = path.basename(filePath);
  const parsed = parseTVFileName(fileName);

  return {
    format: path.extname(filePath).substring(1),
    show: parsed.show,
    season: parsed.season,
    episode: parsed.episode,
    title: parsed.title || fileName,
    year: parsed.year,
    resolution: { width: 1920, height: 1080 },
    duration: parsed.episode ? 40 * 60 : 0 // Assume 40 min per episode
  };
}

function parseMediaFileName(fileName: string): any {
  // Remove file extension
  const name = path.basename(fileName, path.extname(fileName));

  // Parse TV show naming patterns
  const tvPattern = /^(.+)[. ]?[Ss](\d{1,2})[Ee](\d{1,2})(.*)$/i;
  const tvMatch = name.match(tvPattern);

  if (tvMatch) {
    const show = tvMatch[1].replace(/[._-]/g, ' ').trim();
    const season = parseInt(tvMatch[2]);
    const episode = parseInt(tvMatch[3]);
    const title = tvMatch[4]?.replace(/^[\s._-]+/, '') || `S${season}E${episode}`;
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? parseInt(yearMatch[0]) : undefined;

    return { show, season, episode, title, year };
  }

  // Parse movie naming patterns
  const moviePattern = /^(.+)[. ]?\((\d{4})\)(.*)$/;
  const movieMatch = name.match(moviePattern);

  if (movieMatch) {
    const title = movieMatch[1].replace(/[._-]/g, ' ').trim();
    const year = parseInt(movieMatch[2]);
    return { title, year };
  }

  // Parse music naming patterns
  const musicPattern = /^(.+)[. ][-–][. ](.+)[. ]\((\d{4})\)(.*)$/;
  const musicMatch = name.match(musicPattern);

  if (musicMatch) {
    const artist = musicMatch[1].replace(/[._]/g, ' ').trim();
    const album = musicMatch[2].replace(/[._]/g, ' ').trim();
    const year = musicMatch[3] ? parseInt(musicMatch[3]) : undefined;
    const title = musicMatch[4]?.replace(/^[\s._-]+/, '') || '';

    return { artist, album, year, title };
  }

  return { title: name };
}

function parseTVFileName(fileName: string): any {
  const name = path.basename(fileName, path.extname(fileName));

  // Enhanced TV show parsing
  const patterns = [
    // S01E01, S1E1, 1x01 patterns
    /^(.+?)[. _-]?[Ss](\d{1,2})[Ee](\d{1,2})(?:[._ -]*(.+))?$/,
    // Season 1 Episode 1 patterns
    /^(.+?)[. _-]?[Ss]eason[. _-]?(\d+)[. _-]?[Ee]pisode[. _-]?(\d+)(?:[._ -]*(.+))?$/,
    // 101 patterns
    /^(.+?)[. _-]?(\d{3})(?:[._ -]*(.+))?$/,
    // Other patterns
    /^(.+?)[. _-]?(\d{1,2})x(\d{1,2})(?:[._ -]*(.+))?$/
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      let show = match[1]?.replace(/[._-]/g, ' ').trim() || '';
      let season, episode, title;

      if (pattern.source.includes('Season')) {
        season = parseInt(match[2]);
        episode = parseInt(match[3]);
        title = match[4]?.replace(/^[\s._-]+/, '') || '';
      } else if (pattern.source.includes('\\d{3}')) {
        // 101 pattern - assume first number is season, second is episode if multiple digits
        const num1 = parseInt(match[2]);
        const num2 = match[3] ? parseInt(match[3]) : null;
        if (num2 && num2 > 99) {
          season = num1;
          episode = Math.floor(num2 % 100);
        } else if (num2) {
          season = num1;
          episode = num2;
        } else {
          // Single number episode in season 1
          episode = num1;
          season = 1;
        }
        title = match[4]?.replace(/^[\s._-]+/, '') || '';
      } else {
        season = parseInt(match[2]);
        episode = parseInt(match[3]);
        title = match[4]?.replace(/^[\s._-]+/, '') || '';
      }

      // Extract year from title
      const yearMatch = title?.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? parseInt(yearMatch[0]) : undefined;
      if (year) {
        title = title?.replace(yearMatch[0], '').replace(/[._-]+$/, '') || '';
      }

      return {
        show: show.replace(/\s+/g, ' ').trim(),
        season,
        episode,
        title: title || `S${season}E${episode}`,
        year
      };
    }
  }

  return { show: '', season: 0, episode: 0, title: name };
}

function extractGenericMetadata(filePath: string, stat: fs.Stats): MediaMetadata['fingerprint'] {
  return {
    format: path.extname(filePath).substring(1) || 'unknown',
    title: path.basename(filePath),
    size: stat.size
  };
}

function calculateConfidence(metadata: MediaMetadata): number {
  let confidence = 0.5;

  // Higher confidence for structured patterns
  if (metadata.type === 'tv' && metadata.fingerprint?.show && metadata.fingerprint.season) {
    confidence += 0.3;
  }

  if (metadata.type === 'music' && metadata.fingerprint?.artist && metadata.fingerprint?.title) {
    confidence += 0.3;
  }

  if (metadata.type === 'movie' && metadata.fingerprint?.title && metadata.fingerprint?.year) {
    confidence += 0.3;
  }

  if (metadata.fingerprint?.format) {
    confidence += 0.2;
  }

  return Math.min(confidence, 1.0);
}

// API Routes

// Storage Pool Management
router.get('/pools', (req, res) => {
  try {
    const pools = Array.from(storagePools.values());
    res.json(pools);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve storage pools' });
  }
});

router.post('/pools', (req, res) => {
  try {
    const pool: StoragePool = {
      id: Date.now().toString(),
      name: req.body.name || `Storage Pool ${storagePools.size + 1}`,
      paths: req.body.paths || [],
      deduplication: req.body.deduplication !== false,
      mediaRecognition: req.body.mediaRecognition !== false,
      autoCleanup: req.body.autoCleanup || false,
      maxFileAge: req.body.maxFileAge || 365 * 24 * 60 * 60 * 1000, // 1 year
      minFileSize: req.body.minFileSize || 1024, // 1KB
      createdAt: new Date(),
      lastScan: new Date(0)
    };

    storagePools.set(pool.id, pool);
    res.json(pool);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create storage pool' });
  }
});

router.put('/pools/:id', (req, res) => {
  try {
    const { id } = req.params;
    const pool = storagePools.get(id);

    if (!pool) {
      return res.status(404).json({ error: 'Storage pool not found' });
    }

    const updated = { ...pool, ...req.body, id };
    storagePools.set(id, updated);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update storage pool' });
  }
});

router.delete('/pools/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = storagePools.delete(id);
    res.json({ success: deleted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete storage pool' });
  }
});

// Scan for duplicates
router.post('/scan/:poolId', async (req, res) => {
  try {
    const { poolId } = req.params;
    const pool = storagePools.get(poolId);

    if (!pool) {
      return res.status(404). json({ error: 'Storage pool not found' });
    }

    const scanId = Date.now().toString();
    const result = await scanForDuplicates(pool);

    scanResults.set(scanId, result);
    pool.lastScan = new Date();

    res.json({ scanId, ...result });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: 'Failed to scan for duplicates' });
  }
});

async function scanForDuplicates(pool: StoragePool): Promise<DeduplicationResult> {
  const startTime = Date.now();
  const fileMap = new Map<string, FileHash[]>();
  const duplicates: string[] = [];
  let totalSize = 0;
  let duplicateSize = 0;
  const categories: Record<string, number> = {};

  // Scan all paths in the pool
  for (const poolPath of pool.paths) {
    if (!fs.existsSync(poolPath)) continue;

    const files = await getAllFiles(poolPath, pool.minFileSize);

    for (const filePath of files) {
      try {
        const stat = fs.statSync(filePath);
        const hash = await calculateFileHash(filePath);
        const category = categorizeFile(filePath, path.extname(filePath));

        const metadata = pool.mediaRecognition ?
          await extractMediaFingerprint(filePath) :
          { type: category, extracted: false, confidence: 0.5 };

        const fileHash: FileHash = {
          path: filePath,
          hash,
          size: stat.size,
          mtime: stat.mtime,
          category,
          metadata
        };

        fileHashes.set(hash, [...(fileHashes.get(hash) || []), fileHash]);
        totalSize += stat.size;

        if (!categories[category]) {
          categories[category] = 0;
        }
        categories[category]++;

        // Keep only one copy per hash
        if (fileHashes.get(hash)!.length > 1) {
          duplicates.push(filePath);
          duplicateSize += stat.size;
          // Remove duplicates from total size (keep only one copy)
          totalSize -= stat.size;
        }
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }
  }

  // Update global file hashes
  for (const [hash, files] of fileHashes.entries()) {
    fileHashes.set(hash, files);
  }

  const originalFiles = Array.from(fileHashes.values()).flat();

  return {
    originalFiles,
    duplicateFiles: duplicates,
    spaceSaved: duplicateSize,
    duplicatesRemoved: duplicates.length,
    categories,
    scanTime: Date.now() - startTime
  };
}

async function getAllFiles(dirPath: string, minSize: number): Promise<string[]> {
  const files: string[] = [];

  async function scanDirectory(dir: string) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      try {
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (stat.isFile() && stat.size >= minSize) {
          files.push(fullPath);
        }
      } catch (error) {
        // Skip inaccessible files
      }
    }
  }

  await scanDirectory(dirPath);
  return files;
}

// Remove duplicates
router.post('/cleanup/:poolId', async (req, res) => {
  try {
    const { poolId } = req.params;
    const { dryRun = true } = req.body;
    const pool = storagePools.get(poolId);

    if (!pool) {
      return res.status(404).json({ error: 'Storage pool not found' });
    }

    const result = await cleanupDuplicates(pool, dryRun);
    res.json(result);
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup duplicates' });
  }
});

async function cleanupDuplicates(pool: StoragePool, dryRun: boolean = true): Promise<{
  filesRemoved: string[];
  spaceFreed: number;
  errors: string[];
}> {
  const filesRemoved: string[] = [];
  const spaceFreed = 0;
  const errors: string[] = [];

  for (const [hash, files] of fileHashes.entries()) {
    if (files.length > 1) {
      // Keep the oldest file (or the first one in a directory we want to keep)
      const filesToRemove = files.slice(1);

      for (const file of filesToRemove) {
        try {
          const stat = fs.statSync(file);

          if (!dryRun) {
            fs.unlinkSync(file);
          }

          filesRemoved.push(file);
          spaceFreed += stat.size;
        } catch (error) {
          errors.push(`Failed to remove ${file}: ${error.message}`);
        }
      }
    }
  }

  return { filesRemoved, spaceFreed, errors };
}

// Get storage statistics
router.get('/stats', (req, res) => {
  try {
    const totalFiles = fileHashes.size;
    let totalSize = 0;
    let duplicateFiles = 0;
    let duplicateSize = 0;
    const categories: Record<string, { count: number; size: number }> = {};

    for (const [hash, files] of fileHashes.entries()) {
      const mainFile = files[0];
      totalSize += mainFile.size;

      if (files.length > 1) {
        duplicateFiles += files.length - 1;
        duplicateSize += mainFile.size * (files.length - 1);
      }

      const category = mainFile.category;
      if (!categories[category]) {
        categories[category] = { count: 0, size: 0 };
      }
      categories[category].count++;
      categories[category].size += mainFile.size;
    }

    const stats: StorageStats = {
      totalFiles,
      totalSize,
      duplicateFiles,
      duplicateSize,
      categories,
      pools: Array.from(storagePools.values())
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get storage statistics' });
  }
});

// Find potential duplicates (without hashing entire files)
router.post('/find-duplicates', async (req, res) => {
  try {
    const { paths, minSize = 1024 } = req.body;
    const potentialDuplicates = await findPotentialDuplicates(paths, minSize);
    res.json(potentialDuplicates);
  } catch (error) {
    console.error('Find duplicates error:', error);
    res.status(500).json({ error: 'Failed to find potential duplicates' });
  }
});

async function findPotentialDuplicates(paths: string[], minSize: number): Promise<any[]> {
  const duplicates: any[] = [];
  const sizeMap = new Map<number, string[]>();

  for (const scanPath of paths) {
    if (!fs.existsSync(scanPath)) continue;

    const files = await getAllFiles(scanPath, minSize);

    for (const filePath of files) {
      try {
        const stat = fs.statSync(filePath);
        const size = stat.size;

        if (!sizeMap.has(size)) {
          sizeMap.set(size, []);
        }
        sizeMap.get(size)!.push(filePath);
      } catch (error) {
        console.error(`Error checking file size for ${filePath}:`, error);
      }
    }
  }

  // Find files with identical sizes (potential duplicates)
  for (const [size, files] of sizeMap.entries()) {
    if (files.length > 1) {
      // Perform quick content check for first few KB
      const samples = await Promise.all(
        files.slice(0, Math.min(files.length, 5)).map(async file => {
          try {
            const buffer = Buffer.alloc(4096);
            const fd = fs.openSync(file, 'r');
            fs.readSync(fd, buffer, 0, 4096);
            fs.closeSync(fd);
            return buffer.toString('base64');
          } catch (error) {
            return null;
          }
        })
      );

      // Group by content samples
      const contentGroups = new Map<string, string[]>();
      samples.forEach((content, index) => {
        if (content) {
          if (!contentGroups.has(content)) {
            contentGroups.set(content, []);
          }
          contentGroups.get(content)!.push(files[index]);
        }
      });

      // Add groups with multiple files as potential duplicates
      for (const [content, groupFiles] of contentGroups.entries()) {
        if (groupFiles.length > 1) {
          duplicates.push({
            size,
            files: groupFiles,
            confidence: 0.8 // High confidence for identical first 4KB
          });
        }
      }
    }
  }

  return duplicates;
}

// Get scan results
router.get('/scans/:scanId', (req, res) => {
  try {
    const { scanId } = req.params;
    const result = scanResults.get(scanId);

    if (!result) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get scan results' });
  }
});

// Media-specific endpoints
router.get('/media/categories', (req, res) => {
  try {
    const categories = {
      music: [],
      movies: [],
      tv: [],
      photos: [],
      documents: []
    };

    for (const [hash, files] of fileHashes.entries()) {
      for (const file of files) {
        const category = file.category;
        if (categories[category as keyof typeof categories]) {
          (categories[category as keyof typeof categories] as any[]).push({
            path: file.path,
            hash,
            metadata: file.metadata
          });
        }
      }
    }

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get media categories' });
  }
});

router.get('/media/search', async (req, res) => {
  try {
    const { query, category, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const results = await searchMediaFiles(
      query as string,
      category as string,
      parseInt(limit as string)
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search media files' });
  }
});

async function searchMediaFiles(query: string, category?: string, limit: number = 20): Promise<any[]> {
  const results: any[] = [];
  const lowerQuery = query.toLowerCase();

  for (const [hash, files] of fileHashes.entries()) {
    for (const file of files) {
      if (category && file.category !== category) {
        continue;
      }

      const metadata = file.metadata;
      let matches = false;
      let score = 0;

      // Search in file name
      if (file.path.toLowerCase().includes(lowerQuery)) {
        matches = true;
        score += 50;
      }

      // Search in extracted metadata
      if (metadata.fingerprint) {
        if (metadata.fingerprint.title && metadata.fingerprint.title.toLowerCase().includes(lowerQuery)) {
          matches = true;
          score += 40;
        }

        if (metadata.fingerprint.artist && metadata.fingerprint.artist.toLowerCase().includes(lowerQuery)) {
          matches = true;
          score += 30;
        }

        if (metadata.fingerprint.show && metadata.fingerprint.show.toLowerCase().includes(lowerQuery)) {
          matches = true;
          score += 30;
        }

        if (metadata.fingerprint.album && metadata.fingerprint.album.toLowerCase().includes(lowerQuery)) {
          matches = true;
          score += 20;
        }

        if (metadata.fingerprint.year && metadata.fingerprint.year.toString().includes(lowerQuery)) {
          matches = true;
          score += 15;
        }
      }

      if (matches) {
        results.push({
          file,
          metadata,
          score,
          type: file.category
        });
      }
    }
  }

  // Sort by score (descending) and limit
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export default router;