import { createContext } from 'react';
import type { ReactNode } from 'react';

export interface AppLauncherContextType {
    isOpen: boolean;
    openLauncher: () => void;
    closeLauncher: () => void;
    toggleLauncher: () => void;
}

export const AppLauncherContext = createContext<AppLauncherContextType | undefined>(undefined);