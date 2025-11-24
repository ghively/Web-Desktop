import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    // Core system icons
    Search, Command, Clock, Star, Zap, ArrowRight, ArrowLeft,
    // Category icons
    Home, Home as HomeIcon, Settings, Wrench, Code, Brain, Tv, Wifi, Music, Globe as NetworkIcon,
    // Application icons
    Terminal, Folder, FileText, Container, Play, Gauge, Monitor, Share2, Activity,
    Package, Database, Palette, Cpu, HardDrive, Disc, FileSearch, Key,
    // Additional UI icons
    X, ChevronRight, TrendingUp, Sparkles, Filter, Grid, List
} from 'lucide-react';

import { TerminalComponent } from './Terminal';
import { FileManager } from './FileManager';
import { Notes } from './Notes';
import { ContainerManager } from './ContainerManager';
import { ControlPanel } from './ControlPanel';
import { VNCClient } from './VNCClient';
import { RDPClient } from './RDPClient';
import { NginxProxyManager } from './NginxProxyManager';
import { ShareManager } from './ShareManager';
import { SystemMonitor } from './SystemMonitor';
import { ComprehensiveSettings } from './ComprehensiveSettings';
import { EnvironmentConfiguration } from './EnvironmentConfiguration';
import { Marketplace } from './Marketplace';
import { DeveloperTools } from './DeveloperTools';
import SmartStorage from './SmartStorage';
import AIIntegration from './AIIntegration';
import ThemeCustomizer from './ThemeCustomizer';
import AIModelManager from './AIModelManager';
import StoragePools from './StoragePools';
import WiFiManagement from './WiFiManagement';
import HomeAssistantIntegration from './HomeAssistantIntegration';
import PowerManagement from './PowerManagement';
import MediaServer from './MediaServer';
import { FileMetadataManager } from './FileMetadataManager';
import SystemTools from './SystemTools';
import { AIHub } from './AIHub';
import { SmartHomeHub } from './SmartHomeHub';
import { MediaHub } from './MediaHub';
import { NetworkHub } from './NetworkHub';
import { useWindowManager, useAppLauncher, useSettings } from '../context/exports';
import clsx from 'clsx';
import Fuse from 'fuse.js';

// Enhanced application interface with categorization
interface App {
    id: string;
    name: string;
    icon: string | React.ComponentType<{ size?: number }>;
    description?: string;
    category: AppCategory;
    subcategory?: string;
    tags?: string[];
    action: () => void;
    isRunning?: boolean;
    isBuiltIn?: boolean;
    isFavorite?: boolean;
    usageCount?: number;
    lastUsed?: string;
    keywords?: string[];
}

// Application categories with logical grouping
export enum AppCategory {
    CONTROL_CENTER = 'control-center',
    APPLICATIONS = 'applications',
    SYSTEM_TOOLS = 'system-tools',
    DEVELOPMENT = 'development',
    AI_HUB = 'ai-hub',
    SMART_HOME = 'smart-home',
    MEDIA_HUB = 'media-hub',
    NETWORK_HUB = 'network-hub'
}

// Category configuration
export const CATEGORY_CONFIG = {
    [AppCategory.CONTROL_CENTER]: {
        name: 'Control Center',
        icon: HomeIcon,
        description: 'System management and settings',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        priority: 1
    },
    [AppCategory.APPLICATIONS]: {
        name: 'Applications',
        icon: Grid,
        description: 'User-facing applications',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        priority: 2
    },
    [AppCategory.SYSTEM_TOOLS]: {
        name: 'System Tools',
        icon: Wrench,
        description: 'Administrative utilities',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        priority: 3
    },
    [AppCategory.DEVELOPMENT]: {
        name: 'Development',
        icon: Code,
        description: 'Developer tools and environments',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        priority: 4
    },
    [AppCategory.AI_HUB]: {
        name: 'AI Hub',
        icon: Brain,
        description: 'AI-related applications and tools',
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
        priority: 5
    },
    [AppCategory.SMART_HOME]: {
        name: 'Smart Home',
        icon: Tv,
        description: 'Home automation and IoT devices',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
        priority: 6
    },
    [AppCategory.MEDIA_HUB]: {
        name: 'Media Hub',
        icon: Music,
        description: 'Media and entertainment applications',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        priority: 7
    },
    [AppCategory.NETWORK_HUB]: {
        name: 'Network Hub',
        icon: NetworkIcon,
        description: 'Network and connectivity tools',
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-500/10',
        priority: 8
    }
};

