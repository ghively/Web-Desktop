import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Search, FileText, Folder, Settings, Terminal, Play,
    Clock, Command, HelpCircle, Book, Zap, Package,
    Globe, Cpu, HardDrive, Wifi, Home, Database,
    Brain, Palette, Activity, Container, Tv, Monitor,
    Share2, Zap as PowerIcon, Disc, FileSearch, Key, Gauge
} from 'lucide-react';
import { useWindowManager, useSettings } from '../context/exports';
import { TerminalComponent } from './Terminal';
import { FileManager } from './FileManager';
import { Notes } from './Notes';
import { ContainerManager } from './ContainerManager';
import { ControlPanel } from './ControlPanel';
import { VNCClient } from './VNCClient';
import { RDPClient } from './RDPClient';
import { NginxProxyManager } from './NginxProxyManager';
import { ShareManager } from './ShareManager';
import { ComprehensiveSettings } from './ComprehensiveSettings';
import { EnvironmentConfiguration } from './EnvironmentConfiguration';
import { Marketplace } from './Marketplace';
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
import clsx from 'clsx';
import Fuse from 'fuse.js';

// Types for search results
export interface SearchResult {
    id: string;
    title: string;
    description?: string;
    category: 'application' | 'file' | 'setting' | 'command' | 'help' | 'recent';
    icon: React.ComponentType<{ size?: number }> | string;
    action: () => void;
    score?: number;
    metadata?: Record<string, any>;
}

interface SearchHistoryItem {
    query: string;
    timestamp: number;
}

interface RecentItem {
    id: string;
    title: string;
    category: SearchResult['category'];
    timestamp: number;
    action: () => void;
}

