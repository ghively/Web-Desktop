import { useState, useEffect, useCallback, useRef } from 'react';
import { VFSManager, VFSNode, VFSMount, FileOperation, FileWatchEvent, VFSAdapter, FileWatcher } from '../types/vfs';
import { WebDesktopVFSManager } from '../lib/vfs/VFSManager';

// Create a global VFS instance
let vfsManager: VFSManager | null = null;

const getVFSManager = (): VFSManager => {
  if (!vfsManager) {
    vfsManager = new WebDesktopVFSManager();
  }
  return vfsManager;
};

export interface UseVFSOptions {
  autoMount?: boolean;
  watchPath?: string;
}

export interface UseVFSReturn {
  // File operations
  readFile: (path: string) => Promise<Buffer>;
  writeFile: (path: string, data: Buffer | Uint8Array) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
  stat: (path: string) => Promise<VFSNode>;
  readdir: (path: string) => Promise<VFSNode[]>;
  mkdir: (path: string, recursive?: boolean) => Promise<void>;
  remove: (path: string, recursive?: boolean) => Promise<void>;
  copy: (src: string, dest: string) => Promise<FileOperation>;
  move: (src: string, dest: string) => Promise<FileOperation>;

  // Mount management
  mount: (path: string, adapter: any, options?: Record<string, any>) => Promise<VFSMount>;
  unmount: (path: string) => Promise<void>;
  listMounts: () => VFSMount[];

  // Search and utilities
  search: (query: string, basePath?: string) => Promise<VFSNode[]>;
  normalizePath: (path: string) => string;
  getAdapter: (name: string) => VFSAdapter | null;

  // State
  currentPath: string;
  setCurrentPath: (path: string) => void;
  files: VFSNode[];
  loading: boolean;
  error: string | null;

  // Operations
  operations: FileOperation[];
}

