import { Router, Request, Response } from 'express';
import { promises as fs, constants } from 'fs';
import { join, resolve, extname, basename } from 'path';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import { createHash } from 'crypto';

const router = Router();
const execFileAsync = promisify(execFile);

// File locking mechanism to prevent race conditions
const installationLocks = new Map<string, Promise<any>>();

const withLock = async <T>(lockKey: string, operation: () => Promise<T>): Promise<T> => {
    // Wait for any existing operation with the same key
    if (installationLocks.has(lockKey)) {
        await installationLocks.get(lockKey);
    }

    // Create new promise for this operation
    const operationPromise = (async () => {
        try {
            return await operation();
        } finally {
            // Clean up lock after operation completes or fails
            installationLocks.delete(lockKey);
        }
    })();

    // Store the promise
    installationLocks.set(lockKey, operationPromise);

    return operationPromise;
};

// Progress tracking interface
interface InstallationProgress {
    sessionId: string;
    status: 'pending' | 'downloading' | 'extracting' | 'scanning' | 'validating' | 'installing' | 'completed' | 'failed';
    progress: number; // 0-100
    currentStep: string;
    totalSteps: number;
    message: string;
    startTime: number;
    appId?: string;
    appName?: string;
    error?: string;
    details?: Record<string, any>;
}

// In-memory progress storage (in production, consider using Redis or database)
const installationProgress = new Map<string, InstallationProgress>();

// Job management interface
interface JobInfo {
    sessionId: string;
    type: 'install' | 'uninstall' | 'update';
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    appId?: string;
    appName?: string;
    url?: string;
    userId?: string; // For multi-user support
    progress: InstallationProgress;
}

// Job management storage
const activeJobs = new Map<string, JobInfo>();

// Job management functions
const createJob = (sessionId: string, type: JobInfo['type'], details: Partial<JobInfo> = {}): JobInfo => {
    const job: JobInfo = {
        sessionId,
        type,
        status: 'pending',
        createdAt: Date.now(),
        progress: initializeProgress(sessionId),
        ...details
    };

    activeJobs.set(sessionId, job);
    return job;
};

const updateJobStatus = (sessionId: string, status: JobInfo['status'], details: Partial<JobInfo> = {}): void => {
    const job = activeJobs.get(sessionId);
    if (job) {
        job.status = status;
        if (status === 'running' && !job.startedAt) {
            job.startedAt = Date.now();
        }
        if (['completed', 'failed', 'cancelled'].includes(status) && !job.completedAt) {
            job.completedAt = Date.now();
        }
        Object.assign(job, details);
    }
};

const cancelJob = async (sessionId: string): Promise<{ success: boolean; reason?: string }> => {
    const job = activeJobs.get(sessionId);
    if (!job) {
        return { success: false, reason: 'Job not found' };
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        return { success: false, reason: `Job already ${job.status}` };
    }

    // Update job status
    updateJobStatus(sessionId, 'cancelled');

    // Update progress
    updateProgress(sessionId, {
        status: 'failed',
        error: 'Installation cancelled by user',
        message: 'Installation was cancelled'
    });

    // Clean up temp directory
    const installDir = join(TEMP_DIR, sessionId);
    try {
        await fs.rm(installDir, { recursive: true, force: true });
    } catch (error) {
        console.warn(`Failed to clean up cancelled job ${sessionId}:`, error);
    }

    return { success: true };
};

const cleanupOldJobs = (): void => {
    const oneHour = 60 * 60 * 1000;
    const now = Date.now();

    // Convert to array to avoid iterator issues
    const jobs = Array.from(activeJobs.entries());
    for (const [sessionId, job] of jobs) {
        const age = now - job.createdAt;
        const isCompleted = ['completed', 'failed', 'cancelled'].includes(job.status);

        // Remove completed jobs older than 1 hour, or pending jobs older than 24 hours
        if ((isCompleted && age > oneHour) || (!isCompleted && age > 24 * oneHour)) {
            activeJobs.delete(sessionId);
            installationProgress.delete(sessionId);
            console.log(`Cleaned up old job: ${sessionId} (${job.status})`);
        }
    }
};


// Progress management functions
const updateProgress = (sessionId: string, update: Partial<InstallationProgress>): void => {
    const current = installationProgress.get(sessionId);
    if (current) {
        installationProgress.set(sessionId, { ...current, ...update });
    }
};

const initializeProgress = (sessionId: string): InstallationProgress => {
    const progress: InstallationProgress = {
        sessionId,
        status: 'pending',
        progress: 0,
        currentStep: 'Initializing installation',
        totalSteps: 6, // Download, extract, validate, scan, install, cleanup
        message: 'Installation started',
        startTime: Date.now(),
        details: {}
    };
    installationProgress.set(sessionId, progress);
    return progress;
};

const calculateProgress = (currentStep: number, totalSteps: number, stepProgress: number = 0): number => {
    const baseProgress = (currentStep - 1) * (100 / totalSteps);
    const stepContribution = stepProgress * (100 / totalSteps);
    return Math.min(Math.round(baseProgress + stepContribution), 100);
};

// Configuration
const MARKETPLACE_DIR = process.env.MARKETPLACE_DIR || join(process.env.HOME || '', '.web-desktop', 'marketplace');
const APPS_DIR = join(MARKETPLACE_DIR, 'apps');
const CACHE_DIR = join(MARKETPLACE_DIR, 'cache');
const TEMP_DIR = join(MARKETPLACE_DIR, 'temp');
const SECURITY_SCAN_DIR = join(MARKETPLACE_DIR, 'security');

// Download size limits (configurable via environment variables)
const MAX_DOWNLOAD_SIZE = parseInt(process.env.MAX_DOWNLOAD_SIZE || '104857600'); // 100MB default
const MAX_ARCHIVE_SIZE = parseInt(process.env.MAX_ARCHIVE_SIZE || '209715200'); // 200MB default
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB default for individual files

