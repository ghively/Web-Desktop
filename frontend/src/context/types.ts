import { createContext } from 'react';
import type { ReactNode } from 'react';

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

export const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);
export type { WindowManagerContextType };