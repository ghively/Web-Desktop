// Virtual Desktop System Types

export interface VirtualDesktop {
    id: string;
    name: string;
    index: number;
    wallpaper?: {
        type: 'image' | 'gradient' | 'color';
        value?: string;
        imageUrl?: string;
        gradient?: string;
    };
    theme?: {
        name: string;
        colors: {
            primary: string;
            secondary: string;
            background: string;
            surface: string;
            text: string;
        };
    };
    windows: string[]; // Window IDs assigned to this desktop
    isActive: boolean;
    layout: WindowLayout;
    lastAccessed: number;
}

export interface WindowLayout {
    mode: 'tiling' | 'floating' | 'hybrid';
    template?: LayoutTemplate;
    snapEnabled: boolean;
    snapThreshold: number;
    gaps: {
        size: number;
        enabled: boolean;
    };
}

export interface LayoutTemplate {
    id: string;
    name: string;
    description: string;
    type: 'grid' | 'cascade' | 'vertical' | 'horizontal' | 'master-stack' | 'custom';
    config: Record<string, unknown>;
}

export interface WindowGroup {
    id: string;
    name: string;
    windowIds: string[];
    layout: 'tabbed' | 'stacked' | 'tiled';
    isActive: boolean;
}

export interface VirtualDesktopSettings {
    enableVirtualDesktops: boolean;
    desktopCount: number;
    showDesktopIndicators: boolean;
    showDesktopThumbnails: boolean;
    desktopSwitching: {
        keyboardShortcuts: boolean;
        animationDuration: number;
        wrapAround: boolean;
    };
    windowManagement: {
        rememberPositionsPerDesktop: boolean;
        stickyWindows: string[]; // Window IDs that appear on all desktops
        autoAssignNewWindows: boolean; // Assign to current desktop automatically
    };
    performance: {
        enableThumbnails: boolean;
        thumbnailSize: { width: number; height: number };
        updateThumbnailsOnDemand: boolean;
    };
}

export interface DesktopSnapshot {
    desktopId: string;
    windows: WindowSnapshot[];
    layout: WindowLayout;
    timestamp: number;
}

export interface WindowSnapshot {
    id: string;
    title: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    state: {
        isMinimized: boolean;
        isMaximized: boolean;
        zIndex: number;
    };
    desktopId: string;
}

export interface SnapZone {
    edge: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'corners';
    bounds: { x: number; y: number; width: number; height: number };
    action: {
        type: 'tile' | 'maximize' | 'position' | 'layout';
        config?: Record<string, unknown>;
    };
}

export interface VirtualDesktopManagerContextType {
    // Desktop Management
    desktops: VirtualDesktop[];
    currentDesktopId: string | null;
    createDesktop: (name?: string) => string;
    deleteDesktop: (desktopId: string) => void;
    switchDesktop: (desktopId: string) => void;
    moveWindowToDesktop: (windowId: string, desktopId: string) => void;

    // Layout Management
    applyLayoutTemplate: (templateId: string) => void;
    saveLayoutTemplate: (template: LayoutTemplate) => void;
    getLayoutTemplates: () => LayoutTemplate[];

    // Window Grouping
    createWindowGroup: (windowIds: string[], name: string) => string;
    deleteWindowGroup: (groupId: string) => void;
    addWindowToGroup: (groupId: string, windowId: string) => void;
    removeWindowFromGroup: (groupId: string, windowId: string) => void;

    // Snap Zones
    getSnapZones: (desktopId: string) => SnapZone[];
    enableSnapping: boolean;
    setEnableSnapping: (enabled: boolean) => void;

    // Settings
    settings: VirtualDesktopSettings;
    updateSettings: (settings: Partial<VirtualDesktopSettings>) => void;

    // Persistence
    saveDesktopSnapshot: (desktopId: string) => DesktopSnapshot;
    restoreDesktopSnapshot: (snapshot: DesktopSnapshot) => void;
    exportConfiguration: () => string;
    importConfiguration: (config: string) => void;
}

export const DEFAULT_LAYOUT_TEMPLATES: LayoutTemplate[] = [
    {
        id: 'grid-2x2',
        name: 'Grid 2x2',
        description: '2x2 grid layout',
        type: 'grid',
        config: { rows: 2, cols: 2 }
    },
    {
        id: 'grid-3x3',
        name: 'Grid 3x3',
        description: '3x3 grid layout',
        type: 'grid',
        config: { rows: 3, cols: 3 }
    },
    {
        id: 'cascade',
        name: 'Cascade',
        description: 'Overlapping windows offset',
        type: 'cascade',
        config: { offset: 30 }
    },
    {
        id: 'vertical-split',
        name: 'Vertical Split',
        description: 'Side by side vertical layout',
        type: 'vertical',
        config: { ratio: 0.5 }
    },
    {
        id: 'horizontal-split',
        name: 'Horizontal Split',
        description: 'Top and bottom horizontal layout',
        type: 'horizontal',
        config: { ratio: 0.5 }
    },
    {
        id: 'master-stack',
        name: 'Master Stack',
        description: 'Master window with stacked others',
        type: 'master-stack',
        config: { masterRatio: 0.6, stackDirection: 'right' }
    }
];

export const DEFAULT_VIRTUAL_DESKTOP_SETTINGS: VirtualDesktopSettings = {
    enableVirtualDesktops: true,
    desktopCount: 4,
    showDesktopIndicators: true,
    showDesktopThumbnails: true,
    desktopSwitching: {
        keyboardShortcuts: true,
        animationDuration: 300,
        wrapAround: true
    },
    windowManagement: {
        rememberPositionsPerDesktop: true,
        stickyWindows: [],
        autoAssignNewWindows: true
    },
    performance: {
        enableThumbnails: true,
        thumbnailSize: { width: 200, height: 150 },
        updateThumbnailsOnDemand: true
    }
};