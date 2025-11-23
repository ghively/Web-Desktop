import { useState, useEffect } from 'react';
import { Container, Play, Square, RotateCcw, Clock, Activity } from 'lucide-react';

interface DockerContainer {
    id: string;
    name: string;
    image: string;
    state: string;
    status: string;
    ports?: string | any[];
    created: string;
}

interface ContainerManagerProps {
    windowId: string;
}

export const ContainerManager: React.FC<ContainerManagerProps> = () => {
    const [containers, setContainers] = useState<DockerContainer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadContainers = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(`http://${window.location.hostname}:3001/api/containers`, {
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

            const containers = Array.isArray(data.containers) ? data.containers : [];
            
            // Validate container data
            const validContainers = containers.filter((container: any) => 
                container && 
                typeof container.id === 'string' && 
                typeof container.name === 'string' &&
                container.id.length > 0
            );

            setContainers(validContainers);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error('Failed to load containers:', err);
            setError(errorMessage);
            setContainers([]);
        } finally {
            setLoading(false);
        }
    };

    const executeContainerAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
        // Validate container ID
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            setError('Invalid container ID');
            return;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for container operations

            const response = await fetch(`http://${window.location.hostname}:3001/api/containers/${encodeURIComponent(id.trim())}/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `Failed to ${action} container`;
                throw new Error(errorMessage);
            }

            // Refresh list after successful action
            await loadContainers();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : `Failed to ${action} container`;
            console.error(`Container ${action} error:`, err);
            setError(errorMessage);
            
            // Clear error after 5 seconds
            setTimeout(() => setError(null), 5000);
        }
    };

    const startContainer = (id: string) => executeContainerAction(id, 'start');
    const stopContainer = (id: string) => executeContainerAction(id, 'stop');
    const restartContainer = (id: string) => executeContainerAction(id, 'restart');

    const getStatusColor = (status: string) => {
        if (status.includes('running')) return 'text-green-400';
        if (status.includes('exited')) return 'text-red-400';
        if (status.includes('paused')) return 'text-yellow-400';
        return 'text-gray-400';
    };

    const getStatusBg = (status: string) => {
        if (status.includes('running')) return 'bg-green-900/20 border-green-700/50';
        if (status.includes('exited')) return 'bg-red-900/20 border-red-700/50';
        if (status.includes('paused')) return 'bg-yellow-900/20 border-yellow-700/50';
        return 'bg-gray-800/50 border-gray-700/50';
    };

    const formatPorts = (ports?: string | any[]) => {
        if (!ports) return null;
        
        // Handle case where ports comes as a string from backend
        if (typeof ports === 'string') {
            return ports;
        }
        
        // Handle case where ports is an array
        if (Array.isArray(ports) && ports.length > 0) {
            return ports.map(port => {
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
        // Auto-refresh every 5 seconds
        const interval = setInterval(loadContainers, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                    <Container size={20} className="text-blue-400" />
                    <div>
                        <h2 className="text-gray-100 font-semibold">Container Management</h2>
                        <p className="text-gray-500 text-xs">Docker containers</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                        {containers.length} containers
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

            {/* Container List */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-3"></div>
                        Loading containers...
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

                {!loading && !error && containers.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Container size={48} className="mb-4 opacity-50" />
                        <div className="text-lg font-medium mb-2">No containers found</div>
                        <div className="text-sm">Start by creating a Docker container</div>
                    </div>
                )}

                {!loading && !error && containers.map((container) => (
                    <div
                        key={container.id}
                        className="mb-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all hover:shadow-lg overflow-hidden"
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
                                                {new Date(container.created).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Container Details */}
                        <div className="p-4 bg-gray-900/30">
                            {formatPorts(container.ports) && (
                                <div className="mb-3">
                                    <div className="text-gray-400 text-xs mb-1">Ports</div>
                                    <div className="text-gray-200 text-sm font-mono bg-gray-800/50 px-2 py-1 rounded">
                                        {formatPorts(container.ports)}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                {container.status.includes('running') ? (
                                    <>
                                        <button
                                            onClick={() => stopContainer(container.id)}
                                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-all hover:scale-105 flex items-center gap-2"
                                        >
                                            <Square size={14} />
                                            Stop
                                        </button>
                                        <button
                                            onClick={() => restartContainer(container.id)}
                                            className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-all hover:scale-105 flex items-center gap-2"
                                        >
                                            <RotateCcw size={14} />
                                            Restart
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => startContainer(container.id)}
                                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-all hover:scale-105 flex items-center gap-2"
                                    >
                                        <Play size={14} />
                                        Start
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};