import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Terminal, Folder, FileText, Container, Play, Gauge, Tv, Globe, Share2, Search, Activity, Settings, Package, Database, Brain, Palette, Cpu, HardDrive, Wifi, Home, Zap, Disc, FileSearch } from 'lucide-react';
import { TerminalComponent } from './Terminal';
import { FileManager } from './FileManager';
import { Notes } from './Notes';
import { ContainerManager } from './ContainerManager';
import { ControlPanel } from './ControlPanel';
import { VNCClient } from './VNCClient';
import { NginxProxyManager } from './NginxProxyManager';
import { ShareManager } from './ShareManager';
import { SystemMonitor } from './SystemMonitor';
import { ComprehensiveSettings } from './ComprehensiveSettings';
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
import { useWindowManager, useAppLauncher, useSettings } from '../context/exports';
import clsx from 'clsx';
import Fuse from 'fuse.js';
// Removed react-use import, using manual debounce instead

interface App {
    id: string;
    name: string;
    icon: string | React.ComponentType<{ size?: number }>;
    description?: string;
    categories?: string[];
    action: () => void;
    isRunning?: boolean;
    isBuiltIn?: boolean;
}

export const AppLauncher = () => {
    const { isOpen, closeLauncher, toggleLauncher } = useAppLauncher();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [installedApps, setInstalledApps] = useState<App[]>([]);
    const [debouncedQuery, setDebouncedQuery] = useState('');
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

    // Generate unique window IDs without using refs during render
    const createWindowId = useCallback((prefix: string) => {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // Built-in apps
    const builtInApps: App[] = useMemo(() => [
        {
            id: 'terminal',
            name: 'Terminal',
            icon: Terminal,
            description: 'System terminal with shell access',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('terminal');
                return openWindow('Terminal', <TerminalComponent windowId={windowId} />);
            }
        },
        {
            id: 'files',
            name: 'Files',
            icon: Folder,
            description: 'Browse and manage files',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('fm');
                return openWindow('Files', <FileManager windowId={windowId} />);
            }
        },
        {
            id: 'notes',
            name: 'Notes',
            icon: FileText,
            description: 'Markdown notes editor',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('notes');
                return openWindow('Notes', <Notes windowId={windowId} />);
            }
        },
        {
            id: 'containers',
            name: 'Containers',
            icon: Container,
            description: 'Docker container management',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('containers');
                return openWindow('Containers', <ContainerManager windowId={windowId} />);
            }
        },
        {
            id: 'control-panel',
            name: 'Control Panel',
            icon: Gauge, // Using Gauge icon for Control Panel
            description: 'Manage system settings, users, and services',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('cp');
                return openWindow('Control Panel', <ControlPanel windowId={windowId} />);
            }
        },
        {
            id: 'settings',
            name: 'Settings',
            icon: Settings, // Use Settings icon for comprehensive settings
            description: 'Comprehensive system configuration and administration',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('settings');
                return openWindow('Settings', <ComprehensiveSettings windowId={windowId} />);
            }
        },
        {
            id: 'vnc-client',
            name: 'VNC Client',
            icon: Tv, // Using Tv icon for VNC Client
            description: 'Access remote graphical desktops via VNC',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('vnc');
                return openWindow('VNC Client', <VNCClient windowId={windowId} />);
            }
        },
        {
            id: 'nginx-proxy-manager',
            name: 'Nginx Proxy Manager',
            icon: Globe, // Using Globe icon for Nginx Proxy Manager
            description: 'Configure Nginx proxy hosts, SSL, and redirections',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('npm');
                return openWindow('Nginx Proxy Manager', <NginxProxyManager windowId={windowId} />);
            }
        },
        {
            id: 'share-manager',
            name: 'Share Manager',
            icon: Share2, // Using Share2 icon for Share Manager
            description: 'Manage NFS and Samba network shares',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('sm');
                return openWindow('Share Manager', <ShareManager windowId={windowId} />);
            }
        },
        {
            id: 'system-monitor',
            name: 'System Monitor',
            icon: Activity, // Using Activity icon for System Monitor
            description: 'Real-time CPU and memory usage monitoring',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('sysmon');
                return openWindow('System Monitor', <SystemMonitor windowId={windowId} />);
            }
        },
        {
            id: 'marketplace',
            name: 'Marketplace',
            icon: Package, // Using Package icon for Marketplace
            description: 'Browse and install applications',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('marketplace');
                return openWindow('Marketplace', <Marketplace windowId={windowId} />);
            }
        },
        {
            id: 'developer-tools',
            name: 'Developer Tools',
            icon: Settings, // Using Settings icon for Developer Tools
            description: 'App development and debugging tools',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('devtools');
                return openWindow('Developer Tools', <DeveloperTools windowId={windowId} />);
            }
        },
        {
            id: 'smart-storage',
            name: 'Smart Storage',
            icon: Database, // Using Database icon for Smart Storage
            description: 'AI-powered storage deduplication and management',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('storage');
                return openWindow('Smart Storage', <SmartStorage />);
            }
        },
        {
            id: 'ai-integration',
            name: 'AI Integration',
            icon: Brain, // Using Brain icon for AI Integration
            description: 'Smart file analysis, search, and automation',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('ai');
                return openWindow('AI Integration', <AIIntegration windowId={windowId} />);
            }
        },
        {
            id: 'theme-customizer',
            name: 'Theme Customizer',
            icon: Palette, // Using Palette icon for Theme Customizer
            description: 'Customize desktop themes and appearance',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('themes');
                return openWindow('Theme Customizer', <ThemeCustomizer windowId={windowId} />);
            }
        },
        {
            id: 'ai-model-manager',
            name: 'AI Model Manager',
            icon: Cpu, // Using Cpu icon for AI Model Manager
            description: 'Manage Ollama and OpenRouter models with task routing',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('ai-models');
                return openWindow('AI Model Manager', <AIModelManager windowId={windowId} />);
            }
        },
        {
            id: 'storage-pools',
            name: 'Storage Pools',
            icon: HardDrive, // Using HardDrive icon for Storage Pools
            description: 'Manage multiple disks and remote storage with unified access',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('storage-pools');
                return openWindow('Storage Pools', <StoragePools windowId={windowId} />);
            }
        },
        {
            id: 'wifi-management',
            name: 'WiFi Management',
            icon: Wifi,
            description: 'Manage WiFi networks, connections, and interfaces',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('wifi-management');
                return openWindow('WiFi Management', <WiFiManagement windowId={windowId} />);
            }
        },
        {
            id: 'home-assistant',
            name: 'Home Assistant',
            icon: Home,
            description: 'Control and monitor smart home devices and automations',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('home-assistant');
                return openWindow('Home Assistant', <HomeAssistantIntegration windowId={windowId} />);
            }
        },
        {
            id: 'power-management',
            name: 'Power Management',
            icon: Zap,
            description: 'System power controls, monitoring, and automation',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('power-management');
                return openWindow('Power Management', <PowerManagement windowId={windowId} />);
            }
        },
        {
            id: 'media-server',
            name: 'Media Server',
            icon: Disc,
            description: 'Jellyfin/Emby integration with transcoding and media management',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('media-server');
                return openWindow('Media Server', <MediaServer windowId={windowId} />);
            }
        },
        {
            id: 'file-metadata',
            name: 'File Metadata Manager',
            icon: FileSearch,
            description: 'Database-powered file search with codec detection and metadata extraction',
            isBuiltIn: true,
            action: () => {
                const windowId = createWindowId('file-metadata');
                return openWindow('File Metadata Manager', <FileMetadataManager windowId={windowId} />);
            }
        },
    ], [openWindow, createWindowId]);

    // Pre-resolve apps with icons to avoid dynamic resolution in render
    const allApps = useMemo(() => [...builtInApps, ...installedApps].map(app => ({
        ...app,
        isRunning: windows.some(w => w.title.toLowerCase() === app.name.toLowerCase()),
        Icon: typeof app.icon === 'function' ? app.icon : null,
        iconString: typeof app.icon === 'string' ? app.icon : '📦'
    })), [builtInApps, installedApps, windows]);

    // Create Fuse instance once and cache it
    const fuse = useMemo(() => new Fuse(allApps, {
        keys: [
            { name: 'name', weight: 2 },
            { name: 'description', weight: 1 },
            { name: 'categories', weight: 0.5 }
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 1
    }), [allApps]);

    // Use debounced query for filtering - only depends on debounced query
    const filteredApps = useMemo(() => {
        if (debouncedQuery.trim()) {
            try {
                return fuse.search(debouncedQuery).map(result => result.item);
            } catch (error) {
                console.warn('Fuse search error:', error);
                // Fallback to simple filtering if Fuse fails
                return allApps.filter(app =>
                    app.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
                    (app.description && app.description.toLowerCase().includes(debouncedQuery.toLowerCase()))
                );
            }
        }
        return allApps;
    }, [fuse, debouncedQuery, allApps]);

    // Separate running apps for display
    const runningApps = filteredApps.filter(app => app.isRunning);
    const notRunningApps = filteredApps.filter(app => !app.isRunning);

    // Fetch installed apps from both packages and marketplace
    useEffect(() => {
        const fetchInstalledApps = async () => {
            try {
                // Fetch both system packages and marketplace apps
                const [packagesResponse, marketplaceResponse] = await Promise.all([
                    fetch(`${settings.backend.apiUrl}/api/packages/installed`),
                    fetch(`${settings.backend.apiUrl}/api/marketplace/installed`).catch(() => null)
                ]);

                const apps: App[] = [];

                // Process system packages
                if (packagesResponse.ok) {
                    const packagesData = await packagesResponse.json();
                    const packageApps = packagesData.apps.map((app: { id?: string; name: string; description?: string; icon?: string; categories?: string[]; exec?: string }) => ({
                        id: app.id || app.name,
                        name: app.name,
                        icon: app.icon || '📦',
                        description: app.description || '',
                        categories: app.categories || [],
                        isBuiltIn: false,
                        isNative: true,
                        action: () => {
                            // Try to launch the native app via backend API
                            const launchNativeApp = async () => {
                                try {
                                    if (app.exec) {
                                        // Extract command from exec string (remove arguments for now)
                                        const command = app.exec.split(' ')[0];
                                        const response = await fetch(`${settings.backend.apiUrl}/api/apps/launch`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ command: command })
                                        });

                                        if (response.ok) {
                                            console.log(`Launched ${app.name}`);
                                        } else {
                                            console.warn(`Failed to launch ${app.name}`);
                                        }
                                    }
                                } catch (error) {
                                    console.error(`Error launching ${app.name}:`, error);
                                }
                            };

                            launchNativeApp();

                            // Show a placeholder for native apps
                            openWindow(app.name, (
                                <div className="p-4 text-center">
                                    <div className="text-4xl mb-4">{app.icon || '📦'}</div>
                                    <h2 className="text-xl font-bold mb-2">{app.name}</h2>
                                    <p className="text-gray-400">{app.description}</p>
                                    <p className="mt-4 text-sm text-gray-500">Launching native app...</p>
                                </div>
                            ));
                        }
                    }));
                    apps.push(...packageApps);
                }

                // Process marketplace apps
                if (marketplaceResponse && marketplaceResponse.ok) {
                    const marketplaceData = await marketplaceResponse.json();
                    const marketplaceApps = marketplaceData.apps.map((app: any) => ({
                        id: app.manifest.id,
                        name: app.manifest.name,
                        icon: app.manifest.icon || Package,
                        description: app.manifest.description,
                        categories: [app.manifest.category],
                        isBuiltIn: false,
                        isWebApp: true,
                        installPath: app.installPath,
                        action: () => {
                            // Launch web app from its install path
                            const launchWebApp = async () => {
                                try {
                                    // Construct the URL for the web app
                                    const appUrl = `/apps/${app.manifest.id}/`;

                                    openWindow(app.manifest.name, (
                                        <iframe
                                            src={appUrl}
                                            className="w-full h-full border-0"
                                            title={app.manifest.name}
                                            sandbox="allow-same-origin allow-scripts allow-forms"
                                        />
                                    ));

                                    console.log(`Launched web app ${app.manifest.name}`);
                                } catch (error) {
                                    console.error(`Error launching web app ${app.manifest.name}:`, error);
                                }
                            };

                            launchWebApp();
                        }
                    }));
                    apps.push(...marketplaceApps);
                }

                setInstalledApps(apps);
            } catch (error) {
                console.error('Failed to fetch installed apps:', error);
                // Set fallback apps if backend is not available
                setInstalledApps([]);
            }
        };

        fetchInstalledApps();
    }, [openWindow, settings.backend.apiUrl]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if Alt+Space is pressed and not in an input/textarea
            if ((e.altKey && e.code === 'Space') &&
                !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
                e.preventDefault();
                e.stopPropagation();
                toggleLauncher();
            }
            if (e.key === 'Escape') {
                closeLauncher();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [toggleLauncher, closeLauncher]);

    useEffect(() => {
        if (isOpen) {
            // Focus input when launcher opens
            if (inputRef.current) {
                inputRef.current.focus();
            }
        } else {
            // Reset state when launcher closes
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const handleExecute = () => {
        const appToExecute = filteredApps[selectedIndex];
        if (appToExecute) {
            console.log(`Executing app: ${appToExecute.name}`);
            appToExecute.action();
            closeLauncher();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-[600px] bg-gray-900 rounded-xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col">
                <div className="h-16 border-b border-gray-700 flex items-center px-4 gap-4">
                    <Search className="text-blue-400" size={24} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent text-xl text-gray-100 placeholder-gray-500 outline-none"
                        placeholder="Launch app..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleExecute();
                            } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setSelectedIndex(i => {
                                    const newIndex = i + 1;
                                    return newIndex >= filteredApps.length ? 0 : newIndex;
                                });
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setSelectedIndex(i => {
                                    const newIndex = i - 1;
                                    return newIndex < 0 ? filteredApps.length - 1 : newIndex;
                                });
                            }
                        }}
                    />
                </div>

                <div className="max-h-[400px] overflow-y-auto p-2">
                    {runningApps.length > 0 && (
                        <>
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Running Apps
                            </div>
                            {runningApps.map((app, index) => {
                                return (
                                    <button
                                        key={`running-${app.id}`}
                                        onClick={() => {
                                            app.action();
                                            closeLauncher();
                                        }}
                                        className={clsx(
                                            "w-full flex items-center gap-4 p-3 rounded-lg transition-colors text-left",
                                            index === selectedIndex ? "bg-gray-800" : "hover:bg-gray-800/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {app.Icon && <app.Icon size={20} />}
                                            {!app.Icon && <span className="text-xl">{app.iconString}</span>}
                                            <Play size={12} className="text-green-400" />
                                        </div>
                                        <div className="flex-1">
                                            <span className={clsx(
                                                "font-medium",
                                                index === selectedIndex ? "text-gray-100" : "text-gray-400"
                                            )}>
                                                {app.name}
                                            </span>
                                            {app.description && (
                                                <div className="text-xs text-gray-500">{app.description}</div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </>
                    )}

                    {notRunningApps.length > 0 && (
                        <>
                            {runningApps.length > 0 && (
                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">
                                    Available Apps
                                </div>
                            )}
                            {notRunningApps.map((app, index) => {
                                const globalIndex = runningApps.length + index;
                                return (
                                    <button
                                        key={`available-${app.id}`}
                                        onClick={() => {
                                            app.action();
                                            closeLauncher();
                                        }}
                                        className={clsx(
                                            "w-full flex items-center gap-4 p-3 rounded-lg transition-colors text-left",
                                            globalIndex === selectedIndex ? "bg-gray-800" : "hover:bg-gray-800/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {app.Icon && <app.Icon size={20} />}
                                            {!app.Icon && <span className="text-xl">{app.iconString}</span>}
                                        </div>
                                        <div className="flex-1">
                                            <span className={clsx(
                                                globalIndex === selectedIndex ? "text-gray-100" : "text-gray-400"
                                            )}>
                                                {app.name}
                                            </span>
                                            {app.description && (
                                                <div className="text-xs text-gray-500">{app.description}</div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </>
                    )}

                    {filteredApps.length === 0 && (
                        <div className="p-4 text-center text-gray-500">No apps found</div>
                    )}
                </div>

                <div className="h-8 bg-gray-950 border-t border-gray-700 flex items-center justify-between px-4 text-xs text-gray-500">
                    <span>Select</span>
                    <div className="flex gap-2">
                        <span className="bg-gray-800 px-1 rounded">↵</span>
                        <span>to open</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
