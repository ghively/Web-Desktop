import express from 'express';
import Database from 'better-sqlite3';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import mm from 'music-metadata';
import probeImageSize from 'probe-image-size';
import ExifReader from 'exifr';

const execAsync = promisify(exec);
const router = express.Router();

// Database path
const DB_PATH = path.join(process.env.HOME || '', '.web-desktop', 'file-metadata.db');

// Initialize database
let db: Database.Database;

interface FileMetadata {
  id: string;
  path: string;
  name: string;
  extension: string;
  size: number;
  modified: Date;
  created: Date;
  mimeType: string;
  hash: string;
  directoryId?: string;
  tags?: string[];
  metadata?: any;
  indexed: Date;
}

interface DirectoryMetadata {
  id: string;
  path: string;
  name: string;
  parentId?: string;
  fileCount: number;
  totalSize: number;
  indexed: Date;
}

class FileMetadataManager {
  private supportedExtensions = new Set([
    // Video
    'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ogv',
    // Audio
    'mp3', 'flac', 'wav', 'aac', 'ogg', 'wma', 'm4a', 'opus', 'aiff',
    // Image
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'svg', 'ico', 'heic',
    // Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp',
    // Archives
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'
  ]);

  constructor() {
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Ensure parent directory exists before opening the database
    fsSync.mkdirSync(path.dirname(DB_PATH), { recursive: true });

    db = new Database(DB_PATH);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        extension TEXT,
        size INTEGER NOT NULL,
        modified INTEGER NOT NULL,
        created INTEGER NOT NULL,
        mime_type TEXT,
        hash TEXT,
        directory_id TEXT,
        tags TEXT, -- JSON array
        metadata TEXT, -- JSON object
        indexed INTEGER NOT NULL,
        FOREIGN KEY (directory_id) REFERENCES directories (id)
      );

      CREATE TABLE IF NOT EXISTS directories (
        id TEXT PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        parent_id TEXT,
        file_count INTEGER DEFAULT 0,
        total_size INTEGER DEFAULT 0,
        indexed INTEGER NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES directories (id)
      );

      CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
      CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension);
      CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);
      CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
      CREATE INDEX IF NOT EXISTS idx_files_directory_id ON files(directory_id);
      CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
      CREATE INDEX IF NOT EXISTS idx_directories_path ON directories(path);
      CREATE INDEX IF NOT EXISTS idx_directories_parent_id ON directories(parent_id);
    `);
  }

  async addFile(filePath: string): Promise<FileMetadata | null> {
    try {
      const stats = await fs.stat(filePath);
      const resolvedPath = path.resolve(filePath);
      const fileHash = await this.calculateFileHash(filePath);

      const metadata: FileMetadata = {
        id: crypto.randomUUID(),
        path: resolvedPath,
        name: path.basename(filePath),
        extension: path.extname(filePath).toLowerCase().slice(1),
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime || stats.ctime,
        mimeType: this.getMimeType(filePath),
        hash: fileHash,
        directoryId: await this.getOrCreateDirectoryId(path.dirname(resolvedPath)),
        metadata: {},
        indexed: new Date()
      };

      // Extract extended metadata based on file type
      const extendedMetadata = await this.extractExtendedMetadata(filePath);
      if (extendedMetadata) {
        metadata.metadata = extendedMetadata;
      }

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO files (
          id, path, name, extension, size, modified, created, mime_type,
          hash, directory_id, tags, metadata, indexed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        metadata.id,
        metadata.path,
        metadata.name,
        metadata.extension,
        metadata.size,
        metadata.modified.getTime(),
        metadata.created.getTime(),
        metadata.mimeType,
        metadata.hash,
        metadata.directoryId,
        JSON.stringify(metadata.tags || []),
        JSON.stringify(metadata.metadata || {}),
        Date.now()
      );

      // Update directory stats
      await this.updateDirectoryStats(metadata.directoryId!);

      return metadata;
    } catch (error) {
      console.error(`Error adding file ${filePath}:`, error);
      return null;
    }
  }

  async removeFile(filePath: string): Promise<boolean> {
    try {
      const resolvedPath = path.resolve(filePath);
      const file = await this.getFileByPath(resolvedPath);

      if (file) {
        const stmt = db.prepare('DELETE FROM files WHERE path = ?');
        stmt.run(resolvedPath);

        // Update directory stats
        if (file.directoryId) {
          await this.updateDirectoryStats(file.directoryId);
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error removing file ${filePath}:`, error);
      return false;
    }
  }

  async getFileByPath(filePath: string): Promise<FileMetadata | null> {
    try {
      const resolvedPath = path.resolve(filePath);
      const stmt = db.prepare('SELECT * FROM files WHERE path = ?');
      const row = stmt.get(resolvedPath) as any;

      if (row) {
        return this.mapRowToFileMetadata(row);
      }
      return null;
    } catch (error) {
      console.error(`Error getting file ${filePath}:`, error);
      return null;
    }
  }

  async searchFiles(query: {
    text?: string;
    extensions?: string[];
    mimeTypes?: string[];
    minSize?: number;
    maxSize?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ files: FileMetadata[], total: number }> {
    try {
      let sql = 'SELECT * FROM files WHERE 1=1';
      const params: any[] = [];

      if (query.text) {
        sql += ' AND (name LIKE ? OR path LIKE ?)';
        const searchTerm = `%${query.text}%`;
        params.push(searchTerm, searchTerm);
      }

      if (query.extensions && query.extensions.length > 0) {
        const placeholders = query.extensions.map(() => '?').join(',');
        sql += ` AND extension IN (${placeholders})`;
        params.push(...query.extensions);
      }

      if (query.mimeTypes && query.mimeTypes.length > 0) {
        const placeholders = query.mimeTypes.map(() => '?').join(',');
        sql += ` AND mime_type IN (${placeholders})`;
        params.push(...query.mimeTypes);
      }

      if (query.minSize !== undefined) {
        sql += ' AND size >= ?';
        params.push(query.minSize);
      }

      if (query.maxSize !== undefined) {
        sql += ' AND size <= ?';
        params.push(query.maxSize);
      }

      // Get total count
      const countStmt = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*)'));
      const total = (countStmt.get(params) as any)['COUNT(*)'];

      // Add pagination
      sql += ' ORDER BY name COLLATE NOCASE';
      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }
      if (query.offset) {
        sql += ' OFFSET ?';
        params.push(query.offset);
      }

      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as any[];

      const files = rows.map(row => this.mapRowToFileMetadata(row));
      return { files, total };
    } catch (error) {
      console.error('Error searching files:', error);
      return { files: [], total: 0 };
    }
  }

  async getDuplicates(): Promise<{ hash: string, files: FileMetadata[] }[]> {
    try {
      const stmt = db.prepare(`
        SELECT hash, COUNT(*) as count
        FROM files
        WHERE hash IS NOT NULL AND hash != ''
        GROUP BY hash
        HAVING count > 1
      `);

      const duplicateGroups = stmt.all() as any[];
      const results: { hash: string, files: FileMetadata[] }[] = [];

      for (const group of duplicateGroups) {
        const filesStmt = db.prepare('SELECT * FROM files WHERE hash = ? ORDER BY size DESC');
        const files = filesStmt.all(group.hash) as any[];
        results.push({
          hash: group.hash,
          files: files.map(row => this.mapRowToFileMetadata(row))
        });
      }

      return results;
    } catch (error) {
      console.error('Error finding duplicates:', error);
      return [];
    }
  }

  async getDirectoryFiles(directoryId: string, recursive: boolean = false): Promise<FileMetadata[]> {
    try {
      let sql = 'SELECT * FROM files WHERE directory_id = ?';
      const params: any[] = [directoryId];

      if (recursive) {
        const descendantIds = await this.getDescendantDirectoryIds(directoryId);
        if (descendantIds.length > 0) {
          const placeholders = descendantIds.map(() => '?').join(',');
          sql = `SELECT * FROM files WHERE directory_id IN (?)`;
          params.push(...descendantIds);
        }
      }

      sql += ' ORDER BY name COLLATE NOCASE';
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as any[];

      return rows.map(row => this.mapRowToFileMetadata(row));
    } catch (error) {
      console.error('Error getting directory files:', error);
      return [];
    }
  }

  async indexDirectory(directoryPath: string, recursive: boolean = true): Promise<{
    indexed: number,
    errors: string[]
  }> {
    const results = { indexed: 0, errors: [] as string[] };

    try {
      const directoryId = await this.getOrCreateDirectoryId(directoryPath);

      const processPath = async (currentPath: string) => {
        try {
          const entries = await fs.readdir(currentPath, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);

            if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase().slice(1);
              if (this.supportedExtensions.has(ext)) {
                const metadata = await this.addFile(fullPath);
                if (metadata) {
                  results.indexed++;
                } else {
                  results.errors.push(`Failed to index: ${fullPath}`);
                }
              }
            } else if (entry.isDirectory() && recursive) {
              await processPath(fullPath);
            }
          }
        } catch (error) {
          results.errors.push(`Error processing ${currentPath}: ${error}`);
        }
      };

      await processPath(directoryPath);

      // Update directory stats
      await this.updateDirectoryStats(directoryId);

      return results;
    } catch (error) {
      results.errors.push(`Directory indexing failed: ${error}`);
      return results;
    }
  }

  async calculateFileHash(filePath: string): Promise<string> {
    try {
      const data = await fs.readFile(filePath);
      return crypto.createHash('sha256').digest('hex');
    } catch (error) {
      return '';
    }
  }

  private async extractExtendedMetadata(filePath: string): Promise<any> {
    try {
      const ext = path.extname(filePath).toLowerCase().slice(1);
      const mimeType = this.getMimeType(filePath);

      if (mimeType.startsWith('video/')) {
        return await this.extractVideoMetadata(filePath);
      } else if (mimeType.startsWith('audio/')) {
        return await this.extractAudioMetadata(filePath);
      } else if (mimeType.startsWith('image/')) {
        return await this.extractImageMetadata(filePath);
      } else if (mimeType === 'application/pdf') {
        return await this.extractPdfMetadata(filePath);
      }

      return {};
    } catch (error) {
      return {};
    }
  }

  private async extractVideoMetadata(filePath: string): Promise<any> {
    try {
      // Use ffprobe for video metadata
      const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
      const probeData = JSON.parse(stdout);

      const videoStream = probeData.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = probeData.streams.find((s: any) => s.codec_type === 'audio');

      return {
        duration: parseFloat(probeData.format?.duration) || null,
        bitrate: parseInt(probeData.format?.bit_rate) || null,
        format: probeData.format?.format_name,
        video: videoStream ? {
          codec: videoStream.codec_name,
          width: videoStream.width,
          height: videoStream.height,
          fps: this.calculateFps(videoStream.r_frame_rate),
          pixelFormat: videoStream.pix_fmt
        } : null,
        audio: audioStream ? {
          codec: audioStream.codec_name,
          sampleRate: parseInt(audioStream.sample_rate),
          channels: audioStream.channels,
          bitrate: parseInt(audioStream.bit_rate)
        } : null
      };
    } catch (error) {
      return {};
    }
  }

  private async extractAudioMetadata(filePath: string): Promise<any> {
    try {
      const metadata = await mm.parseFile(filePath);

      return {
        duration: metadata.format.duration,
        bitrate: metadata.format.bitrate,
        sampleRate: metadata.format.sampleRate,
        channels: metadata.format.numberOfChannels,
        format: metadata.format.container,
        title: metadata.common.title,
        artist: metadata.common.artist,
        album: metadata.common.album,
        year: metadata.common.year,
        genre: metadata.common.genre,
        track: metadata.common.track,
        albumartist: metadata.common.albumartist
      };
    } catch (error) {
      return {};
    }
  }

  private async extractImageMetadata(filePath: string): Promise<any> {
    try {
      const imageSize = await probeImageSize(fs.readFile(filePath));
      const exifBuffer = await fs.readFile(filePath);
      const exifData = await ExifReader.parse(exifBuffer, { reviveValues: true }).catch(() => ({} as any));

      return {
        width: imageSize.width,
        height: imageSize.height,
        format: imageSize.type,
        size: imageSize.length,
        exif: {
          make: (exifData as any)?.Make,
          model: (exifData as any)?.Model,
          dateTime: (exifData as any)?.DateTimeOriginal || (exifData as any)?.DateTime,
          iso: (exifData as any)?.ISO || (exifData as any)?.ISOSpeedRatings,
          aperture: (exifData as any)?.FNumber,
          focalLength: (exifData as any)?.FocalLength,
          exposureTime: (exifData as any)?.ExposureTime,
          flash: (exifData as any)?.Flash,
          gpsLat: (exifData as any)?.GPSLatitude,
          gpsLng: (exifData as any)?.GPSLongitude
        }
      };
    } catch (error) {
      return {};
    }
  }

  private async extractPdfMetadata(filePath: string): Promise<any> {
    try {
      // Basic PDF metadata extraction - could be enhanced with pdf-parse
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        format: 'PDF'
      };
    } catch (error) {
      return {};
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const mimeTypes: Record<string, string> = {
      // Video
      mp4: 'video/mp4', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
      mov: 'video/quicktime', wmv: 'video/x-ms-wmv', flv: 'video/x-flv',
      webm: 'video/webm', m4v: 'video/mp4',
      // Audio
      mp3: 'audio/mpeg', flac: 'audio/flac', wav: 'audio/wav',
      aac: 'audio/aac', ogg: 'audio/ogg', wma: 'audio/x-ms-wma',
      m4a: 'audio/mp4', opus: 'audio/opus',
      // Image
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', bmp: 'image/bmp', tiff: 'image/tiff',
      webp: 'image/webp', svg: 'image/svg+xml', heic: 'image/heic',
      // Documents
      pdf: 'application/pdf', doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain', rtf: 'application/rtf'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  private calculateFps(rFrameRate: string): number {
    try {
      const [num, den] = rFrameRate.split('/').map(Number);
      return den ? num / den : num;
    } catch {
      return 0;
    }
  }

  private async getOrCreateDirectoryId(directoryPath: string): Promise<string> {
    const resolvedPath = path.resolve(directoryPath);

    // Check if directory exists
    const stmt = db.prepare('SELECT id FROM directories WHERE path = ?');
    const result = stmt.get(resolvedPath) as any;

    if (result) {
      return result.id;
    }

    // Create directory record
    const dirId = crypto.randomUUID();
    const parentId = await this.getOrCreateDirectoryId(path.dirname(resolvedPath));

    const insertStmt = db.prepare(`
      INSERT INTO directories (id, path, name, parent_id, file_count, total_size, indexed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      dirId,
      resolvedPath,
      path.basename(resolvedPath),
      parentId !== dirId ? parentId : null,
      0,
      0,
      Date.now()
    );

    return dirId;
  }

  private async updateDirectoryStats(directoryId: string): Promise<void> {
    try {
      const filesStmt = db.prepare('SELECT COUNT(*) as count, SUM(size) as total FROM files WHERE directory_id = ?');
      const stats = filesStmt.get(directoryId) as any;

      const updateStmt = db.prepare(`
        UPDATE directories
        SET file_count = ?, total_size = ?, indexed = ?
        WHERE id = ?
      `);

      updateStmt.run(
        stats.count || 0,
        stats.total || 0,
        Date.now(),
        directoryId
      );
    } catch (error) {
      console.error('Error updating directory stats:', error);
    }
  }

  private async getDescendantDirectoryIds(parentId: string): Promise<string[]> {
    const ids: string[] = [];

    const getChildren = async (id: string) => {
      const stmt = db.prepare('SELECT id FROM directories WHERE parent_id = ?');
      const children = stmt.all(id) as any[];

      for (const child of children) {
        ids.push(child.id);
        await getChildren(child.id);
      }
    };

    await getChildren(parentId);
    return ids;
  }

  private mapRowToFileMetadata(row: any): FileMetadata {
    return {
      id: row.id,
      path: row.path,
      name: row.name,
      extension: row.extension,
      size: row.size,
      modified: new Date(row.modified),
      created: new Date(row.created),
      mimeType: row.mime_type,
      hash: row.hash,
      directoryId: row.directory_id,
      tags: row.tags ? JSON.parse(row.tags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      indexed: new Date(row.indexed)
    };
  }
}

// Global instance
const fileMetadataManager = new FileMetadataManager();

// Routes

// Search files
router.post('/search', async (req, res) => {
  try {
    const result = await fileMetadataManager.searchFiles(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get file by path
router.get('/file', async (req, res) => {
  try {
    const { path } = req.query;
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'Path parameter is required' });
    }

    const file = await fileMetadataManager.getFileByPath(path);
    res.json(file);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add/update file
router.post('/file', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }

    const file = await fileMetadataManager.addFile(path);
    res.json(file);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove file
router.delete('/file', async (req, res) => {
  try {
    const { path } = req.query;
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'Path parameter is required' });
    }

    const success = await fileMetadataManager.removeFile(path);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Find duplicates
router.get('/duplicates', async (req, res) => {
  try {
    const duplicates = await fileMetadataManager.getDuplicates();
    res.json(duplicates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get directory files
router.get('/directory/:directoryId/files', async (req, res) => {
  try {
    const { directoryId } = req.params;
    const { recursive = 'false' } = req.query;

    const files = await fileMetadataManager.getDirectoryFiles(
      directoryId,
      recursive === 'true'
    );
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Index directory
router.post('/index-directory', async (req, res) => {
  try {
    const { path, recursive = true } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }

    const result = await fileMetadataManager.indexDirectory(path, recursive);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
