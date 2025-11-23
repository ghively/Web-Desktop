import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { SettingsContext } from './SettingsContextDefinition';
import { defaultSettings, applySettingsToDOM, themeGradients, type Settings, type CatppuccinTheme } from './settingsTypes';

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>(() => {
        // Load settings from localStorage during initialization
        if (typeof window !== 'undefined') {
            const storedSettings = localStorage.getItem('web-desktop-settings');
            if (storedSettings) {
                try {
                    const parsed = JSON.parse(storedSettings);
                    return { ...defaultSettings, ...parsed };
                } catch (error) {
                    console.error('Failed to parse stored settings:', error);
                }
            }
        }
        return defaultSettings;
    });

    // Save settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('web-desktop-settings', JSON.stringify(settings));
        applySettingsToDOM(settings);
    }, [settings]);

    const updateSettings = (updates: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
    };

    const setWallpaperType = (type: 'image' | 'gradient') => {
        updateSettings({
            wallpaper: {
                ...settings.wallpaper,
                type,
                gradient: type === 'gradient' ? themeGradients[settings.theme] : undefined
            }
        });
    };

    const setWallpaperImage = (url: string) => {
        updateSettings({
            wallpaper: {
                ...settings.wallpaper,
                type: 'image',
                imageUrl: url
            }
        });
    };

    const setWallpaperDisplayMode = (displayMode: 'cover' | 'contain' | 'stretch' | 'tile' | 'center') => {
        updateSettings({
            wallpaper: {
                ...settings.wallpaper,
                displayMode
            }
        });
    };

    const setWindowOpacity = (opacity: number) => {
        updateSettings({ windowOpacity: Math.max(0.5, Math.min(1, opacity)) });
    };

    const setTheme = (theme: CatppuccinTheme) => {
        updateSettings({
            theme,
            wallpaper: {
                ...settings.wallpaper,
                gradient: settings.wallpaper.type === 'gradient' ? themeGradients[theme] : settings.wallpaper.gradient
            }
        });
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSettings,
            resetSettings,
            setWallpaperType,
            setWallpaperImage,
            setWallpaperDisplayMode,
            setWindowOpacity,
            setTheme
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

// Export the context for use in useSettings hook
export { SettingsContext };