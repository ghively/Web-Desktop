import { createContext } from 'react';
import type { ReactNode } from 'react';
import type { LayoutTemplate } from '../types/virtualDesktops';

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
    desktopId?: string; // Virtual desktop assignment
    isSticky?: boolean; // Show on all desktops
    groupId?: string; // Window group membership
    snapData?: {
        isSnapped: boolean;
        snapPosition?: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'maximized';
    };
    // Store pre-maximized state for proper restoration
    restoreState?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

interface WindowManagerContextType {
    windows: WindowState[];
    activeWindowId: string | null;
    layoutMode: 'tiling' | 'floating';
    openWindow: (title: string, component: ReactNode, options?: { desktopId?: string; isSticky?: boolean }) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    maximizeWindow: (id: string) => void;
    toggleLayoutMode: () => void;
    updateWindowPosition: (id: string, x: number, y: number) => void;
    updateWindowSize: (id: string, width: number, height: number) => void;

    // Virtual desktop support
    moveWindowToDesktop: (windowId: string, desktopId: string) => void;
    setWindowSticky: (windowId: string, isSticky: boolean) => void;
    getWindowsForDesktop: (desktopId: string) => WindowState[];

    // Layout template support
    applyLayoutTemplate: (template: LayoutTemplate) => void;

    // Window snapping
    snapWindow: (windowId: string, position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'maximized') => void;
    unsnapWindow: (windowId: string) => void;

    // Window operations with enhanced features
    cascadeWindows: () => void;
    tileWindows: () => void;
    arrangeWindows: (mode: 'cascade' | 'tile' | 'grid') => void;
}

export const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);
export type { WindowManagerContextType };