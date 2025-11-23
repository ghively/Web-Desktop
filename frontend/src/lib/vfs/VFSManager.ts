import { VFSManager, VFSAdapter, VFSMount, VFSNode, FileOperation, VFSTransaction, FileWatcher, FileWatchEvent, VFSError, VFSErrorCodes, VFSAdapterCapabilities, FilePermissions } from '../../types/vfs';
import { EventEmitter } from 'events';

export class WebDesktopVFSManager extends EventEmitter implements VFSManager {
  private adapters: Map<string, VFSAdapter> = new Map();
  private mounts: Map<string, VFSMount> = new Map();
  private watchers: Map<string, FileWatcher[]> = new Map();
  private transactions: Map<string, VFSTransaction> = new Map();
  private operations: Map<string, FileOperation> = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private cacheStats = { hits: 0, misses: 0, size: 0 };

  constructor() {
    super();
    this.setupDefaultAdapters();
  }

  private setupDefaultAdapters() {
    // Register built-in adapters
    this.registerAdapter(new LocalFSAdapter());
    this.registerAdapter(new MemoryFSAdapter());
    this.registerAdapter(new IndexedDBAdapter());
  }

  // Adapter management
  registerAdapter(adapter: VFSAdapter): void {
    this.adapters.set(adapter.name, adapter);
    this.emit('adapter:registered', adapter);
  }

  unregisterAdapter(name: string): void {
    const adapter = this.adapters.get(name);
    if (adapter) {
      // Unmount all mounts using this adapter
      for (const [path, mount] of this.mounts) {
        if (mount.adapter.name === name) {
          this.unmount(path).catch(console.error);
        }
      }
      this.adapters.delete(name);
      this.emit('adapter:unregistered', adapter);
    }
  }

  getAdapter(name: string): VFSAdapter | null {
    return this.adapters.get(name) || null;
  }

  listAdapters(): VFSAdapter[] {
    return Array.from(this.adapters.values());
  }

  // Mount management
  async mount(path: string, adapter: VFSAdapter, options: Record<string, any> = {}): Promise<VFSMount> {
    if (this.mounts.has(path)) {
      throw new VFSError(`Mount point already exists: ${path}`, VFSErrorCodes.MOUNT_POINT_EXISTS, path);
    }

    if (!this.adapters.has(adapter.name)) {
      throw new VFSError(`Adapter not found: ${adapter.name}`, VFSErrorCodes.ADAPTER_NOT_FOUND);
    }

    try {
      await adapter.mount();

      const mount: VFSMount = {
        id: this.generateId(),
        path: this.normalizePath(path),
        adapter,
        autoMount: options.autoMount || false,
        options,
        mountedAt: new Date()
      };

      this.mounts.set(path, mount);
      this.emit('mount:added', mount);

      return mount;
    } catch (error) {
      throw new VFSError(
        `Failed to mount ${path}: ${error.message}`,
        VFSErrorCodes.NETWORK_ERROR,
        path,
        'mount',
        error
      );
    }
  }

  async unmount(path: string): Promise<void> {
    const mount = this.mounts.get(path);
    if (!mount) {
      throw new VFSError(`Mount point not found: ${path}`, VFSErrorCodes.FILE_NOT_FOUND, path);
    }

    try {
      // Stop all watchers for this mount
      const watchers = this.watchers.get(path) || [];
      watchers.forEach(watcher => watcher.close());
      this.watchers.delete(path);

      await mount.adapter.unmount();
      this.mounts.delete(path);
      this.emit('mount:removed', path);
    } catch (error) {
      throw new VFSError(
        `Failed to unmount ${path}: ${error.message}`,
        VFSErrorCodes.NETWORK_ERROR,
        path,
        'unmount',
        error
      );
    }
  }

  listMounts(): VFSMount[] {
    return Array.from(this.mounts.values());
  }

  // Path resolution
  resolvePath(virtualPath: string): string {
    const normalized = this.normalizePath(virtualPath);

    // Find the most specific mount point
    let bestMatch: VFSMount | null = null;
    let bestMatchLength = 0;

    for (const [mountPath, mount] of this.mounts) {
      if (normalized.startsWith(mountPath) && mountPath.length > bestMatchLength) {
        bestMatch = mount;
        bestMatchLength = mountPath.length;
      }
    }

    if (!bestMatch) {
      throw new VFSError(`No mount found for path: ${virtualPath}`, VFSErrorCodes.FILE_NOT_FOUND, virtualPath);
    }

    const relativePath = normalized.slice(bestMatchLength);
    return relativePath || '/';
  }

