import { createContext } from 'react';

export interface AppLauncherContextType {
    isOpen: boolean;
    openLauncher: () => void;
    closeLauncher: () => void;
    toggleLauncher: () => void;
}

export const AppLauncherContext = createContext<AppLauncherContextType | undefined>(undefined);