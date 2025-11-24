
import React, { useState, useEffect } from 'react';
import { useWindowManager, useSettings, AppLauncherProvider } from '../context/exports';
import { Window } from './Window';
import { WindowGroup } from './WindowGroup';
import { AppLauncher } from './AppLauncher';
import { Taskbar } from './Taskbar';
import { VirtualDesktops } from './VirtualDesktops';
import { WindowLayoutTools } from './WindowLayoutTools';
import { DesktopErrorBoundary } from './error-boundaries';
import { DesktopHeader } from './DesktopHeader';
import { GlobalSearch } from './GlobalSearch';
import { WorkspaceTemplates } from './WorkspaceTemplates';
import { KeyboardShortcuts, useKeyboardShortcuts } from './KeyboardShortcuts';


export const Desktop = () => {
    const {
        windows,
        windowGroups,
        activeWindowId,
        maximizeWindow,
        minimizeWindow,
        closeWindow,
        toggleLayoutMode,
        focusWindow,
        getWindowsForDesktop,
        getWindowGroup
    } = useWindowManager();
    const { settings } = useSettings();
    const [error, setError] = useState<string | null>(null);
    const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
    const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

    // Initialize enhanced keyboard shortcuts
    useKeyboardShortcuts();

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
                const visibleWindows = windows.filter(w => !w.isMinimized && !w.tabData?.isTabbed);
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

            // Super + W: Show workspace manager
            if (metaKey && key === 'w') {
                event.preventDefault();
                setShowWorkspaceManager(prev => !prev);
                return;
            }

            // Super + ?: Show keyboard shortcuts
            if (metaKey && (key === '/' || key === '?')) {
                event.preventDefault();
                setShowKeyboardShortcuts(prev => !prev);
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

            <DesktopHeader />
            <AppLauncher />

  
            <div className="absolute top-12 left-0 right-0 bottom-0 z-10">
                {/* Render window groups first */}
                {windowGroups.map(group => (
                    <WindowGroup key={group.id} group={group} />
                ))}

                {/* Render individual windows (those not in groups) */}
                {windows.map(window => {
                    // Skip windows that are in groups (they're rendered by WindowGroup)
                    if (window.tabData?.isTabbed) return null;

                    return <Window key={window.id} window={window} />;
                })}
            </div>

            {/* Taskbar for minimized windows */}
            <Taskbar />

            {/* Virtual Desktops and Layout Tools */}
            <VirtualDesktops />
            <WindowLayoutTools />

            {/* Global Search */}
            <GlobalSearch />

            {/* Workspace Templates Manager */}
            {showWorkspaceManager && (
                <WorkspaceTemplates
                    onClose={() => setShowWorkspaceManager(false)}
                    onApplyTemplate={(templateId) => {
                        console.log('Applied template:', templateId);
                        setShowWorkspaceManager(false);
                    }}
                />
            )}

            {/* Keyboard Shortcuts Help */}
            {showKeyboardShortcuts && (
                <KeyboardShortcuts
                    onClose={() => setShowKeyboardShortcuts(false)}
                />
            )}
        </div>
            </AppLauncherProvider>
        </DesktopErrorBoundary>
    );
};
