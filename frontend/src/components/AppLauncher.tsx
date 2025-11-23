import { useState, useEffect, useRef } from 'react';
import { Terminal, Folder, FileText, Container, Play, Gauge, Tv, Globe, Share2, Search } from 'lucide-react'; // Added missing icons
import { TerminalComponent } from './Terminal';
import { FileManager } from './FileManager';
import { Notes } from './Notes';
import { ContainerManager } from './ContainerManager';
import { ControlPanel } from './ControlPanel'; // New import
import { VNCClient } from './VNCClient'; // New import
import { NginxProxyManager } from './NginxProxyManager'; // New import
import { ShareManager } from './ShareManager'; // New import
import { useWindowManager } from '../context/exports';
import clsx from 'clsx';
import Fuse from 'fuse.js';

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
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [installedApps, setInstalledApps] = useState<App[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const { openWindow, windows } = useWindowManager();

    // Built-in apps
    const builtInApps: App[] = [
        {
            id: 'terminal',
            name: 'Terminal',
            icon: Terminal,
            description: 'System terminal with shell access',
            isBuiltIn: true,
            action: () => openWindow('Terminal', <TerminalComponent windowId={`terminal-${Date.now()}`} />)
        },
        {
            id: 'files',
            name: 'Files',
            icon: Folder,
            description: 'Browse and manage files',
            isBuiltIn: true,
            action: () => openWindow('Files', <FileManager windowId={`fm-${Date.now()}`} />)
        },
        {
            id: 'notes',
            name: 'Notes',
            icon: FileText,
            description: 'Markdown notes editor',
            isBuiltIn: true,
            action: () => openWindow('Notes', <Notes windowId={`notes-${Date.now()}`} />)
        },
        {
            id: 'containers',
            name: 'Containers',
            icon: Container,
            description: 'Docker container management',
            isBuiltIn: true,
            action: () => openWindow('Containers', <ContainerManager windowId={`containers-${Date.now()}`} />)
        },
        {
            id: 'control-panel',
            name: 'Control Panel',
            icon: Gauge, // Using Gauge icon for Control Panel
            description: 'Manage system settings, users, and services',
            isBuiltIn: true,
            action: () => openWindow('Control Panel', <ControlPanel windowId={`cp-${Date.now()}`} />)
        },
        {
            id: 'vnc-client',
            name: 'VNC Client',
            icon: Tv, // Using Tv icon for VNC Client
            description: 'Access remote graphical desktops via VNC',
            isBuiltIn: true,
            action: () => openWindow('VNC Client', <VNCClient windowId={`vnc-${Date.now()}`} />)
        },
        {
            id: 'nginx-proxy-manager',
            name: 'Nginx Proxy Manager',
            icon: Globe, // Using Globe icon for Nginx Proxy Manager
            description: 'Configure Nginx proxy hosts, SSL, and redirections',
            isBuiltIn: true,
            action: () => openWindow('Nginx Proxy Manager', <NginxProxyManager windowId={`npm-${Date.now()}`} />)
        },
        {
            id: 'share-manager',
            name: 'Share Manager',
            icon: Share2, // Using Share2 icon for Share Manager
            description: 'Manage NFS and Samba network shares',
            isBuiltIn: true,
            action: () => openWindow('Share Manager', <ShareManager windowId={`sm-${Date.now()}`} />)
        },
    ];

    // Combine built-in apps with installed apps, marking running apps
    const allApps = [...builtInApps, ...installedApps].map(app => ({
        ...app,
        isRunning: windows.some(w => w.title.toLowerCase() === app.name.toLowerCase())
    }));

    // Configure Fuse.js for fuzzy searching
    const fuse = new Fuse(allApps, {
        keys: [
            { name: 'name', weight: 2 },
            { name: 'description', weight: 1 },
            { name: 'categories', weight: 0.5 }
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 1
    });

    // Use fuzzy search if query exists, otherwise show all apps
    const filteredApps = query.trim()
        ? fuse.search(query).map(result => result.item)
        : allApps;

    // Separate running apps for display
    const runningApps = filteredApps.filter(app => app.isRunning);
    const notRunningApps = filteredApps.filter(app => !app.isRunning);

    // Fetch installed apps from backend
    useEffect(() => {
        const fetchInstalledApps = async () => {
            try {
                const response = await fetch('/api/packages/installed');
                const data = await response.json();

                const apps: App[] = data.apps.map((app: any) => ({
                    id: app.id || app.name,
                    name: app.name,
                    icon: app.icon || '📦',
                    description: app.description || '',
                    categories: app.categories || [],
                    isBuiltIn: false,
                    action: () => {
                        // For now, show a placeholder for system apps
                        openWindow(app.name, (
                            <div className="p-4 text-center">
                                <div className="text-4xl mb-4">{app.icon || '📦'}</div>
                                <h2 className="text-xl font-bold mb-2">{app.name}</h2>
                                <p className="text-gray-400">{app.description}</p>
                                <p className="mt-4 text-sm text-gray-500">Native app integration coming soon</p>
                            </div>
                        ));
                    }
                }));

                setInstalledApps(apps);
            } catch (error) {
                console.error('Failed to fetch installed apps:', error);
            }
        };

        fetchInstalledApps();
    }, [openWindow]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.altKey) && e.code === 'Space') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Reset state when launcher closes
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const handleExecute = () => {
        if (filteredApps[selectedIndex]) {
            filteredApps[selectedIndex].action();
            setIsOpen(false);
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
                            if (e.key === 'Enter') handleExecute();
                            if (e.key === 'ArrowDown') setSelectedIndex(i => Math.min(i + 1, filteredApps.length - 1));
                            if (e.key === 'ArrowUp') setSelectedIndex(i => Math.max(i - 1, 0));
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
                                const Icon = typeof app.icon === 'string' ? null : app.icon;
                                return (
                                    <button
                                        key={`running-${app.id}`}
                                        onClick={() => {
                                            app.action();
                                            setIsOpen(false);
                                        }}
                                        className={clsx(
                                            "w-full flex items-center gap-4 p-3 rounded-lg transition-colors text-left",
                                            index === selectedIndex ? "bg-gray-800" : "hover:bg-gray-800/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {Icon && <Icon size={20} />}
                                            {!Icon && typeof app.icon === 'string' && <span className="text-xl">{app.icon}</span>}
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
                                const Icon = typeof app.icon === 'string' ? null : app.icon;
                                return (
                                    <button
                                        key={`available-${app.id}`}
                                        onClick={() => {
                                            app.action();
                                            setIsOpen(false);
                                        }}
                                        className={clsx(
                                            "w-full flex items-center gap-4 p-3 rounded-lg transition-colors text-left",
                                            globalIndex === selectedIndex ? "bg-gray-800" : "hover:bg-gray-800/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {Icon && <Icon size={20} />}
                                            {!Icon && typeof app.icon === 'string' && <span className="text-xl">{app.icon}</span>}
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