// Quick actions for frequent tasks
export const QUICK_ACTIONS = [
    {
        id: 'new-terminal',
        name: 'New Terminal',
        icon: Terminal,
        action: 'launch-terminal',
        shortcut: 'Ctrl+Alt+T',
        category: AppCategory.APPLICATIONS
    },
    {
        id: 'new-note',
        name: 'New Note',
        icon: FileText,
        action: 'launch-notes',
        shortcut: 'Ctrl+Alt+N',
        category: AppCategory.APPLICATIONS
    },
    {
        id: 'file-manager',
        name: 'File Manager',
        icon: Folder,
        action: 'launch-files',
        shortcut: 'Ctrl+Alt+F',
        category: AppCategory.APPLICATIONS
    },
    {
        id: 'system-monitor',
        name: 'System Monitor',
        icon: Activity,
        action: 'launch-monitor',
        shortcut: 'Ctrl+Alt+M',
        category: AppCategory.SYSTEM_TOOLS
    },
    {
        id: 'settings',
        name: 'Settings',
        icon: Settings,
        action: 'launch-settings',
        shortcut: 'Ctrl+Alt+S',
        category: AppCategory.CONTROL_CENTER
    }
];

interface AppUsage {
    appId: string;
    count: number;
    lastUsed: string;
}

