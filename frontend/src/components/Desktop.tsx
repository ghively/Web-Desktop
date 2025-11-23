
import { useState, useEffect } from 'react';
import { useWindowManager } from '../context/exports';
import { Window } from './Window';
import { Terminal, Folder, FileText, Container, Cpu, Gauge, Tv, Globe, Share2 } from 'lucide-react'; // Added Gauge, Tv, Globe, Share2 icons
import { TerminalComponent } from './Terminal';
import { FileManager } from './FileManager';
import { Notes } from './Notes';
import { ContainerManager } from './ContainerManager';
import { ControlPanel } from './ControlPanel'; // New import
import { VNCClient } from './VNCClient'; // New import
import { NginxProxyManager } from './NginxProxyManager'; // New import
import { ShareManager } from './ShareManager'; // New import
import { AppLauncher } from './AppLauncher';

const TopBar = () => {
    const { openWindow } = useWindowManager();

    return (
        <div className="fixed top-0 left-0 right-0 h-10 bg-gray-900/80 backdrop-blur-md border-b border-gray-700 flex items-center justify-between px-4 z-50">
            <div className="flex items-center gap-4">
                <span className="font-bold text-blue-400">Omarchy Web</span>
                <div className="h-4 w-px bg-gray-700" />
                <button
                    onClick={() => openWindow('Terminal', <TerminalComponent windowId={`terminal-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-colors"
                    title="System terminal"
                >
                    <Terminal size={16} />
                    <span>Terminal</span>
                </button>
                <button
                    onClick={() => openWindow('Files', <FileManager windowId={`fm-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-colors"
                    title="File system browser"
                >
                    <Folder size={16} />
                    <span>Files</span>
                </button>
                <button
                    onClick={() => openWindow('Notes', <Notes windowId={`notes-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-colors"
                    title="Markdown notes editor"
                >
                    <FileText size={16} />
                    <span>Notes</span>
                </button>
                <button
                    onClick={() => openWindow('Containers', <ContainerManager windowId={`containers-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-colors"
                    title="Docker container management"
                >
                    <Container size={16} />
                    <span>Containers</span>
                </button>
                <button
                    onClick={() => openWindow('Control Panel', <ControlPanel windowId={`cp-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-colors"
                    title="System Control Panel"
                >
                    <Gauge size={16} />
                    <span>Control Panel</span>
                </button>
                <button
                    onClick={() => openWindow('VNC Client', <VNCClient windowId={`vnc-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-colors"
                    title="VNC Remote Desktop Client"
                >
                    <Tv size={16} />
                    <span>VNC Client</span>
                </button>
                <button
                    onClick={() => openWindow('Nginx Proxy Manager', <NginxProxyManager windowId={`npm-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-colors"
                    title="Manage Nginx Proxy Hosts"
                >
                    <Globe size={16} />
                    <span>Nginx Proxy</span>
                </button>
                <button
                    onClick={() => openWindow('Share Manager', <ShareManager windowId={`sm-${Date.now()}`} />)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-colors"
                    title="Manage Network Shares (NFS/SMB)"
                >
                    <Share2 size={16} />
                    <span>Shares</span>
                </button>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                    <Cpu size={16} />
                    <span>CPU: 12%</span>
                </div>
                <span>{new Date().toLocaleTimeString()}</span>
            </div>
        </div>
    );
};

export const Desktop = () => {
    const { windows } = useWindowManager();
    const [error, setError] = useState<string | null>(null);

    // Global error handler
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            console.error('Global error:', event.error);
            setError(`Application error: ${event.error?.message || 'Unknown error'}`);
            
            // Clear error after 5 seconds
            setTimeout(() => setError(null), 5000);
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            console.error('Unhandled promise rejection:', event.reason);
            setError(`Application error: ${event.reason?.message || 'Promise rejected'}`);
            
            // Clear error after 5 seconds
            setTimeout(() => setError(null), 5000);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    return (
        <div className="h-screen w-screen bg-gray-900 overflow-hidden flex flex-col relative">
            {/* Wallpaper / Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black z-0" />

            {/* Global Error Display */}
            {error && (
                <div className="fixed top-4 right-4 z-50 max-w-md p-4 bg-red-900/90 backdrop-blur-sm border border-red-700 rounded-lg text-red-400 shadow-lg">
                    <div className="flex items-start gap-2">
                        <span className="text-red-400">⚠️</span>
                        <div>
                            <div className="font-medium">Application Error</div>
                            <div className="text-sm opacity-90">{error}</div>
                        </div>
                    </div>
                </div>
            )}

            <TopBar />
            <AppLauncher />

            <div className="absolute top-10 left-0 right-0 bottom-0 z-10">
                {windows.map(window => (
                    <Window key={window.id} window={window} />
                ))}
            </div>
        </div>
    );
};
