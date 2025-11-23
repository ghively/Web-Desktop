import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface WindowState {
    id: string;
    title: string;
    component: ReactNode;
    isMinimized: boolean;
    isMaximized: boolean;
    zIndex: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

interface WindowManagerContextType {
    windows: WindowState[];
    activeWindowId: string | null;
    layoutMode: 'tiling' | 'floating';
    openWindow: (title: string, component: ReactNode) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    maximizeWindow: (id: string) => void;
    toggleLayoutMode: () => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);

export const WindowManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [windows, setWindows] = useState<WindowState[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const [nextZIndex, setNextZIndex] = useState(100);
    const [layoutMode, setLayoutMode] = useState<'tiling' | 'floating'>('tiling');

    // Simple recursive binary splitting algorithm for tiling
    const calculateTiledLayout = (windowList: WindowState[]) => {
        if (layoutMode === 'floating') return windowList;

        const count = windowList.length;
        if (count === 0) return windowList;

        // Screen dimensions (minus top bar and gaps)
        const screenW = window.innerWidth;
        const screenH = window.innerHeight - 40; // 40px top bar
        const gap = 8;
        const startY = 40 + gap;
        const startX = gap;
        const availableW = screenW - (gap * 2);
        const availableH = screenH - (gap * 2);

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
    };

    const openWindow = (title: string, component: ReactNode) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newWindow: WindowState = {
            id,
            title,
            component,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZIndex,
            width: 800,
            height: 600,
            x: 100 + (windows.length * 20),
            y: 100 + (windows.length * 20),
        };

        setWindows(prev => {
            const updated = [...prev, newWindow];
            return layoutMode === 'tiling' ? calculateTiledLayout(updated) : updated;
        });
        setActiveWindowId(id);
        setNextZIndex(prev => prev + 1);
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
        setWindows(prev => prev.map(w =>
            w.id === id ? { ...w, zIndex: nextZIndex } : w
        ));
        setNextZIndex(prev => prev + 1);
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
    }, [layoutMode]);

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
                    className="bg-surface0 hover:bg-surface1 text-text px-4 py-2 rounded-full shadow-lg border border-overlay0 text-xs font-mono"
                >
                    Mode: {layoutMode.toUpperCase()}
                </button>
            </div>
        </WindowManagerContext.Provider>
    );
};

export const useWindowManager = () => {
    const context = useContext(WindowManagerContext);
    if (!context) {
        throw new Error('useWindowManager must be used within a WindowManagerProvider');
    }
    return context;
};
