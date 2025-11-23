import { useContext } from 'react';
import { VirtualDesktopManagerContext } from './VirtualDesktopManager';
import type { VirtualDesktopManagerContextType } from '../types/virtualDesktops';

export const useVirtualDesktopManager = (): VirtualDesktopManagerContextType => {
    const context = useContext(VirtualDesktopManagerContext);
    if (context === undefined) {
        throw new Error('useVirtualDesktopManager must be used within a VirtualDesktopManagerProvider');
    }
    return context;
};