  normalizePath(path: string): string {
    // Convert backslashes to forward slashes
    path = path.replace(/\\/g, '/');

    // Remove duplicate slashes
    path = path.replace(/\/+/g, '/');

    // Remove trailing slash (except for root)
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    // Ensure leading slash
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    return path;
  }

  isVirtualPath(path: string): boolean {
    return path.startsWith('/');
  }

  // File operations
  async readFile(path: string): Promise<Buffer> {
    const cached = this.getCached(path);
    if (cached) {
      return cached;
    }

    const mount = this.findMountForPath(path);
    const relativePath = this.resolvePath(path);

    try {
      const data = await mount.adapter.read(relativePath);
      this.setCache(path, data, 300000); // 5 minutes cache
      return Buffer.from(data);
    } catch (error) {
      throw new VFSError(
        `Failed to read file ${path}: ${error.message}`,
        VFSErrorCodes.FILE_NOT_FOUND,
        path,
        'read',
        error
      );
    }
  }

  async writeFile(path: string, data: Buffer | Uint8Array): Promise<void> {
    const mount = this.findMountForPath(path);
    const relativePath = this.resolvePath(path);

    try {
      await mount.adapter.write(relativePath, data);
      this.clearCache(path);
      this.emit('file:modified', { path, type: 'file' });
    } catch (error) {
      throw new VFSError(
        `Failed to write file ${path}: ${error.message}`,
        VFSErrorCodes.PERMISSION_DENIED,
        path,
        'write',
        error
      );
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const mount = this.findMountForPath(path);
      const relativePath = this.resolvePath(path);
      return await mount.adapter.exists(relativePath);
    } catch (error) {
      return false;
    }
  }

  async stat(path: string): Promise<VFSNode> {
    const cached = this.getCached(path);
    if (cached) {
      return cached;
    }

    const mount = this.findMountForPath(path);
    const relativePath = this.resolvePath(path);

    try {
      const node = await mount.adapter.stat(relativePath);
      this.setCache(path, node, 60000); // 1 minute cache
      return node;
    } catch (error) {
      throw new VFSError(
        `Failed to stat ${path}: ${error.message}`,
        VFSErrorCodes.FILE_NOT_FOUND,
        path,
        'stat',
        error
      );
    }
  }

  async readdir(path: string): Promise<VFSNode[]> {
    const cached = this.getCached(path);
    if (cached) {
      return cached;
    }

    const mount = this.findMountForPath(path);
    const relativePath = this.resolvePath(path);

    try {
      const nodes = await mount.adapter.readdir(relativePath);
      this.setCache(path, nodes, 30000); // 30 seconds cache
      return nodes;
    } catch (error) {
      throw new VFSError(
        `Failed to read directory ${path}: ${error.message}`,
        VFSErrorCodes.FILE_NOT_FOUND,
        path,
        'readdir',
        error
      );
    }
  }

  async mkdir(path: string, recursive: boolean = false): Promise<void> {
    const mount = this.findMountForPath(path);
    const relativePath = this.resolvePath(path);

    try {
      if (recursive) {
        const parts = relativePath.split('/').filter(p => p);
        let currentPath = '';

        for (const part of parts) {
          currentPath += '/' + part;
          if (!(await mount.adapter.exists(currentPath))) {
            await mount.adapter.mkdir(currentPath);
          }
        }
      } else {
        await mount.adapter.mkdir(relativePath);
      }

      this.clearCache(path);
      this.emit('directory:created', { path, type: 'directory' });
    } catch (error) {
      throw new VFSError(
        `Failed to create directory ${path}: ${error.message}`,
        VFSErrorCodes.PERMISSION_DENIED,
        path,
        'mkdir',
        error
      );
    }
  }

  async remove(path: string, recursive: boolean = false): Promise<void> {
    const mount = this.findMountForPath(path);
    const relativePath = this.resolvePath(path);

    try {
      if (recursive) {
        const node = await mount.adapter.stat(relativePath);
        if (node.type === 'directory') {
          const children = await mount.adapter.readdir(relativePath);
          for (const child of children) {
            await this.remove(path + '/' + child.name, true);
          }
          await mount.adapter.rmdir(relativePath);
          this.emit('directory:deleted', path);
        } else {
          await mount.adapter.unlink(relativePath);
          this.emit('file:deleted', path);
        }
      } else {
        const node = await mount.adapter.stat(relativePath);
        if (node.type === 'directory') {
          await mount.adapter.rmdir(relativePath);
          this.emit('directory:deleted', path);
        } else {
          await mount.adapter.unlink(relativePath);
          this.emit('file:deleted', path);
        }
      }

      this.clearCache(path);
    } catch (error) {
      throw new VFSError(
        `Failed to remove ${path}: ${error.message}`,
        VFSErrorCodes.PERMISSION_DENIED,
        path,
        'remove',
        error
      );
    }
  }