export const useVFS = (options: UseVFSOptions = {}): UseVFSReturn => {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [files, setFiles] = useState<VFSNode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [operations, setOperations] = useState<FileOperation[]>([]);

  const vfsRef = useRef<VFSManager>(getVFSManager());
  const vfs = vfsRef.current;

  // Load directory contents
  const loadDirectory = useCallback(async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      const nodes = await vfs.readdir(path);
      setFiles(nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []); // Remove vfs dependency to prevent infinite loop

  // Initialize and load initial directory
  useEffect(() => {
    if (options.autoMount !== false) {
      // Mount default memory filesystem
      const mountMemoryFS = async () => {
        try {
          const memoryAdapter = vfs.getAdapter('memory');
          if (memoryAdapter) {
            await vfs.mount('/memory', memoryAdapter);
          }

          // Load initial directory
          await loadDirectory(currentPath);
        } catch (err) {
          console.error('Failed to mount memory filesystem:', err);
        }
      };

      mountMemoryFS();
    }
  }, [options.autoMount]); // Remove vfs, currentPath, and loadDirectory to prevent infinite loop

  // Watch for changes if specified
  useEffect(() => {
    if (options.watchPath) {
      let isCancelled = false;
      let watcher: FileWatcher | null = null;

      vfs.watch(options.watchPath, (event: FileWatchEvent) => {
        if (event.path.startsWith(currentPath) || options.watchPath.startsWith(currentPath)) {
          loadDirectory(currentPath);
        }
      }).then(w => {
        if (isCancelled) {
          w.close();
        } else {
          watcher = w;
        }
      });

      return () => {
        isCancelled = true;
        if (watcher) {
          watcher.close();
        }
      };
    }
  }, [options.watchPath]); // Remove vfs, currentPath, and loadDirectory to prevent infinite loop

  // Load directory when currentPath changes (but only if it actually changes)
  useEffect(() => {
    if (currentPath && currentPath !== '/') {
      loadDirectory(currentPath);
    }
  }, [currentPath]); // Only depend on currentPath

  // File operations
  const readFile = useCallback(async (path: string): Promise<Buffer> => {
    return await vfs.readFile(path);
  }, [vfs]);

  const writeFile = useCallback(async (path: string, data: Buffer | Uint8Array): Promise<void> => {
    await vfs.writeFile(path, data);
    // Refresh if in current directory
    if (path.startsWith(currentPath)) {
      await loadDirectory(currentPath);
    }
  }, [vfs, currentPath, loadDirectory]);

  const exists = useCallback(async (path: string): Promise<boolean> => {
    return await vfs.exists(path);
  }, [vfs]);

  const stat = useCallback(async (path: string): Promise<VFSNode> => {
    return await vfs.stat(path);
  }, [vfs]);

  const readdir = useCallback(async (path: string): Promise<VFSNode[]> => {
    return await vfs.readdir(path);
  }, [vfs]);

  const mkdir = useCallback(async (path: string, recursive: boolean = false): Promise<void> => {
    await vfs.mkdir(path, recursive);
    // Refresh if in current directory
    if (path.startsWith(currentPath) || currentPath.startsWith(path)) {
      await loadDirectory(currentPath);
    }
  }, [vfs, currentPath, loadDirectory]);

  const remove = useCallback(async (path: string, recursive: boolean = false): Promise<void> => {
    await vfs.remove(path, recursive);
    // Refresh if in current directory
    if (path.startsWith(currentPath) || currentPath.startsWith(path)) {
      await loadDirectory(currentPath);
    }
  }, [vfs, currentPath, loadDirectory]);

  const copy = useCallback(async (src: string, dest: string): Promise<FileOperation> => {
    const operation = await vfs.copy(src, dest);

    // Add to operations list
    setOperations(prev => [...prev, operation]);

    // Listen for operation progress
    const handleProgress = () => {
      setOperations(prev => prev.map(op =>
        op.id === operation.id ? { ...op } : op
      ));
    };

    const handleComplete = () => {
      setOperations(prev => prev.filter(op => op.id !== operation.id));
      if (src.startsWith(currentPath) || dest.startsWith(currentPath)) {
        loadDirectory(currentPath);
      }
      vfs.off('operation:progress', handleProgress);
      vfs.off('operation:completed', handleComplete);
    };

    vfs.on('operation:progress', handleProgress);
    vfs.on('operation:completed', handleComplete);

    return operation;
  }, [vfs, currentPath, loadDirectory]);

  const move = useCallback(async (src: string, dest: string): Promise<FileOperation> => {
    const operation = await vfs.move(src, dest);

    // Add to operations list
    setOperations(prev => [...prev, operation]);

    // Listen for operation progress
    const handleProgress = () => {
      setOperations(prev => prev.map(op =>
        op.id === operation.id ? { ...op } : op
      ));
    };

    const handleComplete = () => {
      setOperations(prev => prev.filter(op => op.id !== operation.id));
      if (src.startsWith(currentPath) || dest.startsWith(currentPath)) {
        loadDirectory(currentPath);
      }
      vfs.off('operation:progress', handleProgress);
      vfs.off('operation:completed', handleComplete);
    };

    vfs.on('operation:progress', handleProgress);
    vfs.on('operation:completed', handleComplete);

    return operation;
  }, [vfs, currentPath, loadDirectory]);

  // Mount management
  const mount = useCallback(async (path: string, adapter: any, options?: Record<string, any>): Promise<VFSMount> => {
    return await vfs.mount(path, adapter, options);
  }, [vfs]);

  const unmount = useCallback(async (path: string): Promise<void> => {
    await vfs.unmount(path);
    // Refresh mounts list
    await loadDirectory(currentPath);
  }, [vfs, currentPath, loadDirectory]);

  const listMounts = useCallback((): VFSMount[] => {
    return vfs.listMounts();
  }, [vfs]);

  // Search and utilities
  const search = useCallback(async (query: string, basePath?: string): Promise<VFSNode[]> => {
    return await vfs.search(query, basePath);
  }, [vfs]);

  const normalizePath = useCallback((path: string): string => {
    return vfs.normalizePath(path);
  }, [vfs]);

  // Path navigation
  const handleSetCurrentPath = useCallback((path: string) => {
    const normalized = vfs.normalizePath(path);
    setCurrentPath(normalized);
    // Load directory in a setTimeout to break the infinite loop cycle
    setTimeout(() => loadDirectory(normalized), 0);
  }, []); // Remove dependencies to prevent infinite loop

  return {
    getAdapter: (name: string) => (vfs as any).getAdapter ? (vfs as any).getAdapter(name) : null,
    // File operations
    readFile,
    writeFile,
    exists,
    stat,
    readdir,
    mkdir,
    remove,
    copy,
    move,

    // Mount management
    mount,
    unmount,
    listMounts,

    // Search and utilities
    search,
    normalizePath,

    // State
    currentPath,
    setCurrentPath: handleSetCurrentPath,
    files,
    loading,
    error,

    // Operations
    operations
  };
};

export default useVFS;
