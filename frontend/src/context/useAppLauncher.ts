import { useContext } from 'react';
import { AppLauncherContext } from './AppLauncherContextDefinition';

export const useAppLauncher = () => {
    const context = useContext(AppLauncherContext);
    if (context === undefined) {
        throw new Error('useAppLauncher must be used within an AppLauncherProvider');
    }
    return context;
};