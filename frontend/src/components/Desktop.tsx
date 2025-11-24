
import React, { useState, useEffect } from 'react';
import { useWindowManager, useSettings, AppLauncherProvider, useAppLauncher } from '../context/exports';
import { Window } from './Window';
import { Terminal, Folder, FileText, Container, Cpu, Gauge, Tv, Globe, Share2, Search, Settings, Activity } from 'lucide-react';
import { TerminalComponent } from './Terminal';
import { FileManager } from './FileManager';
import { Notes } from './Notes';
import { ContainerManager } from './ContainerManager';
import { ControlPanel } from './ControlPanel';
import { VNCClient } from './VNCClient';
import { NginxProxyManager } from './NginxProxyManager';
import { ShareManager } from './ShareManager';
import { AppLauncher } from './AppLauncher';
import { Taskbar } from './Taskbar';
import { Settings as SettingsComponent } from './Settings';
import { VirtualDesktops } from './VirtualDesktops';
import { WindowLayoutTools } from './WindowLayoutTools';
import { DesktopErrorBoundary } from './error-boundaries';
import { Monitoring } from './Monitoring';

const TopBar = ({ onSettingsClick }: { onSettingsClick: () => void }) => {
    const { openWindow } = useWindowManager();
    const { openLauncher } = useAppLauncher();

    return (
        <div className="fixed top-0 left-0 right-0 h-10 bg-gray-900/80 backdrop-blur-md border-b border-gray-700 flex items-center justify-between px-4 z-50">
            <div className="flex items-center gap-4">
                <button
                    onClick={openLauncher}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gray-800/80 hover:shadow-md focus-enhanced"
                    title="Launch apps (Alt+Space)"
                    aria-label="Open application launcher"
                >
                    <Search size={16} />
                    <span>Launch</span>
                </button>
                <span className="font-bold text-blue-400 text-lg px-3 py-1 bg-blue-500/10 rounded-lg">Omarchy Web</span>
                <div className="h-4 w-px bg-gray-700" />
                <button
                    onClick={() => openWindow('Terminal', <TerminalComponent windowId={`terminal-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gray-800/80 hover:shadow-md hover:scale-105 focus-enhanced"
                    title="System terminal"
                    aria-label="Open terminal"
                >
                    <Terminal size={16} />
                    <span>Terminal</span>
                </button>
                <button
                    onClick={() => openWindow('Files', <FileManager windowId={`fm-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gray-800/80 hover:shadow-md hover:scale-105 focus-enhanced"
                    title="File system browser"
                    aria-label="Open file manager"
                >
                    <Folder size={16} />
                    <span>Files</span>
                </button>
                <button
                    onClick={() => openWindow('Notes', <Notes windowId={`notes-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gray-800/80 hover:shadow-md hover:scale-105 focus-enhanced"
                    title="Markdown notes editor"
                    aria-label="Open notes"
                >
                    <FileText size={16} />
                    <span>Notes</span>
                </button>
                <button
                    onClick={() => openWindow('Containers', <ContainerManager windowId={`containers-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gray-800/80 hover:shadow-md hover:scale-105 focus-enhanced"
                    title="Docker container management"
                    aria-label="Open container manager"
                >
                    <Container size={16} />
                    <span>Containers</span>
                </button>
                <button
                    onClick={() => openWindow('Control Panel', <ControlPanel windowId={`cp-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gray-800/80 hover:shadow-md hover:scale-105 focus-enhanced"
                    title="System Control Panel"
                    aria-label="Open control panel"
                >
                    <Gauge size={16} />
                    <span>Control Panel</span>
                </button>
                <button
                    onClick={() => openWindow('VNC Client', <VNCClient windowId={`vnc-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gray-800/80 hover:shadow-md hover:scale-105 focus-enhanced"
                    title="VNC Remote Desktop Client"
                    aria-label="Open VNC client"
                >
                    <Tv size={16} />
                    <span>VNC Client</span>
                </button>
                <button
                    onClick={() => openWindow('Nginx Proxy Manager', <NginxProxyManager windowId={`npm-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gray-800/80 hover:shadow-md hover:scale-105 focus-enhanced"
                    title="Manage Nginx Proxy Hosts"
                    aria-label="Open Nginx proxy manager"
                >
                    <Globe size={16} />
                    <span>Nginx Proxy</span>
                </button>
                <button
                    onClick={() => openWindow('Share Manager', <ShareManager windowId={`sm-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gray-800/80 hover:shadow-md hover:scale-105 focus-enhanced"
                    title="Manage Network Shares (NFS/SMB)"
                    aria-label="Open share manager"
                >
                    <Share2 size={16} />
                    <span>Shares</span>
                </button>
                <button
                    onClick={() => openWindow('Monitoring', <Monitoring windowId={`monitoring-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gray-800/80 hover:shadow-md hover:scale-105 focus-enhanced"
                    title="System Monitoring Dashboard"
                    aria-label="Open monitoring dashboard"
                >
                    <Activity size={16} />
                    <span>Monitoring</span>
                </button>
                <div className="h-4 w-px bg-gray-700" />
                <button
                    onClick={onSettingsClick}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gray-800/80 hover:shadow-md hover:scale-105 focus-enhanced"
                    title="Desktop Settings"
                    aria-label="Open settings"
                >
                    <Settings size={16} />
                    <span>Settings</span>
                </button>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                    <Cpu size={16} />
                    <span>CPU: 12%</span>
                </div>
                <span>{new Date().toLocaleTimeString()}</span>
            </div>
        </div>
    );
};

export const Desktop = () => {
    const { windows, activeWindowId, maximizeWindow, minimizeWindow, closeWindow, toggleLayoutMode, focusWindow } = useWindowManager();
    const { settings } = useSettings();
    const [error, setError] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    // Global error handler
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            console.error('Global error:', event.error);
            setError(`Application error: ${event.error?.message || 'Unknown error'}`);

            // Clear error after 5 seconds
            setTimeout(() => setError(null), 5000);
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            console.error('Unhandled promise rejection:', event.reason);
            setError(`Application error: ${event.reason?.message || 'Promise rejected'}`);

            // Clear error after 5 seconds
            setTimeout(() => setError(null), 5000);
        };

        // Window management keyboard shortcuts
        const handleKeyDown = (event: KeyboardEvent) => {
            // Only handle shortcuts when not in input fields
            if (event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                event.target instanceof HTMLSelectElement) {
                return;
            }

            const { altKey, ctrlKey, metaKey, shiftKey, key } = event;
            const cmdOrCtrl = ctrlKey || metaKey;

            // Alt + F4: Close active window
            if (altKey && key === 'F4' && activeWindowId) {
                event.preventDefault();
                closeWindow(activeWindowId);
                return;
            }

            // Alt + Space: App launcher (handled by AppLauncher)
            // Ctrl + M: Minimize active window
            if (cmdOrCtrl && key === 'm' && activeWindowId) {
                event.preventDefault();
                minimizeWindow(activeWindowId);
                return;
            }

            // Alt + Enter or F11: Maximize/Restore active window
            if ((altKey && key === 'Enter') || key === 'F11') {
                event.preventDefault();
                if (activeWindowId) {
                    maximizeWindow(activeWindowId);
                }
                return;
            }

            // Ctrl + Alt + T: Toggle layout mode
            if (cmdOrCtrl && altKey && key === 't') {
                event.preventDefault();
                toggleLayoutMode();
                return;
            }

            // Alt + Tab: Focus next window
            if (altKey && key === 'Tab') {
                event.preventDefault();
                const visibleWindows = windows.filter(w => !w.isMinimized);
                if (visibleWindows.length > 1) {
                    const currentIndex = visibleWindows.findIndex(w => w.id === activeWindowId);
                    const nextIndex = shiftKey
                        ? (currentIndex - 1 + visibleWindows.length) % visibleWindows.length
                        : (currentIndex + 1) % visibleWindows.length;
                    const nextWindow = visibleWindows[nextIndex];
                    if (nextWindow) {
                        focusWindow(nextWindow.id);
                    }
                }
                return;
            }
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeWindowId, windows, closeWindow, minimizeWindow, maximizeWindow, toggleLayoutMode, focusWindow]);

    return (
        <DesktopErrorBoundary>
            <AppLauncherProvider>
            <div className="h-screen w-screen bg-gray-900 overflow-hidden flex flex-col relative">
            {/* Wallpaper / Background */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    background: settings.wallpaper.type === 'image' && settings.wallpaper.imageUrl
                        ? `url(${settings.wallpaper.imageUrl})`
                        : settings.wallpaper.gradient,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            />

            {/* Global Error Display */}
            {error && (
                <div className="fixed top-4 right-4 z-50 max-w-md p-4 bg-red-900/90 backdrop-blur-sm border border-red-700 rounded-lg text-red-400 shadow-lg">
                    <div className="flex items-start gap-2">
                        <span className="text-red-400">⚠️</span>
                        <div>
                            <div className="font-medium">Application Error</div>
                            <div className="text-sm opacity-90">{error}</div>
                        </div>
                    </div>
                </div>
            )}

            <TopBar onSettingsClick={() => setShowSettings(true)} />
            <AppLauncher />

            {/* Settings Modal */}
            {showSettings && (
                <SettingsComponent onClose={() => setShowSettings(false)} />
            )}

            <div className="absolute top-10 left-0 right-0 bottom-0 z-10">
                {windows.map(window => (
                    <Window key={window.id} window={window} />
                ))}
            </div>

            {/* Taskbar for minimized windows */}
            <Taskbar />

            {/* Virtual Desktops and Layout Tools */}
            <VirtualDesktops />
            <WindowLayoutTools />
        </div>
            </AppLauncherProvider>
        </DesktopErrorBoundary>
    );
};
