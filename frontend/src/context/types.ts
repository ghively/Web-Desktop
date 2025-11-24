import { createContext } from 'react';
import type { ReactNode } from 'react';
import type { LayoutTemplate } from '../types/virtualDesktops';

// Application categories for context-aware layouts
export type ApplicationCategory =
    | 'development'
    | 'terminal'
    | 'browser'
    | 'media'
    | 'system'
    | 'communication'
    | 'ai'
    | 'file-manager'
    | 'notes'
    | 'monitoring'
    | 'general';

// Window tabbing interface
export interface WindowTab {
    id: string;
    title: string;
    component: ReactNode;
    isActive: boolean;
    applicationCategory?: ApplicationCategory;
    icon?: string;
}

// Window group for tabbing and stacking
export interface WindowGroup {
    id: string;
    name: string;
    type: 'tabbed' | 'stacked' | 'tiled';
    windows: WindowTab[];
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    isMinimized: boolean;
    isMaximized: boolean;
    zIndex: number;
    desktopId?: string;
    isSticky?: boolean;
    snapData?: {
        isSnapped: boolean;
        snapPosition?: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'maximized';
    };
    restoreState?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

// Workspace template definition
export interface WorkspaceTemplate {
    id: string;
    name: string;
    description: string;
    category: 'development' | 'system-admin' | 'media' | 'ai-development' | 'communication' | 'general';
    icon: string;
    layout: {
        mode: 'tiling' | 'floating' | 'hybrid';
        template?: LayoutTemplate;
    };
    applications: WorkspaceApplication[];
    windowRules: WindowRule[];
    snapZones: SnapZone[];
}

// Application configuration for workspace templates
export interface WorkspaceApplication {
    id: string;
    title: string;
    component?: ReactNode; // Optional, as components are created at runtime
    applicationCategory: ApplicationCategory;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    isMinimized?: boolean;
    isMaximized?: boolean;
    isSticky?: boolean;
    groupId?: string;
    autoLaunch?: boolean;
    icon?: string;
}

// Window rules for automatic positioning and behavior
export interface WindowRule {
    applicationCategory: ApplicationCategory;
    titlePattern?: string; // Regex pattern for window titles
    rules: {
        defaultPosition?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        defaultDesktop?: number;
        snapZone?: string;
        groupId?: string;
        alwaysOnTop?: boolean;
        minimizeOnLaunch?: boolean;
        autoGroup?: string; // Group with similar applications
    };
}

// Enhanced snap zones with context awareness
export interface SnapZone {
    id: string;
    edge: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'corners' | 'custom';
    bounds: { x: number; y: number; width: number; height: number };
    action: {
        type: 'tile' | 'maximize' | 'position' | 'layout' | 'group';
        config?: Record<string, unknown>;
    };
    applicationCategories?: ApplicationCategory[]; // Categories that can use this snap zone
    priority: number; // Higher priority zones override lower ones
}

// Workspace state for persistence
export interface WorkspaceState {
    id: string;
    name: string;
    desktopId?: string;
    windows: WindowState[];
    windowGroups: WindowGroup[];
    layout: {
        mode: 'tiling' | 'floating' | 'hybrid';
        template?: LayoutTemplate;
    };
    timestamp: number;
    metadata: {
        windowCount: number;
        groupCount: number;
        activeWindowId?: string;
        activeGroupId?: string;
    };
}

// Enhanced window state with new features
export interface WindowState {
    id: string;
    title: string;
    component: ReactNode;
    isMinimized: boolean;
    isMaximized: boolean;
    zIndex: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    desktopId?: string; // Virtual desktop assignment
    isSticky?: boolean; // Show on all desktops
    groupId?: string; // Window group membership
    applicationCategory?: ApplicationCategory; // Application type for context-aware behavior
    icon?: string; // Icon for better visual representation
    snapData?: {
        isSnapped: boolean;
        snapPosition?: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'maximized';
        zoneId?: string; // ID of the snap zone if applicable
    };
    // Store pre-maximized state for proper restoration
    restoreState?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    // Tabbing support (for when window is in a group)
    tabData?: {
        isTabbed: boolean;
        groupId: string;
        tabIndex: number;
        isActive: boolean;
    };
    // Window rules that have been applied
    appliedRules?: string[];
}

interface WindowManagerContextType {
    windows: WindowState[];
    windowGroups: WindowGroup[];
    activeWindowId: string | null;
    activeGroupId?: string;
    layoutMode: 'tiling' | 'floating' | 'hybrid';