  async copy(src: string, dest: string): Promise<FileOperation> {
    const operation = this.createOperation('copy', src, dest);

    try {
      this.emit('operation:started', operation);

      const srcMount = this.findMountForPath(src);
      const destMount = this.findMountForPath(dest);
      const srcRelativePath = this.resolvePath(src);
      const destRelativePath = this.resolvePath(dest);

      const srcNode = await srcMount.adapter.stat(srcRelativePath);
      operation.totalBytes = srcNode.size;

      // Stream copy with progress tracking
      const srcData = await srcMount.adapter.read(srcRelativePath);
      operation.transferredBytes = srcData.length;
      operation.progress = 100;

      await destMount.adapter.write(destRelativePath, srcData);

      operation.status = 'completed';
      operation.endTime = new Date();
      this.emit('operation:completed', operation);

      return operation;
    } catch (error) {
      operation.status = 'error';
      operation.error = error.message;
      operation.endTime = new Date();
      this.emit('operation:error', operation, error);

      throw new VFSError(
        `Failed to copy ${src} to ${dest}: ${error.message}`,
        VFSErrorCodes.NETWORK_ERROR,
        src,
        'copy',
        error
      );
    } finally {
      this.operations.delete(operation.id);
    }
  }

  async move(src: string, dest: string): Promise<FileOperation> {
    const operation = this.createOperation('move', src, dest);

    try {
      this.emit('operation:started', operation);

      const srcMount = this.findMountForPath(src);
      const destMount = this.findMountForPath(dest);
      const srcRelativePath = this.resolvePath(src);
      const destRelativePath = this.resolvePath(dest);

      // If same mount, use rename for efficiency
      if (srcMount === destMount) {
        await srcMount.adapter.rename(srcRelativePath, destRelativePath);
      } else {
        // Copy then delete
        await this.copy(src, dest);
        await this.remove(src);
      }

      operation.status = 'completed';
      operation.endTime = new Date();
      this.emit('operation:completed', operation);
      this.emit('file:renamed', src, dest);

      return operation;
    } catch (error) {
      operation.status = 'error';
      operation.error = error.message;
      operation.endTime = new Date();
      this.emit('operation:error', operation, error);

      throw new VFSError(
        `Failed to move ${src} to ${dest}: ${error.message}`,
        VFSErrorCodes.NETWORK_ERROR,
        src,
        'move',
        error
      );
    } finally {
      this.operations.delete(operation.id);
    }
  }

  // Batch operations
  createTransaction(): VFSTransaction {
    const transaction: VFSTransaction = {
      id: this.generateId(),
      operations: [],
      rollbackOperations: [],
      status: 'pending',
      startTime: new Date()
    };

    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new VFSError(`Transaction not found: ${transactionId}`, VFSErrorCodes.FILE_NOT_FOUND);
    }

    transaction.status = 'running';

