import { useState, useEffect, useRef } from 'react';
import { Folder, ArrowLeft, RefreshCw, Home, File, FolderOpen, HardDrive, FileText, Image, Music, Video, Archive, Upload, Copy, Scissors, Trash2, Edit3, X, Eye } from 'lucide-react';

interface FileItem {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number;
    modified?: string;
}

interface FileManagerProps {
    windowId: string;
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

export const FileManager: React.FC<FileManagerProps> = () => {
    const [currentPath, setCurrentPath] = useState('/home');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
    const [clipboard, setClipboard] = useState<{ file: FileItem; operation: 'copy' | 'cut' } | null>(null);
    const [preview, setPreview] = useState<PreviewModal | null>(null);
    const [renameDialog, setRenameDialog] = useState<RenameDialog | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const API_BASE = `http://${window.location.hostname}:3001/api/fs`;

    const loadDirectory = async (path: string) => {
        // Validate path
        if (!path || typeof path !== 'string') {
            setError('Invalid path');
            setFiles([]);
            return;
        }

        // Prevent path traversal attacks
        const normalizedPath = path.replace(/\.\./g, '').replace(/\.\./g, '');
        if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
            setError('Access denied: Path traversal not allowed');
            setFiles([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`${API_BASE}?path=${encodeURIComponent(normalizedPath)}`, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Validate response data
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response from server');
            }

            const files = Array.isArray(data.files) ? data.files : [];
            setFiles(files);
            setCurrentPath(normalizedPath);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error('Failed to load directory:', err);
            setError(errorMessage);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    };

    const navigate = (path: string) => {
        if (!path || path === currentPath) return;
        loadDirectory(path);
    };

    const goUp = () => {
        if (currentPath === '/' || currentPath === '') return;

        const parts = currentPath.split('/').filter(part => part.length > 0);
        const parentPath = '/' + parts.slice(0, -1).join('/');
        loadDirectory(parentPath);
    };

    const refresh = () => {
        loadDirectory(currentPath);
    };

    const handleFileUpload = async (file: File) => {
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target?.result as string;
                const base64Content = content.split(',')[1]; // Remove data:... prefix

                const response = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        path: currentPath,
                        filename: file.name,
                        content: base64Content
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Upload failed');
                }

                refresh();
            };
            reader.readAsDataURL(file);
        } catch (err) {
            alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

        try {
            const response = await fetch(`${API_BASE}/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: file.path })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Delete failed');
            }

            setContextMenu(null);
            refresh();
        } catch (err) {
            alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
        loadDirectory(currentPath);
    }, []);

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className="flex flex-col h-full bg-gray-900" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                    <HardDrive className="text-blue-400" size={20} />
                    <div>
                        <h2 className="text-gray-100 font-semibold">File Manager</h2>
                        <p className="text-gray-500 text-xs">Browse your files</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
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
                        Array.from(e.target.files).forEach(handleFileUpload);
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
                                <pre className="text-gray-200 text-sm whitespace-pre-wrap font-mono bg-gray-900 p-4 rounded">
                                    {preview.content}
                                </pre>
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
        </div>
    );
};
