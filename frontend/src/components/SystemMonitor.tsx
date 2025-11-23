import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Cpu, HardDrive, Zap } from 'lucide-react';
import { useSettings } from '../context/useSettings';

interface SystemStats {
    cpu: number;
    mem: {
        total: number;
        used: number;
        free: number;
        percent: number;
    };
    os?: {
        platform: string;
        distro: string;
        release: string;
        hostname: string;
    };
}

interface SystemMonitorProps {
    windowId?: string;
}

export const SystemMonitor: React.FC<SystemMonitorProps> = ({ windowId }: SystemMonitorProps) => {
    const { settings } = useSettings();

    // Log windowId for debugging
    React.useEffect(() => {
        if (windowId) {
            console.log('SystemMonitor rendered in window:', windowId);
        }
    }, [windowId]);
    const [stats, setStats] = useState<SystemStats>({
        cpu: 0,
        mem: { total: 0, used: 0, free: 0, percent: 0 }
    });
    const [cpuHistory, setCpuHistory] = useState<number[]>(new Array(60).fill(0));
    const [ramHistory, setRamHistory] = useState<number[]>(new Array(60).fill(0));
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const cpuCanvasRef = useRef<HTMLCanvasElement>(null);
    const ramCanvasRef = useRef<HTMLCanvasElement>(null);

    const drawGraph = useCallback((canvas: HTMLCanvasElement | null, data: number[], color: string) => {
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;

        // Set canvas resolution
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        const stepX = width / (data.length - 1);
        data.forEach((value, i) => {
            const x = i * stepX;
            const y = height - (value / 100) * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Fill area under line
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '00');
        ctx.fillStyle = gradient;
        ctx.fill();
    }, []);

    const updateGraphs = useCallback(() => {
        drawGraph(cpuCanvasRef.current, cpuHistory, '#89b4fa');
        drawGraph(ramCanvasRef.current, ramHistory, '#f9e2af');
    }, [cpuHistory, ramHistory, drawGraph]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${settings.backend.apiUrl}/api/system/stats`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data: SystemStats = await response.json();

            setStats(data);

            // Update history arrays (keep last 60 values)
            setCpuHistory(prev => {
                const newHistory = [...prev.slice(1), data.cpu];
                return newHistory;
            });

            setRamHistory(prev => {
                const newHistory = [...prev.slice(1), data.mem.percent];
                return newHistory;
            });

            setError(null);
        } catch (err) {
            console.error('Failed to fetch system stats:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [settings.backend.apiUrl]);

    // Initial fetch and set up interval
    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 3000);

        return () => clearInterval(interval);
    }, [fetchStats]);

    // Update graphs when data changes
    useEffect(() => {
        updateGraphs();
    }, [updateGraphs]);

    const formatBytes = (bytes: number): string => {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    const getBarColor = (percentage: number, type: 'cpu' | 'ram'): string => {
        if (percentage < 50) return type === 'cpu' ? 'bg-blue-500' : 'bg-yellow-500';
        if (percentage < 80) return type === 'cpu' ? 'bg-blue-400' : 'bg-yellow-400';
        return type === 'cpu' ? 'bg-blue-300' : 'bg-yellow-300';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-900">
                <div className="flex items-center gap-3 text-gray-400">
                    <Activity className="animate-pulse" size={24} />
                    <span>Loading system stats...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-900">
                <div className="text-center">
                    <div className="text-red-400 mb-2">⚠️ Error</div>
                    <div className="text-gray-400">{error}</div>
                    <button
                        onClick={fetchStats}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-900 text-gray-100 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <Zap className="text-blue-400" size={32} />
                    <div>
                        <h1 className="text-3xl font-bold">System Monitor</h1>
                        <p className="text-gray-400 text-sm mt-1">Real-time system performance monitoring</p>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* CPU Usage */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Cpu className="text-blue-400" size={24} />
                                <h2 className="text-xl font-semibold">CPU Usage</h2>
                            </div>
                            <div className="text-2xl font-mono font-bold text-blue-400">
                                {stats.cpu.toFixed(1)}%
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${getBarColor(stats.cpu, 'cpu')}`}
                                    style={{ width: `${stats.cpu}%` }}
                                />
                            </div>
                        </div>

                        <div className="h-24 bg-gray-900 rounded-lg p-2">
                            <canvas
                                ref={cpuCanvasRef}
                                className="w-full h-full"
                                style={{ imageRendering: 'crisp-edges' }}
                            />
                        </div>
                    </div>

                    {/* RAM Usage */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <HardDrive className="text-yellow-400" size={24} />
                                <h2 className="text-xl font-semibold">RAM Usage</h2>
                            </div>
                            <div className="text-2xl font-mono font-bold text-yellow-400">
                                {stats.mem.percent.toFixed(1)}%
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${getBarColor(stats.mem.percent, 'ram')}`}
                                    style={{ width: `${stats.mem.percent}%` }}
                                />
                            </div>
                        </div>

                        <div className="mb-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Used:</span>
                                <span className="font-mono">{formatBytes(stats.mem.used)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Free:</span>
                                <span className="font-mono">{formatBytes(stats.mem.free)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Total:</span>
                                <span className="font-mono">{formatBytes(stats.mem.total)}</span>
                            </div>
                        </div>

                        <div className="h-24 bg-gray-900 rounded-lg p-2">
                            <canvas
                                ref={ramCanvasRef}
                                className="w-full h-full"
                                style={{ imageRendering: 'crisp-edges' }}
                            />
                        </div>
                    </div>
                </div>

                {/* System Information */}
                {stats.os && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
                            <Activity className="text-green-400" size={24} />
                            System Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <div className="text-sm text-gray-400 mb-1">Hostname</div>
                                <div className="font-mono text-sm">{stats.os.hostname}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 mb-1">Platform</div>
                                <div className="font-mono text-sm">{stats.os.platform}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 mb-1">Distribution</div>
                                <div className="font-mono text-sm">{stats.os.distro}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 mb-1">Release</div>
                                <div className="font-mono text-sm">{stats.os.release}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    Updates every 3 seconds • Showing last 60 data points
                </div>
            </div>
        </div>
    );
};