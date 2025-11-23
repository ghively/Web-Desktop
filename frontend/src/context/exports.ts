// Export hook separately to avoid fast refresh warning
export { useWindowManager } from './useWindowManager';
export { WindowManagerProvider } from './WindowManager';
export { WindowManagerContext } from './types';
export type { WindowManagerContextType, WindowState } from './types';

// Virtual Desktop context
export { VirtualDesktopManagerProvider } from './VirtualDesktopManager';
export { VirtualDesktopManagerContext } from './VirtualDesktopManager';
export { useVirtualDesktopManager } from './useVirtualDesktopManager';
export type { VirtualDesktopManagerContextType } from '../types/virtualDesktops';

// AppLauncher context
export { AppLauncherProvider } from './AppLauncherContext';
export { useAppLauncher } from './useAppLauncher';
export type { AppLauncherContextType } from './AppLauncherContextDefinition';

// Settings context
export { SettingsProvider } from './SettingsContext';
export { useSettings } from './useSettings';
export type { Settings, CatppuccinTheme, WallpaperDisplayMode, BackendConfig } from './settingsTypes';
export type { SettingsContextType } from './SettingsContextDefinition';