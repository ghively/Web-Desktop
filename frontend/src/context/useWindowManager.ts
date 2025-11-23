import { useContext } from 'react';
import { WindowManagerContext, type WindowManagerContextType } from './types';

export const useWindowManager = (): WindowManagerContextType => {
    const context = useContext(WindowManagerContext);
    if (!context) {
        throw new Error('useWindowManager must be used within a WindowManagerProvider');
    }
    return context;
};