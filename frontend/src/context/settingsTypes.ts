import { API_CONFIG } from '../config/api';

export type CatppuccinTheme = 'mocha' | 'latte' | 'frappe' | 'macchiato';
export type WallpaperDisplayMode = 'cover' | 'contain' | 'stretch' | 'tile' | 'center';

export interface BackendConfig {
    apiUrl: string;
    wsUrl: string;
    vncUrl: string;
    dockerSocket?: string;
    defaultHomePath: string;
    tempPath: string;
    sharePath: string;
}

export interface Settings {
    wallpaper: {
        type: 'image' | 'gradient';
        imageUrl?: string;
        gradient?: string;
        displayMode: WallpaperDisplayMode;
    };
    windowOpacity: number;
    theme: CatppuccinTheme;
    useSystemTheme: boolean;
    backend: BackendConfig;
}

// Cross-platform helper to get platform-specific paths
const getPlatformSpecificPaths = () => {
    // Browser-based platform detection
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const platform = typeof navigator !== 'undefined' ? navigator.platform : '';

    const isWindows = userAgent.includes('Windows') || platform.includes('Win');

    if (isWindows) {
        return {
            dockerSocket: 'npipe://./pipe/docker_engine',
            defaultHomePath: 'C:\\Users\\User',
            tempPath: 'C:\\Users\\User\\AppData\\Local\\Temp',
            sharePath: 'C:\\Temp\\Shares'
        };
    } else {
        return {
            dockerSocket: '/var/run/docker.sock',
            defaultHomePath: '/home/user',
            tempPath: '/tmp',
            sharePath: '/tmp/shares'
        };
    }
};

export const defaultSettings: Settings = {
    wallpaper: {
        type: 'gradient',
        gradient: 'linear-gradient(135deg, #1e1e2e 0%, #181825 50%, #11111b 100%)',
        displayMode: 'cover'
    },
    windowOpacity: 0.95,
    theme: 'mocha',
    useSystemTheme: false,
    backend: {
        ...API_CONFIG,
        ...getPlatformSpecificPaths()
    }
};

export const themeGradients: Record<CatppuccinTheme, string> = {
    mocha: 'linear-gradient(135deg, #1e1e2e 0%, #181825 50%, #11111b 100%)',
    latte: 'linear-gradient(135deg, #eff1f5 0%, #e6e9ef 50%, #dce0e8 100%)',
    frappe: 'linear-gradient(135deg, #303446 0%, #292c3c 50%, #232634 100%)',
    macchiato: 'linear-gradient(135deg, #24273a 0%, #1e2030 50%, #181926 100%)'
};

export const catppuccinThemes: Record<CatppuccinTheme, Record<string, string>> = {
    mocha: {
        '--base': '#1e1e2e',
        '--mantle': '#181825',
        '--crust': '#11111b',
        '--text': '#cdd6f4',
        '--subtext0': '#a6adc8',
        '--subtext1': '#bac2de',
        '--surface0': '#313244',
        '--surface1': '#45475a',
        '--surface2': '#585b70',
        '--overlay0': '#6c7086',
        '--blue': '#89b4fa',
        '--green': '#a6e3a1',
        '--red': '#f38ba8',
        '--yellow': '#f9e2af'
    },
    latte: {
        '--base': '#eff1f5',
        '--mantle': '#e6e9ef',
        '--crust': '#dce0e8',
        '--text': '#4c4f69',
        '--subtext0': '#6c6f85',
        '--subtext1': '#5c5f77',
        '--surface0': '#ccd0da',
        '--surface1': '#bcc0cc',
        '--surface2': '#acb0be',
        '--overlay0': '#9ca0b0',
        '--blue': '#1e66f5',
        '--green': '#40a02b',
        '--red': '#d20f39',
        '--yellow': '#df8e1d'
    },
    frappe: {
        '--base': '#303446',
        '--mantle': '#292c3c',
        '--crust': '#232634',
        '--text': '#c6d0f5',
        '--subtext0': '#a5adce',
        '--subtext1': '#b5bfe2',
        '--surface0': '#414559',
        '--surface1': '#51576d',
        '--surface2': '#626880',
        '--overlay0': '#737994',
        '--blue': '#8caaee',
        '--green': '#a6d189',
        '--red': '#e78284',
        '--yellow': '#e5c890'
    },
    macchiato: {
        '--base': '#24273a',
        '--mantle': '#1e2030',
        '--crust': '#181926',
        '--text': '#cad3f5',
        '--subtext0': '#a5adcb',
        '--subtext1': '#b8c0e0',
        '--surface0': '#363a4f',
        '--surface1': '#494d64',
        '--surface2': '#5b6078',
        '--overlay0': '#6e738d',
        '--blue': '#8aadf4',
        '--green': '#a6da95',
        '--red': '#ed8796',
        '--yellow': '#eed49f'
    }
};

export const applySettingsToDOM = (settingsToApply: Settings) => {
    const root = document.documentElement;

    // Apply window opacity
    root.style.setProperty('--window-opacity', settingsToApply.windowOpacity.toString());

    // Apply theme colors
    const themeColors = catppuccinThemes[settingsToApply.theme];
    Object.entries(themeColors).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });

    // Apply wallpaper
    let wallpaper: string;
    if (settingsToApply.wallpaper.type === 'gradient') {
        wallpaper = settingsToApply.wallpaper.gradient || themeGradients[settingsToApply.theme];
    } else {
        wallpaper = `url(${settingsToApply.wallpaper.imageUrl || ''})`;
    }
    root.style.setProperty('--wallpaper', wallpaper);

    // Apply wallpaper display mode
    root.style.setProperty('--wallpaper-display', settingsToApply.wallpaper.displayMode);

    // Also set data attribute on desktop element for CSS targeting
    const desktopElement = document.querySelector('.desktop') as HTMLElement;
    if (desktopElement) {
        desktopElement.setAttribute('data-wallpaper-display', settingsToApply.wallpaper.displayMode);
    }
};