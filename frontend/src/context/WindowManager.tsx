/* eslint-disable */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import {
    WindowManagerContext,
    type WindowState,
    type WindowGroup,
    type WorkspaceTemplate,
    type WindowRule,
    type SnapZone,
    type WorkspaceState,
    type WindowTab,
    type ApplicationCategory
} from './types';
import type { LayoutTemplate } from '../types/virtualDesktops';
import { DEFAULT_WORKSPACE_TEMPLATES } from '../data/workspaceTemplates';

export const WindowManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [windows, setWindows] = useState<WindowState[]>([]);
    const [windowGroups, setWindowGroups] = useState<WindowGroup[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const [activeGroupId, setActiveGroupId] = useState<string | undefined>();
    const [nextZIndex, setNextZIndex] = useState(100);
    const [layoutMode, setLayoutMode] = useState<'tiling' | 'floating' | 'hybrid'>('tiling');

    // New state for advanced features
    const [workspaceTemplates] = useState<WorkspaceTemplate[]>(DEFAULT_WORKSPACE_TEMPLATES);
    const [windowRules] = useState<WindowRule[]>([]);
    const [savedWorkspaces, setSavedWorkspaces] = useState<WorkspaceState[]>([]);

    // Load saved workspaces from localStorage on mount
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('workspaceStates') || '[]');
            if (saved.length > 0) {
                setSavedWorkspaces(saved);
            }
        } catch (error) {
            console.error('Failed to load saved workspaces:', error);
        }
    }, []);
    const [animationDuration, setAnimationDuration] = useState(200);
    const [showSnapIndicators, setShowSnapIndicators] = useState(true);
    const [showGroupPreviews, setShowGroupPreviews] = useState(true);
    const [hotkeys, setHotkeys] = useState<Array<{ keyCombo: string; action: string; description: string }>>([]);

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

    const openWindow = useCallback((
        title: string,
        component: ReactNode,
        options?: {
            desktopId?: string;
            isSticky?: boolean;
            applicationCategory?: ApplicationCategory;
            icon?: string;
            groupId?: string;
        }
    ) => {
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
                applicationCategory: options?.applicationCategory,
                icon: options?.icon,
                groupId: options?.groupId,
                snapData: { isSnapped: false }
            };

            setNextZIndex(newZIndex);
            setActiveWindowId(id);
            const updated = [...prev, newWindow];
            return layoutMode === 'tiling' ? calculateTiledLayout(updated) : updated;
        });

        // Apply window rules if available
        setTimeout(() => applyWindowRules(id), 0);
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
                case 'cascade': {
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
                }

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
                }

                case 'grid': {
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
                }

                case 'master-stack': {
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
                }

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

    // ==================== NEW ADVANCED WINDOW MANAGEMENT METHODS ====================

    // Smart snapping zones based on application category
    const getSnapZones = useCallback((categoryId?: ApplicationCategory): SnapZone[] => {
        const screenWidth = globalThis.window.innerWidth;
        const screenHeight = globalThis.window.innerHeight;
        const zones: SnapZone[] = [];

        // Universal snap zones
        zones.push(
            {
                id: 'left-half',
                edge: 'left',
                bounds: { x: 0, y: 0, width: screenWidth / 2, height: screenHeight },
                action: { type: 'position', config: { x: 8, y: 48, width: screenWidth / 2 - 12, height: screenHeight - 56 } },
                priority: 10
            },
            {
                id: 'right-half',
                edge: 'right',
                bounds: { x: screenWidth / 2, y: 0, width: screenWidth / 2, height: screenHeight },
                action: { type: 'position', config: { x: screenWidth / 2 + 4, y: 48, width: screenWidth / 2 - 12, height: screenHeight - 56 } },
                priority: 10
            },
            {
                id: 'top-half',
                edge: 'top',
                bounds: { x: 0, y: 0, width: screenWidth, height: screenHeight / 2 },
                action: { type: 'position', config: { x: 8, y: 48, width: screenWidth - 16, height: screenHeight / 2 - 28 } },
                priority: 9
            },
            {
                id: 'bottom-half',
                edge: 'bottom',
                bounds: { x: 0, y: screenHeight / 2, width: screenWidth, height: screenHeight / 2 },
                action: { type: 'position', config: { x: 8, y: screenHeight / 2 + 20, width: screenWidth - 16, height: screenHeight / 2 - 24 } },
                priority: 9
            },
            {
                id: 'center',
                edge: 'center',
                bounds: { x: screenWidth / 3, y: screenHeight / 3, width: screenWidth / 3, height: screenHeight / 3 },
                action: { type: 'position', config: { x: 8, y: 48, width: screenWidth - 16, height: screenHeight - 56 } },
                priority: 8
            }
        );

        // Category-specific snap zones
        if (categoryId === 'development' || categoryId === 'terminal') {
            zones.push({
                id: 'dev-left-third',
                edge: 'custom',
                bounds: { x: 0, y: 0, width: screenWidth * 0.33, height: screenHeight },
                action: { type: 'position', config: { x: 8, y: 48, width: screenWidth * 0.33 - 8, height: screenHeight - 56 } },
                applicationCategories: ['development', 'terminal'],
                priority: 12
            });
        }

        if (categoryId === 'media') {
            zones.push({
                id: 'media-center-large',
                edge: 'custom',
                bounds: { x: screenWidth * 0.1, y: screenHeight * 0.1, width: screenWidth * 0.8, height: screenHeight * 0.8 },
                action: { type: 'position', config: { x: screenWidth * 0.1, y: screenHeight * 0.1 + 40, width: screenWidth * 0.8, height: screenHeight * 0.8 - 40 } },
                applicationCategories: ['media'],
                priority: 13
            });
        }

        return zones.sort((a, b) => b.priority - a.priority);
    }, []);

    // Application category detection
    const getApplicationCategory = useCallback((windowTitle: string): ApplicationCategory => {
        const title = windowTitle.toLowerCase();

        if (title.includes('terminal') || title.includes('shell') || title.includes('command') || title.includes('bash')) {
            return 'terminal';
        }
        if (title.includes('code') || title.includes('vscode') || title.includes('editor') || title.includes('ide')) {
            return 'development';
        }
        if (title.includes('browser') || title.includes('chrome') || title.includes('firefox') || title.includes('safari')) {
            return 'browser';
        }
        if (title.includes('media') || title.includes('video') || title.includes('music') || title.includes('player')) {
            return 'media';
        }
        if (title.includes('system') || title.includes('control') || title.includes('settings') || title.includes('monitor')) {
            return 'system';
        }
        if (title.includes('chat') || title.includes('discord') || title.includes('slack') || title.includes('zoom')) {
            return 'communication';
        }
        if (title.includes('ai') || title.includes('claude') || title.includes('gpt') || title.includes('copilot')) {
            return 'ai';
        }
        if (title.includes('file') || title.includes('explorer') || title.includes('folder')) {
            return 'file-manager';
        }
        if (title.includes('note') || title.includes('memo') || title.includes('text')) {
            return 'notes';
        }

        return 'general';
    }, []);

    // Window grouping and tabbing functionality
    const createWindowGroup = useCallback((
        windowIds: string[],
        name: string,
        type: 'tabbed' | 'stacked' | 'tiled' = 'tabbed'
    ): string => {
        const groupId = Math.random().toString(36).substr(2, 9);
        const groupWindows = windows.filter(w => windowIds.includes(w.id));

        if (groupWindows.length === 0) return '';

        const windowTabs: WindowTab[] = groupWindows.map((window, index) => ({
            id: window.id,
            title: window.title,
            component: window.component,
            isActive: index === 0,
            applicationCategory: window.applicationCategory,
            icon: window.icon
        }));

        // Calculate bounds based on first window
        const firstWindow = groupWindows[0];
        const bounds = {
            x: firstWindow.x || 100,
            y: firstWindow.y || 100,
            width: firstWindow.width || 800,
            height: firstWindow.height || 600
        };

        const newGroup: WindowGroup = {
            id: groupId,
            name,
            type,
            windows: windowTabs,
            bounds,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZIndex,
            desktopId: firstWindow.desktopId,
            isSticky: firstWindow.isSticky
        };

        setWindowGroups(prev => [...prev, newGroup]);
        setNextZIndex(prev => prev + 1);

        // Update windows to be part of the group
        setWindows(prev => prev.map(w => {
            if (windowIds.includes(w.id)) {
                return {
                    ...w,
                    groupId,
                    tabData: {
                        isTabbed: true,
                        groupId,
                        tabIndex: windowIds.indexOf(w.id),
                        isActive: windowIds.indexOf(w.id) === 0
                    }
                };
            }
            return w;
        }));

        setActiveGroupId(groupId);
        setActiveWindowId(windowTabs[0].id);

        return groupId;
    }, [windows, nextZIndex]);

    const addWindowToGroup = useCallback((groupId: string, windowId: string) => {
        const window = windows.find(w => w.id === windowId);
        if (!window) return;

        const group = windowGroups.find(g => g.id === groupId);
        if (!group) return;

        const newTab: WindowTab = {
            id: window.id,
            title: window.title,
            component: window.component,
            isActive: false,
            applicationCategory: window.applicationCategory,
            icon: window.icon
        };

        setWindowGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    windows: [...g.windows, newTab]
                };
            }
            return g;
        }));

        setWindows(prev => prev.map(w => {
            if (w.id === windowId) {
                return {
                    ...w,
                    groupId,
                    tabData: {
                        isTabbed: true,
                        groupId,
                        tabIndex: group.windows.length,
                        isActive: false
                    }
                };
            }
            return w;
        }));
    }, [windows, windowGroups]);

    const removeWindowFromGroup = useCallback((groupId: string, windowId: string) => {
        setWindowGroups(prev => {
            const group = prev.find(g => g.id === groupId);
            if (!group || group.windows.length <= 1) {
                // Remove group entirely if only one window
                return prev.filter(g => g.id !== groupId);
            }

            return prev.map(g => {
                if (g.id === groupId) {
                    const updatedWindows = g.windows.filter(w => w.id !== windowId);
                    // If removing active window, make first window active
                    if (updatedWindows.length > 0) {
                        updatedWindows[0].isActive = true;
                    }
                    return { ...g, windows: updatedWindows };
                }
                return g;
            });
        });

        setWindows(prev => prev.map(w => {
            if (w.id === windowId) {
                const { groupId, tabData, ...windowWithoutGroup } = w;
                return {
                    ...windowWithoutGroup,
                    x: 100 + Math.random() * 100,
                    y: 100 + Math.random() * 100
                };
            }
            return w;
        }));

        if (activeGroupId === groupId) {
            setActiveGroupId(undefined);
        }
    }, [activeGroupId]);

    const deleteWindowGroup = useCallback((groupId: string) => {
        const group = windowGroups.find(g => g.id === groupId);
        if (!group) return;

        // Remove all windows from the group
        group.windows.forEach(window => {
            removeWindowFromGroup(groupId, window.id);
        });

        setWindowGroups(prev => prev.filter(g => g.id !== groupId));
        if (activeGroupId === groupId) {
            setActiveGroupId(undefined);
        }
    }, [windowGroups, activeGroupId, removeWindowFromGroup]);

    const setActiveTabInGroup = useCallback((groupId: string, tabIndex: number) => {
        setWindowGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                const updatedWindows = g.windows.map((w, index) => ({
                    ...w,
                    isActive: index === tabIndex
                }));
                return { ...g, windows: updatedWindows };
            }
            return g;
        }));

        const group = windowGroups.find(g => g.id === groupId);
        if (group && group.windows[tabIndex]) {
            const activeTab = group.windows[tabIndex];
            setActiveWindowId(activeTab.id);
            setWindows(prev => prev.map(w => ({
                ...w,
                tabData: w.tabData?.groupId === groupId
                    ? { ...w.tabData, isActive: w.id === activeTab.id }
                    : w.tabData
            })));
        }
    }, [windowGroups]);

    const moveTabInGroup = useCallback((groupId: string, fromIndex: number, toIndex: number) => {
        setWindowGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                const newWindows = [...g.windows];
                const [movedTab] = newWindows.splice(fromIndex, 1);
                newWindows.splice(toIndex, 0, movedTab);

                // Update tabIndex for affected windows
                const updatedWindows = newWindows.map((tab, index) => ({
                    ...tab,
                    isActive: tab.isActive
                }));

                setWindows(prev => prev.map(w => {
                    if (w.tabData?.groupId === groupId) {
                        const newTabIndex = newWindows.findIndex(tab => tab.id === w.id);
                        return {
                            ...w,
                            tabData: {
                                ...w.tabData,
                                tabIndex: newTabIndex
                            }
                        };
                    }
                    return w;
                }));

                return { ...g, windows: updatedWindows };
            }
            return g;
        }));
    }, []);

    const getWindowGroup = useCallback((groupId: string): WindowGroup | undefined => {
        return windowGroups.find(g => g.id === groupId);
    }, [windowGroups]);

    // Enhanced snap window with zone support
    const snapWindowEnhanced = useCallback((
        windowId: string,
        position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'maximized',
        zoneId?: string
    ) => {
        const window = windows.find(w => w.id === windowId);
        if (!window) return;

        const shouldStoreRestoreState = !window.snapData?.isSnapped && !window.isMaximized;
        const restoreState = shouldStoreRestoreState ? {
            x: window.x || 0,
            y: window.y || 0,
            width: window.width || 800,
            height: window.height || 600
        } : window.restoreState;

        let newBounds = { x: window.x || 0, y: window.y || 0, width: window.width || 800, height: window.height || 600 };

        // Check if we have a specific snap zone
        if (zoneId) {
            const zones = getSnapZones(window.applicationCategory);
            const zone = zones.find(z => z.id === zoneId);
            if (zone?.action.config) {
                newBounds = validateWindowBounds(
                    (zone.action.config.x as number) || 0,
                    (zone.action.config.y as number) || 0,
                    (zone.action.config.width as number) || 800,
                    (zone.action.config.height as number) || 600
                );
            }
        } else {
            // Use original snap logic
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
        }

        setWindows(prev => prev.map(w => {
            if (w.id === windowId) {
                return {
                    ...w,
                    ...newBounds,
                    snapData: { isSnapped: true, snapPosition: position, zoneId },
                    restoreState
                };
            }
            return w;
        }));
    }, [windows, validateWindowBounds, getSnapZones]);

    // Window rules and automation
    const applyWindowRules = useCallback((windowId: string) => {
        const window = windows.find(w => w.id === windowId);
        if (!window) return;

        const applicableRules = windowRules.filter(rule => {
            if (rule.applicationCategory !== window.applicationCategory) return false;
            if (rule.titlePattern && !new RegExp(rule.titlePattern, 'i').test(window.title)) return false;
            return true;
        });

        const appliedRules: string[] = [];

        applicableRules.forEach(rule => {
            appliedRules.push(rule.id);

            // Apply rule configurations
            if (rule.rules.defaultPosition && !window.snapData?.isSnapped) {
                updateWindowPosition(windowId, rule.rules.defaultPosition.x, rule.rules.defaultPosition.y);
                updateWindowSize(windowId, rule.rules.defaultPosition.width, rule.rules.defaultPosition.height);
            }

            if (rule.rules.alwaysOnTop) {
                const newZIndex = nextZIndex + 100;
                setWindows(prev => prev.map(w =>
                    w.id === windowId ? { ...w, zIndex: newZIndex } : w
                ));
            }

            if (rule.rules.minimizeOnLaunch && !window.isMinimized) {
                minimizeWindow(windowId);
            }

            if (rule.rules.autoGroup) {
                // Find existing group or create new one
                const existingGroup = windowGroups.find(g => g.name === rule.rules.autoGroup);
                if (existingGroup) {
                    addWindowToGroup(existingGroup.id, windowId);
                } else {
                    createWindowGroup([windowId], rule.rules.autoGroup, 'tabbed');
                }
            }
        });

        setWindows(prev => prev.map(w =>
            w.id === windowId ? { ...w, appliedRules } : w
        ));
    }, [windows, windowRules, nextZIndex, updateWindowPosition, updateWindowSize, minimizeWindow, windowGroups, addWindowToGroup, createWindowGroup]);

    // Workspace templates
    const getWorkspaceTemplates = useCallback((): WorkspaceTemplate[] => {
        return workspaceTemplates;
    }, [workspaceTemplates]);

    const applyWorkspaceTemplate = useCallback((templateId: string, desktopId?: string) => {
        const template = workspaceTemplates.find(t => t.id === templateId);
        if (!template) return;

        // Switch layout mode
        setLayoutMode(template.layout.mode);

        // Apply layout template
        if (template.layout.template) {
            applyLayoutTemplate(template.layout.template);
        }

        // Auto-launch applications (this would need integration with app launcher)
        template.applications.forEach(app => {
            if (app.autoLaunch) {
                // This would need to be connected to the app system
                console.log('Auto-launch app:', app.title);
            }
        });

        // Apply window rules
        setWindows(prev => prev.map(w => {
            const rules = template.windowRules.filter(rule =>
                rule.applicationCategory === w.applicationCategory ||
                (rule.titlePattern && new RegExp(rule.titlePattern, 'i').test(w.title))
            );

            if (rules.length > 0) {
                return applyWindowRules(w.id), w;
            }
            return w;
        }));
    }, [workspaceTemplates, applyLayoutTemplate, applyWindowRules]);

    // Workspace persistence
    const saveWorkspaceState = useCallback((name: string, desktopId?: string): string => {
        const stateId = Math.random().toString(36).substr(2, 9);
        const workspaceState: WorkspaceState = {
            id: stateId,
            name,
            desktopId,
            windows: [...windows],
            windowGroups: [...windowGroups],
            layout: { mode: layoutMode },
            timestamp: Date.now(),
            metadata: {
                windowCount: windows.length,
                groupCount: windowGroups.length,
                activeWindowId,
                activeGroupId
            }
        };

        setSavedWorkspaces(prev => [...prev, workspaceState]);

        // Also save to localStorage for persistence
        try {
            const saved = JSON.parse(localStorage.getItem('workspaceStates') || '[]');
            saved.push(workspaceState);
            localStorage.setItem('workspaceStates', JSON.stringify(saved));
        } catch (error) {
            console.error('Failed to save workspace state:', error);
        }

        return stateId;
    }, [windows, windowGroups, layoutMode, activeWindowId, activeGroupId]);

    const loadWorkspaceState = useCallback((stateId: string) => {
        const state = savedWorkspaces.find(s => s.id === stateId);
        if (!state) return;

        setLayoutMode(state.layout.mode);
        setWindows(state.windows);
        setWindowGroups(state.windowGroups);
        setActiveWindowId(state.metadata.activeWindowId || null);
        setActiveGroupId(state.metadata.activeGroupId);
    }, [savedWorkspaces]);

    const deleteWorkspaceState = useCallback((stateId: string) => {
        setSavedWorkspaces(prev => prev.filter(s => s.id !== stateId));

        try {
            const saved = JSON.parse(localStorage.getItem('workspaceStates') || '[]');
            const filtered = saved.filter((s: WorkspaceState) => s.id !== stateId);
            localStorage.setItem('workspaceStates', JSON.stringify(filtered));
        } catch (error) {
            console.error('Failed to delete workspace state:', error);
        }
    }, []);

    const getRecentWorkspaces = useCallback((): WorkspaceState[] => {
        return savedWorkspaces
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10); // Return last 10 workspaces
    }, [savedWorkspaces]);

    // Auto-arrange windows by category
    const autoArrangeWindowsByCategory = useCallback(() => {
        const categories = new Map<ApplicationCategory, WindowState[]>();

        windows.forEach(window => {
            const category = window.applicationCategory || 'general';
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category)!.push(window);
        });

        const categoryLayouts: Record<ApplicationCategory, LayoutTemplate> = {
            'development': {
                id: 'dev-layout',
                name: 'Development Layout',
                description: 'Optimized for coding',
                type: 'master-stack',
                config: { masterRatio: 0.7, stackDirection: 'right' }
            },
            'terminal': {
                id: 'terminal-layout',
                name: 'Terminal Layout',
                description: 'Vertical split for terminals',
                type: 'vertical',
                config: { ratio: 0.5 }
            },
            'browser': {
                id: 'browser-layout',
                name: 'Browser Layout',
                description: 'Full width for browsing',
                type: 'grid',
                config: { rows: 1, cols: 1 }
            },
            'media': {
                id: 'media-layout',
                name: 'Media Layout',
                description: 'Centered for media viewing',
                type: 'grid',
                config: { rows: 1, cols: 1 }
            },
            'system': {
                id: 'system-layout',
                name: 'System Layout',
                description: 'Cascade for system tools',
                type: 'cascade',
                config: { offset: 25 }
            },
            'communication': {
                id: 'comm-layout',
                name: 'Communication Layout',
                description: 'Side by side for communication',
                type: 'vertical',
                config: { ratio: 0.6 }
            },
            'ai': {
                id: 'ai-layout',
                name: 'AI Layout',
                description: 'Master-stack for AI tools',
                type: 'master-stack',
                config: { masterRatio: 0.65, stackDirection: 'right' }
            },
            'file-manager': {
                id: 'file-layout',
                name: 'File Manager Layout',
                description: 'Large area for file management',
                type: 'grid',
                config: { rows: 1, cols: 1 }
            },
            'notes': {
                id: 'notes-layout',
                name: 'Notes Layout',
                description: 'Comfortable reading area',
                type: 'grid',
                config: { rows: 1, cols: 2 }
            },
            'monitoring': {
                id: 'monitor-layout',
                name: 'Monitoring Layout',
                description: 'Grid for monitoring tools',
                type: 'grid',
                config: { rows: 2, cols: 2 }
            },
            'general': {
                id: 'general-layout',
                name: 'General Layout',
                description: 'Balanced layout',
                type: 'grid',
                config: { rows: 2, cols: 2 }
            }
        };

        categories.forEach((categoryWindows, category) => {
            const layout = categoryLayouts[category];
            if (layout && categoryWindows.length > 0) {
                // Apply layout to this category's windows
                applyLayoutTemplate(layout);
            }
        });
    }, [windows, applyLayoutTemplate]);

    // Multi-monitor support
    const getMonitorBounds = useCallback((): Array<{ x: number; y: number; width: number; height: number }> => {
        // Basic implementation - in real world, this would use screen API
        return [{
            x: 0,
            y: 0,
            width: globalThis.window.innerWidth,
            height: globalThis.window.innerHeight
        }];
    }, []);

    const moveToMonitor = useCallback((windowId: string, monitorIndex: number) => {
        const monitors = getMonitorBounds();
        const monitor = monitors[monitorIndex];
        if (!monitor) return;

        const window = windows.find(w => w.id === windowId);
        if (!window) return;

        // Center window on the new monitor
        const centerX = monitor.x + (monitor.width - (window.width || 800)) / 2;
        const centerY = monitor.y + (monitor.height - (window.height || 600)) / 2;

        updateWindowPosition(windowId, centerX, centerY);
    }, [getMonitorBounds, windows, updateWindowPosition]);

    // Keyboard shortcuts (simplified implementation)
    const registerHotkey = useCallback((keyCombo: string, action: string, callback?: () => void) => {
        const hotkey = { keyCombo, action, description: action };
        setHotkeys(prev => [...prev, hotkey]);

        // In a real implementation, this would bind to keyboard events
        console.log(`Registered hotkey: ${keyCombo} -> ${action}`);
    }, []);

    const unregisterHotkey = useCallback((keyCombo: string) => {
        setHotkeys(prev => prev.filter(h => h.keyCombo !== keyCombo));
    }, []);

    const getHotkeys = useCallback(() => {
        return hotkeys;
    }, [hotkeys]);

    // Helper methods for the context
    const createWindowRule = useCallback((rule: WindowRule) => {
        // This would add to the windowRules state
        console.log('Creating window rule:', rule);
    }, []);

    const getWindowRules = useCallback((): WindowRule[] => {
        return windowRules;
    }, [windowRules]);

    const deleteWindowRule = useCallback((ruleId: string) => {
        // This would remove from the windowRules state
        console.log('Deleting window rule:', ruleId);
    }, []);

    const setApplicationCategory = useCallback((windowId: string, category: ApplicationCategory) => {
        setWindows(prev => prev.map(w =>
            w.id === windowId ? { ...w, applicationCategory: category } : w
        ));
    }, []);

    const getOptimalLayout = useCallback((windowsList: WindowState[], category?: ApplicationCategory): LayoutTemplate => {
        if (category) {
            const categoryLayouts: Record<ApplicationCategory, LayoutTemplate> = {
                'development': { id: 'dev-optimal', name: 'Dev Optimal', description: '', type: 'master-stack', config: { masterRatio: 0.7 } },
                'terminal': { id: 'term-optimal', name: 'Terminal Optimal', description: '', type: 'vertical', config: { ratio: 0.5 } },
                'media': { id: 'media-optimal', name: 'Media Optimal', description: '', type: 'grid', config: { rows: 1, cols: 1 } },
                'communication': { id: 'comm-optimal', name: 'Comm Optimal', description: '', type: 'vertical', config: { ratio: 0.6 } },
                'ai': { id: 'ai-optimal', name: 'AI Optimal', description: '', type: 'master-stack', config: { masterRatio: 0.65 } },
                'browser': { id: 'browser-optimal', name: 'Browser Optimal', description: '', type: 'grid', config: { rows: 1, cols: 1 } },
                'file-manager': { id: 'file-optimal', name: 'File Optimal', description: '', type: 'grid', config: { rows: 1, cols: 1 } },
                'notes': { id: 'notes-optimal', name: 'Notes Optimal', description: '', type: 'grid', config: { rows: 1, cols: 2 } },
                'monitoring': { id: 'monitor-optimal', name: 'Monitor Optimal', description: '', type: 'grid', config: { rows: 2, cols: 2 } },
                'system': { id: 'system-optimal', name: 'System Optimal', description: '', type: 'cascade', config: { offset: 30 } },
                'general': { id: 'general-optimal', name: 'General Optimal', description: '', type: 'grid', config: { rows: 2, cols: 2 } }
            };
            return categoryLayouts[category];
        }

        const count = windowsList.length;
        if (count === 1) {
            return { id: 'single', name: 'Single', description: '', type: 'grid', config: { rows: 1, cols: 1 } };
        } else if (count === 2) {
            return { id: 'dual', name: 'Dual', description: '', type: 'vertical', config: { ratio: 0.5 } };
        } else if (count <= 4) {
            return { id: 'quad', name: 'Quad', description: '', type: 'grid', config: { rows: 2, cols: 2 } };
        } else {
            const cols = Math.ceil(Math.sqrt(count));
            const rows = Math.ceil(count / cols);
            return { id: 'grid', name: 'Grid', description: '', type: 'grid', config: { rows, cols } };
        }
    }, []);

    return (
        <WindowManagerContext.Provider value={{
            windows,
            windowGroups,
            activeWindowId,
            activeGroupId,
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
            snapWindow: snapWindowEnhanced,
            unsnapWindow,
            cascadeWindows,
            tileWindows,
            arrangeWindows,

            // New advanced features
            getSnapZones,
            createWindowGroup,
            addWindowToGroup,
            removeWindowFromGroup,
            deleteWindowGroup,
            setActiveTabInGroup,
            moveTabInGroup,
            getWindowGroup,

            // Workspace templates
            getWorkspaceTemplates,
            applyWorkspaceTemplate,
            saveWorkspaceState,
            loadWorkspaceState,
            deleteWorkspaceState,
            getRecentWorkspaces,
            autoArrangeWindowsByCategory,

            // Window rules and automation
            applyWindowRules,
            createWindowRule,
            getWindowRules,
            deleteWindowRule,

            // Context-aware features
            getApplicationCategory,
            setApplicationCategory,
            getOptimalLayout,

            // Multi-monitor support
            getMonitorBounds,
            moveToMonitor,

            // Keyboard shortcuts
            registerHotkey,
            unregisterHotkey,
            getHotkeys,

            // Animation and visual settings
            setAnimationDuration,
            setShowSnapIndicators,
            setShowGroupPreviews
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
/* eslint-enable */
