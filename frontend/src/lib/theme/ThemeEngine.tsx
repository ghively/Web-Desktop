import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Theme interfaces
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  border: string;
  shadow: string;
  highlight: string;
  sidebar: string;
  header: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeAnimations {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

export interface ThemeConfig {
  id: string;
  name: string;
  description?: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  shadows: ThemeShadows;
  animations: ThemeAnimations;
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  customCSS?: string;
  isDark?: boolean;
}

export interface UITheme {
  name: string;
  wallpaper?: string;
  desktopIcons: boolean;
  showClock: boolean;
  windowControls: 'mac' | 'windows' | 'custom';
  iconPack: string;
  animations: boolean;
  transparency: boolean;
  blurEffects: boolean;
  customComponents: ThemeComponent[];
}

export interface ThemeComponent {
  id: string;
  type: 'button' | 'input' | 'card' | 'modal' | 'sidebar' | 'header' | 'window';
  name: string;
  styles: Record<string, any>;
  overrides: Record<string, any>;
}

// Predefined themes
export const defaultLightTheme: ThemeConfig = {
  id: 'default-light',
  name: 'Default Light',
  colors: {
    primary: '#3b82f6',
    secondary: '#6366f1',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    accent: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    border: '#e2e8f0',
    shadow: '#00000015',
    highlight: '#fef3c7',
    sidebar: '#f1f5f9',
    header: '#ffffff'
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75
    }
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  },
  isDark: false
};

export const defaultDarkTheme: ThemeConfig = {
  ...defaultLightTheme,
  id: 'default-dark',
  name: 'Default Dark',
  colors: {
    primary: '#60a5fa',
    secondary: '#818cf8',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    accent: '#a78bfa',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    border: '#334155',
    shadow: '#00000040',
    highlight: '#451a03',
    sidebar: '#1e293b',
    header: '#0f172a'
  },
  isDark: true
};

// Theme Engine class
export class ThemeEngine {
  private static instance: ThemeEngine;
  private currentTheme: ThemeConfig;
  private uiTheme: UITheme;
  private customThemes: Map<string, ThemeConfig> = new Map();
  private observers: Set<(theme: ThemeConfig) => void> = new Set();

  private constructor() {
    this.currentTheme = defaultDarkTheme;
    this.uiTheme = {
      name: 'Default',
      desktopIcons: true,
      showClock: true,
      windowControls: 'mac',
      iconPack: 'lucide',
      animations: true,
      transparency: false,
      blurEffects: false,
      customComponents: []
    };
    this.loadSavedThemes();
  }

  static getInstance(): ThemeEngine {
    if (!ThemeEngine.instance) {
      ThemeEngine.instance = new ThemeEngine();
    }
    return ThemeEngine.instance;
  }

  // Theme management
  getCurrentTheme(): ThemeConfig {
    return this.currentTheme;
  }

  setTheme(theme: ThemeConfig): void {
    this.currentTheme = theme;
    this.applyTheme(theme);
    this.notifyObservers();
    this.saveTheme(theme);
  }

  getUITheme(): UITheme {
    return this.uiTheme;
  }

  setUITheme(uiTheme: Partial<UITheme>): void {
    this.uiTheme = { ...this.uiTheme, ...uiTheme };
    this.applyUITheme(this.uiTheme);
    this.saveUITheme();
  }

  // Custom themes
  addCustomTheme(theme: ThemeConfig): void {
    this.customThemes.set(theme.id, theme);
    this.saveThemes();
  }

  removeCustomTheme(themeId: string): void {
    this.customThemes.delete(themeId);
    this.saveThemes();
  }

  getCustomThemes(): ThemeConfig[] {
    return Array.from(this.customThemes.values());
  }

  // Preset themes
  getPresetThemes(): ThemeConfig[] {
    return [
      defaultDarkTheme,
      defaultLightTheme,
      this.createCatppuccinMochaTheme(),
      this.createCatppuccinLatteTheme(),
      this.createSynologyTheme(),
      this.createWindowsTheme(),
      this.createMacOSTheme()
    ];
  }

