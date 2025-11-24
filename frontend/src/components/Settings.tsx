import React, { useState, useEffect } from 'react';
import { X, Image, Palette, Sliders, RotateCcw, Server, Database, Wifi, Shield } from 'lucide-react';
import { useSettings, type CatppuccinTheme, type WallpaperDisplayMode } from '../context/exports';

interface SettingsProps {
    onClose: () => void;
}

const defaultWallpapers = [
    {
        name: 'Nature Mountains',
        url: 'https://cdn.mos.cms.futurecdn.net/AoWXgnHSxAAPxqymPQMQYL-1200-80.jpg'
    },
    {
        name: 'Abstract Waves',
        url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&h=1080'
    },
    {
        name: 'City Night',
        url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920&h=1080'
    },
    {
        name: 'Ocean Sunset',
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&h=1080'
    },
    {
        name: 'Forest Path',
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080'
    },
    {
        name: 'Desert Dunes',
        url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&h=1080'
    }
];

const themeInfo: Record<CatppuccinTheme, { name: string; description: string; preview: string[] }> = {
    mocha: {
        name: 'Mocha',
        description: 'Dark, warm, and comfortable',
        preview: ['#1e1e2e', '#181825', '#11111b']
    },
    latte: {
        name: 'Latte',
        description: 'Light, soothing, and warm',
        preview: ['#eff1f5', '#e6e9ef', '#dce0e8']
    },
    frappe: {
        name: 'Frappé',
        description: 'Dark, cool, and calming',
        preview: ['#303446', '#292c3c', '#232634']
    },
    macchiato: {
        name: 'Macchiato',
        description: 'Dark, balanced, and silky',
        preview: ['#24273a', '#1e2030', '#181926']
    }
};

