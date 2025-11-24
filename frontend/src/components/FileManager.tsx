import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Folder, ArrowLeft, RefreshCw, Home, File, FolderOpen, HardDrive, FileText, Image, Music, Video, Archive, Upload, Copy, Scissors, Trash2, Edit3, X, Eye, Plus, Cloud, Database } from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { useVFS } from '../hooks/useVFS';
import { VFSNode } from '../types/vfs';
import { AsyncErrorBoundary } from './error-boundaries';
import { useMonitoring, useApiMonitoring } from '../hooks/useMonitoring';

interface FileItem {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number;
    modified?: string;
}

interface FileManagerProps {
    windowId?: string;
}

interface ContextMenu {
    x: number;
    y: number;
    file: FileItem;
}

interface PreviewModal {
    file: FileItem;
    content: string;
    type: 'text' | 'image' | 'binary';
    mimeType: string;
}

interface RenameDialog {
    file: FileItem;
    newName: string;
}

interface NewFileDialog {
    type: 'file' | 'directory';
    name: string;
}

interface MountDialog {
    path: string;
    adapterType: string;
}

interface ToastNotification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    persistent?: boolean;
}

interface UploadState {
    file: File;
    uploadId: string;
    loading: boolean;
    error: string | null;
    progress?: number;
    retryCount?: number;
    controller?: AbortController;
}

