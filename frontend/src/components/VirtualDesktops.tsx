import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVirtualDesktopManager } from '../context/VirtualDesktopManager';
import { Monitor, Plus, X, Settings, Layers } from 'lucide-react';

interface DesktopThumbnailProps {
    desktop: Record<string, unknown>;
    isActive: boolean;
    onClick: () => void;
    onDelete: () => void;
    showThumbnails: boolean;
}

const DesktopThumbnail: React.FC<DesktopThumbnailProps> = ({
    desktop,
    isActive,
    onClick,
    onDelete,
    showThumbnails
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`relative group cursor-pointer transition-all duration-200 ${
                isActive
                    ? 'ring-2 ring-blue-500 scale-105'
                    : 'hover:ring-1 hover:ring-gray-600'
            }`}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`w-32 h-24 rounded-lg overflow-hidden shadow-lg ${
                isActive ? 'bg-gray-800' : 'bg-gray-900'
            } border border-gray-700`}>
                {/* Wallpaper preview */}
                {desktop.wallpaper && (
                    <div
                        className="absolute inset-0 opacity-50"
                        style={{
                            background: desktop.wallpaper.type === 'gradient'
                                ? desktop.wallpaper.gradient
                                : desktop.wallpaper.imageUrl
                                ? `url(${desktop.wallpaper.imageUrl})`
                                : desktop.wallpaper.value || '#1a1a1a',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    />
                )}

                {/* Window previews */}
                {showThumbnails && (
                    <div className="absolute inset-1 p-1">
                        <div className="grid grid-cols-2 gap-1 h-full">
                            {desktop.windows.slice(0, 4).map((windowId: string, index: number) => (
                                <div
                                    key={windowId}
                                    className="bg-white/10 rounded border border-white/20 backdrop-blur-sm"
                                    style={{
                                        animation: 'fadeIn 0.2s ease-out',
                                        animationDelay: `${index * 50}ms`
                                    }}
                                />
                            ))}
                            {desktop.windows.length > 4 && (
                                <div className="flex items-center justify-center text-xs text-white/60">
                                    +{desktop.windows.length - 4}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Desktop info overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="text-white text-xs font-medium truncate">
                        {desktop.name}
                    </div>
                    <div className="text-white/60 text-xs">
                        {desktop.windows.length} windows
                    </div>
                </div>

                {/* Delete button */}
                {isHovered && !isActive && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>
        </div>
    );
};

export const VirtualDesktops: React.FC = () => {
    const {
        desktops,
        currentDesktopId,
        createDesktop,
        deleteDesktop,
        switchDesktop,
        settings,
        updateSettings,
        exportConfiguration,
        importConfiguration
    } = useVirtualDesktopManager();

    const [isExpanded, setIsExpanded] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isCreatingDesktop, setIsCreatingDesktop] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCreateDesktop = useCallback(() => {
        setIsCreatingDesktop(true);
        const name = prompt('Enter desktop name:');
        if (name) {
            createDesktop(name);
        }
        setIsCreatingDesktop(false);
    }, [createDesktop]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Toggle desktop switcher with Ctrl+Tab
            if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                setIsExpanded(prev => !prev);
            }

            // Create new desktop with Ctrl+Shift+N
            if (e.ctrlKey && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                handleCreateDesktop();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleCreateDesktop]);

    const handleDeleteDesktop = (desktopId: string) => {
        if (confirm('Are you sure you want to delete this desktop?')) {
            deleteDesktop(desktopId);
        }
    };

    const handleExportConfig = () => {
        const config = exportConfiguration();
        const blob = new Blob([config], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'virtual-desktops-config.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportConfig = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                importConfiguration(event.target?.result as string);
                alert('Configuration imported successfully!');
            } catch {
                alert('Failed to import configuration: Invalid format');
            }
        };
        reader.readAsText(file);
    };

    const currentDesktop = desktops.find(d => d.id === currentDesktopId);

    if (!settings.enableVirtualDesktops) {
        return null;
    }

    return (
        <>
            {/* Desktop Switcher Toggle */}
            <div className="fixed bottom-4 left-4 z-50">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700/90 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-600 flex items-center gap-2 transition-all ${
                        isExpanded ? 'ring-2 ring-blue-500' : ''
                    }`}
                    title="Virtual Desktops (Ctrl+Tab)"
                >
                    <Monitor size={16} />
                    <span className="text-sm font-medium">
                        {currentDesktop?.name || 'Desktop 1'}
                    </span>
                    <span className="text-xs text-gray-400">
                        {desktops.findIndex(d => d.id === currentDesktopId) + 1}/{desktops.length}
                    </span>
                </button>
            </div>

            {/* Expanded Desktop Switcher */}
            {isExpanded && (
                <div className="fixed bottom-20 left-4 z-50 bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 p-4 max-w-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Layers size={18} className="text-blue-400" />
                            <h3 className="text-white font-medium">Virtual Desktops</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleCreateDesktop}
                                disabled={isCreatingDesktop || desktops.length >= 9}
                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="New Desktop (Ctrl+Shift+N)"
                            >
                                <Plus size={16} />
                            </button>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
                                title="Settings"
                            >
                                <Settings size={16} />
                            </button>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
                                title="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Desktop Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {desktops.map((desktop) => (
                            <DesktopThumbnail
                                key={desktop.id}
                                desktop={desktop}
                                isActive={desktop.id === currentDesktopId}
                                onClick={() => {
                                    switchDesktop(desktop.id);
                                    setIsExpanded(false);
                                }}
                                onDelete={() => handleDeleteDesktop(desktop.id)}
                                showThumbnails={settings.showDesktopThumbnails}
                            />
                        ))}
                    </div>

                    {/* Settings Panel */}
                    {showSettings && (
                        <div className="border-t border-gray-700 pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-gray-300">Show Thumbnails</label>
                                <input
                                    type="checkbox"
                                    checked={settings.showDesktopThumbnails}
                                    onChange={(e) => updateSettings({
                                        showDesktopThumbnails: e.target.checked
                                    })}
                                    className="rounded"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm text-gray-300">Keyboard Shortcuts</label>
                                <input
                                    type="checkbox"
                                    checked={settings.desktopSwitching.keyboardShortcuts}
                                    onChange={(e) => updateSettings({
                                        desktopSwitching: {
                                            ...settings.desktopSwitching,
                                            keyboardShortcuts: e.target.checked
                                        }
                                    })}
                                    className="rounded"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm text-gray-300">Animation Duration</label>
                                <select
                                    value={settings.desktopSwitching.animationDuration}
                                    onChange={(e) => updateSettings({
                                        desktopSwitching: {
                                            ...settings.desktopSwitching,
                                            animationDuration: parseInt(e.target.value)
                                        }
                                    })}
                                    className="bg-gray-800 text-white rounded px-2 py-1 text-sm"
                                >
                                    <option value="0">None</option>
                                    <option value="200">Fast</option>
                                    <option value="300">Normal</option>
                                    <option value="500">Slow</option>
                                </select>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleExportConfig}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-xs py-2 px-3 rounded transition-colors"
                                >
                                    Export Config
                                </button>
                                <button
                                    onClick={handleImportConfig}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-xs py-2 px-3 rounded transition-colors"
                                >
                                    Import Config
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Keyboard Shortcuts Info */}
                    <div className="border-t border-gray-700 pt-3 mt-4">
                        <div className="text-xs text-gray-400 space-y-1">
                            <div className="flex items-center gap-2">
                                <kbd className="bg-gray-800 px-2 py-0.5 rounded text-gray-300">Ctrl+Tab</kbd>
                                <span>Toggle desktop switcher</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="bg-gray-800 px-2 py-0.5 rounded text-gray-300">Ctrl+1-9</kbd>
                                <span>Switch to desktop</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="bg-gray-800 px-2 py-0.5 rounded text-gray-300">Ctrl+Shift+N</kbd>
                                <span>New desktop</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden file input for import */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
            />

            {/* Desktop Animation Overlay */}
            {currentDesktop && (
                <div
                    className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-300"
                    style={{
                        background: currentDesktop.wallpaper?.type === 'gradient'
                            ? currentDesktop.wallpaper.gradient
                            : currentDesktop.wallpaper?.imageUrl
                            ? `url(${currentDesktop.wallpaper.imageUrl})`
                            : currentDesktop.wallpaper?.value || 'transparent',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.05
                    }}
                />
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </>
    );
};