// Initialize directories
const initializeDirectories = async () => {
    const dirs = [MARKETPLACE_DIR, APPS_DIR, CACHE_DIR, TEMP_DIR, SECURITY_SCAN_DIR];
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            console.error(`Failed to create directory ${dir}:`, error);
        }
    }
};

// Security and validation functions
const sanitizeId = (id: string): string => {
    return id.replace(/[^a-zA-Z0-9._-]/g, '').substring(0, 100);
};

const validateUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
};

const validateDownloadSize = async (url: string, sessionId?: string): Promise<{ valid: boolean; contentLength?: number; error?: string }> => {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https:') ? 'https' : 'http';
        const client = require(protocol);

        client.request(url, { method: 'HEAD' }, (response: any) => {
            const contentLength = parseInt(response.headers['content-length'] || '0');

            if (response.statusCode < 200 || response.statusCode >= 300) {
                resolve({ valid: false, error: `URL check failed with status ${response.statusCode}` });
                return;
            }

            if (contentLength > 0) {
                if (contentLength > MAX_DOWNLOAD_SIZE) {
                    resolve({
                        valid: false,
                        contentLength,
                        error: `Download size ${Math.round(contentLength / 1024 / 1024)}MB exceeds maximum allowed size of ${Math.round(MAX_DOWNLOAD_SIZE / 1024 / 1024)}MB`
                    });
                    return;
                }

                // Update progress with size info
                if (sessionId) {
                    updateProgress(sessionId, {
                        details: {
                            totalBytes: contentLength,
                            downloadedBytes: 0
                        }
                    });
                }
            }

            resolve({ valid: true, contentLength });
        }).on('error', (error: any) => {
            // If HEAD request fails, we'll allow the download but with strict monitoring
            console.warn(`Could not pre-validate download size for ${url}:`, error.message);
            resolve({ valid: true, error: 'Size validation skipped, will monitor during download' });
        }).end();
    });
};

const calculateFileHash = async (filePath: string): Promise<string> => {
    const data = await fs.readFile(filePath);
    return createHash('sha256').update(data).digest('hex');
};

// Enhanced security scan configuration with configurable levels
interface SecurityScanConfig {
    level: 'quick' | 'standard' | 'thorough';
    maxFilesToScan: number;
    scanExcludedDirs: string[];
    scanExcludedExtensions: string[];
    suspiciousPatterns: RegExp[];
    largeFileThreshold: number;
}

