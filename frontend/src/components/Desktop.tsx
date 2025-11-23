import React from 'react';
import { useWindowManager } from '../context/WindowManager';
import { Window } from './Window';
import { AppLauncher } from './AppLauncher';
import { Terminal, Folder, Cpu } from 'lucide-react';

const TopBar = () => {
    const { openWindow } = useWindowManager();

    return (
        <div className="h-10 bg-crust/80 backdrop-blur-md border-b border-surface0 flex items-center justify-between px-4 z-50 relative">
            <div className="flex items-center gap-4">
                <span className="font-bold text-blue">Omarchy Web</span>
                <div className="h-4 w-px bg-surface0" />
                <button
                    onClick={() => openWindow('Terminal', <div className="p-4 text-green font-mono">user@omarchy:~$ _</div>)}
                    className="flex items-center gap-2 text-sm text-subtext0 hover:text-text transition-colors"
                >
                    <Terminal size={16} />
                    <span>Terminal</span>
                </button>
                <button
                    onClick={() => openWindow('Files', <div className="p-4">File Explorer Content</div>)}
                    className="flex items-center gap-2 text-sm text-subtext0 hover:text-text transition-colors"
                >
                    <Folder size={16} />
                    <span>Files</span>
                </button>
            </div>

            <div className="flex items-center gap-4 text-sm text-subtext0">
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

    return (
        <div className="h-screen w-screen bg-base overflow-hidden flex flex-col relative">
            {/* Wallpaper / Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-base via-mantle to-crust z-0" />

            <TopBar />
            <AppLauncher />

            <div className="flex-1 relative z-10">
                {windows.map(window => (
                    <Window key={window.id} window={window} />
                ))}
            </div>
        </div>
    );
};
