import React, { useState, useEffect } from 'react';
import { Search, Database, File, Filter, Folder, Hash, Clock, HardDrive, Play, Music, Image, FileText, RefreshCw, Trash2, Download, Eye, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { useSettings } from '../context/exports';

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

interface SearchQuery {
  text?: string;
  extensions?: string[];
  mimeTypes?: string[];
  minSize?: number;
  maxSize?: number;
  limit?: number;
  offset?: number;
}

interface DuplicateGroup {
  hash: string;
  files: FileMetadata[];
}

export const FileMetadataManager: React.FC<{ windowId: string }> = ({ windowId }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'duplicates' | 'indexing'>('search');
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Search state
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    text: '',
    limit: 50,
    offset: 0
  });
  const [quickFilters, setQuickFilters] = useState({
    videos: false,
    images: false,
    audio: false,
    documents: false
  });

  // Indexing state
  const [indexingPath, setIndexingPath] = useState('');
  const [indexingRecursive, setIndexingRecursive] = useState(true);
  const [indexingResult, setIndexingResult] = useState<{
    indexed: number;
    errors: string[];
  } | null>(null);

  const { settings } = useSettings();

  useEffect(() => {
    if (activeTab === 'search') {
      handleSearch();
    } else if (activeTab === 'duplicates') {
      loadDuplicates();
    }
  }, [activeTab]);

  useEffect(() => {
    // Apply quick filters to search query
    const extensions: string[] = [];
    const mimeTypes: string[] = [];

    if (quickFilters.videos) {
      mimeTypes.push('video/');
    }
    if (quickFilters.images) {
      mimeTypes.push('image/');
    }
    if (quickFilters.audio) {
      mimeTypes.push('audio/');
    }
    if (quickFilters.documents) {
      extensions.push('pdf', 'doc', 'docx', 'txt', 'rtf');
    }

    setSearchQuery(prev => ({
      ...prev,
      extensions: extensions.length > 0 ? extensions : undefined,
      mimeTypes: mimeTypes.length > 0 ? mimeTypes : undefined
    }));
  }, [quickFilters]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${settings.backend.apiUrl}/api/file-metadata/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchQuery)
      });

      if (response.ok) {
        const result = await response.json();
        setFiles(result.files);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
    setLoading(false);
  };

  const loadDuplicates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${settings.backend.apiUrl}/api/file-metadata/duplicates`);
      if (response.ok) {
        const data = await response.json();
        setDuplicates(data);
      }
    } catch (error) {
      console.error('Load duplicates error:', error);
    }
    setLoading(false);
  };

  const startIndexing = async () => {
    if (!indexingPath) return;

    setLoading(true);
    try {
      const response = await fetch(`${settings.backend.apiUrl}/api/file-metadata/index-directory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: indexingPath,
          recursive: indexingRecursive
        })
      });

      if (response.ok) {
        const result = await response.json();
        setIndexingResult(result);
      }
    } catch (error) {
      console.error('Indexing error:', error);
    }
    setLoading(false);
  };

  const getFileIcon = (file: FileMetadata) => {
    if (file.mimeType.startsWith('video/')) return <Play className="w-4 h-4" />;
    if (file.mimeType.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (file.mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.mimeType.includes('text') || file.mimeType.includes('document')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  const getExtensionColor = (ext: string): string => {
    const colors: Record<string, string> = {
      mp4: 'bg-blue-100 text-blue-800',
      mkv: 'bg-blue-100 text-blue-800',
      avi: 'bg-blue-100 text-blue-800',
      mp3: 'bg-green-100 text-green-800',
      flac: 'bg-green-100 text-green-800',
      wav: 'bg-green-100 text-green-800',
      jpg: 'bg-purple-100 text-purple-800',
      png: 'bg-purple-100 text-purple-800',
      gif: 'bg-purple-100 text-purple-800',
      pdf: 'bg-red-100 text-red-800',
      doc: 'bg-orange-100 text-orange-800',
      docx: 'bg-orange-100 text-orange-800'
    };
    return colors[ext.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const toggleDirectoryExpand = (dirPath: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath);
    } else {
      newExpanded.add(dirPath);
    }
    setExpandedDirs(newExpanded);
  };

  const renderFileMetadata = (file: FileMetadata) => {
    if (!file.metadata) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-sm mb-2 text-gray-700">Extended Metadata</h4>

        {file.metadata.video && (
          <div className="space-y-1 text-xs">
            <div><span className="font-medium">Codec:</span> {file.metadata.video.codec}</div>
            <div><span className="font-medium">Resolution:</span> {file.metadata.video.width}x{file.metadata.video.height}</div>
            <div><span className="font-medium">FPS:</span> {file.metadata.video.fps}</div>
            <div><span className="font-medium">Pixel Format:</span> {file.metadata.video.pixelFormat}</div>
          </div>
        )}

        {file.metadata.audio && (
          <div className="space-y-1 text-xs mt-2">
            <div><span className="font-medium">Audio Codec:</span> {file.metadata.audio.codec}</div>
            <div><span className="font-medium">Sample Rate:</span> {file.metadata.audio.sampleRate} Hz</div>
            <div><span className="font-medium">Channels:</span> {file.metadata.audio.channels}</div>
          </div>
        )}

        {file.metadata.duration && (
          <div className="text-xs mt-2">
            <span className="font-medium">Duration:</span> {Math.floor(file.metadata.duration / 60)}:{(file.metadata.duration % 60).toFixed(0).padStart(2, '0')}
          </div>
        )}

        {file.metadata.exif && (
          <div className="space-y-1 text-xs mt-2">
            <div><span className="font-medium">Camera:</span> {file.metadata.exif.make} {file.metadata.exif.model}</div>
            <div><span className="font-medium">Date:</span> {file.metadata.exif.dateTime}</div>
            <div><span className="font-medium">ISO:</span> {file.metadata.exif.iso}</div>
            <div><span className="font-medium">Focal Length:</span> {file.metadata.exif.focalLength}mm</div>
            {file.metadata.exif.gpsLat && (
              <div><span className="font-medium">GPS:</span> {file.metadata.exif.gpsLat}, {file.metadata.exif.gpsLng}</div>
            )}
          </div>
        )}

        {file.metadata.artist && (
          <div className="space-y-1 text-xs mt-2">
            <div><span className="font-medium">Artist:</span> {file.metadata.artist}</div>
            {file.metadata.album && <div><span className="font-medium">Album:</span> {file.metadata.album}</div>}
            {file.metadata.title && <div><span className="font-medium">Title:</span> {file.metadata.title}</div>}
            {file.metadata.genre && <div><span className="font-medium">Genre:</span> {file.metadata.genre}</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5" />
            File Metadata Manager
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          {[
            { id: 'search', label: 'Search', icon: Search },
            { id: 'duplicates', label: 'Duplicates', icon: Hash },
            { id: 'indexing', label: 'Indexing', icon: RefreshCw }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'search' && (
          <div className="h-full flex">
            {/* Search Panel */}
            <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
              <h3 className="font-medium mb-4">Search Filters</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Search Text</label>
                  <input
                    type="text"
                    value={searchQuery.text || ''}
                    onChange={(e) => setSearchQuery(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Search filename or path..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Quick Filters</label>
                  <div className="space-y-2">
                    {[
                      { key: 'videos', label: 'Videos' },
                      { key: 'images', label: 'Images' },
                      { key: 'audio', label: 'Audio' },
                      { key: 'documents', label: 'Documents' }
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={quickFilters[key as keyof typeof quickFilters]}
                          onChange={(e) => setQuickFilters(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="rounded"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Min Size (MB)</label>
                  <input
                    type="number"
                    value={searchQuery.minSize ? Math.round(searchQuery.minSize / 1024 / 1024) : ''}
                    onChange={(e) => setSearchQuery(prev => ({
                      ...prev,
                      minSize: e.target.value ? parseInt(e.target.value) * 1024 * 1024 : undefined
                    }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Max Size (MB)</label>
                  <input
                    type="number"
                    value={searchQuery.maxSize ? Math.round(searchQuery.maxSize / 1024 / 1024) : ''}
                    onChange={(e) => setSearchQuery(prev => ({
                      ...prev,
                      maxSize: e.target.value ? parseInt(e.target.value) * 1024 * 1024 : undefined
                    }))}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Search
                </button>
              </div>

              {total > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    Found {total.toLocaleString()} files
                  </div>
                </div>
              )}
            </div>

            {/* Results Panel */}
            <div className="flex-1 flex">
              {/* File List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => setSelectedFile(file)}
                          className={`p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 ${
                            selectedFile?.id === file.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {getFileIcon(file)}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{file.name}</div>
                                <div className="text-xs text-gray-500 truncate">{file.path}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${getExtensionColor(file.extension)}`}>
                                    {file.extension.toUpperCase()}
                                  </span>
                                  <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                                  <span className="text-xs text-gray-400">{formatDate(file.modified)}</span>
                                </div>
                              </div>
                            </div>
                            {file.hash && (
                              <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" title={`SHA-256: ${file.hash.substring(0, 16)}...`} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* File Details */}
              {selectedFile && (
                <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
                  <div className="p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      {getFileIcon(selectedFile)}
                      {selectedFile.name}
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Path</label>
                        <div className="text-sm break-all">{selectedFile.path}</div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Size</label>
                        <div className="text-sm">{formatSize(selectedFile.size)}</div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Type</label>
                        <div className="text-sm">{selectedFile.mimeType}</div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Modified</label>
                        <div className="text-sm">{formatDate(selectedFile.modified)}</div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Created</label>
                        <div className="text-sm">{formatDate(selectedFile.created)}</div>
                      </div>

                      {selectedFile.hash && (
                        <div>
                          <label className="text-xs font-medium text-gray-500">SHA-256 Hash</label>
                          <div className="text-sm font-mono text-xs break-all">{selectedFile.hash}</div>
                        </div>
                      )}

                      {renderFileMetadata(selectedFile)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'duplicates' && (
          <div className="h-full overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : duplicates.length > 0 ? (
              <div className="space-y-6">
                {duplicates.map((group) => (
                  <div key={group.hash} className="bg-white rounded-lg border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <Hash className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="font-medium">Duplicate Group</div>
                          <div className="text-sm text-gray-500 font-mono">{group.hash.substring(0, 16)}...</div>
                        </div>
                        <div className="ml-auto text-sm text-gray-500">
                          {group.files.length} files • {formatSize(group.files.reduce((sum, f) => sum + f.size, 0))} total
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {group.files.map((file) => (
                        <div key={file.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getFileIcon(file)}
                              <div>
                                <div className="font-medium">{file.name}</div>
                                <div className="text-sm text-gray-500">{file.path}</div>
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              <div>{formatSize(file.size)}</div>
                              <div>{formatDate(file.modified)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Hash className="w-12 h-12 mb-3" />
                <div className="text-lg font-medium">No Duplicates Found</div>
                <div className="text-sm">All files in the database are unique</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'indexing' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <h3 className="font-semibold mb-6">Index Directory</h3>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Directory Path</label>
                    <input
                      type="text"
                      value={indexingPath}
                      onChange={(e) => setIndexingPath(e.target.value)}
                      placeholder="/home/user/Videos or /mnt/media"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={indexingRecursive}
                        onChange={(e) => setIndexingRecursive(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Index subdirectories recursively</span>
                    </label>
                  </div>

                  <button
                    onClick={startIndexing}
                    disabled={loading || !indexingPath}
                    className="w-full bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center gap-2"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Start Indexing
                  </button>
                </div>
              </div>

              {indexingResult && (
                <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="font-medium mb-4">Indexing Results</h4>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">
                        Successfully indexed {indexingResult.indexed} files
                      </span>
                    </div>

                    {indexingResult.errors.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="text-sm font-medium text-red-600 mb-2">
                          Errors ({indexingResult.errors.length}):
                        </div>
                        <div className="space-y-1">
                          {indexingResult.errors.map((error, index) => (
                            <div key={index} className="text-xs text-red-500">{error}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Supported File Types</h4>
                <div className="text-sm text-blue-700">
                  The metadata manager supports extracting detailed information from:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Video:</strong> MP4, MKV, AVI, MOV, WMV, FLV, WebM</li>
                    <li><strong>Audio:</strong> MP3, FLAC, WAV, AAC, OGG, M4A, OPUS</li>
                    <li><strong>Image:</strong> JPG, PNG, GIF, TIFF, WebP, HEIC (with EXIF data)</li>
                    <li><strong>Documents:</strong> PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};