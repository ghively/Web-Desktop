// Virtual File System (VFS) types and interfaces inspired by OS.js and ArozOS

export interface VFSNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
  created: Date;
  permissions: FilePermissions;
  owner: string;
  group: string;
  metadata: Record<string, any>;
}

export interface FilePermissions {
  read: boolean;
  write: boolean;
  execute: boolean;
  owner: string;
  group: string;
  mode: string; // octal mode like '755'
}

export interface VFSAdapter {
  name: string;
  type: 'local' | 'webdav' | 'ftp' | 'sftp' | 'cloud' | 'memory';
  mountPath: string;
  priority: number;

  // Core file operations
  read(path: string): Promise<Buffer | Uint8Array>;
  write(path: string, data: Buffer | Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<VFSNode>;
  readdir(path: string): Promise<VFSNode[]>;
  mkdir(path: string): Promise<void>;
  rmdir(path: string): Promise<void>;
  unlink(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  copy(src: string, dest: string): Promise<void>;

  // Advanced operations
  watch(path: string, callback: (event: FileWatchEvent) => void): Promise<FileWatcher>;
  getCapabilities(): VFSAdapterCapabilities;
  isConnected(): boolean;
  mount(): Promise<void>;
  unmount(): Promise<void>;
}

export interface VFSAdapterCapabilities {
  supportsRealtime: boolean;
  supportsPermissions: boolean;
  supportsSymlinks: boolean;
  supportsHardlinks: boolean;
  supportsLocking: boolean;
  maxFileSize: number;
  supportedProtocols: string[];
}

export interface FileWatchEvent {
  type: 'created' | 'modified' | 'deleted' | 'renamed';
  path: string;
  oldPath?: string;
  timestamp: Date;
}

export interface FileWatcher {
  close(): void;
  path: string;
  isActive: boolean;
}

export interface VFSMount {
  id: string;
  path: string;
  adapter: VFSAdapter;
  autoMount: boolean;
  options: Record<string, any>;
  mountedAt: Date;
}

export interface FileOperation {
  id: string;
  type: 'copy' | 'move' | 'delete' | 'upload' | 'download';
  source: string;
  destination?: string;
  progress: number;
  totalBytes: number;
  transferredBytes: number;
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
  error?: string;
  startTime: Date;
  endTime?: Date;
}

export interface VFSTransaction {
  id: string;
  operations: FileOperation[];
  rollbackOperations: FileOperation[];
  status: 'pending' | 'running' | 'committed' | 'rolledback' | 'error';
  startTime: Date;
}

// Main VFS Manager interface
export interface VFSManager {
  // Adapter management
  registerAdapter(adapter: VFSAdapter): void;
  unregisterAdapter(name: string): void;
  getAdapter(name: string): VFSAdapter | null;
  listAdapters(): VFSAdapter[];

  // Mount management
  mount(path: string, adapter: VFSAdapter, options?: Record<string, any>): Promise<VFSMount>;
  unmount(path: string): Promise<void>;
  listMounts(): VFSMount[];

  // Path resolution (virtual to physical)
  resolvePath(virtualPath: string): string;
  normalizePath(path: string): string;
  isVirtualPath(path: string): boolean;

  // File operations
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: Buffer | Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<VFSNode>;
  readdir(path: string): Promise<VFSNode[]>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  remove(path: string, recursive?: boolean): Promise<void>;
  copy(src: string, dest: string): Promise<FileOperation>;
  move(src: string, dest: string): Promise<FileOperation>;

  // Batch operations
  createTransaction(): VFSTransaction;
  commitTransaction(transactionId: string): Promise<void>;
  rollbackTransaction(transactionId: string): Promise<void>;

  // File watching
  watch(path: string, callback: (event: FileWatchEvent) => void): Promise<FileWatcher>;
  unwatch(watcher: FileWatcher): void;

  // Search and indexing
  search(query: string, path?: string): Promise<VFSNode[]>;
  indexFiles(path: string): Promise<void>;

  // Permissions and security
  checkPermission(path: string, permission: 'read' | 'write' | 'execute'): Promise<boolean>;
  setPermissions(path: string, permissions: Partial<FilePermissions>): Promise<void>;

  // Caching and optimization
  clearCache(path?: string): void;
  getCacheStats(): { hits: number; misses: number; size: number };
}

// Predefined adapter configurations
export interface LocalFSConfig {
  rootPath: string;
  followSymlinks: boolean;
  caseSensitive: boolean;
  maxCacheSize: number;
}

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  authMethod: 'basic' | 'digest' | 'token';
  sslVerify: boolean;
  timeout: number;
}

export interface FTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  passiveMode: boolean;
  encoding: string;
}

export interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
  algorithms: {
    kex: string[];
    cipher: string[];
    mac: string[];
  };
  timeout: number;
}

// File system events
export interface VFSEventMap {
  'file:created': (node: VFSNode) => void;
  'file:modified': (node: VFSNode) => void;
  'file:deleted': (path: string) => void;
  'file:renamed': (oldPath: string, newPath: string) => void;
  'directory:created': (node: VFSNode) => void;
  'directory:deleted': (path: string) => void;
  'mount:added': (mount: VFSMount) => void;
  'mount:removed': (path: string) => void;
  'operation:started': (operation: FileOperation) => void;
  'operation:progress': (operation: FileOperation) => void;
  'operation:completed': (operation: FileOperation) => void;
  'operation:error': (operation: FileOperation, error: Error) => void;
}

// VFS error types
export class VFSError extends Error {
  constructor(
    message: string,
    public code: string,
    public path?: string,
    public operation?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'VFSError';
  }
}

export const VFSErrorCodes = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_PATH: 'INVALID_PATH',
  ADAPTER_NOT_FOUND: 'ADAPTER_NOT_FOUND',
  MOUNT_POINT_EXISTS: 'MOUNT_POINT_EXISTS',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  OPERATION_CANCELLED: 'OPERATION_CANCELLED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION'
} as const;