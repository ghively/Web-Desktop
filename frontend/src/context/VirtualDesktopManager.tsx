import React, { createContext, useState, useEffect, useCallback, useRef, useContext } from 'react';
import type { ReactNode } from 'react';
import type {
    VirtualDesktop,
    LayoutTemplate,
    WindowGroup,
    VirtualDesktopSettings,
    DesktopSnapshot,
    SnapZone,
    VirtualDesktopManagerContextType
} from '../types/virtualDesktops';
import { DEFAULT_LAYOUT_TEMPLATES, DEFAULT_VIRTUAL_DESKTOP_SETTINGS } from '../types/virtualDesktops';

const VirtualDesktopManagerContext = createContext<VirtualDesktopManagerContextType | undefined>(undefined);

export const VirtualDesktopManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [desktops, setDesktops] = useState<VirtualDesktop[]>([]);
    const [currentDesktopId, setCurrentDesktopId] = useState<string | null>(null);
    const [layoutTemplates, setLayoutTemplates] = useState<LayoutTemplate[]>(DEFAULT_LAYOUT_TEMPLATES);
    const [windowGroups, setWindowGroups] = useState<WindowGroup[]>([]);
    const [enableSnapping, setEnableSnapping] = useState(true);
    const [settings, setSettings] = useState<VirtualDesktopSettings>(DEFAULT_VIRTUAL_DESKTOP_SETTINGS);
    const snapshots = useRef<Map<string, DesktopSnapshot>>(new Map());

    // Switch to a desktop (defined early to avoid hoisting issues)
    const switchDesktop = useCallback((desktopId: string) => {
        const desktop = desktops.find(d => d.id === desktopId);
        if (!desktop) return;

        setCurrentDesktopId(desktopId);
        setDesktops(prev => prev.map(d => ({
            ...d,
            isActive: d.id === desktopId,
            lastAccessed: d.id === desktopId ? Date.now() : d.lastAccessed
        })));
    }, [desktops]);

    // Initialize with default desktops
    useEffect(() => {
        const defaultDesktops: VirtualDesktop[] = Array.from({ length: settings.desktopCount }, (_, i) => ({
            id: `desktop-${i + 1}`,
            name: `Desktop ${i + 1}`,
            index: i,
            wallpaper: i === 0 ? {
                type: 'gradient',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            } : undefined,
            windows: [],
            isActive: i === 0,
            layout: {
                mode: 'tiling',
                snapEnabled: true,
                snapThreshold: 20,
                gaps: { size: 8, enabled: true }
            },
            lastAccessed: Date.now()
        }));

        setTimeout(() => {
            setDesktops(defaultDesktops);
            if (defaultDesktops[0]?.id) {
                setCurrentDesktopId(defaultDesktops[0].id);
            }
        }, 0);
    }, [settings.desktopCount]);

    // Keyboard shortcuts for desktop switching
    useEffect(() => {
        if (!settings.desktopSwitching.keyboardShortcuts) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!e.ctrlKey || !e.key.match(/[1-9]/)) return;

            const desktopIndex = parseInt(e.key) - 1;
            if (desktopIndex < desktops.length) {
                const desktop = desktops[desktopIndex];
                if (desktop) {
                    switchDesktop(desktop.id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [desktops, settings.desktopSwitching.keyboardShortcuts]);

    // Persist settings to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('virtual-desktop-settings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save virtual desktop settings:', error);
        }
    }, [settings]);

    // Load settings from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('virtual-desktop-settings');
            if (saved) {
                setTimeout(() => {
                    setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
                }, 0);
            }
        } catch (error) {
            console.warn('Failed to load virtual desktop settings:', error);
        }
    }, []);

    // Create a new desktop
    const createDesktop = useCallback((name?: string) => {
        const id = `desktop-${Date.now()}`;
        const newDesktop: VirtualDesktop = {
            id,
            name: name || `Desktop ${desktops.length + 1}`,
            index: desktops.length,
            wallpaper: {
                type: 'gradient',
                gradient: `linear-gradient(135deg, hsl(${Math.random() * 360}, 70%, 50%) 0%, hsl(${Math.random() * 360}, 70%, 30%) 100%)`
            },
            windows: [],
            isActive: false,
            layout: {
                mode: 'tiling',
                snapEnabled: true,
                snapThreshold: 20,
                gaps: { size: 8, enabled: true }
            },
            lastAccessed: Date.now()
        };

        setDesktops(prev => [...prev, newDesktop]);
        return id;
    }, [desktops.length]);

    // Delete a desktop
    const deleteDesktop = useCallback((desktopId: string) => {
        if (desktops.length <= 1) return; // Can't delete last desktop

        setDesktops(prev => {
            const filtered = prev.filter(d => d.id !== desktopId);

            // Re-index desktops
            const reindexed = filtered.map((d, i) => ({
                ...d,
                index: i,
                name: d.name.replace(/Desktop \d+/, `Desktop ${i + 1}`)
            }));

            // If current desktop was deleted, switch to first desktop
            if (currentDesktopId === desktopId) {
                setCurrentDesktopId(reindexed[0]?.id || null);
            }

            return reindexed;
        });
    }, [currentDesktopId, desktops.length]);

    // Move window to desktop
    const moveWindowToDesktop = useCallback((windowId: string, desktopId: string) => {
        setDesktops(prev => prev.map(desktop => {
            if (desktop.id === desktopId) {
                return {
                    ...desktop,
                    windows: [...new Set([...desktop.windows, windowId])]
                };
            } else {
                return {
                    ...desktop,
                    windows: desktop.windows.filter(id => id !== windowId)
                };
            }
        }));
    }, []);

    // Apply layout template
    const applyLayoutTemplate = useCallback((templateId: string) => {
        const template = layoutTemplates.find(t => t.id === templateId);
        if (!template || !currentDesktopId) return;

        setDesktops(prev => prev.map(desktop =>
            desktop.id === currentDesktopId
                ? { ...desktop, layout: { ...desktop.layout, template } }
                : desktop
        ));
    }, [currentDesktopId, layoutTemplates]);

    // Save layout template
    const saveLayoutTemplate = useCallback((template: LayoutTemplate) => {
        setLayoutTemplates(prev => {
            const existing = prev.find(t => t.id === template.id);
            if (existing) {
                return prev.map(t => t.id === template.id ? template : t);
            } else {
                return [...prev, template];
            }
        });
    }, []);

    // Get layout templates
    const getLayoutTemplates = useCallback(() => layoutTemplates, [layoutTemplates]);

    // Create window group
    const createWindowGroup = useCallback((windowIds: string[], name: string) => {
        const id = `group-${Date.now()}`;
        const newGroup: WindowGroup = {
            id,
            name,
            windowIds,
            layout: 'tabbed',
            isActive: false
        };
        setWindowGroups(prev => [...prev, newGroup]);
        return id;
    }, []);

    // Delete window group
    const deleteWindowGroup = useCallback((groupId: string) => {
        setWindowGroups(prev => prev.filter(g => g.id !== groupId));
    }, []);

    // Add window to group
    const addWindowToGroup = useCallback((groupId: string, windowId: string) => {
        setWindowGroups(prev => prev.map(group =>
            group.id === groupId
                ? { ...group, windowIds: [...new Set([...group.windowIds, windowId])] }
                : group
        ));
    }, []);

    // Remove window from group
    const removeWindowFromGroup = useCallback((groupId: string, windowId: string) => {
        setWindowGroups(prev => prev.map(group =>
            group.id === groupId
                ? { ...group, windowIds: group.windowIds.filter(id => id !== windowId) }
                : group
        ));
    }, []);

    // Get snap zones for desktop
    const getSnapZones = useCallback((desktopId: string): SnapZone[] => {
        const desktop = desktops.find(d => d.id === desktopId);
        if (!desktop || !desktop.layout.snapEnabled) return [];

        const gap = desktop.layout.gaps.size;
        const threshold = desktop.layout.snapThreshold;
        const zones: SnapZone[] = [];

        // Edge snap zones
        zones.push(
            {
                edge: 'left',
                bounds: { x: 0, y: 40, width: threshold, height: window.innerHeight - 40 },
                action: { type: 'tile', config: { position: 'left' } }
            },
            {
                edge: 'right',
                bounds: { x: window.innerWidth - threshold, y: 40, width: threshold, height: window.innerHeight - 40 },
                action: { type: 'tile', config: { position: 'right' } }
            },
            {
                edge: 'top',
                bounds: { x: 0, y: 40, width: window.innerWidth, height: threshold },
                action: { type: 'maximize' }
            },
            {
                edge: 'bottom',
                bounds: { x: 0, y: window.innerHeight - threshold, width: window.innerWidth, height: threshold },
                action: { type: 'tile', config: { position: 'bottom' } }
            }
        );

        // Center snap zone
        const centerX = window.innerWidth / 2 - threshold / 2;
        const centerY = window.innerHeight / 2 - threshold / 2;
        zones.push({
            edge: 'center',
            bounds: { x: centerX, y: centerY, width: threshold, height: threshold },
            action: { type: 'maximize' }
        });

        return zones;
    }, [desktops]);

    // Update settings
    const updateSettings = useCallback((newSettings: Partial<VirtualDesktopSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    // Save desktop snapshot
    const saveDesktopSnapshot = useCallback((desktopId: string): DesktopSnapshot => {
        const desktop = desktops.find(d => d.id === desktopId);
        if (!desktop) {
            throw new Error(`Desktop ${desktopId} not found`);
        }

        // This would integrate with the actual window manager
        // For now, we'll create a basic snapshot structure
        const snapshot: DesktopSnapshot = {
            desktopId,
            windows: [], // Would be populated by window manager
            layout: desktop.layout,
            timestamp: Date.now()
        };

        snapshots.current.set(desktopId, snapshot);
        return snapshot;
    }, [desktops]);

    // Restore desktop snapshot
    const restoreDesktopSnapshot = useCallback((snapshot: DesktopSnapshot) => {
        const desktop = desktops.find(d => d.id === snapshot.desktopId);
        if (!desktop) return;

        setDesktops(prev => prev.map(d =>
            d.id === snapshot.desktopId
                ? { ...d, layout: snapshot.layout }
                : d
        ));

        // Window restoration would be handled by window manager
    }, [desktops]);

    // Export configuration
    const exportConfiguration = useCallback((): string => {
        const config = {
            desktops,
            layoutTemplates,
            settings,
            windowGroups
        };
        return JSON.stringify(config, null, 2);
    }, [desktops, layoutTemplates, settings, windowGroups]);

    // Import configuration
    const importConfiguration = useCallback((config: string) => {
        try {
            const parsed = JSON.parse(config);

            if (parsed.desktops) setDesktops(parsed.desktops);
            if (parsed.layoutTemplates) setLayoutTemplates(prev => [...prev, ...parsed.layoutTemplates]);
            if (parsed.settings) setSettings(parsed.settings);
            if (parsed.windowGroups) setWindowGroups(parsed.windowGroups);

            // Set current desktop to first desktop if available
            if (parsed.desktops?.[0]) {
                setCurrentDesktopId(parsed.desktops[0].id);
            }
        } catch (error) {
            console.error('Failed to import configuration:', error);
            throw new Error('Invalid configuration format');
        }
    }, []);

    const value: VirtualDesktopManagerContextType = {
        desktops,
        currentDesktopId,
        createDesktop,
        deleteDesktop,
        switchDesktop,
        moveWindowToDesktop,
        applyLayoutTemplate,
        saveLayoutTemplate,
        getLayoutTemplates,
        createWindowGroup,
        deleteWindowGroup,
        addWindowToGroup,
        removeWindowFromGroup,
        getSnapZones,
        enableSnapping,
        setEnableSnapping,
        settings,
        updateSettings,
        saveDesktopSnapshot,
        restoreDesktopSnapshot,
        exportConfiguration,
        importConfiguration
    };

    return (
        <VirtualDesktopManagerContext.Provider value={value}>
            {children}
        </VirtualDesktopManagerContext.Provider>
    );
};

export { VirtualDesktopManagerContext };

export const useVirtualDesktopManager = (): VirtualDesktopManagerContextType => {
    const ctx = useContext(VirtualDesktopManagerContext);
    if (!ctx) {
        throw new Error('useVirtualDesktopManager must be used within VirtualDesktopManagerProvider');
    }
    return ctx;
};