export const GlobalSearch: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
    const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState<SearchResult['category'] | 'all'>('all');
    const [externalResults, setExternalResults] = useState<SearchResult[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const { openWindow } = useWindowManager();
    const { settings } = useSettings();

    // Built-in applications registry
    const builtInApps = useMemo(() => [
        {
            id: 'terminal',
            title: 'Terminal',
            description: 'System terminal with shell access',
            category: 'application' as const,
            icon: Terminal,
            action: () => openWindow('Terminal', <TerminalComponent windowId={`terminal-${Date.now()}`} />)
        },
        {
            id: 'files',
            title: 'Files',
            description: 'Browse and manage files',
            category: 'application' as const,
            icon: Folder,
            action: () => openWindow('Files', <FileManager windowId={`fm-${Date.now()}`} />)
        },
        {
            id: 'notes',
            title: 'Notes',
            description: 'Markdown notes editor',
            category: 'application' as const,
            icon: FileText,
            action: () => openWindow('Notes', <Notes windowId={`notes-${Date.now()}`} />)
        },
        {
            id: 'containers',
            title: 'Containers',
            description: 'Docker container management',
            category: 'application' as const,
            icon: Container,
            action: () => openWindow('Containers', <ContainerManager windowId={`containers-${Date.now()}`} />)
        },
        {
            id: 'control-panel',
            title: 'Control Panel',
            description: 'Manage system settings, users, and services',
            category: 'application' as const,
            icon: Gauge,
            action: () => openWindow('Control Panel', <ControlPanel windowId={`cp-${Date.now()}`} />)
        },
        {
            id: 'settings',
            title: 'Settings',
            description: 'Comprehensive system configuration',
            category: 'application' as const,
            icon: Settings,
            action: () => openWindow('Settings', <ComprehensiveSettings windowId={`settings-${Date.now()}`} />)
        },
        {
            id: 'vnc-client',
            title: 'VNC Client',
            description: 'Access remote desktops via VNC',
            category: 'application' as const,
            icon: Tv,
            action: () => openWindow('VNC Client', <VNCClient windowId={`vnc-${Date.now()}`} />)
        },
        {
            id: 'rdp-client',
            title: 'RDP Client',
            description: 'Connect to Windows systems via RDP',
            category: 'application' as const,
            icon: Monitor,
            action: () => openWindow('RDP Client', <RDPClient windowId={`rdp-${Date.now()}`} />)
        },
        {
            id: 'nginx-proxy',
            title: 'Nginx Proxy Manager',
            description: 'Configure proxy hosts and SSL',
            category: 'application' as const,
            icon: Globe,
            action: () => openWindow('Nginx Proxy Manager', <NginxProxyManager windowId={`npm-${Date.now()}`} />)
        },
        {
            id: 'shares',
            title: 'Share Manager',
            description: 'Manage NFS and Samba network shares',
            category: 'application' as const,
            icon: Share2,
            action: () => openWindow('Share Manager', <ShareManager windowId={`sm-${Date.now()}`} />)
        },
        {
            id: 'ai-integration',
            title: 'AI Integration',
            description: 'Smart file analysis and automation',
            category: 'application' as const,
            icon: Brain,
            action: () => openWindow('AI Integration', <AIIntegration windowId={`ai-${Date.now()}`} />)
        },
        {
            id: 'storage-pools',
            title: 'Storage Pools',
            description: 'Manage multiple disks and storage',
            category: 'application' as const,
            icon: HardDrive,
            action: () => openWindow('Storage Pools', <StoragePools windowId={`storage-pools-${Date.now()}`} />)
        },
        {
            id: 'wifi',
            title: 'WiFi Management',
            description: 'Manage wireless networks',
            category: 'application' as const,
            icon: Wifi,
            action: () => openWindow('WiFi Management', <WiFiManagement windowId={`wifi-${Date.now()}`} />)
        },
        {
            id: 'home-assistant',
            title: 'Home Assistant',
            description: 'Control smart home devices',
            category: 'application' as const,
            icon: Home,
            action: () => openWindow('Home Assistant', <HomeAssistantIntegration windowId={`ha-${Date.now()}`} />)
        },
        {
            id: 'power-management',
            title: 'Power Management',
            description: 'System power controls and monitoring',
            category: 'application' as const,
            icon: PowerIcon,
            action: () => openWindow('Power Management', <PowerManagement windowId={`pm-${Date.now()}`} />)
        },
        {
            id: 'media-server',
            title: 'Media Server',
            description: 'Jellyfin/Emby media management',
            category: 'application' as const,
            icon: Disc,
            action: () => openWindow('Media Server', <MediaServer windowId={`media-${Date.now()}`} />)
        }
    ], [openWindow]);

    // Common system commands
    const systemCommands = useMemo(() => [
        {
            id: 'shutdown',
            title: 'Shutdown System',
            description: 'Power off the system',
            category: 'command' as const,
            icon: PowerIcon,
            action: async () => {
                try {
                    await fetch(`${settings.backend.apiUrl}/api/system/shutdown`, { method: 'POST' });
                } catch (error) {
                    console.error('Failed to shutdown:', error);
                }
            }
        },
        {
            id: 'reboot',
            title: 'Reboot System',
            description: 'Restart the system',
            category: 'command' as const,
            icon: Zap,
            action: async () => {
                try {
                    await fetch(`${settings.backend.apiUrl}/api/system/reboot`, { method: 'POST' });
                } catch (error) {
                    console.error('Failed to reboot:', error);
                }
            }
        },
        {
            id: 'lock-screen',
            title: 'Lock Screen',
            description: 'Lock the desktop session',
            category: 'command' as const,
            icon: Key,
            action: () => {
                // Implement screen locking logic
                console.log('Locking screen...');
            }
        },
        {
            id: 'toggle-theme',
            title: 'Toggle Theme',
            description: 'Switch between light and dark themes',
            category: 'command' as const,
            icon: Palette,
            action: () => {
                // Implement theme toggle logic
                console.log('Toggling theme...');
            }
        }
    ], [settings.backend.apiUrl]);

    // Common settings
    const commonSettings = useMemo(() => [
        {
            id: 'wallpaper',
            title: 'Wallpaper Settings',
            description: 'Change desktop background',
            category: 'setting' as const,
            icon: Palette,
            action: () => openWindow('Settings', <ComprehensiveSettings windowId={`settings-${Date.now()}`} initialTab="appearance" />)
        },
        {
            id: 'network',
            title: 'Network Settings',
            description: 'Configure network connections',
            category: 'setting' as const,
            icon: Globe,
            action: () => openWindow('Settings', <ComprehensiveSettings windowId={`settings-${Date.now()}`} initialTab="network" />)
        },
        {
            id: 'privacy',
            title: 'Privacy Settings',
            description: 'Manage privacy and security options',
            category: 'setting' as const,
            icon: Key,
            action: () => openWindow('Settings', <ComprehensiveSettings windowId={`settings-${Date.now()}`} initialTab="privacy" />)
        },
        {
            id: 'shortcuts',
            title: 'Keyboard Shortcuts',
            description: 'Configure keyboard shortcuts',
            category: 'setting' as const,
            icon: Command,
            action: () => openWindow('Settings', <ComprehensiveSettings windowId={`settings-${Date.now()}`} initialTab="shortcuts" />)
        }
    ], [openWindow]);

    // Help items
    const helpItems = useMemo(() => [
        {
            id: 'getting-started',
            title: 'Getting Started Guide',
            description: 'Learn the basics of Web Desktop',
            category: 'help' as const,
            icon: Book,
            action: () => {
                // Open help documentation
                window.open('/docs/getting-started', '_blank');
            }
        },
        {
            id: 'shortcuts-help',
            title: 'Keyboard Shortcuts',
            description: 'View all available keyboard shortcuts',
            category: 'help' as const,
            icon: Command,
            action: () => {
                window.open('/docs/shortcuts', '_blank');
            }
        },
        {
            id: 'api-docs',
            title: 'API Documentation',
            description: 'Developer API reference',
            category: 'help' as const,
            icon: HelpCircle,
            action: () => {
                window.open('/docs/api', '_blank');
            }
        }
    ], []);

    // Load search history and recent items from localStorage
    useEffect(() => {
        const savedHistory = localStorage.getItem('global-search-history');
        const savedRecent = localStorage.getItem('global-search-recent');

        if (savedHistory) {
            setSearchHistory(JSON.parse(savedHistory));
        }
        if (savedRecent) {
            setRecentItems(JSON.parse(savedRecent));
        }
    }, []);

    // Save search history to localStorage
    const saveSearchHistory = useCallback((newHistory: SearchHistoryItem[]) => {
        localStorage.setItem('global-search-history', JSON.stringify(newHistory));
        setSearchHistory(newHistory);
    }, []);

    // Save recent items to localStorage
    const saveRecentItems = useCallback((newItems: RecentItem[]) => {
        localStorage.setItem('global-search-recent', JSON.stringify(newItems));
        setRecentItems(newItems);
    }, []);

    // Add to recent items
    const addToRecent = useCallback((item: SearchResult) => {
        const recentItem: RecentItem = {
            id: item.id,
            title: item.title,
            category: item.category,
            timestamp: Date.now(),
            action: item.action
        };

        setRecentItems(prev => {
            const filtered = prev.filter(i => i.id !== item.id);
            const updated = [recentItem, ...filtered].slice(0, 10);
            saveRecentItems(updated);
            return updated;
        });
    }, [saveRecentItems]);

    // All searchable items
    const allSearchItems = useMemo(() => [
        ...builtInApps,
        ...systemCommands,
        ...commonSettings,
        ...helpItems,
        ...recentItems.map(item => ({
            id: `recent-${item.id}`,
            title: item.title,
            description: `Recent ${item.category}`,
            category: 'recent' as const,
            icon: Clock,
            action: item.action
        }))
    ], [builtInApps, systemCommands, commonSettings, helpItems, recentItems]);

    // Fuse.js configuration for fuzzy search
    const fuse = useMemo(() => new Fuse(allSearchItems, {
        keys: [
            { name: 'title', weight: 3 },
            { name: 'description', weight: 2 },
            { name: 'category', weight: 1 }
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 1
    }), [allSearchItems]);

    // Execute command from session storage
    const executeStoredCommand = useCallback(async () => {
        const storedCommand = sessionStorage.getItem('executeCommand');
        if (storedCommand) {
            try {
                const { command, confirmation } = JSON.parse(storedCommand);

                if (confirmation) {
                    const confirmed = window.confirm(`Are you sure you want to ${command}?`);
                    if (!confirmed) {
                        sessionStorage.removeItem('executeCommand');
                        return;
                    }
                }

                switch (command) {
                    case 'shutdown':
                        await fetch(`${settings.backend.apiUrl}/api/system/shutdown`, { method: 'POST' });
                        break;
                    case 'reboot':
                        await fetch(`${settings.backend.apiUrl}/api/system/reboot`, { method: 'POST' });
                        break;
                    case 'logout':
                        window.location.href = '/logout';
                        break;
                    case 'lock':
                        // Implement screen lock logic
                        document.body.style.pointerEvents = 'none';
                        setTimeout(() => {
                            document.body.style.pointerEvents = '';
                        }, 100);
                        break;
                    case 'suspend':
                        await fetch(`${settings.backend.apiUrl}/api/system/suspend`, { method: 'POST' });
                        break;
                    case 'screenshot':
                        // Implement screenshot logic
                        const canvas = document.createElement('canvas');
                        canvas.width = window.innerWidth;
                        canvas.height = window.innerHeight;
                        const ctx = canvas.getContext('2d');
                        // This would need html2canvas or similar library for real implementation
                        alert('Screenshot functionality requires additional libraries');
                        break;
                    case 'open-terminal':
                        openWindow('Terminal', <TerminalComponent windowId={`terminal-${Date.now()}`} />);
                        break;
                    case 'open-file-manager':
                        openWindow('Files', <FileManager windowId={`fm-${Date.now()}`} />);
                        break;
                    default:
                        console.warn('Unknown command:', command);
                }
            } catch (error) {
                console.error('Command execution failed:', error);
            } finally {
                sessionStorage.removeItem('executeCommand');
            }
        }
    }, [settings.backend.apiUrl, openWindow]);

    // Handle file selection from session storage
    const handleStoredFileSelection = useCallback(() => {
        const storedFile = sessionStorage.getItem('selectedFile');
        if (storedFile) {
            try {
                const file = JSON.parse(storedFile);
                openWindow('Files', <FileManager windowId={`fm-${Date.now()}`} initialPath={file.path} />);
            } catch (error) {
                console.error('Failed to open file:', error);
            } finally {
                sessionStorage.removeItem('selectedFile');
            }
        }
    }, [openWindow]);

    // Handle app launch from session storage
    const handleStoredAppLaunch = useCallback(() => {
        const storedApp = sessionStorage.getItem('launchApp');
        const storedWebApp = sessionStorage.getItem('launchWebApp');

        if (storedApp) {
            try {
                const app = JSON.parse(storedApp);
                // Launch native app logic here
                openWindow(app.name, (
                    <div className="p-4 text-center">
                        <div className="text-4xl mb-4">{app.icon || '📦'}</div>
                        <h2 className="text-xl font-bold mb-2">{app.name}</h2>
                        <p className="text-gray-400">{app.description}</p>
                    </div>
                ));
            } catch (error) {
                console.error('Failed to launch app:', error);
            } finally {
                sessionStorage.removeItem('launchApp');
            }
        }

        if (storedWebApp) {
            try {
                const app = JSON.parse(storedWebApp);
                openWindow(app.manifest.name, (
                    <iframe
                        src={`/apps/${app.manifest.id}/`}
                        className="w-full h-full border-0"
                        title={app.manifest.name}
                        sandbox="allow-same-origin allow-scripts allow-forms"
                    />
                ));
            } catch (error) {
                console.error('Failed to launch web app:', error);
            } finally {
                sessionStorage.removeItem('launchWebApp');
            }
        }
    }, [openWindow]);

    // Handle settings navigation from session storage
    const handleStoredSettingsNavigation = useCallback(() => {
        const storedSetting = sessionStorage.getItem('navigateToSetting');
        if (storedSetting) {
            try {
                const setting = JSON.parse(storedSetting);
                openWindow('Settings', <ComprehensiveSettings windowId={`settings-${Date.now()}`} initialTab={setting.category} initialSection={setting.section} />);
            } catch (error) {
                console.error('Failed to navigate to setting:', error);
            } finally {
                sessionStorage.removeItem('navigateToSetting');
            }
        }
    }, [openWindow]);

    // Check for stored actions on component mount and after search closes
    useEffect(() => {
        if (!isOpen) {
            executeStoredCommand();
            handleStoredFileSelection();
            handleStoredAppLaunch();
            handleStoredSettingsNavigation();
        }
    }, [isOpen, executeStoredCommand, handleStoredFileSelection, handleStoredAppLaunch, handleStoredSettingsNavigation]);

    // Search results with debouncing
    const searchResults = useMemo(() => {
        let results: SearchResult[] = [];

        if (!query.trim()) {
            // Show recent items when no query
            results = recentItems.slice(0, 5).map(item => ({
                id: `recent-${item.id}`,
                title: item.title,
                description: `Recent ${item.category}`,
                category: 'recent' as const,
                icon: Clock,
                action: item.action
            }));
        } else {
            const fuseResults = fuse.search(query);

            // Filter by active category if specified
            const filtered = activeCategory === 'all'
                ? fuseResults
                : fuseResults.filter(result => result.item.category === activeCategory);

            results = filtered.map(result => ({
                ...result.item,
                score: result.score
            }));
        }

        // Add external results if available
        if (externalResults.length > 0) {
            results = [...results, ...externalResults];
        }

        return results;
    }, [query, fuse, activeCategory, recentItems, externalResults]);

    // File search provider
    const searchFiles = useCallback(async (searchQuery: string): Promise<SearchResult[]> => {
        if (searchQuery.length < 2) return [];

        try {
            const response = await fetch(`${settings.backend.apiUrl}/api/fs/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
            if (!response.ok) return [];

            const files = await response.json();
            return files.map((file: any) => ({
                id: `file-${file.path}`,
                title: file.name,
                description: file.path,
                category: 'file' as const,
                icon: file.isDirectory ? Folder : FileText,
                action: () => {
                    openWindow('Files', <FileManager windowId={`fm-${Date.now()}`} initialPath={file.path} />);
                },
                metadata: { path: file.path, type: file.type, size: file.size }
            }));
        } catch (error) {
            console.error('File search failed:', error);
            return [];
        }
    }, [settings.backend.apiUrl, openWindow]);

    // Handle file search integration
    useEffect(() => {
        if (query.trim().length >= 2) {
            setIsLoading(true);
            searchFiles(query).then(fileResults => {
                // Note: In a real implementation, you'd want to merge these with existing results
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    }, [query, searchFiles]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+Space or Cmd+Space to open search
            if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(true);
            }

            // Escape to close
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
                setQuery('');
                setSelectedIndex(0);
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Handle search execution
    const handleExecute = useCallback(() => {
        const result = searchResults[selectedIndex];
        if (result) {
            // Add to search history
            const historyItem: SearchHistoryItem = {
                query,
                timestamp: Date.now()
            };

            setSearchHistory(prev => {
                const filtered = prev.filter(item => item.query !== query);
                const updated = [historyItem, ...filtered].slice(0, 20);
                saveSearchHistory(updated);
                return updated;
            });

            // Add to recent items
            addToRecent(result);

            // Execute action
            result.action();

            // Close search
            setIsOpen(false);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [searchResults, selectedIndex, query, saveSearchHistory, addToRecent]);

    // Handle input keyboard navigation
    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                handleExecute();
                break;
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < searchResults.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : searchResults.length - 1
                );
                break;
            case 'Tab':
                e.preventDefault();
                // Cycle through categories
                const categories: Array<typeof activeCategory> = ['all', 'application', 'file', 'setting', 'command', 'help', 'recent'];
                const currentIndex = categories.indexOf(activeCategory);
                const nextIndex = e.shiftKey
                    ? (currentIndex - 1 + categories.length) % categories.length
                    : (currentIndex + 1) % categories.length;
                setActiveCategory(categories[nextIndex]);
                break;
        }
    };

    // Get icon component
    const getIcon = (icon: SearchResult['icon']) => {
        if (typeof icon === 'string') {
            return <span className="text-xl">{icon}</span>;
        }
        const IconComponent = icon as React.ComponentType<{ size?: number }>;
        return <IconComponent size={20} />;
    };

    // Get category color
    const getCategoryColor = (category: SearchResult['category']) => {
        const colors = {
            application: 'text-blue-400',
            file: 'text-green-400',
            setting: 'text-purple-400',
            command: 'text-orange-400',
            help: 'text-cyan-400',
            recent: 'text-gray-400'
        };
        return colors[category];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm">
            <div className="w-[700px] max-h-[80vh] bg-gray-900 rounded-xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col">
                {/* Search Header */}
                <div className="h-20 border-b border-gray-700 flex items-center px-6 gap-4">
                    <Search className="text-blue-400" size={24} />
                    <div className="flex-1">
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full bg-transparent text-xl text-gray-100 placeholder-gray-500 outline-none"
                            placeholder="Search applications, files, settings, commands..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                        />
                        {/* Category Tabs */}
                        <div className="flex gap-2 mt-2">
                            {['all', 'application', 'file', 'setting', 'command', 'help', 'recent'].map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setActiveCategory(category as any)}
                                    className={clsx(
                                        "px-2 py-1 text-xs rounded capitalize transition-colors",
                                        activeCategory === category
                                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                            : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                                    )}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                    {isLoading && (
                        <div className="animate-spin">
                            <Activity size={20} className="text-gray-400" />
                        </div>
                    )}
                </div>

                {/* Search Results */}
                <div className="flex-1 overflow-y-auto">
                    {searchResults.length > 0 ? (
                        <div className="p-2">
                            {searchResults.map((result, index) => (
                                <button
                                    key={result.id}
                                    onClick={() => {
                                        setSelectedIndex(index);
                                        handleExecute();
                                    }}
                                    className={clsx(
                                        "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left group",
                                        index === selectedIndex
                                            ? "bg-gray-800 border border-blue-500/30"
                                            : "hover:bg-gray-800/50"
                                    )}
                                >
                                    <div className={clsx("flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800", getCategoryColor(result.category))}>
                                        {getIcon(result.icon)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={clsx(
                                                "font-medium truncate",
                                                index === selectedIndex ? "text-gray-100" : "text-gray-300"
                                            )}>
                                                {result.title}
                                            </span>
                                            <span className={clsx(
                                                "text-xs px-2 py-1 rounded-full bg-gray-700 capitalize",
                                                getCategoryColor(result.category)
                                            )}>
                                                {result.category}
                                            </span>
                                        </div>
                                        {result.description && (
                                            <div className="text-sm text-gray-500 truncate">
                                                {result.description}
                                            </div>
                                        )}
                                        {result.metadata?.path && (
                                            <div className="text-xs text-gray-600 truncate">
                                                {result.metadata.path}
                                            </div>
                                        )}
                                    </div>
                                    {result.score && (
                                        <div className="text-xs text-gray-600">
                                            {Math.round((1 - result.score) * 100)}%
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : query.trim() ? (
                        <div className="p-8 text-center text-gray-500">
                            <Search size={48} className="mx-auto mb-4 opacity-50" />
                            <div className="text-lg font-medium mb-2">No results found</div>
                            <div className="text-sm">
                                Try different keywords or browse by category
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-lg font-medium mb-4">Start typing to search</div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Command size={16} />
                                    <span>Ctrl+Space to open</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Package size={16} />
                                    <span>Applications</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Folder size={16} />
                                    <span>Files</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Settings size={16} />
                                    <span>Settings</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search Footer */}
                <div className="h-12 bg-gray-950 border-t border-gray-700 flex items-center justify-between px-6 text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                        <span>Search</span>
                        {searchHistory.length > 0 && (
                            <div className="flex gap-2">
                                {searchHistory.slice(0, 3).map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setQuery(item.query)}
                                        className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
                                    >
                                        {item.query}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-gray-800 rounded text-xs">↑↓</kbd>
                            <span>Navigate</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-gray-800 rounded text-xs">↵</kbd>
                            <span>Open</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-gray-800 rounded text-xs">Esc</kbd>
                            <span>Close</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};