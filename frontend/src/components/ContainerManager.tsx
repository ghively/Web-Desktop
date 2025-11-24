import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Play, Square, RotateCcw, Clock, Activity, Monitor,
  Terminal, Copy, Trash2, Plus, Search, Filter, TrendingUp, HardDrive,
  Network, Settings, Eye, EyeOff, ChevronDown, ChevronUp, Download,
  Upload, FileText, AlertCircle, CheckCircle, Zap, Cpu, BarChart3
} from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { Loading } from './ui/Loading';

interface DockerContainer {
    id: string;
    name: string;
    image: string;
    state: string;
    status: string;
    ports?: string | unknown[];
    created: string;
    // Enhanced properties for advanced features
    labels?: Record<string, string>;
    environment?: Record<string, string>;
    volumes?: string[];
    networks?: string[];
    resources?: {
      cpu?: string;
      memory?: string;
    };
    metrics?: {
      cpu?: number;
      memory?: number;
      networkIO?: number;
      diskIO?: number;
    };
    logs?: string[];
    restartCount?: number;
    exitCode?: number;
}

interface ContainerManagerProps {
    windowId: string;
}

// Utility function to validate and format dates
const validateAndFormatDate = (dateString: string): string => {
    if (!dateString || typeof dateString !== 'string') {
        return 'Unknown';
    }

    try {
        const date = new Date(dateString);

        // Check if date is invalid
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        // Check for reasonable date range (1970-2100)
        if (date.getFullYear() < 1970 || date.getFullYear() > 2100) {
            return 'Out of Range';
        }

        // Check if date is too far in the future (more than 1 year from now)
        const now = new Date();
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        if (date > oneYearFromNow) {
            return 'Future Date';
        }

        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.warn('Date parsing error:', error);
        return 'Invalid';
    }
};