const getSecurityScanConfig = (level: SecurityScanConfig['level'] = 'standard'): SecurityScanConfig => {
    const basePatterns = [
        /eval\s*\(/i,
        /exec\s*\(/i,
        /system\s*\(/i,
        /shell_exec\s*\(/i,
        /passthru\s*\(/i,
    ];

    const configs = {
        quick: {
            level: 'quick' as const,
            maxFilesToScan: 100,
            scanExcludedDirs: ['node_modules', '.git', 'vendor', '__MACOSX'],
            scanExcludedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg'],
            suspiciousPatterns: [
                ...basePatterns,
                /\.exe$/i,
                /\.bat$/i,
                /\.cmd$/i,
                /\.scr$/i,
                /\.vbs$/i,
                /\.jar$/i,
            ],
            largeFileThreshold: 10 * 1024 * 1024, // 10MB
        },
        standard: {
            level: 'standard' as const,
            maxFilesToScan: 1000,
            scanExcludedDirs: ['node_modules', '.git', 'vendor', '__MACOSX', 'dist', 'build'],
            scanExcludedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2'],
            suspiciousPatterns: [
                ...basePatterns,
                /\.exe$/i,
                /\.bat$/i,
                /\.cmd$/i,
                /\.scr$/i,
                /\.vbs$/i,
                /\.jar$/i,
                /\.js$/i,
                /require\s*\(\s*['"]\.\./i,
                /import\s*.*\.\./i,
                /document\.write/i,
                /innerHTML\s*=/i,
            ],
            largeFileThreshold: 50 * 1024 * 1024, // 50MB
        },
        thorough: {
            level: 'thorough' as const,
            maxFilesToScan: 5000,
            scanExcludedDirs: ['node_modules', '.git', 'vendor', '__MACOSX'],
            scanExcludedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg'],
            suspiciousPatterns: [
                ...basePatterns,
                /\.exe$/i,
                /\.bat$/i,
                /\.cmd$/i,
                /\.scr$/i,
                /\.vbs$/i,
                /\.jar$/i,
                /\.js$/i,
                /\.ts$/i,
                /\.php$/i,
                /\.py$/i,
                /\.sh$/i,
                /\.rb$/i,
                /\.pl$/i,
                /require\s*\(\s*['"]\.\./i,
                /import\s*.*\.\./i,
                /document\.write/i,
                /innerHTML\s*=/i,
                /outerHTML\s*=/i,
                /setTimeout\s*\(/i,
                /setInterval\s*\(/i,
                /Function\s*\(/i,
            ],
            largeFileThreshold: 100 * 1024 * 1024, // 100MB
        }
    };

    return configs[level];
};

const scanForMalware = async (
    extractPath: string,
    sessionId?: string,
    scanLevel: SecurityScanConfig['level'] = 'standard'
): Promise<{
    threats: string[];
    safe: boolean;
    filesScanned: number;
    filesSkipped: number;
    scanDuration: number;
    scanLevel: SecurityScanConfig['level'];
}> => {
    const config = getSecurityScanConfig(scanLevel);
    const threats: string[] = [];
    let filesScanned = 0;
    let filesSkipped = 0;
    const startTime = Date.now();

    try {
        // Optimized file counting with early termination
        const countFiles = async (dirPath: string, depth = 0): Promise<number> => {
            if (depth > 10 || filesScanned + filesSkipped >= config.maxFilesToScan) {
                return 0;
            }

            let count = 0;
            try {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (config.scanExcludedDirs.includes(entry.name)) {
                        continue;
                    }

                    const fullPath = join(dirPath, entry.name);
                    if (entry.isDirectory() && depth < 5) { // Limit depth for performance
                        count += await countFiles(fullPath, depth + 1);
                    } else if (!entry.isDirectory()) {
                        count++;
                    }
                }
            } catch (error) {
                console.warn(`Could not count files in ${dirPath}:`, error);
            }
            return count;
        };

        // Enhanced file scanning with performance optimizations
        const scanFile = async (filePath: string): Promise<void> => {
            const fileName = basename(filePath);
            const fileExt = extname(fileName).toLowerCase();

            try {
                // Skip excluded extensions
                if (config.scanExcludedExtensions.includes(fileExt)) {
                    filesSkipped++;
                    return;
                }

                // Check file size first to avoid reading large files unnecessarily
                const stats = await fs.stat(filePath);
                if (stats.size > config.largeFileThreshold) {
                    threats.push(`Large file detected: ${fileName} (${Math.round(stats.size / 1024 / 1024)}MB, threshold: ${Math.round(config.largeFileThreshold / 1024 / 1024)}MB)`);
                    filesScanned++;
                    return;
                }

                // For binary files, only scan filename patterns
                if (['.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar', '.bin', '.dat'].includes(fileExt)) {
                    const fileNameLower = fileName.toLowerCase();
                    for (const pattern of config.suspiciousPatterns) {
                        if (pattern.test(fileNameLower)) {
                            threats.push(`Suspicious filename: ${fileName} (matches ${pattern.source})`);
                            break;
                        }
                    }
                    filesScanned++;
                    return;
                }

                // Read and scan text files with size limit
                if (stats.size <= 1024 * 1024) { // Only scan files up to 1MB
                    const content = await fs.readFile(filePath, 'utf-8');

                    // Check filename patterns first
                    const fileNameLower = fileName.toLowerCase();
                    for (const pattern of config.suspiciousPatterns) {
                        if (pattern.test(fileNameLower) || pattern.test(content)) {
                            threats.push(`Suspicious content in ${fileName}: ${pattern.source}`);
                            break; // Only add one threat per file to avoid spam
                        }
                    }
                } else {
                    // For larger text files, do partial scanning
                    const buffer = Buffer.alloc(Math.min(stats.size, 64 * 1024)); // Read first 64KB
                    const fileHandle = await fs.open(filePath, 'r');
                    try {
                        await fileHandle.read(buffer, 0, buffer.length, 0);
                        const content = buffer.toString('utf-8', 0, buffer.length);

                        for (const pattern of config.suspiciousPatterns) {
                            if (pattern.test(content)) {
                                threats.push(`Suspicious content in ${fileName} (partial scan): ${pattern.source}`);
                                break;
                            }
                        }
                    } finally {
                        await fileHandle.close();
                    }
                }

                filesScanned++;

                // Update progress less frequently for better performance
                if (sessionId && filesScanned % 10 === 0) {
                    const totalFiles = filesScanned + filesSkipped;
                    const stepProgress = Math.min(filesScanned / config.maxFilesToScan, 1);
                    updateProgress(sessionId, {
                        status: 'scanning',
                        progress: calculateProgress(4, 6, stepProgress),
                        currentStep: 'Scanning for security threats',
                        message: `Scanned ${filesScanned} files (skipped ${filesSkipped})`,
                        details: {
                            filesScanned,
                            totalFiles,
                            currentFile: fileName,
                            scanLevel: config.level
                        }
                    });
                }
            } catch (error) {
                // Skip files that can't be read
                filesSkipped++;
            }
        };

        // Optimized directory scanning with early termination
        const scanDirectory = async (dirPath: string, depth = 0): Promise<void> => {
            if (depth > 10 || filesScanned >= config.maxFilesToScan) {
                return;
            }

            try {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });

                // Process entries in batches to reduce I/O pressure
                const batchSize = 50;
                for (let i = 0; i < entries.length; i += batchSize) {
                    const batch = entries.slice(i, i + batchSize);

                    for (const entry of batch) {
                        if (config.scanExcludedDirs.includes(entry.name)) {
                            continue;
                        }

                        const fullPath = join(dirPath, entry.name);

                        if (entry.isDirectory() && depth < 5) {
                            await scanDirectory(fullPath, depth + 1);
                        } else if (!entry.isDirectory()) {
                            await scanFile(fullPath);

                            // Early termination if we've scanned enough files
                            if (filesScanned >= config.maxFilesToScan) {
                                return;
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn(`Could not scan directory ${dirPath}:`, error);
            }
        };

        // Get total file count for progress tracking (async, non-blocking)
        const totalFilesPromise = countFiles(extractPath);

        // Start scanning immediately
        await scanDirectory(extractPath);

        const scanDuration = Date.now() - startTime;
        const totalFiles = filesScanned + filesSkipped;

        // Final progress update
        if (sessionId) {
            updateProgress(sessionId, {
                status: 'scanning',
                progress: calculateProgress(4, 6, 1),
                currentStep: 'Security scan complete',
                message: `Scanned ${filesScanned} files (${filesSkipped} skipped) in ${Math.round(scanDuration / 1000)}s`,
                details: {
                    filesScanned,
                    totalFiles,
                    scanLevel: config.level,
                    threatsFound: threats.length
                }
            });
        }

        return {
            threats,
            safe: threats.length === 0,
            filesScanned,
            filesSkipped,
            scanDuration,
            scanLevel: config.level
        };
    } catch (error) {
        const scanDuration = Date.now() - startTime;
        return {
            threats: [`Security scan failed: ${error}`],
            safe: false,
            filesScanned,
            filesSkipped,
            scanDuration,
            scanLevel: config.level
        };
    }
};

const validateManifest = (manifest: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const required = ['id', 'name', 'version', 'description', 'author', 'license', 'main', 'type'];

    for (const field of required) {
        if (!manifest[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    }

    if (manifest.id && !/^[a-z0-9._-]+$/i.test(manifest.id)) {
        errors.push('Invalid app ID format');
    }

    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
        errors.push('Invalid version format');
    }

    if (manifest.type && !['web', 'native', 'hybrid'].includes(manifest.type)) {
        errors.push('Invalid app type');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

const downloadFile = async (url: string, destination: string, sessionId?: string): Promise<void> => {
    // First validate the download size
    const sizeValidation = await validateDownloadSize(url, sessionId);
    if (!sizeValidation.valid) {
        throw new Error(sizeValidation.error || 'Download size validation failed');
    }

    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? 'https' : 'http';
        const client = require(protocol);

        client.get(url, (response: any) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Download failed with status ${response.statusCode}`));
                return;
            }

            const contentLength = parseInt(response.headers['content-length'] || '0');
            let downloadedBytes = 0;

            // If we have a content-length from HEAD request that differs, validate again
            if (sizeValidation.contentLength && contentLength > 0 &&
                Math.abs(sizeValidation.contentLength - contentLength) > 1024) {
                console.warn(`Content-length mismatch: HEAD=${sizeValidation.contentLength}, GET=${contentLength}`);
            }

            const fileStream = require('fs').createWriteStream(destination);

            response.on('data', (chunk: any) => {
                downloadedBytes += chunk.length;

                // Enforce download size limit during streaming
                if (downloadedBytes > MAX_DOWNLOAD_SIZE) {
                    fileStream.destroy();
                    response.destroy();
                    reject(new Error(`Download stopped: size exceeded ${Math.round(MAX_DOWNLOAD_SIZE / 1024 / 1024)}MB limit`));
                    return;
                }

                if (sessionId && contentLength > 0) {
                    const stepProgress = Math.min(downloadedBytes / contentLength, 1);
                    updateProgress(sessionId, {
                        status: 'downloading',
                        progress: calculateProgress(1, 6, stepProgress),
                        currentStep: 'Downloading application',
                        message: `Downloaded ${Math.round(downloadedBytes / 1024 / 1024)}MB of ${Math.round(contentLength / 1024 / 1024)}MB`,
                        details: {
                            downloadedBytes,
                            totalBytes: Math.max(contentLength, downloadedBytes)
                        }
                    });
                }
            });

            response.pipe(fileStream);

            fileStream.on('finish', async () => {
                fileStream.close();

                // Final size validation
                const stats = await fs.stat(destination);
                if (stats.size > MAX_DOWNLOAD_SIZE) {
                    // Clean up oversized file
                    await fs.unlink(destination).catch(() => {});
                    reject(new Error(`Download failed: file size ${Math.round(stats.size / 1024 / 1024)}MB exceeds limit`));
                    return;
                }

                resolve();
            });

            fileStream.on('error', async (error: any) => {
                // Clean up partial file on error
                try {
                    await fs.unlink(destination);
                } catch {}
                reject(error);
            });
        }).on('error', reject);
    });
};

const moveFileCrossFilesystem = async (src: string, dest: string): Promise<void> => {
    try {
        // Try atomic rename first (fastest if same filesystem)
        await fs.rename(src, dest);
    } catch (renameError: any) {
        // If rename fails, it's likely a cross-filesystem issue
        if (renameError.code === 'EXDEV' || renameError.code === 'EPERM') {
            // Use copy + unlink for cross-filesystem moves
            await fs.copyFile(src, dest);
            await fs.unlink(src);
        } else {
            throw renameError;
        }
    }
};

const moveDirectoryCrossFilesystem = async (src: string, dest: string): Promise<void> => {
    // Ensure destination directory exists
    await fs.mkdir(dest, { recursive: true });

    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);

        if (entry.isDirectory()) {
            await moveDirectoryCrossFilesystem(srcPath, destPath);
        } else {
            // Validate file size before moving
            const stats = await fs.stat(srcPath);
            if (stats.size > MAX_FILE_SIZE) {
                throw new Error(`File ${entry.name} size ${Math.round(stats.size / 1024 / 1024)}MB exceeds maximum file size limit`);
            }

            await moveFileCrossFilesystem(srcPath, destPath);
        }
    }

    // Clean up empty source directory
    try {
        const remainingEntries = await fs.readdir(src);
        if (remainingEntries.length === 0) {
            await fs.rmdir(src);
        }
    } catch (cleanupError) {
        // Non-critical error, log but don't fail
        console.warn(`Could not clean up empty directory ${src}:`, cleanupError);
    }
};

const extractArchive = async (archivePath: string, extractPath: string): Promise<void> => {
    // First validate archive size
    const stats = await fs.stat(archivePath);
    if (stats.size > MAX_ARCHIVE_SIZE) {
        throw new Error(`Archive size ${Math.round(stats.size / 1024 / 1024)}MB exceeds maximum archive size limit`);
    }

    const ext = extname(archivePath).toLowerCase();

    try {
        switch (ext) {
            case '.zip':
                await execFileAsync('unzip', ['-q', archivePath, '-d', extractPath]);
                break;
            case '.tar':
            case '.gz':
            case '.tgz':
            case '.bz2':
            case '.xz':
                const tarArgs = ['xf', archivePath, '-C', extractPath];
                await execFileAsync('tar', tarArgs);
                break;
            default:
                throw new Error(`Unsupported archive format: ${ext}`);
        }
    } catch (error) {
        throw new Error(`Failed to extract archive: ${error}`);
    }
};

// API Routes

// GET /api/marketplace/apps - List available apps
router.get('/apps', async (req: Request, res: Response) => {
    try {
        const { category, search, page = 1, limit = 20, sort = 'name' } = req.query;

        const appsPath = join(APPS_DIR, 'registry.json');

        try {
            const data = await fs.readFile(appsPath, 'utf-8');
            let apps = JSON.parse(data);

            // Apply filters
            if (category && category !== 'all') {
                apps = apps.filter((app: any) => app.category === category);
            }

            if (search) {
                const searchTerm = (search as string).toLowerCase();
                apps = apps.filter((app: any) =>
                    app.name.toLowerCase().includes(searchTerm) ||
                    app.description.toLowerCase().includes(searchTerm) ||
                    app.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm))
                );
            }

            // Sort
            apps.sort((a: any, b: any) => {
                switch (sort) {
                    case 'name':
                        return a.name.localeCompare(b.name);
                    case 'rating':
                        return b.rating - a.rating;
                    case 'downloads':
                        return b.downloadCount - a.downloadCount;
                    case 'updated':
                        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                    default:
                        return 0;
                }
            });

            // Pagination
            const offset = (Number(page) - 1) * Number(limit);
            const paginatedApps = apps.slice(offset, offset + Number(limit));

            res.json({
                apps: paginatedApps,
                total: apps.length,
                page: Number(page),
                limit: Number(limit),
                hasMore: offset + Number(limit) < apps.length
            });
        } catch (error) {
            // No registry file found
            res.json({
                apps: [],
                total: 0,
                page: Number(page),
                limit: Number(limit),
                hasMore: false
            });
        }
    } catch (error: any) {
        console.error('Failed to list apps:', error);
        res.status(500).json({ error: 'Failed to list apps', details: error.message });
    }
});

// GET /api/marketplace/apps/:appId - Get app details
router.get('/apps/:appId', async (req: Request, res: Response) => {
    try {
        const { appId } = req.params;
        const sanitizedId = sanitizeId(appId);

        if (!appId || appId !== sanitizedId) {
            return res.status(400).json({ error: 'Invalid app ID' });
        }

        const appPath = join(APPS_DIR, sanitizedId, 'manifest.json');

        try {
            const manifestData = await fs.readFile(appPath, 'utf-8');
            const manifest = JSON.parse(manifestData);

            // Add additional metadata
            const stats = await fs.stat(join(APPS_DIR, sanitizedId));
            manifest.installedSize = stats.size;
            manifest.installedAt = stats.birthtime.toISOString();

            res.json(manifest);
        } catch (error) {
            res.status(404).json({ error: 'App not found' });
        }
    } catch (error: any) {
        console.error('Failed to get app details:', error);
        res.status(500).json({ error: 'Failed to get app details', details: error.message });
    }
});

// GET /api/marketplace/categories - List categories
router.get('/categories', async (req: Request, res: Response) => {
    try {
        const categoriesPath = join(APPS_DIR, 'categories.json');

        try {
            const data = await fs.readFile(categoriesPath, 'utf-8');
            const categories = JSON.parse(data);
            res.json(categories);
        } catch (error) {
            // Default categories
            const defaultCategories = [
                { id: 'productivity', name: 'Productivity', icon: 'briefcase' },
                { id: 'development', name: 'Development', icon: 'code' },
                { id: 'multimedia', name: 'Multimedia', icon: 'play-circle' },
                { id: 'games', name: 'Games', icon: 'gamepad-2' },
                { id: 'education', name: 'Education', icon: 'graduation-cap' },
                { id: 'utilities', name: 'Utilities', icon: 'wrench' },
                { id: 'system', name: 'System', icon: 'settings' },
                { id: 'graphics', name: 'Graphics', icon: 'palette' },
                { id: 'network', name: 'Network', icon: 'globe' },
                { id: 'office', name: 'Office', icon: 'file-text' }
            ];
            res.json(defaultCategories);
        }
    } catch (error: any) {
        console.error('Failed to list categories:', error);
        res.status(500).json({ error: 'Failed to list categories', details: error.message });
    }
});

// POST /api/marketplace/install - Install app from URL
router.post('/install', async (req: Request, res: Response) => {
    try {
        const { url, manifestId, permissions, sandboxOptions, scanLevel = 'standard' } = req.body;

        if (!url && !manifestId) {
            return res.status(400).json({ error: 'URL or manifest ID is required' });
        }

        if (url && !validateUrl(url)) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const sessionId = crypto.randomUUID();
        const installDir = join(TEMP_DIR, sessionId);
        await fs.mkdir(installDir, { recursive: true });

        // Create job and initialize progress tracking
        const job = createJob(sessionId, 'install', {
            url,
            userId: req.headers['x-user-id'] as string || 'anonymous'
        });

        // Start installation process in background
        const installApp = async () => {
            try {
                // Update job status to running
                updateJobStatus(sessionId, 'running');
                let archivePath: string;
                let manifest: any;

                if (url) {
                    // Download from URL
                    const fileName = basename(url) || `app-${sessionId}.zip`;
                    archivePath = join(installDir, fileName);

                    updateProgress(sessionId, {
                        status: 'downloading',
                        progress: calculateProgress(1, 7, 0),
                        currentStep: 'Starting download',
                        message: 'Downloading application package...',
                        details: { currentFile: fileName }
                    });

                    await downloadFile(url, archivePath, sessionId);
                } else {
                    // Use manifest ID to download from registry
                    // This would typically fetch from a marketplace server
                    updateProgress(sessionId, {
                        status: 'failed',
                        progress: 0,
                        error: 'Manifest ID installation not implemented yet'
                    });
                    return { error: 'Manifest ID installation not implemented yet' };
                }

                // Step 2: Calculate file hash
                updateProgress(sessionId, {
                    status: 'validating',
                    progress: calculateProgress(2, 7, 0),
                    currentStep: 'Verifying integrity',
                    message: 'Calculating file hash for integrity check...'
                });

                const fileHash = await calculateFileHash(archivePath);

                // Step 3: Extract archive
                updateProgress(sessionId, {
                    status: 'extracting',
                    progress: calculateProgress(3, 7, 0.2),
                    currentStep: 'Extracting files',
                    message: 'Extracting application archive...'
                });

                const extractPath = join(installDir, 'extracted');
                await fs.mkdir(extractPath, { recursive: true });

                try {
                    await extractArchive(archivePath, extractPath);
                    updateProgress(sessionId, {
                        progress: calculateProgress(3, 7, 1),
                        message: 'Archive extracted successfully'
                    });
                } catch (error) {
                    updateProgress(sessionId, {
                        status: 'failed',
                        error: `Failed to extract archive: ${error}`
                    });
                    throw error;
                }

                // Step 4: Find and validate manifest
                updateProgress(sessionId, {
                    status: 'validating',
                    progress: calculateProgress(4, 7, 0.2),
                    currentStep: 'Validating manifest',
                    message: 'Reading and validating application manifest...'
                });

                const manifestPath = join(extractPath, 'manifest.json');
                try {
                    const manifestData = await fs.readFile(manifestPath, 'utf-8');
                    manifest = JSON.parse(manifestData);

                    updateProgress(sessionId, {
                        appId: manifest.id,
                        appName: manifest.name
                    });
                } catch (error) {
                    updateProgress(sessionId, {
                        status: 'failed',
                        error: 'Manifest.json not found or invalid'
                    });
                    throw new Error('Manifest.json not found or invalid');
                }

                // Validate manifest
                const validation = validateManifest(manifest);
                if (!validation.valid) {
                    updateProgress(sessionId, {
                        status: 'failed',
                        error: `Invalid manifest: ${validation.errors.join(', ')}`
                    });
                    throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
                }

                // Step 5: Security scan
                const securityScan = await scanForMalware(extractPath, sessionId, scanLevel);
                if (!securityScan.safe) {
                    updateProgress(sessionId, {
                        status: 'failed',
                        error: `Security scan failed: ${securityScan.threats.join(', ')}`
                    });
                    throw new Error(`Security scan failed: ${securityScan.threats.join(', ')}`);
                }

                // Step 6: Install app
                updateProgress(sessionId, {
                    status: 'installing',
                    progress: calculateProgress(6, 7, 0.1),
                    currentStep: 'Installing application',
                    message: 'Installing application files...'
                });

                const finalAppDir = join(APPS_DIR, sanitizeId(manifest.id));

                // Check if app is already installed and handle appropriately
                const appLockKey = `app-install-${sanitizeId(manifest.id)}`;
                await withLock(appLockKey, async () => {
                    // Ensure we have a clean state to start with
                    try {
                        await fs.access(finalAppDir);
                        // App directory exists, check if it's a partial installation
                        const metadataPath = join(finalAppDir, 'metadata.json');
                        try {
                            await fs.access(metadataPath);
                            // Complete installation exists, we should not overwrite
                            throw new Error(`App ${manifest.id} is already installed`);
                        } catch (metadataError) {
                            // No metadata, likely incomplete installation - clean it up
                            console.warn(`Cleaning up incomplete installation for ${manifest.id}`);
                            await fs.rm(finalAppDir, { recursive: true, force: true });
                        }
                    } catch (accessError) {
                        // Directory doesn't exist, which is what we want
                    }
                });

                // Move extracted files to app directory with atomic operations
                const moveFilesAtomic = async (src: string, dest: string): Promise<void> => {
                    // Ensure destination directory exists with proper permissions
                    await fs.mkdir(dest, { recursive: true, mode: 0o755 });

                    const entries = await fs.readdir(src, { withFileTypes: true });

                    for (const entry of entries) {
                        const srcPath = join(src, entry.name);
                        const destPath = join(dest, entry.name);

                        if (entry.isDirectory()) {
                            await moveFilesAtomic(srcPath, destPath);
                        } else {
                            // Use atomic rename with retry mechanism for safety
                            const maxRetries = 3;
                            let retries = 0;

                            while (retries < maxRetries) {
                                try {
                                    // Check if destination already exists
                                    try {
                                        await fs.access(destPath);
                                        // If exists, remove it first to ensure clean rename
                                        await fs.unlink(destPath);
                                    } catch (accessError) {
                                        // File doesn't exist, which is what we want
                                    }

                                    await moveFileCrossFilesystem(srcPath, destPath);
                                    break; // Success, exit retry loop
                                } catch (renameError) {
                                    retries++;
                                    if (retries >= maxRetries) {
                                        throw new Error(`Failed to move file ${srcPath} to ${destPath} after ${maxRetries} attempts: ${renameError}`);
                                    }
                                    // Wait briefly before retrying (exponential backoff)
                                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100));
                                }
                            }
                        }
                    }

                    // Clean up empty source directory after successful move
                    try {
                        const remainingEntries = await fs.readdir(src);
                        if (remainingEntries.length === 0) {
                            await fs.rmdir(src);
                        }
                    } catch (cleanupError) {
                        // Non-critical error, log but don't fail the installation
                        console.warn(`Could not clean up empty directory ${src}:`, cleanupError);
                    }
                };

                // Create temporary staging directory for atomic operation
                const stagingDir = join(finalAppDir, `.${sessionId}-staging`);

                // Use the app lock for the entire move operation
                await withLock(appLockKey, async () => {
                    await moveFilesAtomic(extractPath, stagingDir);

                    // Ensure final directory doesn't exist before atomic rename
                    try {
                        await fs.rm(finalAppDir, { recursive: true, force: true });
                    } catch (cleanupError) {
                        // Directory might not exist, which is fine
                    }

                    // Perform the atomic rename with retry logic
                    const maxRenameRetries = 3;
                    let renameRetries = 0;

                    while (renameRetries < maxRenameRetries) {
                        try {
                            await moveDirectoryCrossFilesystem(stagingDir, finalAppDir);
                            break; // Success
                        } catch (renameError) {
                            renameRetries++;
                            if (renameRetries >= maxRenameRetries) {
                                throw new Error(`Failed to complete installation after ${maxRenameRetries} rename attempts: ${renameError}`);
                            }
                            // Brief delay before retry
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    }
                });

                // Step 7: Create metadata
                updateProgress(sessionId, {
                    progress: calculateProgress(6, 7, 0.8),
                    currentStep: 'Creating metadata',
                    message: 'Creating application metadata...'
                });

                const metadata = {
                    ...manifest,
                    installedAt: new Date().toISOString(),
                    fileHash,
                    securityScan,
                    permissions: permissions || manifest.permissions,
                    sandboxConfig: sandboxOptions || { enabled: true, type: 'partial' }
                };

                await fs.writeFile(
                    join(finalAppDir, 'metadata.json'),
                    JSON.stringify(metadata, null, 2)
                );

                // Step 8: Clean up
                updateProgress(sessionId, {
                    progress: calculateProgress(7, 7, 0.5),
                    currentStep: 'Cleaning up',
                    message: 'Cleaning up temporary files...'
                });

                // Clean up temp directory with error handling
                try {
                    await fs.rm(installDir, { recursive: true, force: true });
                } catch (cleanupError) {
                    console.warn(`Failed to clean up temp directory ${installDir}:`, cleanupError);
                    // Don't fail the installation if cleanup fails
                }

                // Complete
                updateProgress(sessionId, {
                    status: 'completed',
                    progress: 100,
                    currentStep: 'Installation complete',
                    message: 'Application installed successfully'
                });

                // Update job with app info and mark as completed
                updateJobStatus(sessionId, 'completed', {
                    appId: manifest.id,
                    appName: manifest.name
                });

                return {
                    success: true,
                    appId: manifest.id,
                    appPath: finalAppDir,
                    message: 'App installed successfully'
                };

            } catch (error: any) {
                // Update progress with failure information
                updateProgress(sessionId, {
                    status: 'failed',
                    error: error.message,
                    message: `Installation failed: ${error.message}`
                });

                // Update job status to failed
                updateJobStatus(sessionId, 'failed');

                // Enhanced cleanup on failure with multiple attempts
                const maxCleanupRetries = 3;
                for (let cleanupRetry = 0; cleanupRetry < maxCleanupRetries; cleanupRetry++) {
                    try {
                        await fs.rm(installDir, { recursive: true, force: true });
                        break; // Success
                    } catch (cleanupError) {
                        if (cleanupRetry === maxCleanupRetries - 1) {
                            console.warn(`Failed to clean up temp directory ${installDir} after ${maxCleanupRetries} attempts:`, cleanupError);
                        } else {
                            // Brief delay before retry
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }
                }

                return {
                    success: false,
                    error: error.message
                };
            }
        };

        // Start installation asynchronously with race condition protection
        const lockKey = manifestId ? `manifest-${manifestId}` : `url-${crypto.createHash('sha256').update(url).digest('hex').substring(0, 16)}`;

        withLock(lockKey, installApp).then(result => {
            console.log(`Installation ${sessionId} (${lockKey}):`, result);
        }).catch(error => {
            console.error(`Installation ${sessionId} (${lockKey}) failed:`, error);
        });

        res.json({
            success: true,
            sessionId,
            message: 'Installation started',
            progressUrl: `/api/marketplace/install/${sessionId}/progress`
        });

    } catch (error: any) {
        console.error('Failed to start app installation:', error);
        res.status(500).json({ error: 'Failed to start installation', details: error.message });
    }
});

// GET /api/marketplace/install/:sessionId - Get installation status
router.get('/install/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        // Check progress tracking first
        const progress = installationProgress.get(sessionId);
        if (progress) {
            res.json(progress);
            return;
        }

        // Fallback to old method for backwards compatibility
        const installDir = join(TEMP_DIR, sessionId);
        try {
            await fs.access(installDir);
            res.json({
                sessionId,
                status: 'installing',
                progress: 0,
                message: 'Installation in progress',
                currentStep: 'Installing',
                totalSteps: 7
            });
        } catch (error) {
            // Check if completed (temp dir cleaned up)
            res.status(404).json({
                sessionId,
                status: 'not_found',
                message: 'Installation session not found or completed'
            });
        }
    } catch (error: any) {
        console.error('Failed to get installation status:', error);
        res.status(500).json({ error: 'Failed to get installation status', details: error.message });
    }
});

// GET /api/marketplace/install/:sessionId/progress - Get detailed installation progress
router.get('/install/:sessionId/progress', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const progress = installationProgress.get(sessionId);
        if (progress) {
            // Calculate elapsed time
            const elapsed = Date.now() - progress.startTime;
            const elapsedSeconds = Math.floor(elapsed / 1000);

            const progressWithTime = {
                ...progress,
                elapsedTime: elapsedSeconds,
                elapsedFormatted: `${Math.floor(elapsedSeconds / 60)}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`
            };

            res.json(progressWithTime);
        } else {
            res.status(404).json({
                sessionId,
                status: 'not_found',
                message: 'Installation session not found'
            });
        }
    } catch (error: any) {
        console.error('Failed to get installation progress:', error);
        res.status(500).json({ error: 'Failed to get installation progress', details: error.message });
    }
});

// DELETE /api/marketplace/install/:sessionId - Cancel installation
router.delete('/install/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const result = await cancelJob(sessionId);

        if (result.success) {
            res.json({
                success: true,
                sessionId,
                message: 'Installation cancelled successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                sessionId,
                error: result.reason || 'Failed to cancel installation'
            });
        }
    } catch (error: any) {
        console.error('Failed to cancel installation:', error);
        res.status(500).json({ error: 'Failed to cancel installation', details: error.message });
    }
});

// GET /api/marketplace/jobs - List all jobs
router.get('/jobs', async (req: Request, res: Response) => {
    try {
        const { status, type, userId } = req.query;

        let jobs = Array.from(activeJobs.values());

        // Apply filters
        if (status) {
            jobs = jobs.filter(job => job.status === status);
        }
        if (type) {
            jobs = jobs.filter(job => job.type === type);
        }
        if (userId) {
            jobs = jobs.filter(job => job.userId === userId);
        }

        // Sort by creation time (newest first)
        jobs.sort((a, b) => b.createdAt - a.createdAt);

        // Calculate job statistics
        const stats = {
            total: jobs.length,
            pending: jobs.filter(j => j.status === 'pending').length,
            running: jobs.filter(j => j.status === 'running').length,
            completed: jobs.filter(j => j.status === 'completed').length,
            failed: jobs.filter(j => j.status === 'failed').length,
            cancelled: jobs.filter(j => j.status === 'cancelled').length
        };

        res.json({
            jobs: jobs.map(job => ({
                sessionId: job.sessionId,
                type: job.type,
                status: job.status,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                appId: job.appId,
                appName: job.appName,
                url: job.url,
                userId: job.userId,
                progress: job.progress.progress,
                currentStep: job.progress.currentStep,
                message: job.progress.message,
                error: job.progress.error,
                // Calculate duration if job is completed
                duration: job.completedAt && job.startedAt ? job.completedAt - job.startedAt :
                         job.startedAt ? Date.now() - job.startedAt : null
            })),
            stats
        });
    } catch (error: any) {
        console.error('Failed to list jobs:', error);
        res.status(500).json({ error: 'Failed to list jobs', details: error.message });
    }
});

// GET /api/marketplace/jobs/:sessionId - Get detailed job information
router.get('/jobs/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const job = activeJobs.get(sessionId);
        if (job) {
            // Calculate elapsed and duration times
            const now = Date.now();
            const elapsed = now - job.createdAt;
            const duration = job.completedAt && job.startedAt ? job.completedAt - job.startedAt :
                            job.startedAt ? now - job.startedAt : null;

            const jobWithDetails = {
                ...job,
                elapsed,
                elapsedFormatted: `${Math.floor(elapsed / 1000)}s`,
                duration,
                durationFormatted: duration ? `${Math.floor(duration / 1000)}s` : null,
                progress: {
                    ...job.progress,
                    elapsedTime: Math.floor((now - job.progress.startTime) / 1000),
                    elapsedFormatted: `${Math.floor((now - job.progress.startTime) / 60000)}:${(Math.floor((now - job.progress.startTime) / 1000) % 60).toString().padStart(2, '0')}`
                }
            };

            res.json(jobWithDetails);
        } else {
            res.status(404).json({
                sessionId,
                error: 'Job not found'
            });
        }
    } catch (error: any) {
        console.error('Failed to get job details:', error);
        res.status(500).json({ error: 'Failed to get job details', details: error.message });
    }
});

// DELETE /api/marketplace/apps/:appId - Uninstall app
router.delete('/apps/:appId', async (req: Request, res: Response) => {
    try {
        const { appId } = req.params;
        const sanitizedId = sanitizeId(appId);

        if (!appId || appId !== sanitizedId) {
            return res.status(400).json({ error: 'Invalid app ID' });
        }

        const appPath = join(APPS_DIR, sanitizedId);

        try {
            await fs.access(appPath);

            // Check if app is currently running
            // This would require integration with app manager

            // Remove app directory
            await fs.rm(appPath, { recursive: true, force: true });

            res.json({
                success: true,
                message: 'App uninstalled successfully'
            });
        } catch (error) {
            res.status(404).json({ error: 'App not found' });
        }
    } catch (error: any) {
        console.error('Failed to uninstall app:', error);
        res.status(500).json({ error: 'Failed to uninstall app', details: error.message });
    }
});

// GET /api/marketplace/apps/:appId/updates - Check for updates
router.get('/apps/:appId/updates', async (req: Request, res: Response) => {
    try {
        const { appId } = req.params;
        const sanitizedId = sanitizeId(appId);

        if (!appId || appId !== sanitizedId) {
            return res.status(400).json({ error: 'Invalid app ID' });
        }

        const appPath = join(APPS_DIR, sanitizedId);
        const manifestPath = join(appPath, 'manifest.json');

        try {
            const manifestData = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestData);

            // Check for updates (placeholder logic)
            const hasUpdates = false; // This would check against marketplace server

            res.json({
                hasUpdates,
                currentVersion: manifest.version,
                latestVersion: manifest.version,
                updates: hasUpdates ? [{
                    version: '1.0.1',
                    changelog: ['Bug fixes', 'Performance improvements'],
                    downloadUrl: '',
                    size: 0,
                    mandatory: false,
                    publishedAt: new Date().toISOString()
                }] : []
            });
        } catch (error) {
            res.status(404).json({ error: 'App not found' });
        }
    } catch (error: any) {
        console.error('Failed to check for updates:', error);
        res.status(500).json({ error: 'Failed to check for updates', details: error.message });
    }
});

// POST /api/marketplace/apps/:appId/update - Update app
router.post('/apps/:appId/update', async (req: Request, res: Response) => {
    try {
        const { appId } = req.params;
        const sanitizedId = sanitizeId(appId);

        if (!appId || appId !== sanitizedId) {
            return res.status(400).json({ error: 'Invalid app ID' });
        }

        // Update logic would go here
        res.json({
            success: true,
            message: 'App update started'
        });
    } catch (error: any) {
        console.error('Failed to update app:', error);
        res.status(500).json({ error: 'Failed to update app', details: error.message });
    }
});

// GET /api/marketplace/installed - List installed apps
router.get('/installed', async (req: Request, res: Response) => {
    try {
        const installedApps: any[] = [];

        try {
            const appDirs = await fs.readdir(APPS_DIR, { withFileTypes: true });

            for (const dir of appDirs) {
                if (dir.isDirectory()) {
                    try {
                        const manifestPath = join(APPS_DIR, dir.name, 'manifest.json');
                        const metadataPath = join(APPS_DIR, dir.name, 'metadata.json');

                        const manifestData = await fs.readFile(manifestPath, 'utf-8');
                        const manifest = JSON.parse(manifestData);

                        let metadata = {};
                        try {
                            const metadataData = await fs.readFile(metadataPath, 'utf-8');
                            metadata = JSON.parse(metadataData);
                        } catch {}

                        const stats = await fs.stat(join(APPS_DIR, dir.name));

                        installedApps.push({
                            ...manifest,
                            ...metadata,
                            installPath: join(APPS_DIR, dir.name),
                            installedSize: stats.size,
                            status: 'installed'
                        });
                    } catch (error) {
                        console.warn(`Failed to load app ${dir.name}:`, error);
                    }
                }
            }
        } catch (error) {
            console.warn('No apps directory found');
        }

        res.json({
            apps: installedApps,
            total: installedApps.length
        });
    } catch (error: any) {
        console.error('Failed to list installed apps:', error);
        res.status(500).json({ error: 'Failed to list installed apps', details: error.message });
    }
});

// Run cleanup every 15 minutes
setInterval(cleanupOldJobs, 15 * 60 * 1000);

// Initialize marketplace directories
initializeDirectories().catch(console.error);

export default router;
