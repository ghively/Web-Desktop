import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { WindowManagerContext, type WindowState } from './types';

export const WindowManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [windows, setWindows] = useState<WindowState[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const [nextZIndex, setNextZIndex] = useState(100);
    const [layoutMode, setLayoutMode] = useState<'tiling' | 'floating'>('tiling');

    // Simple recursive binary splitting algorithm for tiling
    const calculateTiledLayout = useCallback((windowList: WindowState[]) => {
        if (layoutMode === 'floating') return windowList;

        const count = windowList.length;
        if (count === 0) return windowList;

        // Screen dimensions (minus top bar and gaps)
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

    const openWindow = (title: string, component: ReactNode) => {
        const id = Math.random().toString(36).substr(2, 9);
        
        setWindows(prev => {
            const currentZIndex = nextZIndex;
            const newZIndex = currentZIndex + 1;
            const newWindow: WindowState = {
                id,
                title,
                component,
                isMinimized: false,
                isMaximized: false,
                zIndex: newZIndex,
                width: 800,
                height: 600,
                x: 100 + (prev.length * 20),
                y: 100 + (prev.length * 20),
            };

            setNextZIndex(newZIndex);
            setActiveWindowId(id);
            const updated = [...prev, newWindow];
            return layoutMode === 'tiling' ? calculateTiledLayout(updated) : updated;
        });
    };

    const closeWindow = (id: string) => {
        setWindows(prev => {
            const filtered = prev.filter(w => w.id !== id);
            return layoutMode === 'tiling' ? calculateTiledLayout(filtered) : filtered;
        });
        if (activeWindowId === id) {
            setActiveWindowId(null);
        }
    };

    const focusWindow = (id: string) => {
        setActiveWindowId(id);
        const newZIndex = nextZIndex + 1;
        setWindows(prev => prev.map(w =>
            w.id === id ? { ...w, zIndex: newZIndex } : w
        ));
        setNextZIndex(newZIndex);
    };

    const minimizeWindow = (id: string) => {
        setWindows(prev => {
            const updated = prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w);
            return layoutMode === 'tiling' ? calculateTiledLayout(updated) : updated;
        });
    };

    const maximizeWindow = (id: string) => {
        setWindows(prev => prev.map(w =>
            w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
        ));
    };

    const toggleLayoutMode = () => {
        setLayoutMode(prev => {
            const newMode = prev === 'tiling' ? 'floating' : 'tiling';
            if (newMode === 'tiling') {
                setWindows(curr => calculateTiledLayout(curr));
            }
            return newMode;
        });
    };

    // Handle window resize events to re-tile
    useEffect(() => {
        const handleResize = () => {
            if (layoutMode === 'tiling') {
                setWindows(curr => calculateTiledLayout(curr));
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [layoutMode, calculateTiledLayout]);

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
            toggleLayoutMode
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