    // Core window operations
    openWindow: (title: string, component: ReactNode, options?: {
        desktopId?: string;
        isSticky?: boolean;
        applicationCategory?: ApplicationCategory;
        icon?: string;
        groupId?: string;
    }) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    maximizeWindow: (id: string) => void;
    toggleLayoutMode: () => void;
    updateWindowPosition: (id: string, x: number, y: number) => void;
    updateWindowSize: (id: string, width: number, height: number) => void;

    // Virtual desktop support
    moveWindowToDesktop: (windowId: string, desktopId: string) => void;
    setWindowSticky: (windowId: string, isSticky: boolean) => void;
    getWindowsForDesktop: (desktopId: string) => WindowState[];

    // Layout template support
    applyLayoutTemplate: (template: LayoutTemplate) => void;

    // Window snapping
    snapWindow: (windowId: string, position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'maximized', zoneId?: string) => void;
    unsnapWindow: (windowId: string) => void;
    getSnapZones: (categoryId?: ApplicationCategory) => SnapZone[];

    // Window operations with enhanced features
    cascadeWindows: () => void;
    tileWindows: () => void;
    arrangeWindows: (mode: 'cascade' | 'tile' | 'grid') => void;

    // Window grouping and tabbing
    createWindowGroup: (windowIds: string[], name: string, type?: 'tabbed' | 'stacked' | 'tiled') => string;
    addWindowToGroup: (groupId: string, windowId: string) => void;
    removeWindowFromGroup: (groupId: string, windowId: string) => void;
    deleteWindowGroup: (groupId: string) => void;
    setActiveTabInGroup: (groupId: string, tabIndex: number) => void;
    moveTabInGroup: (groupId: string, fromIndex: number, toIndex: number) => void;
    getWindowGroup: (groupId: string) => WindowGroup | undefined;

    // Workspace templates
    getWorkspaceTemplates: () => WorkspaceTemplate[];
    applyWorkspaceTemplate: (templateId: string, desktopId?: string) => void;
    saveWorkspaceState: (name: string, desktopId?: string) => string;
    loadWorkspaceState: (stateId: string) => void;
    deleteWorkspaceState: (stateId: string) => void;
    getRecentWorkspaces: () => WorkspaceState[];
    autoArrangeWindowsByCategory: () => void;

    // Window rules and automation
    applyWindowRules: (windowId: string) => void;
    createWindowRule: (rule: WindowRule) => void;
    getWindowRules: () => WindowRule[];
    deleteWindowRule: (ruleId: string) => void;

    // Context-aware features
    getApplicationCategory: (windowTitle: string) => ApplicationCategory;
    setApplicationCategory: (windowId: string, category: ApplicationCategory) => void;
    getOptimalLayout: (windows: WindowState[], category?: ApplicationCategory) => LayoutTemplate;

    // Multi-monitor support
    getMonitorBounds: () => Array<{ x: number; y: number; width: number; height: number }>;
    moveToMonitor: (windowId: string, monitorIndex: number) => void;

    // Keyboard shortcuts and hotkeys
    registerHotkey: (keyCombo: string, action: string, callback?: () => void) => void;
    unregisterHotkey: (keyCombo: string) => void;
    getHotkeys: () => Array<{ keyCombo: string; action: string; description: string }>;

    // Animation and visual settings
    setAnimationDuration: (duration: number) => void;
    setShowSnapIndicators: (show: boolean) => void;
    setShowGroupPreviews: (show: boolean) => void;
}

export const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);
export type { WindowManagerContextType };