export const ContainerManager: React.FC<ContainerManagerProps> = () => {
    const { settings } = useSettings();
    const [containers, setContainers] = useState<DockerContainer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
    const [showMetrics, setShowMetrics] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [containerLogs, setContainerLogs] = useState<Record<string, string[]>>({});
    const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'logs' | 'network' | 'volumes'>('overview');
    const [images, setImages] = useState<string[]>([]);
    const [networks, setNetworks] = useState<string[]>([]);
    const [volumes, setVolumes] = useState<string[]>([]);

    const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const loadContainers = useCallback(async () => {
        // Cancel any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        setLoading(true);
        setError(null);

        try {
            // Create new AbortController for this request
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(`${settings.backend.apiUrl}/api/containers`, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            clearTimeout(timeoutId);

            // Check if request was aborted
            if (controller.signal.aborted) {
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Validate response data
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response from server');
            }

            const containers = Array.isArray(data.containers) ? data.containers : [];

            // Validate container data
            const validContainers = containers.filter((container: DockerContainer) => {
                if (!container ||
                    typeof container.id !== 'string' ||
                    typeof container.name !== 'string' ||
                    container.id.length === 0) {
                    return false;
                }

                // Validate and fix created date if needed
                if (!container.created || typeof container.created !== 'string') {
                    container.created = new Date().toISOString();
                }

                return true;
            });

            // Only update state if request wasn't aborted
            if (!controller.signal.aborted) {
                setContainers(validContainers);
            }
        } catch (err) {
            // Don't show error for aborted requests
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }

            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error('Failed to load containers:', err);
            setError(errorMessage);
            setContainers([]);
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    }, [settings.backend.apiUrl]);

    const executeContainerAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
        // Validate container ID
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            setError('Invalid container ID');
            return;
        }

        // Cancel any existing action
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        try {
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for container operations

            const response = await fetch(`${settings.backend.apiUrl}/api/containers/${encodeURIComponent(id.trim())}/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Check if request was aborted
            if (controller.signal.aborted) {
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `Failed to ${action} container`;
                throw new Error(errorMessage);
            }

            // Refresh list after successful action only if not aborted
            if (!controller.signal.aborted) {
                await loadContainers();
            }
        } catch (err) {
            // Don't show error for aborted requests
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }

            const errorMessage = err instanceof Error ? err.message : `Failed to ${action} container`;
            console.error(`Container ${action} error:`, err);
            setError(errorMessage);

            // Clear error after 5 seconds
            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
            }
            errorTimeoutRef.current = setTimeout(() => setError(null), 5000);
        } finally {
            abortControllerRef.current = null;
        }
    };

    const startContainer = (id: string) => executeContainerAction(id, 'start');
    const stopContainer = (id: string) => executeContainerAction(id, 'stop');
    const restartContainer = (id: string) => executeContainerAction(id, 'restart');

    // Advanced functions
    const loadContainerLogs = async (id: string) => {
        try {
            const response = await fetch(`${settings.backend.apiUrl}/api/containers/${id}/logs?lines=50`);
            if (response.ok) {
                const data = await response.json();
                setContainerLogs(prev => ({
                    ...prev,
                    [id]: data.logs?.split('\n').filter((line: string) => line.trim()) || []
                }));
            }
        } catch (error) {
            console.error('Failed to load container logs:', error);
        }
    };

    const loadDockerResources = async () => {
        try {
            // Load images
            const imagesResponse = await fetch(`${settings.backend.apiUrl}/api/containers/images`);
            if (imagesResponse.ok) {
                const imagesData = await imagesResponse.json();
                setImages(imagesData.images || []);
            }

            // Load networks
            const networksResponse = await fetch(`${settings.backend.apiUrl}/api/containers/networks`);
            if (networksResponse.ok) {
                const networksData = await networksResponse.json();
                setNetworks(networksData.networks || []);
            }

            // Load volumes
            const volumesResponse = await fetch(`${settings.backend.apiUrl}/api/containers/volumes`);
            if (volumesResponse.ok) {
                const volumesData = await volumesResponse.json();
                setVolumes(volumesData.volumes || []);
            }
        } catch (error) {
            console.error('Failed to load Docker resources:', error);
        }
    };

    const removeContainer = async (id: string) => {
        if (!confirm('Are you sure you want to remove this container? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${settings.backend.apiUrl}/api/containers/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await loadContainers();
                setSelectedContainer(null);
            }
        } catch (error) {
            setError('Failed to remove container');
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    const getStatusColor = (status: string) => {
        if (status.includes('running')) return 'text-green-400';
        if (status.includes('exited')) return 'text-red-400';
        if (status.includes('paused')) return 'text-yellow-400';
        if (status.includes('restarting')) return 'text-blue-400';
        return 'text-gray-400';
    };

    const getStatusBg = (status: string) => {
        if (status.includes('running')) return 'bg-green-900/20 border-green-700/50';
        if (status.includes('exited')) return 'bg-red-900/20 border-red-700/50';
        if (status.includes('paused')) return 'bg-yellow-900/20 border-yellow-700/50';
        if (status.includes('restarting')) return 'bg-blue-900/20 border-blue-700/50';
        return 'bg-gray-800/50 border-gray-700/50';
    };

    // Filter containers based on search and status
    const filteredContainers = containers.filter(container => {
        const matchesSearch = searchQuery === '' ||
            container.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            container.image.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'running' && container.state === 'running') ||
            (filterStatus === 'stopped' && container.state === 'exited') ||
            (filterStatus === 'paused' && container.state === 'paused');

        return matchesSearch && matchesStatus;
    });

    const formatPorts = (ports?: string | unknown[] | { PublicPort?: number; PrivatePort: number; Type: string }[]) => {
        if (!ports) return null;
        
        // Handle case where ports comes as a string from backend
        if (typeof ports === 'string') {
            return ports;
        }
        
        // Handle case where ports is an array
        if (Array.isArray(ports) && ports.length > 0) {
            return (ports as { PublicPort?: number; PrivatePort: number; Type: string }[]).map((port) => {
                if (port.PublicPort) {
                    return `${port.PublicPort}->${port.PrivatePort}/${port.Type}`;
                }
                return `${port.PrivatePort}/${port.Type}`;
            }).join(', ');
        }
        
        return null;
    };

    const getContainerIcon = (status: string) => {
        if (status.includes('running')) return <Activity className="text-green-400" size={16} />;
        if (status.includes('exited')) return <Square className="text-red-400" size={16} />;
        if (status.includes('paused')) return <Clock className="text-yellow-400" size={16} />;
        return <Container className="text-gray-400" size={16} />;
    };

    useEffect(() => {
        loadContainers();
        loadDockerResources();
        // Auto-refresh every 30 seconds (reduced from 5 seconds to prevent API spam)
        const interval = setInterval(() => {
            loadContainers();
            loadDockerResources();
        }, 30000);

        return () => {
            clearInterval(interval);
            // Clear any pending error timeout
            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
            }
            // Cancel any pending requests
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [loadContainers]);

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Enhanced Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                    <Container size={20} className="text-blue-400" />
                    <div>
                        <h2 className="text-gray-100 font-semibold">Advanced Container Management</h2>
                        <p className="text-gray-500 text-xs">Professional Docker container orchestration</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-all hover:scale-105"
                        title="Toggle Advanced View"
                    >
                        <Settings size={16} />
                    </button>
                    <button
                        onClick={() => setShowMetrics(!showMetrics)}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-all hover:scale-105"
                        title="Toggle Metrics"
                    >
                        <BarChart3 size={16} />
                    </button>
                    <div className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                        {filteredContainers.length}/{containers.length} containers
                    </div>
                    <button
                        onClick={loadContainers}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-all hover:scale-105"
                        title="Refresh"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex items-center gap-3 p-4 bg-gray-800/50 border-b border-gray-700/30">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search containers by name or image..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500/50"
                >
                    <option value="all">All Status</option>
                    <option value="running">Running</option>
                    <option value="stopped">Stopped</option>
                    <option value="paused">Paused</option>
                </select>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex">
                {/* Container List */}
                <div className={`${selectedContainer ? 'w-1/2' : 'w-full'} overflow-y-auto p-4 border-r border-gray-700/30`}>
                    {loading && (
                        <div className="flex items-center justify-center h-full">
                            <Loading
                                variant="spinner"
                                text="Loading containers..."
                                size="lg"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="text-red-400 mb-2">⚠️ {error}</div>
                            <button
                                onClick={loadContainers}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {!loading && !error && filteredContainers.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Container size={48} className="mb-4 opacity-50" />
                            <div className="text-lg font-medium mb-2">No containers found</div>
                            <div className="text-sm">Try adjusting your search or filter criteria</div>
                        </div>
                    )}

                    {!loading && !error && filteredContainers.map((container) => (
                        <div
                            key={container.id}
                            className={`mb-4 bg-gray-800/50 rounded-xl border transition-all hover:shadow-lg overflow-hidden cursor-pointer ${
                                selectedContainer === container.id
                                    ? 'border-blue-600/50 bg-gray-800/70'
                                    : 'border-gray-700/50 hover:border-gray-600/50'
                            }`}
                            onClick={() => setSelectedContainer(container.id)}
                        >
                            {/* Container Header */}
                            <div className="p-4 border-b border-gray-700/30">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                        {getContainerIcon(container.status)}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-gray-100 font-medium truncate">{container.name}</h3>
                                            <p className="text-gray-400 text-sm truncate">{container.image}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBg(container.status)} ${getStatusColor(container.status)} font-medium`}>
                                                    {container.status}
                                                </span>
                                                <div className="flex items-center gap-1 text-gray-500 text-xs">
                                                    <Clock size={12} />
                                                    {validateAndFormatDate(container.created)}
                                                </div>
                                                {container.restartCount && container.restartCount > 0 && (
                                                    <div className="flex items-center gap-1 text-yellow-400 text-xs">
                                                        <AlertCircle size={12} />
                                                        Restarted {container.restartCount} times
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex items-center gap-1">
                                        {container.status.includes('running') ? (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        stopContainer(container.id);
                                                    }}
                                                    className="p-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 rounded-lg transition-all hover:scale-105"
                                                    title="Stop"
                                                >
                                                    <Square size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        restartContainer(container.id);
                                                    }}
                                                    className="p-1.5 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 rounded-lg transition-all hover:scale-105"
                                                    title="Restart"
                                                >
                                                    <RotateCcw size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startContainer(container.id);
                                                }}
                                                className="p-1.5 bg-green-600/20 hover:bg-green-600 text-green-400 rounded-lg transition-all hover:scale-105"
                                                title="Start"
                                            >
                                                <Play size={12} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                copyToClipboard(container.id);
                                            }}
                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded-lg transition-all hover:scale-105"
                                            title="Copy ID"
                                        >
                                            <Copy size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeContainer(container.id);
                                            }}
                                            className="p-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 rounded-lg transition-all hover:scale-105"
                                            title="Remove"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced Container Details */}
                            <div className="p-4 bg-gray-900/30">
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    {formatPorts(container.ports) && (
                                        <div>
                                            <div className="text-gray-400 text-xs mb-1">Ports</div>
                                            <div className="text-gray-200 text-sm font-mono bg-gray-800/50 px-2 py-1 rounded">
                                                {formatPorts(container.ports)}
                                            </div>
                                        </div>
                                    )}
                                    {showMetrics && container.metrics && (
                                        <>
                                            {container.metrics.cpu && (
                                                <div>
                                                    <div className="text-gray-400 text-xs mb-1">CPU Usage</div>
                                                    <div className="flex items-center gap-2">
                                                        <Cpu size={12} className="text-blue-400" />
                                                        <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="bg-blue-400 h-full transition-all"
                                                                style={{ width: `${container.metrics.cpu}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-300">{container.metrics.cpu.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            )}
                                            {container.metrics.memory && (
                                                <div>
                                                    <div className="text-gray-400 text-xs mb-1">Memory</div>
                                                    <div className="flex items-center gap-2">
                                                        <HardDrive size={12} className="text-green-400" />
                                                        <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="bg-green-400 h-full transition-all"
                                                                style={{ width: `${(container.metrics.memory / 1024) * 10}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-300">{(container.metrics.memory / 1024).toFixed(1)}GB</span>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {showAdvanced && (
                                    <div className="grid grid-cols-3 gap-4 text-xs">
                                        <div>
                                            <div className="text-gray-400 mb-1">Container ID</div>
                                            <div className="text-gray-200 font-mono truncate">{container.id.substring(0, 12)}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 mb-1">State</div>
                                            <div className="text-gray-200">{container.state}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 mb-1">Exit Code</div>
                                            <div className="text-gray-200">{container.exitCode || 'N/A'}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Container Details Panel */}
                {selectedContainer && (
                    <div className="w-1/2 bg-gray-800/30 border-l border-gray-700/30 flex flex-col">
                        {(() => {
                            const container = containers.find(c => c.id === selectedContainer);
                            if (!container) return null;

                            return (
                                <>
                                    {/* Details Header */}
                                    <div className="flex items-center justify-between p-4 bg-gray-800/50 border-b border-gray-700/30">
                                        <h3 className="font-semibold text-gray-100">{container.name}</h3>
                                        <button
                                            onClick={() => setSelectedContainer(null)}
                                            className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400"
                                        >
                                            <EyeOff size={16} />
                                        </button>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex border-b border-gray-700/30">
                                        {(['overview', 'metrics', 'logs', 'network', 'volumes'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                                                    activeTab === tab
                                                        ? 'bg-blue-600/20 text-blue-400 border-b border-blue-400'
                                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
                                                }`}
                                            >
                                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content */}
                                    <div className="flex-1 overflow-y-auto p-4">
                                        {activeTab === 'overview' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-300 mb-2">Container Information</h4>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">ID:</span>
                                                            <span className="font-mono text-gray-200">{container.id}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Image:</span>
                                                            <span className="text-gray-200">{container.image}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Status:</span>
                                                            <span className={getStatusColor(container.status)}>{container.status}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Created:</span>
                                                            <span className="text-gray-200">{validateAndFormatDate(container.created)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {formatPorts(container.ports) && (
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-300 mb-2">Port Mappings</h4>
                                                        <div className="font-mono text-sm bg-gray-900/50 p-2 rounded text-gray-200">
                                                            {formatPorts(container.ports)}
                                                        </div>
                                                    </div>
                                                )}

                                                {container.environment && Object.keys(container.environment).length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-300 mb-2">Environment Variables</h4>
                                                        <div className="space-y-1">
                                                            {Object.entries(container.environment).map(([key, value]) => (
                                                                <div key={key} className="text-sm font-mono bg-gray-900/50 p-2 rounded">
                                                                    <span className="text-gray-400">{key}=</span>
                                                                    <span className="text-gray-200">{value}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activeTab === 'metrics' && (
                                            <div className="space-y-4">
                                                {container.metrics ? (
                                                    <>
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-300 mb-3">Resource Usage</h4>
                                                            <div className="space-y-3">
                                                                {container.metrics.cpu && (
                                                                    <div>
                                                                        <div className="flex justify-between text-sm mb-1">
                                                                            <span className="text-gray-400">CPU</span>
                                                                            <span className="text-gray-200">{container.metrics.cpu.toFixed(2)}%</span>
                                                                        </div>
                                                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                                                            <div
                                                                                className="bg-blue-400 h-full rounded-full transition-all"
                                                                                style={{ width: `${Math.min(container.metrics.cpu, 100)}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {container.metrics.memory && (
                                                                    <div>
                                                                        <div className="flex justify-between text-sm mb-1">
                                                                            <span className="text-gray-400">Memory</span>
                                                                            <span className="text-gray-200">{(container.metrics.memory / 1024).toFixed(2)} GB</span>
                                                                        </div>
                                                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                                                            <div
                                                                                className="bg-green-400 h-full rounded-full transition-all"
                                                                                style={{ width: `${Math.min((container.metrics.memory / 1024 / 8) * 100, 100)}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {container.metrics.networkIO && (
                                                                    <div>
                                                                        <div className="flex justify-between text-sm mb-1">
                                                                            <span className="text-gray-400">Network I/O</span>
                                                                            <span className="text-gray-200">{container.metrics.networkIO.toFixed(2)} MB/s</span>
                                                                        </div>
                                                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                                                            <div
                                                                                className="bg-purple-400 h-full rounded-full transition-all"
                                                                                style={{ width: `${Math.min(container.metrics.networkIO * 2, 100)}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {container.metrics.diskIO && (
                                                                    <div>
                                                                        <div className="flex justify-between text-sm mb-1">
                                                                            <span className="text-gray-400">Disk I/O</span>
                                                                            <span className="text-gray-200">{container.metrics.diskIO.toFixed(2)} MB/s</span>
                                                                        </div>
                                                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                                                            <div
                                                                                className="bg-orange-400 h-full rounded-full transition-all"
                                                                                style={{ width: `${Math.min(container.metrics.diskIO * 5, 100)}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-center text-gray-500 py-8">
                                                        <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                                                        <p>No metrics available</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activeTab === 'logs' && (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-sm font-medium text-gray-300">Container Logs</h4>
                                                    <button
                                                        onClick={() => loadContainerLogs(container.id)}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1"
                                                    >
                                                        <Download size={12} />
                                                        Refresh
                                                    </button>
                                                </div>
                                                <div className="font-mono text-xs bg-gray-900/50 p-3 rounded h-96 overflow-y-auto">
                                                    {containerLogs[container.id]?.length ? (
                                                        containerLogs[container.id].map((log, index) => (
                                                            <div key={index} className="text-gray-300 mb-1">
                                                                {log}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-gray-500 text-center py-8">
                                                            <FileText size={24} className="mx-auto mb-2 opacity-50" />
                                                            <p>No logs available</p>
                                                            <p className="text-xs mt-1">Click Refresh to load logs</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'network' && (
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-medium text-gray-300">Network Configuration</h4>
                                                {container.networks && container.networks.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {container.networks.map((network, index) => (
                                                            <div key={index} className="flex items-center justify-between p-2 bg-gray-900/50 rounded">
                                                                <span className="text-sm text-gray-300">{network}</span>
                                                                <Network size={16} className="text-gray-400" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500">No networks attached</p>
                                                )}

                                                <h4 className="text-sm font-medium text-gray-300 mt-4">Available Networks</h4>
                                                <div className="space-y-2">
                                                    {networks.length ? (
                                                        networks.map((network, index) => (
                                                            <div key={index} className="flex items-center justify-between p-2 bg-gray-900/50 rounded">
                                                                <span className="text-sm text-gray-300">{network}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-gray-500">No networks available</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'volumes' && (
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-medium text-gray-300">Volume Mounts</h4>
                                                {container.volumes && container.volumes.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {container.volumes.map((volume, index) => (
                                                            <div key={index} className="p-2 bg-gray-900/50 rounded">
                                                                <div className="text-sm text-gray-300 font-mono">{volume}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500">No volumes mounted</p>
                                                )}

                                                <h4 className="text-sm font-medium text-gray-300 mt-4">Available Volumes</h4>
                                                <div className="space-y-2">
                                                    {volumes.length ? (
                                                        volumes.map((volume, index) => (
                                                            <div key={index} className="flex items-center justify-between p-2 bg-gray-900/50 rounded">
                                                                <span className="text-sm text-gray-300">{volume}</span>
                                                                <HardDrive size={16} className="text-gray-400" />
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-gray-500">No volumes available</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};