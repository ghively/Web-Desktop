import { useState } from 'react';
import type { ReactNode } from 'react';
import { AppLauncherContext } from './AppLauncherContextDefinition';

interface AppLauncherProviderProps {
    children: ReactNode;
}

export const AppLauncherProvider = ({ children }: AppLauncherProviderProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const openLauncher = () => setIsOpen(true);
    const closeLauncher = () => setIsOpen(false);
    const toggleLauncher = () => setIsOpen(prev => !prev);

    return (
        <AppLauncherContext.Provider value={{
            isOpen,
            openLauncher,
            closeLauncher,
            toggleLauncher
        }}>
            {children}
        </AppLauncherContext.Provider>
    );
};