import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { WindowManagerContext, type WindowState } from './types';
import type { LayoutTemplate } from '../types/virtualDesktops';

export const WindowManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [windows, setWindows] = useState<WindowState[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const [nextZIndex, setNextZIndex] = useState(100);
    const [layoutMode, setLayoutMode] = useState<'tiling' | 'floating'>('tiling');

    // Simple recursive binary splitting algorithm for tiling
    // Note: Window dimensions are accessed directly inside to avoid dependency issues
    const calculateTiledLayout = useCallback((windowList: WindowState[]) => {
        if (layoutMode === 'floating') return windowList;

        const count = windowList.length;
        if (count === 0) return windowList;

        // Screen dimensions (minus top bar and gaps) - accessed directly to avoid stale closures
        const screenH = window.innerHeight;
        const topBarHeight = 40;
        const gap = 8;
        const startY = topBarHeight + gap;
        const startX = gap;
        const availableW = window.innerWidth - (gap * 2);
        const availableH = screenH - topBarHeight - (gap * 2);

        return windowList.map((win, index) => {
            if (win.isMinimized) return win;

            let x = startX;
            let y = startY;
            let w = availableW;
            let h = availableH;

            if (count === 1) {
                // Full screen (minus gaps)
            } else if (count === 2) {
                // Split vertical
                w = (availableW - gap) / 2;
                if (index === 1) x += w + gap;
            } else {
                // Grid roughly
                const cols = Math.ceil(Math.sqrt(count));
                const rows = Math.ceil(count / cols);
                const col = index % cols;
                const row = Math.floor(index / cols);

                w = (availableW - (gap * (cols - 1))) / cols;
                h = (availableH - (gap * (rows - 1))) / rows;

                x = startX + (col * (w + gap));
                y = startY + (row * (h + gap));
            }

            return { ...win, x, y, width: w, height: h };
        });
    }, [layoutMode]);

    const validateWindowBounds = useCallback((x: number, y: number, width: number, height: number) => {
        const minX = 0;
        const minY = 48; // Top bar height
        const maxX = Math.max(minX, globalThis.window.innerWidth - width);
        const maxY = Math.max(minY, globalThis.window.innerHeight - height);

        return {
            x: Math.max(minX, Math.min(x, maxX)),
            y: Math.max(minY, Math.min(y, maxY)),
            width: Math.max(300, Math.min(width, globalThis.window.innerWidth - 16)),
            height: Math.max(200, Math.min(height, globalThis.window.innerHeight - 56))
        };
    }, []);

    const openWindow = useCallback((title: string, component: ReactNode, options?: { desktopId?: string; isSticky?: boolean }) => {
        const id = Math.random().toString(36).substr(2, 9);

        setWindows(prev => {
            const currentZIndex = nextZIndex;
            const newZIndex = currentZIndex + 1;

            // Calculate initial position with cascade offset
            const initialX = 100 + (prev.length * 20);
            const initialY = 100 + (prev.length * 20);

            // Validate initial bounds
            const validatedBounds = validateWindowBounds(initialX, initialY, 800, 600);

            const newWindow: WindowState = {
                id,
                title,
                component,
                isMinimized: false,
                isMaximized: false,
                zIndex: newZIndex,
                ...validatedBounds,
                desktopId: options?.desktopId,
                isSticky: options?.isSticky || false,
                snapData: { isSnapped: false }
            };

            setNextZIndex(newZIndex);
            setActiveWindowId(id);
            const updated = [...prev, newWindow];
            return layoutMode === 'tiling' ? calculateTiledLayout(updated) : updated;
        });
    }, [nextZIndex, layoutMode, calculateTiledLayout, validateWindowBounds]);

    const closeWindow = useCallback((id: string) => {
        setWindows(prev => {
            const filtered = prev.filter(w => w.id !== id);
            return layoutMode === 'tiling' ? calculateTiledLayout(filtered) : filtered;
        });
        if (activeWindowId === id) {
            setActiveWindowId(null);
        }
    }, [layoutMode, calculateTiledLayout, activeWindowId]);

    
    const minimizeWindow = useCallback((id: string) => {
        setWindows(prev => {
            const updated = prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w);
            return layoutMode === 'tiling' ? calculateTiledLayout(updated) : updated;
        });
    }, [layoutMode, calculateTiledLayout]);

    const focusWindow = useCallback((id: string) => {
        const window = windows.find(w => w.id === id);
        if (!window) return;

        // Unminimize if clicking on a minimized window
        if (window.isMinimized) {
            minimizeWindow(id);
        }

        setActiveWindowId(id);
        const newZIndex = nextZIndex + 1;
        setWindows(prev => prev.map(w =>
            w.id === id ? { ...w, zIndex: newZIndex } : w
        ));
        setNextZIndex(newZIndex);
    }, [windows, nextZIndex, minimizeWindow]);

    const maximizeWindow = useCallback((id: string) => {
        setWindows(prev => {
            const window = prev.find(w => w.id === id);
            if (!window) return prev;

            const isMaximized = !window.isMaximized;
            const updated = prev.map(w => {
                if (w.id === id) {
                    if (isMaximized) {
                        // Store current state before maximizing
                        const restoreState = {
                            x: w.x || 0,
                            y: w.y || 0,
                            width: w.width || 800,
                            height: w.height || 600
                        };
                        return {
                            ...w,
                            isMaximized: true,
                            restoreState,
                            // Clear snap data when maximizing
                            snapData: { isSnapped: false }
                        };
                    } else {
                        // Restore previous state when un-maximizing
                        return {
                            ...w,
                            isMaximized: false,
                            ...(w.restoreState && {
                                x: w.restoreState.x,
                                y: w.restoreState.y,
                                width: w.restoreState.width,
                                height: w.restoreState.height
                            })
                        };
                    }
                }
                return w;
            });

            // Re-apply tiling if exiting maximize mode in tiling layout
            if (!isMaximized && layoutMode === 'tiling') {
                return calculateTiledLayout(updated);
            }

            return updated;
        });
    }, [layoutMode, calculateTiledLayout]);

    // Update window position and size for floating mode
    const updateWindowPosition = useCallback((id: string, x: number, y: number) => {
        setWindows(prev => prev.map(w => {
            if (w.id === id && !w.isMaximized && !w.snapData?.isSnapped) {
                const validatedBounds = validateWindowBounds(x, y, w.width || 800, w.height || 600);
                // Update restore state if it exists
                const updatedRestoreState = w.restoreState ? { ...w.restoreState, ...validatedBounds } : undefined;
                return { ...w, ...validatedBounds, restoreState: updatedRestoreState };
            }
            return w;
        }));
    }, [validateWindowBounds]);

    const updateWindowSize = useCallback((id: string, width: number, height: number) => {
        setWindows(prev => prev.map(w => {
            if (w.id === id && !w.isMaximized && !w.snapData?.isSnapped) {
                const validatedBounds = validateWindowBounds(w.x || 0, w.y || 0, width, height);
                // Update restore state if it exists
                const updatedRestoreState = w.restoreState ? { ...w.restoreState, ...validatedBounds } : undefined;
                return { ...w, ...validatedBounds, restoreState: updatedRestoreState };
            }
            return w;
        }));
    }, [validateWindowBounds]);

    const toggleLayoutMode = useCallback(() => {
        setLayoutMode(prev => {
            const newMode = prev === 'tiling' ? 'floating' : 'tiling';
            // Apply tiling immediately when switching to tiling mode
            if (newMode === 'tiling') {
                setWindows(curr => calculateTiledLayout(curr));
            }
            return newMode;
        });
    }, [calculateTiledLayout]);

    // Handle window resize events to re-tile and validate floating window bounds
    useEffect(() => {
        const handleResize = () => {
            setWindows(curr => {
                let updated = curr;

                if (layoutMode === 'tiling') {
                    updated = calculateTiledLayout(curr);
                } else {
                    // In floating mode, validate and adjust window bounds
                    updated = curr.map(window => {
                        // Skip maximized and snapped windows as they'll be repositioned automatically
                        if (window.isMaximized || window.snapData?.isSnapped || window.isMinimized) {
                            return window;
                        }

                        const validatedBounds = validateWindowBounds(
                            window.x || 0,
                            window.y || 0,
                            window.width || 800,
                            window.height || 600
                        );

                        // Also update restore state if it exists
                        const updatedRestoreState = window.restoreState ?
                            { ...window.restoreState, ...validatedBounds } : undefined;

                        return {
                            ...window,
                            ...validatedBounds,
                            restoreState: updatedRestoreState
                        };
                    });
                }

                return updated;
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [layoutMode, calculateTiledLayout, validateWindowBounds]);

    // Virtual desktop support methods
    const moveWindowToDesktop = useCallback((windowId: string, desktopId: string) => {
        setWindows(prev => prev.map(w =>
            w.id === windowId ? { ...w, desktopId } : w
        ));
    }, []);

    const setWindowSticky = useCallback((windowId: string, isSticky: boolean) => {
        setWindows(prev => prev.map(w =>
            w.id === windowId ? { ...w, isSticky } : w
        ));
    }, []);

    const getWindowsForDesktop = useCallback((desktopId: string) => {
        return windows.filter(w =>
            w.isSticky || w.desktopId === desktopId || (!w.desktopId && desktopId === 'desktop-1')
        );
    }, [windows]);

    // Layout template support
    const applyLayoutTemplate = useCallback((template: LayoutTemplate) => {
        setWindows(prev => {
            const nonMinimizedWindows = prev.filter(w => !w.isMinimized);

            switch (template.type) {
                case 'cascade':
                    return prev.map((window, index) => {
                        if (window.isMinimized) return window;
                        const offset = ((template.config.offset as number) || 30) * (index % 10);
                        return {
                            ...window,
                            x: 100 + offset,
                            y: 100 + offset,
                            width: 800,
                            height: 600
                        };
                    });

                case 'vertical': {
                    const ratio = (template.config.ratio as number) || 0.5;
                    return prev.map((window, index) => {
                        if (window.isMinimized) return window;
                        const isLeft = index % 2 === 0;
                        return {
                            ...window,
                            x: isLeft ? 8 : globalThis.window.innerWidth * ratio + 8,
                            y: 48,
                            width: isLeft
                                ? globalThis.window.innerWidth * ratio - 16
                                : globalThis.window.innerWidth * (1 - ratio) - 16,
                            height: globalThis.window.innerHeight - 56
                        };
                    });
                }

                case 'horizontal': {
                    const hRatio = (template.config.ratio as number) || 0.5;
                    return prev.map((window, index) => {
                        if (window.isMinimized) return window;
                        const isTop = index % 2 === 0;
                        return {
                            ...window,
                            x: 8,
                            y: isTop ? 48 : globalThis.window.innerHeight * hRatio + 8,
                            width: globalThis.window.innerWidth - 16,
                            height: isTop
                                ? globalThis.window.innerHeight * hRatio - 40
                                : globalThis.window.innerHeight * (1 - hRatio) - 16
                        };
                    });

                case 'grid':
                    const { rows = 2, cols = 2 } = template.config as { rows?: number; cols?: number };
                    const gap = 8;
                    const startX = gap;
                    const startY = 48 + gap;
                    const availableW = window.innerWidth - (gap * 2);
                    const availableH = window.innerHeight - 48 - (gap * 2);
                    const cellW = (availableW - (gap * (cols - 1))) / cols;
                    const cellH = (availableH - (gap * (rows - 1))) / rows;

                    return prev.map((window, index) => {
                        if (window.isMinimized) return window;
                        const col = index % cols;
                        const row = Math.floor(index / cols);

                        return {
                            ...window,
                            x: startX + (col * (cellW + gap)),
                            y: startY + (row * (cellH + gap)),
                            width: cellW,
                            height: cellH
                        };
                    });

                case 'master-stack':
                    const { masterRatio = 0.6, stackDirection = 'right' } = template.config as { masterRatio?: number; stackDirection?: string };
                    return prev.map((window, index) => {
                        if (window.isMinimized) return window;

                        if (index === 0) { // Master window
                            return {
                                ...window,
                                x: 8,
                                y: 48,
                                width: stackDirection === 'right'
                                    ? globalThis.window.innerWidth * masterRatio - 16
                                    : globalThis.window.innerWidth - 16,
                                height: stackDirection === 'right'
                                    ? globalThis.window.innerHeight - 56
                                    : globalThis.window.innerHeight * masterRatio - 40
                            };
                        } else { // Stack windows
                            const stackIndex = index - 1;
                            const stackCount = nonMinimizedWindows.length - 1;
                            const stackSize = stackDirection === 'right'
                                ? globalThis.window.innerWidth * (1 - masterRatio) - 16
                                : globalThis.window.innerHeight * (1 - masterRatio) - 40;
                            const cellSize = stackSize / Math.max(stackCount, 1);

                            return {
                                ...window,
                                x: stackDirection === 'right'
                                    ? globalThis.window.innerWidth * masterRatio + 8
                                    : 8,
                                y: stackDirection === 'right'
                                    ? 48 + (stackIndex * cellSize)
                                    : globalThis.window.innerHeight * masterRatio + 8,
                                width: stackDirection === 'right'
                                    ? stackSize
                                    : globalThis.window.innerWidth - 16,
                                height: stackDirection === 'right'
                                    ? cellSize - 2
                                    : cellSize - 2
                            };
                        }
                    });

                default:
                    return prev;
            }
        });
    }, []);

    // Window snapping
    const snapWindow = useCallback((windowId: string, position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'maximized') => {
        setWindows(prev => prev.map(window => {
            if (window.id !== windowId || window.isMinimized) return window;

            // Store current state before snapping if not already snapped
            const shouldStoreRestoreState = !window.snapData?.isSnapped && !window.isMaximized;
            const restoreState = shouldStoreRestoreState ? {
                x: window.x || 0,
                y: window.y || 0,
                width: window.width || 800,
                height: window.height || 600
            } : window.restoreState;

            let newBounds = { x: window.x || 0, y: window.y || 0, width: window.width || 800, height: window.height || 600 };

            switch (position) {
                case 'left':
                    newBounds = validateWindowBounds(
                        8,
                        48,
                        globalThis.window.innerWidth / 2 - 12,
                        globalThis.window.innerHeight - 56
                    );
                    break;
                case 'right':
                    newBounds = validateWindowBounds(
                        globalThis.window.innerWidth / 2 + 4,
                        48,
                        globalThis.window.innerWidth / 2 - 12,
                        globalThis.window.innerHeight - 56
                    );
                    break;
                case 'top':
                    newBounds = validateWindowBounds(
                        8,
                        48,
                        globalThis.window.innerWidth - 16,
                        globalThis.window.innerHeight / 2 - 28
                    );
                    break;
                case 'bottom':
                    newBounds = validateWindowBounds(
                        8,
                        globalThis.window.innerHeight / 2 + 20,
                        globalThis.window.innerWidth - 16,
                        globalThis.window.innerHeight / 2 - 24
                    );
                    break;
                case 'center':
                    newBounds = validateWindowBounds(
                        (globalThis.window.innerWidth - (window.width || 800)) / 2,
                        (globalThis.window.innerHeight - (window.height || 600)) / 2 + 24,
                        window.width || 800,
                        window.height || 600
                    );
                    break;
                case 'maximized':
                    newBounds = validateWindowBounds(
                        8,
                        48,
                        globalThis.window.innerWidth - 16,
                        globalThis.window.innerHeight - 56
                    );
                    break;
            }

            return {
                ...window,
                ...newBounds,
                snapData: { isSnapped: true, snapPosition: position },
                restoreState
            };
        }));
    }, [validateWindowBounds]);

    const unsnapWindow = useCallback((windowId: string) => {
        setWindows(prev => prev.map(window => {
            if (window.id !== windowId) return window;

            // Restore to previous state if available, otherwise center the window
            if (window.restoreState) {
                const validatedRestoreState = validateWindowBounds(
                    window.restoreState.x,
                    window.restoreState.y,
                    window.restoreState.width,
                    window.restoreState.height
                );
                return {
                    ...window,
                    ...validatedRestoreState,
                    snapData: { isSnapped: false }
                };
            } else {
                // Fallback: center window with default size
                const centeredBounds = validateWindowBounds(
                    (globalThis.window.innerWidth - 800) / 2,
                    (globalThis.window.innerHeight - 600) / 2 + 24,
                    800,
                    600
                );
                return {
                    ...window,
                    ...centeredBounds,
                    snapData: { isSnapped: false }
                };
            }
        }));
    }, [validateWindowBounds]);

    // Enhanced window operations
    const cascadeWindows = useCallback(() => {
        applyLayoutTemplate({
            id: 'cascade-temp',
            name: 'Cascade',
            description: 'Cascade windows',
            type: 'cascade',
            config: { offset: 30 }
        });
    }, [applyLayoutTemplate]);

    const tileWindows = useCallback(() => {
        setLayoutMode('tiling');
        setWindows(calculateTiledLayout);
    }, [calculateTiledLayout]);

    const arrangeWindows = useCallback((mode: 'cascade' | 'tile' | 'grid') => {
        switch (mode) {
            case 'cascade':
                cascadeWindows();
                break;
            case 'tile':
                tileWindows();
                break;
            case 'grid':
                applyLayoutTemplate({
                    id: 'grid-temp',
                    name: 'Grid',
                    description: 'Grid layout',
                    type: 'grid',
                    config: { rows: 2, cols: 2 }
                });
                break;
        }
    }, [cascadeWindows, tileWindows, applyLayoutTemplate]);

    return (
        <WindowManagerContext.Provider value={{
            windows,
            activeWindowId,
            layoutMode,
            openWindow,
            closeWindow,
            focusWindow,
            minimizeWindow,
            maximizeWindow,
            toggleLayoutMode,
            updateWindowPosition,
            updateWindowSize,
            moveWindowToDesktop,
            setWindowSticky,
            getWindowsForDesktop,
            applyLayoutTemplate,
            snapWindow,
            unsnapWindow,
            cascadeWindows,
            tileWindows,
            arrangeWindows
        }}>
            {children}
            {/* Floating Toggle Button (Temporary for testing) */}
            <div className="fixed bottom-4 right-4 z-[9999]">
                <button
                    onClick={toggleLayoutMode}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-4 py-2 rounded-full shadow-lg border border-gray-600 text-xs font-mono"
                >
                    Mode: {layoutMode.toUpperCase()}
                </button>
            </div>
        </WindowManagerContext.Provider>
    );
};