  // Apply theme to DOM
  private applyTheme(theme: ThemeConfig): void {
    const root = document.documentElement;

    // Apply CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });

    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });

    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    root.style.setProperty('--font-family', theme.typography.fontFamily);
    root.style.setProperty('--font-weight-normal', theme.typography.fontWeight.normal.toString());
    root.style.setProperty('--font-weight-medium', theme.typography.fontWeight.medium.toString());
    root.style.setProperty('--font-weight-bold', theme.typography.fontWeight.bold.toString());
    root.style.setProperty('--line-height-normal', theme.typography.lineHeight.normal.toString());

    root.style.setProperty('--animation-fast', theme.animations.duration.fast);
    root.style.setProperty('--animation-normal', theme.animations.duration.normal);
    root.style.setProperty('--animation-slow', theme.animations.duration.slow);

    root.style.setProperty('--border-radius-sm', theme.borderRadius.sm);
    root.style.setProperty('--border-radius-md', theme.borderRadius.md);
    root.style.setProperty('--border-radius-lg', theme.borderRadius.lg);
    root.style.setProperty('--border-radius-xl', theme.borderRadius.xl);

    // Apply custom CSS
    if (theme.customCSS) {
      let styleElement = document.getElementById('custom-theme-css');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'custom-theme-css';
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = theme.customCSS;
    }

    // Set data attribute for dark/light mode
    root.setAttribute('data-theme', theme.isDark ? 'dark' : 'light');
  }

  private applyUITheme(uiTheme: UITheme): void {
    const root = document.documentElement;

    // Apply UI-specific classes
    root.setAttribute('data-window-controls', uiTheme.windowControls);
    root.setAttribute('data-icon-pack', uiTheme.iconPack);

    if (uiTheme.animations) {
      root.classList.add('animations-enabled');
    } else {
      root.classList.remove('animations-enabled');
    }

    if (uiTheme.transparency) {
      root.classList.add('transparency-enabled');
    } else {
      root.classList.remove('transparency-enabled');
    }

    if (uiTheme.blurEffects) {
      root.classList.add('blur-enabled');
    } else {
      root.classList.remove('blur-enabled');
    }

    // Apply wallpaper
    if (uiTheme.wallpaper) {
      root.style.setProperty('--wallpaper', `url(${uiTheme.wallpaper})`);
    } else {
      root.style.removeProperty('--wallpaper');
    }
  }

  // Observer pattern
  subscribe(observer: (theme: ThemeConfig) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  private notifyObservers(): void {
    this.observers.forEach(observer => observer(this.currentTheme));
  }

  // Persistence
  private saveTheme(theme: ThemeConfig): void {
    try {
      localStorage.setItem('current-theme', JSON.stringify(theme));
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }

  private saveUITheme(): void {
    try {
      localStorage.setItem('ui-theme', JSON.stringify(this.uiTheme));
    } catch (error) {
      console.error('Failed to save UI theme:', error);
    }
  }

  private saveThemes(): void {
    try {
      const themes = Array.from(this.customThemes.values());
      localStorage.setItem('custom-themes', JSON.stringify(themes));
    } catch (error) {
      console.error('Failed to save custom themes:', error);
    }
  }

  private loadSavedThemes(): void {
    try {
      // Load current theme
      const savedTheme = localStorage.getItem('current-theme');
      if (savedTheme) {
        const theme = JSON.parse(savedTheme);
        this.currentTheme = theme;
        this.applyTheme(theme);
      }

      // Load UI theme
      const savedUITheme = localStorage.getItem('ui-theme');
      if (savedUITheme) {
        this.uiTheme = JSON.parse(savedUITheme);
        this.applyUITheme(this.uiTheme);
      }

      // Load custom themes
      const savedCustomThemes = localStorage.getItem('custom-themes');
      if (savedCustomThemes) {
        const themes = JSON.parse(savedCustomThemes);
        themes.forEach((theme: ThemeConfig) => {
          this.customThemes.set(theme.id, theme);
        });
      }
    } catch (error) {
      console.error('Failed to load saved themes:', error);
    }
  }

  // Theme creation helpers
  public createCatppuccinMochaTheme(): ThemeConfig {
    return {
      ...defaultDarkTheme,
      id: 'catppuccin-mocha',
      name: 'Catppuccin Mocha',
      colors: {
        primary: '#cba6f7',
        secondary: '#f2cdcd',
        background: '#1e1e2e',
        surface: '#313244',
        text: '#cdd6f4',
        textSecondary: '#a6adc8',
        accent: '#f9e2af',
        success: '#a6e3a1',
        warning: '#fab387',
        error: '#f38ba8',
        border: '#45475a',
        shadow: '#00000060',
        highlight: '#313244',
        sidebar: '#181825',
        header: '#1e1e2e'
      },
      isDark: true
    };
  }

  public createCatppuccinLatteTheme(): ThemeConfig {
    return {
      ...defaultLightTheme,
      id: 'catppuccin-latte',
      name: 'Catppuccin Latte',
      colors: {
        primary: '#8839ef',
        secondary: '#179299',
        background: '#eff1f5',
        surface: '#e6e9ef',
        text: '#4c4f69',
        textSecondary: '#6c6f85',
        accent: '#df8e1d',
        success: '#40a02b',
        warning: '#fe640b',
        error: '#d20f39',
        border: '#bcc0cc',
        shadow: '#00000020',
        highlight: '#e6e9ef',
        sidebar: '#dce0e8',
        header: '#eff1f5'
      },
      isDark: false
    };
  }

  public createSynologyTheme(): ThemeConfig {
    return {
      ...defaultDarkTheme,
      id: 'synology-dsm',
      name: 'Synology DSM',
      colors: {
        primary: '#0085ff',
        secondary: '#0066cc',
        background: '#1a1a1a',
        surface: '#262626',
        text: '#ffffff',
        textSecondary: '#cccccc',
        accent: '#ff6b00',
        success: '#00c851',
        warning: '#ffbb33',
        error: '#ff4444',
        border: '#404040',
        shadow: '#00000050',
        highlight: '#003d82',
        sidebar: '#0d0d0d',
        header: '#1a1a1a'
      },
      isDark: true
    };
  }

  public createWindowsTheme(): ThemeConfig {
    return {
      ...defaultLightTheme,
      id: 'windows-11',
      name: 'Windows 11',
      colors: {
        primary: '#0078d4',
        secondary: '#005a9e',
        background: '#f3f3f3',
        surface: '#ffffff',
        text: '#000000',
        textSecondary: '#666666',
        accent: '#0078d4',
        success: '#107c10',
        warning: '#ff8c00',
        error: '#d13438',
        border: '#e1e1e1',
        shadow: '#00000015',
        highlight: '#e5f1fb',
        sidebar: '#f3f3f3',
        header: '#ffffff'
      },
      isDark: false
    };
  }

  private createMacOSTheme(): ThemeConfig {
    return {
      ...defaultLightTheme,
      id: 'macos-ventura',
      name: 'macOS Ventura',
      colors: {
        primary: '#007aff',
        secondary: '#5856d6',
        background: '#f2f2f7',
        surface: '#ffffff',
        text: '#1d1d1f',
        textSecondary: '#86868b',
        accent: '#ff9f0a',
        success: '#34c759',
        warning: '#ff9500',
        error: '#ff3b30',
        border: '#d1d1d6',
        shadow: '#00000010',
        highlight: '#e8f4fd',
        sidebar: '#ffffff',
        header: '#f2f2f7'
      },
      isDark: false
    };
  }

  // Utility methods
  generateRandomTheme(): ThemeConfig {
    const hue = Math.floor(Math.random() * 360);
    const isDark = Math.random() > 0.5;

    return {
      ...defaultDarkTheme,
      id: `random-${Date.now()}`,
      name: 'Random Theme',
      colors: {
        ...defaultDarkTheme.colors,
        primary: `hsl(${hue}, 70%, ${isDark ? '60%' : '50%'})`,
        secondary: `hsl(${(hue + 60) % 360}, 70%, ${isDark ? '55%' : '45%'})`,
        accent: `hsl(${(hue + 120) % 360}, 70%, ${isDark ? '65%' : '55%'})`,
        background: isDark ? '#0a0a0a' : '#fafafa',
        surface: isDark ? '#1a1a1a' : '#ffffff',
        text: isDark ? '#ffffff' : '#000000',
        textSecondary: isDark ? '#cccccc' : '#666666'
      },
      isDark
    };
  }
}

// React Context
interface ThemeContextType {
  theme: ThemeConfig;
  uiTheme: UITheme;
  setTheme: (theme: ThemeConfig) => void;
  setUITheme: (uiTheme: Partial<UITheme>) => void;
  themeEngine: ThemeEngine;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>(defaultDarkTheme);
  const [uiTheme, setUIThemeState] = useState<UITheme>({
    name: 'Default',
    desktopIcons: true,
    showClock: true,
    windowControls: 'mac',
    iconPack: 'lucide',
    animations: true,
    transparency: false,
    blurEffects: false,
    customComponents: []
  });

  useEffect(() => {
    const engine = ThemeEngine.getInstance();

    // Load saved themes
    setTheme(engine.getCurrentTheme());
    setUIThemeState(engine.getUITheme());

    // Subscribe to theme changes
    const unsubscribe = engine.subscribe((newTheme) => {
      setTheme(newTheme);
    });

    return unsubscribe;
  }, []);

  const handleSetTheme = (newTheme: ThemeConfig) => {
    const engine = ThemeEngine.getInstance();
    engine.setTheme(newTheme);
    setTheme(newTheme);
  };

  const handleSetUITheme = (newUITheme: Partial<UITheme>) => {
    const engine = ThemeEngine.getInstance();
    engine.setUITheme(newUITheme);
    setUIThemeState({ ...uiTheme, ...newUITheme });
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      uiTheme,
      setTheme: handleSetTheme,
      setUITheme: handleSetUITheme,
      themeEngine: ThemeEngine.getInstance()
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