    try {
      for (const operation of transaction.operations) {
        await this.executeOperation(operation);
      }
      transaction.status = 'committed';
    } catch (error) {
      await this.rollbackTransaction(transactionId);
      transaction.status = 'error';
      throw error;
    } finally {
      this.transactions.delete(transactionId);
    }
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new VFSError(`Transaction not found: ${transactionId}`, VFSErrorCodes.FILE_NOT_FOUND);
    }

    transaction.status = 'rolling back';

    try {
      for (const operation of transaction.rollbackOperations.reverse()) {
        await this.executeOperation(operation);
      }
      transaction.status = 'rolledback';
    } catch (error) {
      transaction.status = 'error';
      throw error;
    }
  }

  // File watching
  async watch(path: string, callback: (event: FileWatchEvent) => void): Promise<FileWatcher> {
    const mount = this.findMountForPath(path);
    const relativePath = this.resolvePath(path);

    const watcher = await mount.adapter.watch(relativePath, callback);

    const mountWatchers = this.watchers.get(mount.path) || [];
    mountWatchers.push(watcher);
    this.watchers.set(mount.path, mountWatchers);

    return watcher;
  }

  unwatch(watcher: FileWatcher): void {
    watcher.close();

    for (const [mountPath, watchers] of this.watchers) {
      const index = watchers.indexOf(watcher);
      if (index !== -1) {
        watchers.splice(index, 1);
        if (watchers.length === 0) {
          this.watchers.delete(mountPath);
        }
        break;
      }
    }
  }

  // Search and indexing
  async search(query: string, basePath?: string): Promise<VFSNode[]> {
    const results: VFSNode[] = [];
    const searchPaths = basePath ? [basePath] : Array.from(this.mounts.keys());

    for (const mountPath of searchPaths) {
      const mount = this.mounts.get(mountPath);
      if (mount) {
        try {
          const relativePath = this.resolvePath(mountPath);
          const nodes = await this.searchInMount(mount, relativePath, query);
          results.push(...nodes);
        } catch (error) {
          console.error(`Search failed in ${mountPath}:`, error);
        }
      }
    }

    return results;
  }

  private async searchInMount(mount: VFSMount, path: string, query: string): Promise<VFSNode[]> {
    const results: VFSNode[] = [];
    const nodes = await mount.adapter.readdir(path);

    for (const node of nodes) {
      if (node.name.toLowerCase().includes(query.toLowerCase())) {
        results.push(node);
      }

      if (node.type === 'directory') {
        try {
          const subResults = await this.searchInMount(mount, path + '/' + node.name, query);
          results.push(...subResults);
        } catch (error) {
          // Skip directories we can't access
        }
      }
    }

    return results;
  }

  async indexFiles(path: string): Promise<void> {
    // Implementation for file indexing
    // This would create a searchable index of files
    console.log(`Indexing files in: ${path}`);
  }

  // Permissions and security
  async checkPermission(path: string, permission: 'read' | 'write' | 'execute'): Promise<boolean> {
    try {
      const mount = this.findMountForPath(path);
      const relativePath = this.resolvePath(path);
      const node = await mount.adapter.stat(relativePath);

      switch (permission) {
        case 'read':
          return node.permissions.read;
        case 'write':
          return node.permissions.write;
        case 'execute':
          return node.permissions.execute;
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  async setPermissions(path: string, permissions: Partial<FilePermissions>): Promise<void> {
    const mount = this.findMountForPath(path);
    const relativePath = this.resolvePath(path);

    // Implementation would depend on adapter capabilities
    console.log(`Setting permissions for ${path}:`, permissions);
  }

  // Caching
  clearCache(path?: string): void {
    if (path) {
      const keys = Array.from(this.cache.keys()).filter(key => key.startsWith(path));
      keys.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  getCacheStats(): { hits: number; misses: number; size: number } {
    return { ...this.cacheStats };
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.cacheStats.hits++;
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    this.cacheStats.misses++;
    return null;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
    this.cacheStats.size = this.cache.size;
  }

  // Helper methods
  private findMountForPath(path: string): VFSMount {
    const normalized = this.normalizePath(path);

    let bestMatch: VFSMount | null = null;
    let bestMatchLength = 0;

    for (const [mountPath, mount] of this.mounts) {
      if (normalized.startsWith(mountPath) && mountPath.length > bestMatchLength) {
        bestMatch = mount;
        bestMatchLength = mountPath.length;
      }
    }

    if (!bestMatch) {
      throw new VFSError(`No mount found for path: ${path}`, VFSErrorCodes.FILE_NOT_FOUND, path);
    }

    return bestMatch;
  }

  private createOperation(type: FileOperation['type'], source: string, destination?: string): FileOperation {
    const operation: FileOperation = {
      id: this.generateId(),
      type,
      source,
      destination,
      progress: 0,
      totalBytes: 0,
      transferredBytes: 0,
      status: 'pending',
      startTime: new Date()
    };

    this.operations.set(operation.id, operation);
    return operation;
  }

  private async executeOperation(operation: FileOperation): Promise<void> {
    switch (operation.type) {
      case 'copy':
        await this.copy(operation.source, operation.destination!);
        break;
      case 'move':
        await this.move(operation.source, operation.destination!);
        break;
      case 'delete':
        await this.remove(operation.source);
        break;
      default:
        throw new VFSError(`Unknown operation type: ${operation.type}`, VFSErrorCodes.UNSUPPORTED_OPERATION);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Adapter implementations
class LocalFSAdapter implements VFSAdapter {
  name = 'local';
  type = 'local' as const;
  mountPath = '/';
  priority = 1;

  async read(path: string): Promise<Buffer> {
    throw new Error('LocalFSAdapter not implemented in browser environment');
  }

  async write(path: string, data: Buffer | Uint8Array): Promise<void> {
    throw new Error('LocalFSAdapter not implemented in browser environment');
  }

  async exists(path: string): Promise<boolean> {
    return false; // Placeholder
  }

  async stat(path: string): Promise<VFSNode> {
    throw new Error('LocalFSAdapter not implemented in browser environment');
  }

  async readdir(path: string): Promise<VFSNode[]> {
    throw new Error('LocalFSAdapter not implemented in browser environment');
  }

  async mkdir(path: string): Promise<void> {
    throw new Error('LocalFSAdapter not implemented in browser environment');
  }

  async rmdir(path: string): Promise<void> {
    throw new Error('LocalFSAdapter not implemented in browser environment');
  }

  async unlink(path: string): Promise<void> {
    throw new Error('LocalFSAdapter not implemented in browser environment');
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    throw new Error('LocalFSAdapter not implemented in browser environment');
  }

  async copy(src: string, dest: string): Promise<void> {
    throw new Error('LocalFSAdapter not implemented in browser environment');
  }

  async watch(path: string, callback: (event: FileWatchEvent) => void): Promise<FileWatcher> {
    throw new Error('LocalFSAdapter not implemented in browser environment');
  }

  getCapabilities(): VFSAdapterCapabilities {
    return {
      supportsRealtime: false,
      supportsPermissions: true,
      supportsSymlinks: true,
      supportsHardlinks: true,
      supportsLocking: true,
      maxFileSize: Number.MAX_SAFE_INTEGER,
      supportedProtocols: ['file']
    };
  }

  isConnected(): boolean {
    return false;
  }

  async mount(): Promise<void> {
    // No mount operation needed for local filesystem
  }

  async unmount(): Promise<void> {
    // No unmount operation needed for local filesystem
  }
}

class MemoryFSAdapter implements VFSAdapter {
  name = 'memory';
  type = 'memory' as const;
  mountPath = '/memory';
  priority = 10;
  private files: Map<string, { data: Buffer | Uint8Array; node: VFSNode }> = new Map();

  async read(path: string): Promise<Buffer> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    return Buffer.from(file.data);
  }

  async write(path: string, data: Buffer | Uint8Array): Promise<void> {
    const node: VFSNode = {
      path,
      name: path.split('/').pop() || '',
      type: 'file',
      size: data.length,
      modified: new Date(),
      created: this.files.has(path) ? this.files.get(path)!.node.created : new Date(),
      permissions: {
        read: true,
        write: true,
        execute: false,
        owner: 'user',
        group: 'users',
        mode: '644'
      },
      owner: 'user',
      group: 'users',
      metadata: {}
    };

    this.files.set(path, { data, node });
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async stat(path: string): Promise<VFSNode> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    return { ...file.node };
  }

  async readdir(path: string): Promise<VFSNode[]> {
    const nodes: VFSNode[] = [];
    const prefix = path.endsWith('/') ? path : path + '/';

    for (const [filePath, file] of this.files) {
      if (filePath.startsWith(prefix)) {
        const relativePath = filePath.slice(prefix.length);
        const parts = relativePath.split('/');

        if (parts.length === 1) {
          // Direct child
          nodes.push(file.node);
        } else if (!this.files.get(path + '/' + parts[0])) {
          // Parent directory not listed yet
          const dirNode: VFSNode = {
            path: path + '/' + parts[0],
            name: parts[0],
            type: 'directory',
            size: 0,
            modified: new Date(),
            created: new Date(),
            permissions: {
              read: true,
              write: true,
              execute: true,
              owner: 'user',
              group: 'users',
              mode: '755'
            },
            owner: 'user',
            group: 'users',
            metadata: {}
          };
          nodes.push(dirNode);
        }
      }
    }

    return nodes;
  }

  async mkdir(path: string): Promise<void> {
    const node: VFSNode = {
      path,
      name: path.split('/').pop() || '',
      type: 'directory',
      size: 0,
      modified: new Date(),
      created: new Date(),
      permissions: {
        read: true,
        write: true,
        execute: true,
        owner: 'user',
        group: 'users',
        mode: '755'
      },
      owner: 'user',
      group: 'users',
      metadata: {}
    };

    this.files.set(path, { data: new Uint8Array(), node });
  }

  async rmdir(path: string): Promise<void> {
    this.files.delete(path);
  }

  async unlink(path: string): Promise<void> {
    this.files.delete(path);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const file = this.files.get(oldPath);
    if (!file) {
      throw new Error(`File not found: ${oldPath}`);
    }

    file.node.path = newPath;
    file.node.name = newPath.split('/').pop() || '';
    this.files.set(newPath, file);
    this.files.delete(oldPath);
  }

  async copy(src: string, dest: string): Promise<void> {
    const file = this.files.get(src);
    if (!file) {
      throw new Error(`File not found: ${src}`);
    }

    const newNode = { ...file.node, path: dest, name: dest.split('/').pop() || '' };
    this.files.set(dest, { data: file.data, node: newNode });
  }

  async watch(path: string, callback: (event: FileWatchEvent) => void): Promise<FileWatcher> {
    // Memory filesystem doesn't support watching
    return {
      close: () => {},
      path,
      isActive: false
    };
  }

  getCapabilities(): VFSAdapterCapabilities {
    return {
      supportsRealtime: false,
      supportsPermissions: true,
      supportsSymlinks: false,
      supportsHardlinks: false,
      supportsLocking: false,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      supportedProtocols: ['memory']
    };
  }

  isConnected(): boolean {
    return true;
  }

  async mount(): Promise<void> {
    // Memory filesystem is always available
  }

  async unmount(): Promise<void> {
    // Clear all files
    this.files.clear();
  }
}

class IndexedDBAdapter implements VFSAdapter {
  name = 'indexeddb';
  type = 'cloud' as const;
  mountPath = '/indexeddb';
  priority = 5;
  private dbName = 'WebDesktopVFS';
  private storeName = 'files';
  private db: IDBDatabase | null = null;

  async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'path' });
        }
      };
    });
  }

  async read(path: string): Promise<Buffer> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(path);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          reject(new Error(`File not found: ${path}`));
          return;
        }
        resolve(Buffer.from(result.data));
      };
    });
  }

  async write(path: string, data: Buffer | Uint8Array): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const fileData = {
        path,
        data: Array.from(data), // Convert to array for storage
        node: {
          path,
          name: path.split('/').pop() || '',
          type: 'file',
          size: data.length,
          modified: new Date().toISOString(),
          created: new Date().toISOString(),
          permissions: {
            read: true,
            write: true,
            execute: false,
            owner: 'user',
            group: 'users',
            mode: '644'
          },
          owner: 'user',
          group: 'users',
          metadata: {}
        }
      };

      const request = store.put(fileData);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<VFSNode> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(path);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          reject(new Error(`File not found: ${path}`));
          return;
        }
        resolve(result.node);
      };
    });
  }

  async readdir(path: string): Promise<VFSNode[]> {
    // Implementation would need to scan all keys and filter
    return [];
  }

  async mkdir(path: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const dirData = {
        path,
        data: [],
        node: {
          path,
          name: path.split('/').pop() || '',
          type: 'directory',
          size: 0,
          modified: new Date().toISOString(),
          created: new Date().toISOString(),
          permissions: {
            read: true,
            write: true,
            execute: true,
            owner: 'user',
            group: 'users',
            mode: '755'
          },
          owner: 'user',
          group: 'users',
          metadata: {}
        }
      };

      const request = store.put(dirData);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async rmdir(path: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(path);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async unlink(path: string): Promise<void> {
    return this.rmdir(path);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const data = await this.read(oldPath);
    const node = await this.stat(oldPath);
    await this.write(newPath, data);
    await this.unlink(oldPath);
  }

  async copy(src: string, dest: string): Promise<void> {
    const data = await this.read(src);
    await this.write(dest, data);
  }

  async watch(path: string, callback: (event: FileWatchEvent) => void): Promise<FileWatcher> {
    return {
      close: () => {},
      path,
      isActive: false
    };
  }

  getCapabilities(): VFSAdapterCapabilities {
    return {
      supportsRealtime: false,
      supportsPermissions: true,
      supportsSymlinks: false,
      supportsHardlinks: false,
      supportsLocking: false,
      maxFileSize: 50 * 1024 * 1024, // 50MB IndexedDB limit
      supportedProtocols: ['indexeddb']
    };
  }

  isConnected(): boolean {
    return this.db !== null;
  }

  async mount(): Promise<void> {
    await this.initializeDB();
  }

  async unmount(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}