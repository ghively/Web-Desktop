import { createContext } from 'react';
import type { ReactNode } from 'react';
import type { Settings } from './settingsTypes';

export interface SettingsContextType {
    settings: Settings;
    updateSettings: (updates: Partial<Settings>) => void;
    resetSettings: () => void;
    setWallpaperType: (type: 'image' | 'gradient') => void;
    setWallpaperImage: (url: string) => void;
    setWallpaperDisplayMode: (mode: 'cover' | 'contain' | 'stretch' | 'tile' | 'center') => void;
    setWindowOpacity: (opacity: number) => void;
    setTheme: (theme: 'mocha' | 'latte' | 'frappe' | 'macchiato') => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);