export const EnhancedAppLauncher = () => {
    const { isOpen, closeLauncher, toggleLauncher } = useAppLauncher();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<AppCategory | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [installedApps, setInstalledApps] = useState<App[]>([]);
    const [recentApps, setRecentApps] = useState<string[]>([]);
    const [favoriteApps, setFavoriteApps] = useState<string[]>([]);
    const [appUsage, setAppUsage] = useState<Record<string, AppUsage>>({});
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [showQuickActions, setShowQuickActions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { openWindow, windows } = useWindowManager();
    const { settings } = useSettings();

    // Manual debounce for search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 150);
        return () => clearTimeout(timer);
    }, [query]);

    // Generate unique window IDs
    const createWindowId = useCallback((prefix: string) => {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // Track app usage
    const trackAppUsage = useCallback((appId: string) => {
        setAppUsage(prev => ({
            ...prev,
            [appId]: {
                appId,
                count: (prev[appId]?.count || 0) + 1,
                lastUsed: new Date().toISOString()
            }
        }));

        setRecentApps(prev => {
            const filtered = prev.filter(id => id !== appId);
            return [appId, ...filtered].slice(0, 8); // Keep last 8 apps
        });
    }, []);

    // Built-in apps with proper categorization
    const builtInApps: App[] = useMemo(() => [
        // Control Center
        {
            id: 'control-panel',
            name: 'Control Panel',
            icon: Gauge,
            description: 'Comprehensive system management dashboard',
            category: AppCategory.CONTROL_CENTER,
            subcategory: 'system-management',
            tags: ['system', 'management', 'dashboard'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('control-panel');
                trackAppUsage('control-panel');
                return openWindow('Control Panel', <ControlPanel windowId={windowId} />);
            }
        },
        {
            id: 'settings',
            name: 'Settings',
            icon: Settings,
            description: 'System configuration and preferences',
            category: AppCategory.CONTROL_CENTER,
            subcategory: 'configuration',
            tags: ['settings', 'configuration', 'preferences'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('settings');
                trackAppUsage('settings');
                return openWindow('Settings', <ComprehensiveSettings windowId={windowId} />);
            }
        },
        {
            id: 'environment-config',
            name: 'Environment',
            icon: Key,
            description: 'API keys and external services configuration',
            category: AppCategory.CONTROL_CENTER,
            subcategory: 'configuration',
            tags: ['environment', 'api', 'keys'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('env-config');
                trackAppUsage('environment-config');
                return openWindow('Environment Configuration', <EnvironmentConfiguration windowId={windowId} />);
            }
        },
        {
            id: 'control-center',
            name: 'Control Center',
            icon: HomeIcon,
            description: 'Unified system management and administration hub',
            category: AppCategory.CONTROL_CENTER,
            subcategory: 'system-management',
            tags: ['control', 'center', 'system', 'management', 'admin', 'dashboard'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('control-center');
                trackAppUsage('control-center');
                return openWindow('Control Center', <ControlCenter windowId={windowId} />);
            }
        },

        // Applications
        {
            id: 'terminal',
            name: 'Terminal',
            icon: Terminal,
            description: 'System terminal with shell access',
            category: AppCategory.APPLICATIONS,
            subcategory: 'utilities',
            tags: ['terminal', 'shell', 'command-line'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('terminal');
                trackAppUsage('terminal');
                return openWindow('Terminal', <TerminalComponent windowId={windowId} />);
            }
        },
        {
            id: 'files',
            name: 'Files',
            icon: Folder,
            description: 'Browse and manage files',
            category: AppCategory.APPLICATIONS,
            subcategory: 'utilities',
            tags: ['files', 'file-manager', 'browser'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('fm');
                trackAppUsage('files');
                return openWindow('Files', <FileManager windowId={windowId} />);
            }
        },
        {
            id: 'notes',
            name: 'Notes',
            icon: FileText,
            description: 'Markdown notes editor',
            category: AppCategory.APPLICATIONS,
            subcategory: 'productivity',
            tags: ['notes', 'markdown', 'editor'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('notes');
                trackAppUsage('notes');
                return openWindow('Notes', <Notes windowId={windowId} />);
            }
        },
        {
            id: 'marketplace',
            name: 'Marketplace',
            icon: Package,
            description: 'Browse and install applications',
            category: AppCategory.APPLICATIONS,
            subcategory: 'productivity',
            tags: ['apps', 'store', 'install'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('marketplace');
                trackAppUsage('marketplace');
                return openWindow('Marketplace', <Marketplace windowId={windowId} />);
            }
        },
        {
            id: 'theme-customizer',
            name: 'Theme Customizer',
            icon: Palette,
            description: 'Customize desktop themes and appearance',
            category: AppCategory.APPLICATIONS,
            subcategory: 'personalization',
            tags: ['theme', 'appearance', 'customization'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('themes');
                trackAppUsage('theme-customizer');
                return openWindow('Theme Customizer', <ThemeCustomizer windowId={windowId} />);
            }
        },

        // System Tools
        {
            id: 'system-monitor',
            name: 'System Monitor',
            icon: Activity,
            description: 'Real-time system performance monitoring',
            category: AppCategory.SYSTEM_TOOLS,
            subcategory: 'monitoring',
            tags: ['monitor', 'performance', 'system'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('sysmon');
                trackAppUsage('system-monitor');
                return openWindow('System Monitor', <SystemMonitor windowId={windowId} />);
            }
        },
        {
            id: 'containers',
            name: 'Containers',
            icon: Container,
            description: 'Docker container management',
            category: AppCategory.SYSTEM_TOOLS,
            subcategory: 'virtualization',
            tags: ['docker', 'containers', 'virtualization'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('containers');
                trackAppUsage('containers');
                return openWindow('Containers', <ContainerManager windowId={windowId} />);
            }
        },
        {
            id: 'power-management',
            name: 'Power Management',
            icon: Zap,
            description: 'System power controls and automation',
            category: AppCategory.SYSTEM_TOOLS,
            subcategory: 'power',
            tags: ['power', 'energy', 'automation'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('power-management');
                trackAppUsage('power-management');
                return openWindow('Power Management', <PowerManagement windowId={windowId} />);
            }
        },
        {
            id: 'storage-pools',
            name: 'Storage Pools',
            icon: HardDrive,
            description: 'Manage multiple disks and storage',
            category: AppCategory.SYSTEM_TOOLS,
            subcategory: 'storage',
            tags: ['storage', 'disks', 'management'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('storage-pools');
                trackAppUsage('storage-pools');
                return openWindow('Storage Pools', <StoragePools windowId={windowId} />);
            }
        },
        {
            id: 'system-tools',
            name: 'System Tools',
            icon: Wrench,
            description: 'Professional system administration and utilities launcher',
            category: AppCategory.SYSTEM_TOOLS,
            subcategory: 'utilities',
            tags: ['system', 'administration', 'tools', 'utilities'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('system-tools');
                trackAppUsage('system-tools');
                return openWindow('System Tools', <SystemTools windowId={windowId} />);
            }
        },

        // Development
        {
            id: 'developer-tools',
            name: 'Developer Tools',
            icon: Code,
            description: 'App development and debugging tools',
            category: AppCategory.DEVELOPMENT,
            subcategory: 'tools',
            tags: ['development', 'debugging', 'tools'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('devtools');
                trackAppUsage('developer-tools');
                return openWindow('Developer Tools', <DeveloperTools windowId={windowId} />);
            }
        },

        // AI Hub
        {
            id: 'ai-hub',
            name: 'AI Hub',
            icon: Brain,
            description: 'Comprehensive AI interface with chat, models, and tools',
            category: AppCategory.AI_HUB,
            subcategory: 'main',
            tags: ['ai', 'chat', 'models', 'prompt-templates', 'code-generation'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('ai-hub');
                trackAppUsage('ai-hub');
                return openWindow('AI Hub', <AIHub windowId={windowId} />);
            }
        },
        {
            id: 'ai-integration',
            name: 'AI Integration',
            icon: Brain,
            description: 'Smart file analysis and automation',
            category: AppCategory.AI_HUB,
            subcategory: 'productivity',
            tags: ['ai', 'automation', 'analysis'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('ai');
                trackAppUsage('ai-integration');
                return openWindow('AI Integration', <AIIntegration windowId={windowId} />);
            }
        },
        {
            id: 'ai-model-manager',
            name: 'AI Model Manager',
            icon: Cpu,
            description: 'Manage AI models and task routing',
            category: AppCategory.AI_HUB,
            subcategory: 'management',
            tags: ['ai', 'models', 'ollama'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('ai-models');
                trackAppUsage('ai-model-manager');
                return openWindow('AI Model Manager', <AIModelManager windowId={windowId} />);
            }
        },
        {
            id: 'smart-storage',
            name: 'Smart Storage',
            icon: Database,
            description: 'AI-powered storage deduplication',
            category: AppCategory.AI_HUB,
            subcategory: 'storage',
            tags: ['ai', 'storage', 'deduplication'],
            isBuiltIn: true,
            action: () => {
                trackAppUsage('smart-storage');
                return openWindow('Smart Storage', <SmartStorage />);
            }
        },

        // Smart Home
        {
            id: 'smart-home-hub',
            name: 'Smart Home Hub',
            icon: Home,
            description: 'Comprehensive smart home control and automation interface',
            category: AppCategory.SMART_HOME,
            subcategory: 'main',
            tags: ['smart-home', 'home-automation', 'iot', 'devices', 'scenes', 'energy', 'security'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('smart-home-hub');
                trackAppUsage('smart-home-hub');
                return openWindow('Smart Home Hub', <SmartHomeHub windowId={windowId} />);
            }
        },
        {
            id: 'home-assistant',
            name: 'Home Assistant',
            icon: Tv,
            description: 'Control smart home devices and automations',
            category: AppCategory.SMART_HOME,
            subcategory: 'integration',
            tags: ['home-assistant', 'smart-home', 'iot'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('home-assistant');
                trackAppUsage('home-assistant');
                return openWindow('Home Assistant', <HomeAssistantIntegration windowId={windowId} />);
            }
        },

        // Media Hub
        {
            id: 'media-hub',
            name: 'Media Hub',
            icon: Music,
            description: 'Comprehensive media management, streaming, and entertainment center',
            category: AppCategory.MEDIA_HUB,
            subcategory: 'main',
            tags: ['media', 'streaming', 'music', 'movies', 'player', 'library', 'playlists'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('media-hub');
                trackAppUsage('media-hub');
                return openWindow('Media Hub', <MediaHub windowId={windowId} />);
            }
        },
        {
            id: 'media-server',
            name: 'Media Server',
            icon: Disc,
            description: 'Jellyfin/Emby media management',
            category: AppCategory.MEDIA_HUB,
            subcategory: 'server',
            tags: ['media', 'jellyfin', 'emby', 'streaming'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('media-server');
                trackAppUsage('media-server');
                return openWindow('Media Server', <MediaServer windowId={windowId} />);
            }
        },

        // Network Hub
        {
            id: 'network-hub',
            name: 'Network Hub',
            icon: NetworkIcon,
            description: 'Comprehensive network management, VPN, and connectivity tools',
            category: AppCategory.NETWORK_HUB,
            subcategory: 'main',
            tags: ['network', 'wifi', 'vpn', 'proxy', 'monitoring', 'security', 'tools'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('network-hub');
                trackAppUsage('network-hub');
                return openWindow('Network Hub', <NetworkHub windowId={windowId} />);
            }
        },
        {
            id: 'wifi-management',
            name: 'WiFi Management',
            icon: Wifi,
            description: 'Manage WiFi networks and connections',
            category: AppCategory.NETWORK_HUB,
            subcategory: 'wireless',
            tags: ['wifi', 'network', 'connections'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('wifi-management');
                trackAppUsage('wifi-management');
                return openWindow('WiFi Management', <WiFiManagement windowId={windowId} />);
            }
        },
        {
            id: 'nginx-proxy-manager',
            name: 'Nginx Proxy Manager',
            icon: NetworkIcon,
            description: 'Configure proxy hosts and SSL',
            category: AppCategory.NETWORK_HUB,
            subcategory: 'proxy',
            tags: ['nginx', 'proxy', 'ssl'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('npm');
                trackAppUsage('nginx-proxy-manager');
                return openWindow('Nginx Proxy Manager', <NginxProxyManager windowId={windowId} />);
            }
        },
        {
            id: 'share-manager',
            name: 'Share Manager',
            icon: Share2,
            description: 'Manage NFS and Samba network shares',
            category: AppCategory.NETWORK_HUB,
            subcategory: 'sharing',
            tags: ['nfs', 'samba', 'network-shares'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('sm');
                trackAppUsage('share-manager');
                return openWindow('Share Manager', <ShareManager windowId={windowId} />);
            }
        },
        {
            id: 'vnc-client',
            name: 'VNC Client',
            icon: Monitor,
            description: 'Access remote desktops via VNC',
            category: AppCategory.NETWORK_HUB,
            subcategory: 'remote',
            tags: ['vnc', 'remote-desktop'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('vnc');
                trackAppUsage('vnc-client');
                return openWindow('VNC Client', <VNCClient windowId={windowId} />);
            }
        },
        {
            id: 'rdp-client',
            name: 'RDP Client',
            icon: Monitor,
            description: 'Connect to Windows systems via RDP',
            category: AppCategory.NETWORK_HUB,
            subcategory: 'remote',
            tags: ['rdp', 'remote-desktop', 'windows'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('rdp');
                trackAppUsage('rdp-client');
                return openWindow('RDP Client', <RDPClient windowId={windowId} />);
            }
        },
        {
            id: 'file-metadata',
            name: 'File Metadata Manager',
            icon: FileSearch,
            description: 'Database-powered file search and metadata',
            category: AppCategory.NETWORK_HUB,
            subcategory: 'search',
            tags: ['search', 'metadata', 'files'],
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('file-metadata');
                trackAppUsage('file-metadata');
                return openWindow('File Metadata Manager', <FileMetadataManager windowId={windowId} />);
            }
        }
    ], [openWindow, createWindowId, trackAppUsage]);

    // Pre-resolve apps with icons and status
    const allApps = useMemo(() => [...builtInApps, ...installedApps].map(app => ({
        ...app,
        isRunning: windows.some(w => w.title.toLowerCase() === app.name.toLowerCase()),
        Icon: typeof app.icon === 'function' ? app.icon : null,
        iconString: typeof app.icon === 'string' ? app.icon : '📦',
        isFavorite: favoriteApps.includes(app.id),
        usageCount: appUsage[app.id]?.count || 0,
        lastUsed: appUsage[app.id]?.lastUsed
    })), [builtInApps, installedApps, windows, favoriteApps, appUsage]);

    // Create enhanced Fuse instance for search
    const fuse = useMemo(() => new Fuse(allApps, {
        keys: [
            { name: 'name', weight: 3 },
            { name: 'description', weight: 2 },
            { name: 'tags', weight: 1.5 },
            { name: 'category', weight: 1 },
            { name: 'subcategory', weight: 1 },
            { name: 'keywords', weight: 1 }
        ],
        threshold: 0.3,
        includeScore: true,
        minMatchCharLength: 1
    }), [allApps]);

    // Filter and search apps
    const filteredApps = useMemo(() => {
        let apps = allApps;

        // Apply category filter
        if (selectedCategory) {
            apps = apps.filter(app => app.category === selectedCategory);
        }

        // Apply search query
        if (debouncedQuery.trim()) {
            try {
                apps = fuse.search(debouncedQuery).map(result => result.item);
            } catch (error) {
                console.warn('Fuse search error:', error);
                apps = apps.filter(app =>
                    app.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
                    (app.description && app.description.toLowerCase().includes(debouncedQuery.toLowerCase())) ||
                    (app.tags && app.tags.some(tag => tag.toLowerCase().includes(debouncedQuery.toLowerCase())))
                );
            }
        }

        // Sort by relevance: favorites first, then recent, then usage count
        return apps.sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;

            const aRecentIndex = recentApps.indexOf(a.id);
            const bRecentIndex = recentApps.indexOf(b.id);

            if (aRecentIndex !== -1 && bRecentIndex === -1) return -1;
            if (aRecentIndex === -1 && bRecentIndex !== -1) return 1;
            if (aRecentIndex !== -1 && bRecentIndex !== -1) return aRecentIndex - bRecentIndex;

            return (b.usageCount || 0) - (a.usageCount || 0);
        });
    }, [allApps, selectedCategory, debouncedQuery, fuse, recentApps]);

    // Group apps by category for display
    const appsByCategory = useMemo(() => {
        const categories = new Map<AppCategory, App[]>();

        filteredApps.forEach(app => {
            if (!categories.has(app.category)) {
                categories.set(app.category, []);
            }
            categories.get(app.category)!.push(app);
        });

        // Sort categories by priority
        return Array.from(categories.entries())
            .sort(([, appsA], [, appsB]) => {
                const configA = CATEGORY_CONFIG[appsA[0].category as AppCategory];
                const configB = CATEGORY_CONFIG[appsB[0].category as AppCategory];
                return configA.priority - configB.priority;
            });
    }, [filteredApps]);

    // Fetch installed apps and user preferences
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Fetch installed apps
                const [packagesResponse, marketplaceResponse, usageResponse] = await Promise.all([
                    fetch(`${settings.backend.apiUrl}/api/packages/installed`),
                    fetch(`${settings.backend.apiUrl}/api/marketplace/installed`).catch(() => null),
                    fetch(`${settings.backend.apiUrl}/api/apps/usage`).catch(() => null)
                ]);

                const apps: App[] = [];

                // Process system packages
                if (packagesResponse.ok) {
                    const packagesData = await packagesResponse.json();
                    // ... (package processing logic from original)
                }

                // Process marketplace apps
                if (marketplaceResponse && marketplaceResponse.ok) {
                    const marketplaceData = await marketplaceResponse.json();
                    // ... (marketplace processing logic from original)
                }

                // Load user preferences
                const prefsResponse = await fetch(`${settings.backend.apiUrl}/api/apps/preferences`).catch(() => null);
                if (prefsResponse?.ok) {
                    const prefs = await prefsResponse.json();
                    setFavoriteApps(prefs.favorites || []);
                    setRecentApps(prefs.recent || []);
                    setViewMode(prefs.viewMode || 'grid');
                }

                // Load usage data
                if (usageResponse?.ok) {
                    const usage = await usageResponse.json();
                    setAppUsage(usage.reduce((acc: Record<string, AppUsage>, item: AppUsage) => {
                        acc[item.appId] = item;
                        return acc;
                    }, {}));
                }

                setInstalledApps(apps);
            } catch (error) {
                console.error('Failed to fetch user data:', error);
            }
        };

        fetchUserData();
    }, [openWindow, settings.backend.apiUrl]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.altKey && e.code === 'Space') &&
                !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
                e.preventDefault();
                e.stopPropagation();
                toggleLauncher();
            }

            if (e.key === 'Escape') {
                closeLauncher();
            }

            // Launcher-specific shortcuts
            if (isOpen) {
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key) {
                        case '1':
                            e.preventDefault();
                            setSelectedCategory(AppCategory.CONTROL_CENTER);
                            break;
                        case '2':
                            e.preventDefault();
                            setSelectedCategory(AppCategory.APPLICATIONS);
                            break;
                        case '3':
                            e.preventDefault();
                            setSelectedCategory(AppCategory.SYSTEM_TOOLS);
                            break;
                        case '4':
                            e.preventDefault();
                            setSelectedCategory(AppCategory.DEVELOPMENT);
                            break;
                        case 'g':
                            e.preventDefault();
                            setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
                            break;
                        case 'f':
                            e.preventDefault();
                            setShowQuickActions(prev => !prev);
                            break;
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [toggleLauncher, closeLauncher, isOpen]);

    // Focus management
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        } else if (!isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setSelectedCategory(null);
        }
    }, [isOpen]);

    // Save user preferences
    const savePreferences = useCallback(async () => {
        try {
            await fetch(`${settings.backend.apiUrl}/api/apps/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    favorites: favoriteApps,
                    recent: recentApps,
                    viewMode
                })
            });
        } catch (error) {
            console.error('Failed to save preferences:', error);
        }
    }, [favoriteApps, recentApps, viewMode, settings.backend.apiUrl]);

    // Execute selected app
    const handleExecute = useCallback(() => {
        const appToExecute = filteredApps[selectedIndex];
        if (appToExecute) {
            appToExecute.action();
            closeLauncher();
        }
    }, [filteredApps, selectedIndex, closeLauncher]);

    // Toggle favorite
    const toggleFavorite = useCallback((appId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavoriteApps(prev => {
            const updated = prev.includes(appId)
                ? prev.filter(id => id !== appId)
                : [...prev, appId];
            savePreferences();
            return updated;
        });
    }, [savePreferences]);

    // Quick action handler
    const handleQuickAction = useCallback((actionId: string) => {
        const action = QUICK_ACTIONS.find(a => a.id === actionId);
        if (action) {
            const app = allApps.find(a => a.tags?.some(tag => action.tags?.includes(tag)));
            if (app) {
                app.action();
                closeLauncher();
            }
        }
    }, [allApps, closeLauncher]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="w-[90vw] max-w-7xl max-h-[85vh] bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col">
                {/* Header with search and controls */}
                <div className="h-20 border-b border-gray-700 flex items-center px-6 gap-4">
                    <Search className="text-blue-400" size={24} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent text-xl text-gray-100 placeholder-gray-500 outline-none"
                        placeholder="Search apps, files, or settings..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleExecute();
                            } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setSelectedIndex(i => (i + 1) % filteredApps.length);
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setSelectedIndex(i => i <= 0 ? filteredApps.length - 1 : i - 1);
                            }
                        }}
                    />

                    {/* View mode toggle */}
                    <button
                        onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
                        className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                        title="Toggle view mode (Ctrl+G)"
                    >
                        {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
                    </button>

                    {/* Quick actions toggle */}
                    <button
                        onClick={() => setShowQuickActions(prev => !prev)}
                        className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                        title="Quick actions (Ctrl+F)"
                    >
                        <Zap size={20} />
                    </button>

                    <button
                        onClick={closeLauncher}
                        className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar with categories */}
                    <div className="w-64 bg-gray-950 border-r border-gray-700 p-4 overflow-y-auto">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Categories</h3>

                        <div className="space-y-2">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left",
                                    !selectedCategory ? "bg-blue-600/20 text-blue-400" : "hover:bg-gray-800 text-gray-300"
                                )}
                            >
                                <Grid size={16} />
                                <span>All Apps</span>
                            </button>

                            {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
                                const appCount = allApps.filter(app => app.category === category).length;
                                return (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category as AppCategory)}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left",
                                            selectedCategory === category
                                                ? `${config.bgColor} ${config.color}`
                                                : "hover:bg-gray-800 text-gray-300"
                                        )}
                                    >
                                        <config.icon size={16} />
                                        <div className="flex-1">
                                            <span>{config.name}</span>
                                            <span className="text-xs text-gray-500 ml-2">({appCount})</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Quick actions */}
                        {showQuickActions && (
                            <div className="mt-8">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Quick Actions</h3>
                                <div className="space-y-1">
                                    {QUICK_ACTIONS.map(action => (
                                        <button
                                            key={action.id}
                                            onClick={() => handleQuickAction(action.id)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 text-left transition-colors"
                                        >
                                            <action.icon size={16} />
                                            <div className="flex-1">
                                                <span className="text-sm">{action.name}</span>
                                                <span className="text-xs text-gray-500 ml-2">{action.shortcut}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent apps */}
                        {recentApps.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <Clock size={14} />
                                    Recent
                                </h3>
                                <div className="space-y-1">
                                    {recentApps.slice(0, 5).map(appId => {
                                        const app = allApps.find(a => a.id === appId);
                                        if (!app) return null;
                                        return (
                                            <button
                                                key={appId}
                                                onClick={() => {
                                                    app.action();
                                                    closeLauncher();
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 text-left transition-colors"
                                            >
                                                {app.Icon && <app.Icon size={16} />}
                                                {!app.Icon && <span className="text-sm">{app.iconString}</span>}
                                                <span className="text-sm truncate">{app.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main content area */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {filteredApps.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                <Search size={48} className="mb-4 opacity-50" />
                                <p className="text-lg font-medium">No apps found</p>
                                <p className="text-sm mt-1">Try adjusting your search or filters</p>
                            </div>
                        ) : (
                            <>
                                {/* Grid view */}
                                {viewMode === 'grid' && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {filteredApps.map((app, index) => (
                                            <div
                                                key={app.id}
                                                className={clsx(
                                                    "relative group bg-gray-800 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:bg-gray-700 hover:scale-105 border",
                                                    index === selectedIndex
                                                        ? "ring-2 ring-blue-500 border-blue-500"
                                                        : "border-gray-700 hover:border-gray-600"
                                                )}
                                                onClick={() => {
                                                    app.action();
                                                    closeLauncher();
                                                }}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                            >
                                                {/* Favorite button */}
                                                <button
                                                    onClick={(e) => toggleFavorite(app.id, e)}
                                                    className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Star
                                                        size={16}
                                                        className={clsx(
                                                            app.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400 hover:text-yellow-400"
                                                        )}
                                                    />
                                                </button>

                                                {/* Running indicator */}
                                                {app.isRunning && (
                                                    <div className="absolute top-2 left-2">
                                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                    </div>
                                                )}

                                                <div className="flex flex-col items-center text-center">
                                                    <div className="w-12 h-12 flex items-center justify-center mb-3">
                                                        {app.Icon && <app.Icon size={32} />}
                                                        {!app.Icon && <span className="text-2xl">{app.iconString}</span>}
                                                    </div>
                                                    <h3 className="font-medium text-gray-100 mb-1">{app.name}</h3>
                                                    {app.description && (
                                                        <p className="text-xs text-gray-400 line-clamp-2">{app.description}</p>
                                                    )}

                                                    {/* Category badge */}
                                                    <div className={clsx(
                                                        "mt-2 px-2 py-1 rounded-full text-xs",
                                                        CATEGORY_CONFIG[app.category as AppCategory].bgColor,
                                                        CATEGORY_CONFIG[app.category as AppCategory].color
                                                    )}>
                                                        {CATEGORY_CONFIG[app.category as AppCategory].name}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* List view */}
                                {viewMode === 'list' && (
                                    <div className="space-y-2">
                                        {appsByCategory.map(([category, apps]) => (
                                            <div key={category}>
                                                <div className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                                                    {(() => {
                                                        const config = CATEGORY_CONFIG[category as AppCategory];
                                                        const IconComponent = config.icon;
                                                        return <IconComponent size={16} />;
                                                    })()}
                                                    {CATEGORY_CONFIG[category as AppCategory].name}
                                                    <span className="text-xs">({apps.length})</span>
                                                </div>
                                                {apps.map((app, index) => (
                                                    <div
                                                        key={app.id}
                                                        className={clsx(
                                                            "flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors border",
                                                            index === selectedIndex
                                                                ? "bg-gray-800 ring-2 ring-blue-500 border-blue-500"
                                                                : "bg-gray-900/50 border-gray-700 hover:bg-gray-800"
                                                        )}
                                                        onClick={() => {
                                                            app.action();
                                                            closeLauncher();
                                                        }}
                                                        onMouseEnter={() => setSelectedIndex(index)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {app.Icon && <app.Icon size={24} />}
                                                            {!app.Icon && <span className="text-xl">{app.iconString}</span>}
                                                            {app.isRunning && (
                                                                <div className="w-2 h-2 bg-green-400 rounded-full" />
                                                            )}
                                                        </div>

                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-medium text-gray-100">{app.name}</h3>
                                                                {app.isFavorite && (
                                                                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                                                                )}
                                                            </div>
                                                            {app.description && (
                                                                <p className="text-sm text-gray-400">{app.description}</p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <div className={clsx(
                                                                "px-2 py-1 rounded-full text-xs",
                                                                CATEGORY_CONFIG[app.category as AppCategory].bgColor,
                                                                CATEGORY_CONFIG[app.category as AppCategory].color
                                                            )}>
                                                                {CATEGORY_CONFIG[app.category as AppCategory].name}
                                                            </div>

                                                            <button
                                                                onClick={(e) => toggleFavorite(app.id, e)}
                                                                className="p-1 rounded hover:bg-gray-700"
                                                            >
                                                                <Star
                                                                    size={16}
                                                                    className={clsx(
                                                                        app.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400 hover:text-yellow-400"
                                                                    )}
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Footer with shortcuts and status */}
                <div className="h-10 bg-gray-950 border-t border-gray-700 flex items-center justify-between px-6 text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                        <span>{filteredApps.length} apps</span>
                        {selectedCategory && (
                            <span className="flex items-center gap-1">
                                {(() => {
                                    const config = CATEGORY_CONFIG[selectedCategory as AppCategory];
                                    const IconComponent = config.icon;
                                    return <IconComponent size={12} />;
                                })()}
                                {CATEGORY_CONFIG[selectedCategory as AppCategory].name}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <span>Enter</span>
                            <span>to launch</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span>Ctrl+1-4</span>
                            <span>categories</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span>Ctrl+G</span>
                            <span>toggle view</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Export as default for backward compatibility
export default EnhancedAppLauncher;