import React, { useState, useEffect, useRef } from 'react';
import { Search, Terminal, Globe, Box } from 'lucide-react';
import { useWindowManager } from '../context/WindowManager';
import clsx from 'clsx';

export const AppLauncher = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const { openWindow } = useWindowManager();

    const apps: any[] = [];
    // const apps = [
    //     { name: 'Terminal', icon: Terminal, action: () => openWindow('Terminal', <div className="p-4 font-mono text-green">user@omarchy:~$</div>) },
    //     { name: 'Firefox', icon: Globe, action: () => openWindow('Firefox', <div className="h-full bg-white text-black p-4">Firefox Browser Content</div>) },
    //     { name: 'File Manager', icon: Box, action: () => openWindow('Files', <div className="p-4">/home/user</div>) },
    //     { name: 'VS Code', icon: Box, action: () => openWindow('VS Code', <div className="h-full bg-[#1e1e1e] text-white p-4">VS Code Editor</div>) },
    // ];

    const filteredApps = apps.filter(app => app.name.toLowerCase().includes(query.toLowerCase()));

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
        setQuery('');
        setSelectedIndex(0);
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
            <div className="w-[600px] bg-base rounded-xl border border-surface0 shadow-2xl overflow-hidden flex flex-col">
                <div className="h-16 border-b border-surface0 flex items-center px-4 gap-4">
                    <Search className="text-blue" size={24} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent text-xl text-text placeholder-overlay0 outline-none"
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
                    {filteredApps.map((app, index) => (
                        <button
                            key={app.name}
                            onClick={() => {
                                app.action();
                                setIsOpen(false);
                            }}
                            className={clsx(
                                "w-full flex items-center gap-4 p-3 rounded-lg transition-colors text-left",
                                index === selectedIndex ? "bg-surface0" : "hover:bg-surface0/50"
                            )}
                        >
                            <app.icon className={index === selectedIndex ? "text-blue" : "text-subtext0"} size={20} />
                            <span className={index === selectedIndex ? "text-text" : "text-subtext0"}>{app.name}</span>
                        </button>
                    ))}
                    {filteredApps.length === 0 && (
                        <div className="p-4 text-center text-overlay0">No apps found</div>
                    )}
                </div>

                <div className="h-8 bg-mantle border-t border-surface0 flex items-center justify-between px-4 text-xs text-overlay0">
                    <span>Select</span>
                    <div className="flex gap-2">
                        <span className="bg-surface0 px-1 rounded">↵</span>
                        <span>to open</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