const wallpaperDisplayModes: Record<WallpaperDisplayMode, { name: string; description: string }> = {
    cover: {
        name: 'Cover',
        description: 'Scale image to cover entire screen'
    },
    contain: {
        name: 'Contain',
        description: 'Fit entire image within screen'
    },
    stretch: {
        name: 'Stretch',
        description: 'Stretch image to fill screen'
    },
    tile: {
        name: 'Tile',
        description: 'Repeat image across screen'
    },
    center: {
        name: 'Center',
        description: 'Center image at original size'
    }
};

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    const { settings, setWallpaperType, setWallpaperImage, setWallpaperDisplayMode, setWindowOpacity, setTheme, resetSettings, updateSettings } = useSettings();
    const [customImageUrl, setCustomImageUrl] = useState(settings.wallpaper.imageUrl || '');
    const [activeTab, setActiveTab] = useState<'appearance' | 'wallpaper' | 'backend' | 'advanced'>('appearance');

    // Update customImageUrl when the wallpaper.imageUrl changes, but not when it's changed locally
    useEffect(() => {
        if (settings.wallpaper.imageUrl !== customImageUrl) {
            setCustomImageUrl(settings.wallpaper.imageUrl || '');
        }
    }, [settings.wallpaper.imageUrl, customImageUrl]);

    const handleWallpaperTypeChange = (type: 'image' | 'gradient') => {
        setWallpaperType(type);
    };

    const handleCustomImageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customImageUrl.trim()) {
            setWallpaperImage(customImageUrl.trim());
        }
    };

    const handleReset = () => {
        resetSettings();
        setCustomImageUrl('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex h-[calc(90vh-88px)]">
                    {/* Sidebar */}
                    <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
                        <nav className="space-y-2">
                            <button
                                onClick={() => setActiveTab('appearance')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                                    activeTab === 'appearance'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <Palette size={18} />
                                <span>Appearance</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('wallpaper')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                                    activeTab === 'wallpaper'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <Image size={18} />
                                <span>Wallpaper</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('backend')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                                    activeTab === 'backend'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <Server size={18} />
                                <span>Backend</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('advanced')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                                    activeTab === 'advanced'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <Sliders size={18} />
                                <span>Advanced</span>
                            </button>
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === 'appearance' && (
                            <div className="space-y-8">
                                {/* Theme Selection */}
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-100 mb-4">Theme</h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(themeInfo).map(([key, info]) => (
                                            <button
                                                key={key}
                                                onClick={() => setTheme(key as CatppuccinTheme)}
                                                className={`p-4 rounded-lg border-2 transition-all ${
                                                    settings.theme === key
                                                        ? 'border-blue-500 bg-blue-500/10'
                                                        : 'border-gray-700 hover:border-gray-600'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-medium text-gray-100">{info.name}</span>
                                                    {settings.theme === key && (
                                                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                                    )}
                                                </div>
                                                <div className="flex gap-1 mb-2">
                                                    {info.preview.map((color, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex-1 h-4 rounded"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-sm text-gray-400">{info.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Window Opacity */}
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-100 mb-4">Window Opacity</h2>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="1"
                                                step="0.05"
                                                value={settings.windowOpacity}
                                                onChange={(e) => setWindowOpacity(parseFloat(e.target.value))}
                                                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                            />
                                            <span className="text-gray-100 font-mono text-sm w-12 text-right">
                                                {Math.round(settings.windowOpacity * 100)}%
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            {[0.7, 0.8, 0.9, 0.95, 1].map((opacity) => (
                                                <button
                                                    key={opacity}
                                                    onClick={() => setWindowOpacity(opacity)}
                                                    className={`px-3 py-1 rounded text-sm transition-colors ${
                                                        Math.abs(settings.windowOpacity - opacity) < 0.01
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    }`}
                                                >
                                                    {Math.round(opacity * 100)}%
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'wallpaper' && (
                            <div className="space-y-8">
                                {/* Wallpaper Type */}
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-100 mb-4">Background Type</h2>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleWallpaperTypeChange('gradient')}
                                            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                                                settings.wallpaper.type === 'gradient'
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-gray-700 hover:border-gray-600'
                                            }`}
                                        >
                                            <div className="text-center">
                                                <div className="w-16 h-16 mx-auto mb-2 rounded bg-gradient-to-br from-gray-600 to-gray-800" />
                                                <span className="text-gray-100 font-medium">Gradient</span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => handleWallpaperTypeChange('image')}
                                            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                                                settings.wallpaper.type === 'image'
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-gray-700 hover:border-gray-600'
                                            }`}
                                        >
                                            <div className="text-center">
                                                <div className="w-16 h-16 mx-auto mb-2 rounded bg-gray-600 flex items-center justify-center">
                                                    <Image size={24} className="text-gray-300" />
                                                </div>
                                                <span className="text-gray-100 font-medium">Image</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Wallpaper Display Mode */}
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-100 mb-4">Display Mode</h2>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(wallpaperDisplayModes).map(([mode, info]) => (
                                            <button
                                                key={mode}
                                                onClick={() => setWallpaperDisplayMode(mode as WallpaperDisplayMode)}
                                                className={`p-3 rounded-lg border-2 transition-all ${
                                                    settings.wallpaper.displayMode === mode
                                                        ? 'border-blue-500 bg-blue-500/10'
                                                        : 'border-gray-700 hover:border-gray-600'
                                                }`}
                                            >
                                                <div className="text-left">
                                                    <div className="text-gray-100 font-medium text-sm">{info.name}</div>
                                                    <div className="text-gray-400 text-xs mt-1">{info.description}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Image URL */}
                                {settings.wallpaper.type === 'image' && (
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-100 mb-4">Custom Image URL</h2>
                                        <form onSubmit={handleCustomImageSubmit} className="space-y-4">
                                            <input
                                                type="url"
                                                value={customImageUrl}
                                                onChange={(e) => setCustomImageUrl(e.target.value)}
                                                placeholder="https://example.com/image.jpg"
                                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                            />
                                            <button
                                                type="submit"
                                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                            >
                                                Apply Custom Image
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {/* Default Wallpapers */}
                                {settings.wallpaper.type === 'image' && (
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-100 mb-4">Default Wallpapers</h2>
                                        <div className="grid grid-cols-3 gap-4">
                                            {defaultWallpapers.map((wallpaper) => (
                                                <button
                                                    key={wallpaper.name}
                                                    onClick={() => setWallpaperImage(wallpaper.url)}
                                                    className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                                                        settings.wallpaper.imageUrl === wallpaper.url
                                                            ? 'border-blue-500 ring-2 ring-blue-500/50'
                                                            : 'border-gray-700 hover:border-gray-600'
                                                    }`}
                                                >
                                                    <img
                                                        src={wallpaper.url}
                                                        alt={wallpaper.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                    <span className="absolute bottom-2 left-2 text-white text-sm font-medium">
                                                        {wallpaper.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'backend' && (
                            <div className="space-y-8">
                                {/* API Configuration */}
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                                        <Database size={18} />
                                        API Configuration
                                    </h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                API Base URL
                                            </label>
                                            <input
                                                type="url"
                                                value={settings.backend.apiUrl}
                                                onChange={(e) => {
                                                    updateSettings({
                                                        backend: { ...settings.backend, apiUrl: e.target.value }
                                                    });
                                                }}
                                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Base URL for REST API endpoints</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                WebSocket URL
                                            </label>
                                            <input
                                                type="url"
                                                value={settings.backend.wsUrl}
                                                onChange={(e) => {
                                                    updateSettings({
                                                        backend: { ...settings.backend, wsUrl: e.target.value }
                                                    });
                                                }}
                                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">WebSocket endpoint for terminal and real-time features</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                VNC WebSocket URL
                                            </label>
                                            <input
                                                type="url"
                                                value={settings.backend.vncUrl}
                                                onChange={(e) => {
                                                    updateSettings({
                                                        backend: { ...settings.backend, vncUrl: e.target.value }
                                                    });
                                                }}
                                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">WebSocket endpoint for VNC remote desktop connections</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Docker Configuration */}
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                                        <Server size={18} />
                                        Docker Configuration
                                    </h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Docker Socket Path
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.backend.dockerSocket || ''}
                                                onChange={(e) => {
                                                    updateSettings({
                                                        backend: { ...settings.backend, dockerSocket: e.target.value || undefined }
                                                    });
                                                }}
                                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Path to Docker socket (e.g., /var/run/docker.sock)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* File Paths Configuration */}
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                                        <Shield size={18} />
                                        File Paths
                                    </h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Default Home Path
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.backend.defaultHomePath}
                                                onChange={(e) => {
                                                    updateSettings({
                                                        backend: { ...settings.backend, defaultHomePath: e.target.value }
                                                    });
                                                }}
                                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Default user home directory path</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Temporary Directory
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.backend.tempPath}
                                                onChange={(e) => {
                                                    updateSettings({
                                                        backend: { ...settings.backend, tempPath: e.target.value }
                                                    });
                                                }}
                                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Directory for temporary files</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Share Directory
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.backend.sharePath}
                                                onChange={(e) => {
                                                    updateSettings({
                                                        backend: { ...settings.backend, sharePath: e.target.value }
                                                    });
                                                }}
                                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Directory for shared files and user uploads</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Connection Test */}
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                                        <Wifi size={18} />
                                        Connection Test
                                    </h2>
                                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                                        <p className="text-gray-300 mb-4">
                                            Test your backend configuration to ensure all services are accessible.
                                        </p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const response = await fetch(settings.backend.apiUrl + '/api/system/info');
                                                        if (response.ok) {
                                                            alert('API connection successful!');
                                                        } else {
                                                            alert('API connection failed: ' + response.status);
                                                        }
                                                    } catch (error) {
                                                        alert('API connection failed: ' + error);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                            >
                                                Test API Connection
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const ws = new WebSocket(settings.backend.wsUrl);
                                                    ws.onopen = () => {
                                                        alert('WebSocket connection successful!');
                                                        ws.close();
                                                    };
                                                    ws.onerror = () => {
                                                        alert('WebSocket connection failed');
                                                    };
                                                }}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                            >
                                                Test WebSocket
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'advanced' && (
                            <div className="space-y-8">
                                {/* Reset Settings */}
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-100 mb-4">Reset</h2>
                                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                                        <p className="text-gray-300 mb-4">
                                            Reset all settings to their default values. This action cannot be undone.
                                        </p>
                                        <button
                                            onClick={handleReset}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                        >
                                            <RotateCcw size={18} />
                                            Reset All Settings
                                        </button>
                                    </div>
                                </div>

                                {/* Current Settings Debug */}
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-100 mb-4">Current Settings</h2>
                                    <pre className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
                                        {JSON.stringify(settings, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom styles for range input */}
            <style>{`
                .slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #3b82f6;
                    cursor: pointer;
                    border-radius: 50%;
                }

                .slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    background: #3b82f6;
                    cursor: pointer;
                    border-radius: 50%;
                    border: none;
                }
            `}</style>
        </div>
    );
};