export const FileManager: React.FC<FileManagerProps> = () => {
    const { settings } = useSettings();
    const vfs = useVFS();
    const { trackInteraction, trackMetric, trackError } = useMonitoring({
        component: 'FileManager',
        trackPerformance: true,
        trackErrors: true,
    });
    const { trackApiCall } = useApiMonitoring();
    const [showVFSMode, setShowVFSMode] = useState(true);
    const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
    const [clipboard, setClipboard] = useState<{ file: FileItem; operation: 'copy' | 'cut' } | null>(null);
    const [preview, setPreview] = useState<PreviewModal | null>(null);
    const [renameDialog, setRenameDialog] = useState<RenameDialog | null>(null);
    const [newFileDialog, setNewFileDialog] = useState<NewFileDialog | null>(null);
    const [mountDialog, setMountDialog] = useState<MountDialog | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: UploadState }>({});
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const API_BASE = `${settings.backend.apiUrl}/api/fs`;

    // Toast notification system
    const addToast = (toast: Omit<ToastNotification, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast: ToastNotification = { id, ...toast };

        setToasts(prev => [...prev, newToast]);

        // Auto-remove non-persistent toasts after duration
        if (!toast.persistent && toast.duration !== 0) {
            setTimeout(() => removeToast(id), toast.duration || 5000);
        }

        return id;
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const showSuccessToast = (title: string, message: string) => {
        return addToast({ type: 'success', title, message });
    };

    const showErrorToast = (title: string, message: string, persistent = false) => {
        return addToast({ type: 'error', title, message, persistent, duration: 8000 });
    };

    const showWarningToast = (title: string, message: string) => {
        return addToast({ type: 'warning', title, message });
    };

    const showInfoToast = (title: string, message: string) => {
        return addToast({ type: 'info', title, message });
    };

    // Convert VFS nodes to FileItems for compatibility
    const vfsNodesToFileItems = (nodes: VFSNode[]): FileItem[] => {
        return nodes.map(node => ({
            name: node.name,
            path: node.path,
            isDirectory: node.type === 'directory',
            size: node.size,
            modified: node.modified.toISOString()
        }));
    };

    // Get current files based on mode
    const getCurrentFiles = (): FileItem[] => {
        if (showVFSMode) {
            return vfsNodesToFileItems(vfs.files);
        } else {
            return []; // Legacy mode would use the old API
        }
    };

    // Get current state based on mode
    const currentState = () => {
        if (showVFSMode) {
            return {
                currentPath: vfs.currentPath,
                loading: vfs.loading,
                error: vfs.error,
                files: getCurrentFiles()
            };
        } else {
            return {
                currentPath: '/home',
                loading: false,
                error: null,
                files: []
            };
        }
    };

    const { currentPath, loading, error, files } = currentState();

  
    const navigate = (path: string) => {
        if (!path || path === vfs.currentPath) return;
        vfs.setCurrentPath(path);
    };

    const goUp = () => {
        if (vfs.currentPath === '/' || vfs.currentPath === '') return;

        const parts = vfs.currentPath.split('/').filter(part => part.length > 0);
        const parentPath = '/' + parts.slice(0, -1).join('/');
        vfs.setCurrentPath(parentPath);
    };

    const refresh = () => {
        // VFS automatically refreshes when path changes
        vfs.setCurrentPath(vfs.currentPath);
    };

    const createNewFile = async (type: 'file' | 'directory') => {
        setNewFileDialog({ type, name: '' });
    };

    const performCreate = async () => {
        if (!newFileDialog) return;

        try {
            const newPath = `${vfs.currentPath}/${newFileDialog.name}`;

            if (newFileDialog.type === 'directory') {
                await vfs.mkdir(newPath);
            } else {
                await vfs.writeFile(newPath, new Uint8Array());
            }

            setNewFileDialog(null);
        } catch (error) {
            alert(`Create failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleMount = () => {
        setMountDialog({
            path: '',
            adapterType: 'memory'
        });
    };

    const performMount = async () => {
        if (!mountDialog) return;

        try {
            const adapter = vfs.getAdapter(mountDialog.adapterType);
            if (adapter) {
                await vfs.mount(mountDialog.path, adapter);
                setMountDialog(null);
            }
        } catch (error) {
            alert(`Mount failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const cancelUpload = (uploadId: string) => {
        const uploadState = uploadProgress[uploadId];
        if (uploadState?.controller) {
            uploadState.controller.abort();
            setUploadProgress(prev => {
                const newState = { ...prev };
                delete newState[uploadId];
                return newState;
            });
            showWarningToast('Upload Cancelled', `Upload of "${uploadState.file.name}" was cancelled`);
        }
    };

    const retryUpload = async (uploadId: string) => {
        const uploadState = uploadProgress[uploadId];
        if (!uploadState) return;

        // Delete old upload state and retry
        setUploadProgress(prev => {
            const newState = { ...prev };
            delete newState[uploadId];
            return newState;
        });

        await handleFileUpload(uploadState.file);
    };

    const handleFileUpload = async (file: File, isRetry = false, retryCount = 0) => {
        const uploadId = `${file.name}-${Date.now()}`;
        const MAX_RETRIES = 3;
        const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

        // Create AbortController for this upload
        const controller = new AbortController();

        // Set initial upload state
        const uploadState: UploadState = {
            file,
            uploadId,
            loading: true,
            error: null,
            progress: 0,
            retryCount,
            controller
        };

        setUploadProgress(prev => ({
            ...prev,
            [uploadId]: uploadState
        }));

        // Show initial toast for non-retry uploads
        if (!isRetry) {
            showInfoToast('Upload Started', `Uploading "${file.name}"...`);
        }

        try {
            // Enhanced file validation
            if (!file) {
                throw new Error('No file provided');
            }

            if (file.size === 0) {
                throw new Error('Cannot upload empty files');
            }

            if (file.size > MAX_FILE_SIZE) {
                throw new Error(`File size exceeds ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB limit`);
            }

            // Check file type restrictions
            const restrictedExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
            const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (restrictedExtensions.includes(fileExtension)) {
                showWarningToast('File Type Warning', `File "${file.name}" has a potentially dangerous extension`);
            }

            await new Promise<void>((resolve, reject) => {
                const reader = new FileReader();

                // Enhanced timeout based on file size (larger files get more time)
                const timeoutMs = Math.min(Math.max(file.size / 1024 / 100, 10000), 120000); // 10s to 2min
                const timeoutId = setTimeout(() => {
                    reader.abort();
                    reject(new Error(`File read timeout after ${Math.round(timeoutMs / 1000)}s - file may be too large or corrupted`));
                }, timeoutMs);

                // Update progress during file reading
                reader.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const progress = Math.round((e.loaded / e.total) * 50); // Reading is 50% of total progress
                        setUploadProgress(prev => ({
                            ...prev,
                            [uploadId]: { ...prev[uploadId], progress }
                        }));
                    }
                };

                reader.onload = async (e) => {
                    clearTimeout(timeoutId);

                    try {
                        const content = e.target?.result;
                        if (!content || typeof content !== 'string') {
                            throw new Error('Failed to read file content - the file may be corrupted');
                        }

                        const base64Content = content.split(',')[1]; // Remove data:... prefix
                        if (!base64Content) {
                            throw new Error('Invalid file format for upload - could not encode file properly');
                        }

                        // Update progress to indicate upload starting
                        setUploadProgress(prev => ({
                            ...prev,
                            [uploadId]: { ...prev[uploadId], progress: 50 }
                        }));

                        // Enhanced server upload with progress tracking and better error handling
                        const uploadTimeoutMs = Math.min(Math.max(base64Content.length / 1024 / 50, 30000), 300000); // 30s to 5min
                        const uploadTimeoutId = setTimeout(() => {
                            controller.abort();
                            reject(new Error(`Upload timeout after ${Math.round(uploadTimeoutMs / 1000)}s - server may be unavailable or slow`));
                        }, uploadTimeoutMs);

                        try {
                            const response = await fetch(`${API_BASE}/upload`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    path: currentPath,
                                    filename: file.name,
                                    content: base64Content,
                                    size: file.size,
                                    lastModified: file.lastModified
                                }),
                                signal: controller.signal
                            });

                            clearTimeout(uploadTimeoutId);

                            if (!response.ok) {
                                const errorData = await response.json().catch(() => ({
                                    error: 'Server error - no details provided'
                                }));

                                // Handle specific HTTP errors
                                let errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
                                if (response.status === 413) {
                                    errorMessage = 'File too large - server rejected file';
                                } else if (response.status === 415) {
                                    errorMessage = 'Unsupported media type';
                                } else if (response.status === 429) {
                                    errorMessage = 'Too many upload requests - please wait and try again';
                                } else if (response.status >= 500) {
                                    errorMessage = 'Server error - please try again later';
                                }

                                throw new Error(errorMessage);
                            }

                            // Success!
                            setUploadProgress(prev => {
                                const newState = { ...prev };
                                delete newState[uploadId];
                                return newState;
                            });

                            showSuccessToast('Upload Complete', `Successfully uploaded "${file.name}"`);
                            refresh();
                            resolve();

                        } catch (uploadError) {
                            clearTimeout(uploadTimeoutId);

                            // Handle aborted requests separately
                            if (controller.signal.aborted) {
                                reject(new Error('Upload was cancelled'));
                                return;
                            }

                            // Handle network errors
                            if (uploadError instanceof TypeError && uploadError.message.includes('fetch')) {
                                throw new Error('Network error - unable to connect to server');
                            }

                            throw uploadError;
                        }
                    } catch (error) {
                        reject(error);
                    }
                };

                // Enhanced FileReader error handling
                reader.onerror = () => {
                    clearTimeout(timeoutId);
                    let errorMessage = 'File read failed';

                    if (reader.error) {
                        switch (reader.error.name) {
                            case 'NotFoundError':
                                errorMessage = 'File not found or access denied - check file permissions';
                                break;
                            case 'NotReadableError':
                                errorMessage = 'File is not readable - it may be locked by another application or corrupted';
                                break;
                            case 'SecurityError':
                                errorMessage = 'Security error - browser blocked file access for security reasons';
                                break;
                            case 'EncodingError':
                                errorMessage = 'File encoding error - the file may be corrupted or in an unsupported format';
                                break;
                            case 'DataCloneError':
                                errorMessage = 'File data could not be processed - file may be too complex';
                                break;
                            case 'InvalidStateError':
                                errorMessage = 'FileReader in invalid state - please try again';
                                break;
                            default:
                                errorMessage = `File read error: ${reader.error.message || 'Unknown file reading error'}`;
                        }
                    }

                    reject(new Error(errorMessage));
                };

                reader.onabort = () => {
                    clearTimeout(timeoutId);
                    reject(new Error('File reading was cancelled'));
                };

                // Enhanced file reading with better error handling
                try {
                    reader.readAsDataURL(file);
                } catch (error) {
                    clearTimeout(timeoutId);
                    if (error instanceof TypeError && error.message.includes('readAsDataURL')) {
                        reject(new Error('File type not supported for upload'));
                    } else {
                        reject(new Error(`Failed to start file reading: ${error instanceof Error ? error.message : 'Unknown error'}`));
                    }
                }
            });

        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error occurred during upload');
            const isCancellation = error.message.includes('cancelled');

            console.error('File upload failed:', {
                fileName: file.name,
                error: error.message,
                retryCount,
                isCancellation
            });

            if (!isCancellation) {
                // Update upload progress with error and retry info
                setUploadProgress(prev => ({
                    ...prev,
                    [uploadId]: {
                        ...prev[uploadId],
                        loading: false,
                        error: error.message,
                        progress: undefined
                    }
                }));

                // Check if we should retry
                const shouldRetry = retryCount < MAX_RETRIES &&
                    (error.message.includes('timeout') ||
                     error.message.includes('Network error') ||
                     error.message.includes('Server error') ||
                     error.message.includes('500') ||
                     error.message.includes('502') ||
                     error.message.includes('503') ||
                     error.message.includes('504'));

                if (shouldRetry) {
                    showErrorToast(
                        'Upload Failed - Retrying',
                        `"${file.name}" upload failed. Retry ${retryCount + 1}/${MAX_RETRIES}...`,
                        false
                    );

                    // Wait before retrying (exponential backoff)
                    setTimeout(() => {
                        handleFileUpload(file, true, retryCount + 1);
                    }, Math.pow(2, retryCount) * 1000); // 1s, 2s, 4s
                } else {
                    const finalMessage = retryCount >= MAX_RETRIES ?
                        `Upload failed after ${MAX_RETRIES} attempts` :
                        'Upload failed';

                    showErrorToast(
                        finalMessage,
                        `"${file.name}": ${error.message}`,
                        true // Make persistent for critical failures
                    );

                    // Clear upload state after longer delay for persistent errors
                    setTimeout(() => {
                        setUploadProgress(prev => {
                            const newState = { ...prev };
                            delete newState[uploadId];
                            return newState;
                        });
                    }, 15000);
                }
            } else {
                // Just remove the upload state for cancelled uploads
                setUploadProgress(prev => {
                    const newState = { ...prev };
                    delete newState[uploadId];
                    return newState;
                });
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        for (const file of droppedFiles) {
            await handleFileUpload(file);
        }
    };

    const handleCopy = (file: FileItem) => {
        setClipboard({ file, operation: 'copy' });
        setContextMenu(null);
    };

    const handleCut = (file: FileItem) => {
        setClipboard({ file, operation: 'cut' });
        setContextMenu(null);
    };

    const handlePaste = async () => {
        if (!clipboard) return;

        try {
            const destination = `${currentPath}/${clipboard.file.name}`;
            const endpoint = clipboard.operation === 'copy' ? 'copy' : 'move';

            const response = await fetch(`${API_BASE}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: clipboard.file.path,
                    destination
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Operation failed');
            }

            if (clipboard.operation === 'cut') {
                setClipboard(null);
            }
            refresh();
        } catch (err) {
            alert(`Operation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const handleDelete = async (file: FileItem) => {
        if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;

        trackInteraction('click', 'delete-file', { fileName: file.name, fileSize: file.size });

        try {
            const response = await trackApiCall(
                () => fetch(`${API_BASE}/delete`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: file.path })
                }),
                'filemanager-delete',
                { fileName: file.name, fileSize: file.size }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Delete failed');
            }

            setContextMenu(null);
            refresh();
            trackMetric('file-delete-success', 1, 'interaction', 'count', { fileName: file.name });
        } catch (err) {
            const errorMessage = `Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
            alert(errorMessage);
            trackError(errorMessage, {
                action: 'delete-file',
                fileName: file.name,
                filePath: file.path,
                error: err instanceof Error ? err.message : 'Unknown error'
            });
        }
    };

    const handleRename = (file: FileItem) => {
        setRenameDialog({ file, newName: file.name });
        setContextMenu(null);
    };

    const performRename = async () => {
        if (!renameDialog) return;

        try {
            const response = await fetch(`${API_BASE}/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: renameDialog.file.path,
                    newName: renameDialog.newName
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Rename failed');
            }

            setRenameDialog(null);
            refresh();
        } catch (err) {
            alert(`Rename failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const handlePreview = async (file: FileItem) => {
        if (file.isDirectory) return;

        try {
            const response = await fetch(`${API_BASE}/read?path=${encodeURIComponent(file.path)}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Preview failed');
            }

            const data = await response.json();
            setPreview({
                file,
                content: data.content,
                type: data.type,
                mimeType: data.mimeType
            });
            setContextMenu(null);
        } catch (err) {
            alert(`Preview failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, file: FileItem) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, file });
    };

    const getFileIcon = (filename: string, isDirectory: boolean) => {
        if (isDirectory) return <FolderOpen className="text-blue-400" size={20} />;

        const ext = filename.split('.').pop()?.toLowerCase() || '';

        // Return Lucide icons for better consistency
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
            return <Image className="text-green-400" size={20} />;
        }
        if (['mp4', 'avi', 'mkv', 'mov', 'webm'].includes(ext)) {
            return <Video className="text-purple-400" size={20} />;
        }
        if (['mp3', 'wav', 'flac', 'ogg'].includes(ext)) {
            return <Music className="text-pink-400" size={20} />;
        }
        if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
            return <Archive className="text-yellow-400" size={20} />;
        }
        if (['md', 'txt', 'doc', 'docx'].includes(ext)) {
            return <FileText className="text-blue-400" size={20} />;
        }
        if (['js', 'ts', 'jsx', 'tsx', 'json', 'py', 'java', 'cpp', 'c'].includes(ext)) {
            return <FileText className="text-orange-400" size={20} />;
        }

        return <File className="text-gray-400" size={20} />;
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    };

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // Add custom styles for toast animations
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slide-in-right {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            .animate-slide-in-right {
                animation: slide-in-right 0.3s ease-out;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (
        <AsyncErrorBoundary
            maxRetries={2}
            customMessages={{
                title: 'File Manager Error',
                description: 'Failed to access file system or load files. Please check file permissions.',
                retry: 'Retry File Access'
            }}
        >
            <div className="flex flex-col h-full bg-gray-900" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                    <HardDrive className="text-blue-400" size={20} />
                    <div>
                        <h2 className="text-gray-100 font-semibold">File Manager</h2>
                        <p className="text-gray-500 text-xs">
                            {showVFSMode ? 'Virtual File System' : 'Browse your files'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {showVFSMode && (
                        <>
                            <button
                                onClick={() => createNewFile('file')}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-white text-xs transition-colors"
                                title="New file"
                            >
                                <Plus size={14} />
                                File
                            </button>
                            <button
                                onClick={() => createNewFile('directory')}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-white text-xs transition-colors"
                                title="New directory"
                            >
                                <Plus size={14} />
                                Folder
                            </button>
                            <button
                                onClick={handleMount}
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-white text-xs transition-colors"
                                title="Mount storage"
                            >
                                <Cloud size={14} />
                                Mount
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setShowVFSMode(!showVFSMode)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 rounded text-white text-xs transition-colors"
                        title="Toggle VFS mode"
                    >
                        <Database size={14} />
                        {showVFSMode ? 'Legacy' : 'VFS'}
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs transition-colors"
                        title="Upload files"
                    >
                        <Upload size={14} />
                        Upload
                    </button>
                    <div className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                        {files.length} items
                    </div>
                </div>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                    if (e.target.files) {
                        Array.from(e.target.files).forEach(file => handleFileUpload(file));
                    }
                }}
            />

            {/* Navigation Bar */}
            <div className="flex items-center gap-2 p-3 bg-gray-800/50 border-b border-gray-700/30">
                <button
                    onClick={() => navigate('/home')}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-all hover:scale-105"
                    title="Home"
                >
                    <Home size={16} />
                </button>
                <button
                    onClick={goUp}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-all hover:scale-105"
                    title="Go up"
                >
                    <ArrowLeft size={16} />
                </button>
                <button
                    onClick={refresh}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-all hover:scale-105"
                    title="Refresh"
                >
                    <RefreshCw size={16} />
                </button>
                {clipboard && (
                    <button
                        onClick={handlePaste}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-all hover:scale-105"
                        title={`Paste (${clipboard.operation})`}
                    >
                        {clipboard.operation === 'copy' ? <Copy size={16} /> : <Scissors size={16} />}
                    </button>
                )}
                <div className="flex-1 px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50">
                    <div className="text-gray-200 text-sm font-mono truncate">{currentPath}</div>
                </div>
            </div>

            {/* Drag overlay */}
            {dragOver && (
                <div className="absolute inset-0 bg-blue-500/20 border-4 border-dashed border-blue-400 flex items-center justify-center z-50 pointer-events-none">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <Upload className="text-blue-400 mx-auto mb-2" size={48} />
                        <p className="text-white text-lg">Drop files to upload</p>
                    </div>
                </div>
            )}

            {/* Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
                <div className="border-b border-gray-700/30 p-4 bg-gray-800/50">
                    <div className="text-sm font-medium text-gray-300 mb-2">Upload Progress</div>
                    <div className="space-y-3">
                        {Object.entries(uploadProgress).map(([uploadId, uploadState]) => (
                            <div key={uploadId} className="bg-gray-700/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        {uploadState.loading ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                                        ) : uploadState.error ? (
                                            <div className="text-red-400">⚠️</div>
                                        ) : (
                                            <div className="text-green-400">✓</div>
                                        )}
                                        <span className={`font-medium ${uploadState.error ? 'text-red-400' : 'text-gray-300'}`}>
                                            {uploadState.file.name}
                                        </span>
                                        {uploadState.retryCount && uploadState.retryCount > 0 && (
                                            <span className="text-xs text-yellow-400 bg-yellow-400/20 px-2 py-1 rounded">
                                                Retry {uploadState.retryCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">
                                            {(uploadState.file.size / (1024 * 1024)).toFixed(1)} MB
                                        </span>
                                        {uploadState.loading && (
                                            <button
                                                onClick={() => cancelUpload(uploadId)}
                                                className="text-gray-400 hover:text-red-400 transition-colors"
                                                title="Cancel upload"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {uploadState.loading && uploadState.progress !== undefined && (
                                    <div className="mb-2">
                                        <div className="w-full bg-gray-600 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                                                style={{ width: `${uploadState.progress}%` }}
                                            />
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {uploadState.progress}% complete
                                        </div>
                                    </div>
                                )}

                                {uploadState.error && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-red-400">
                                            {uploadState.error}
                                        </span>
                                        <button
                                            onClick={() => retryUpload(uploadId)}
                                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-3"></div>
                        Loading directory...
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="text-red-400 mb-2">⚠️ {error}</div>
                        <button
                            onClick={refresh}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && files.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Folder className="mb-4 opacity-50" size={48} />
                        <div className="text-lg font-medium mb-2">Empty directory</div>
                        <div className="text-sm">This folder contains no files</div>
                    </div>
                )}

                {!loading && !error && (
                    <div className="grid grid-cols-1 gap-2">
                        {/* Directories first */}
                        {files.filter(f => f.isDirectory).map((file, index) => (
                            <div
                                key={`dir-${index}`}
                                onClick={() => navigate(file.path)}
                                onContextMenu={(e) => handleContextMenu(e, file)}
                                className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md border border-gray-700/30"
                            >
                                {getFileIcon(file.name, true)}
                                <div className="flex-1 min-w-0">
                                    <div className="text-gray-200 font-medium truncate">{file.name}</div>
                                    <div className="text-gray-500 text-sm">Directory</div>
                                </div>
                                <div className="text-gray-600">
                                    <ArrowLeft size={16} className="rotate-180" />
                                </div>
                            </div>
                        ))}

                        {/* Files */}
                        {files.filter(f => !f.isDirectory).map((file, index) => (
                            <div
                                key={`file-${file.name}-${index}`}
                                className="flex items-center gap-3 p-3 bg-gray-800/30 hover:bg-gray-700/30 rounded-lg transition-all hover:scale-[1.02] border border-gray-700/20 cursor-pointer"
                                onClick={() => handlePreview(file)}
                                onContextMenu={(e) => handleContextMenu(e, file)}
                                title={`Size: ${formatFileSize(file.size)}${file.modified ? `\nModified: ${new Date(file.modified).toLocaleString()}` : ''}`}
                            >
                                {getFileIcon(file.name, false)}
                                <div className="flex-1 min-w-0">
                                    <div className="text-gray-200 font-medium truncate">{file.name}</div>
                                    <div className="text-gray-500 text-sm">
                                        {formatFileSize(file.size)}
                                        {file.modified && ` • ${new Date(file.modified).toLocaleDateString()}`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-2 z-50"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => handlePreview(contextMenu.file)}
                        className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Eye size={16} />
                        Preview
                    </button>
                    <button
                        onClick={() => handleCopy(contextMenu.file)}
                        className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Copy size={16} />
                        Copy
                    </button>
                    <button
                        onClick={() => handleCut(contextMenu.file)}
                        className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Scissors size={16} />
                        Cut
                    </button>
                    <button
                        onClick={() => handleRename(contextMenu.file)}
                        className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Edit3 size={16} />
                        Rename
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                        onClick={() => handleDelete(contextMenu.file)}
                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-900/20 flex items-center gap-2"
                    >
                        <Trash2 size={16} />
                        Delete
                    </button>
                </div>
            )}

            {/* Preview Modal */}
            {preview && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] w-full flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-700">
                            <h3 className="text-white font-semibold">{preview.file.name}</h3>
                            <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {preview.type === 'text' && (
                                <>
                                    {preview.mimeType === 'text/html' ? (
                                        <div
                                            className="text-gray-200 bg-gray-900 p-4 rounded overflow-auto"
                                            dangerouslySetInnerHTML={{
                                                __html: DOMPurify.sanitize(preview.content, {
                                                    ALLOWED_TAGS: [
                                                        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                                                        'p', 'br', 'span', 'div',
                                                        'ul', 'ol', 'li',
                                                        'strong', 'em', 'u', 'i', 'b',
                                                        'blockquote', 'code', 'pre',
                                                        'hr'
                                                    ],
                                                    ALLOWED_ATTR: ['class'],
                                                    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'],
                                                    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style']
                                                })
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className="text-gray-200 text-sm whitespace-pre-wrap font-mono bg-gray-900 p-4 rounded overflow-auto"
                                            dangerouslySetInnerHTML={{
                                                __html: DOMPurify.sanitize(preview.content, {
                                                    ALLOWED_TAGS: [],
                                                    ALLOWED_ATTR: [],
                                                    KEEP_CONTENT: true
                                                })
                                            }}
                                        />
                                    )}
                                </>
                            )}
                            {preview.type === 'binary' && preview.mimeType.startsWith('image/') && (
                                <img
                                    src={`data:${preview.mimeType};base64,${preview.content}`}
                                    alt={preview.file.name}
                                    className="max-w-full mx-auto"
                                />
                            )}
                            {preview.type === 'binary' && !preview.mimeType.startsWith('image/') && (
                                <div className="text-gray-400 text-center">
                                    <p>Binary file - preview not available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Dialog */}
            {renameDialog && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-white font-semibold mb-4">Rename File</h3>
                        <input
                            type="text"
                            value={renameDialog.newName}
                            onChange={(e) => setRenameDialog({ ...renameDialog, newName: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                            onKeyDown={(e) => e.key === 'Enter' && performRename()}
                        />
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={performRename}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                                Rename
                            </button>
                            <button
                                onClick={() => setRenameDialog(null)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New File/Directory Dialog */}
            {newFileDialog && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-white font-semibold mb-4">
                            Create New {newFileDialog.type === 'directory' ? 'Directory' : 'File'}
                        </h3>
                        <input
                            type="text"
                            value={newFileDialog.name}
                            onChange={(e) => setNewFileDialog({ ...newFileDialog, name: e.target.value })}
                            placeholder={newFileDialog.type === 'directory' ? 'Enter directory name' : 'Enter file name'}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                            onKeyDown={(e) => e.key === 'Enter' && performCreate()}
                            autoFocus
                        />
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={performCreate}
                                disabled={!newFileDialog.name.trim()}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors disabled:cursor-not-allowed"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => setNewFileDialog(null)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mount Dialog */}
            {mountDialog && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-white font-semibold mb-4">Mount Storage</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Mount Path</label>
                                <input
                                    type="text"
                                    value={mountDialog.path}
                                    onChange={(e) => setMountDialog({ ...mountDialog, path: e.target.value })}
                                    placeholder="/mnt/storage"
                                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Adapter Type</label>
                                <select
                                    value={mountDialog.adapterType}
                                    onChange={(e) => setMountDialog({ ...mountDialog, adapterType: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="memory">Memory Storage</option>
                                    <option value="indexeddb">IndexedDB Storage</option>
                                    <option value="local">Local Filesystem</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={performMount}
                                disabled={!mountDialog.path.trim()}
                                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors disabled:cursor-not-allowed"
                            >
                                Mount
                            </button>
                            <button
                                onClick={() => setMountDialog(null)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        onClick={() => toast.persistent && removeToast(toast.id)}
                        className={`
                            rounded-lg shadow-lg p-4 transform transition-all duration-300 ease-in-out
                            animate-slide-in-right border
                            ${toast.type === 'success' ? 'bg-green-600 border-green-500 text-white' : ''}
                            ${toast.type === 'error' ? 'bg-red-600 border-red-500 text-white' : ''}
                            ${toast.type === 'warning' ? 'bg-orange-600 border-orange-500 text-white' : ''}
                            ${toast.type === 'info' ? 'bg-blue-600 border-blue-500 text-white' : ''}
                            ${toast.persistent ? 'cursor-pointer hover:scale-105' : ''}
                        `}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm">
                                    {toast.title}
                                </div>
                                <div className="text-xs mt-1 opacity-90">
                                    {toast.message}
                                </div>
                            </div>
                            {!toast.persistent && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeToast(toast.id);
                                    }}
                                    className="ml-3 text-white/70 hover:text-white transition-colors flex-shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        {toast.persistent && (
                            <div className="mt-2 text-xs opacity-75">
                                Click to dismiss
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Operations Status */}
            {vfs.operations.length > 0 && (
                <div className="fixed bottom-4 left-4 bg-gray-800 rounded-lg p-4 shadow-xl max-w-sm z-40">
                    <h4 className="text-white font-semibold mb-2">Operations</h4>
                    <div className="space-y-2">
                        {vfs.operations.map((op) => (
                            <div key={op.id} className="text-sm">
                                <div className="flex justify-between text-gray-300">
                                    <span>{op.type}</span>
                                    <span>{Math.round(op.progress)}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${op.progress}%` }}
                                    />
                                </div>
                                <div className="text-gray-500 text-xs">
                                    {op.source} → {op.destination}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </div>
        </AsyncErrorBoundary>
    );
};
