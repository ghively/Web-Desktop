import React, { useEffect, useState } from 'react';
import { X, Keyboard, Plus, Trash2 } from 'lucide-react';
import { useWindowManager } from '../context/exports';
import clsx from 'clsx';

interface KeyboardShortcutsProps {
    onClose?: () => void;
}

interface Hotkey {
    keyCombo: string;
    action: string;
    description: string;
    category: 'window' | 'workspace' | 'navigation' | 'system';
    callback?: () => void;
}

const DEFAULT_HOTKEYS: Hotkey[] = [
    // Window Management
    { keyCombo: 'Alt+Tab', action: 'cycle-windows', description: 'Cycle through windows', category: 'window' },
    { keyCombo: 'Alt+Shift+Tab', action: 'cycle-windows-reverse', description: 'Cycle through windows (reverse)', category: 'window' },
    { keyCombo: 'Alt+Enter', action: 'toggle-maximize', description: 'Maximize/Restore active window', category: 'window' },
    { keyCombo: 'Alt+F4', action: 'close-window', description: 'Close active window', category: 'window' },
    { keyCombo: 'Alt+F10', action: 'minimize-window', description: 'Minimize active window', category: 'window' },
    { keyCombo: 'Super+Left', action: 'snap-left', description: 'Snap window to left', category: 'window' },
    { keyCombo: 'Super+Right', action: 'snap-right', description: 'Snap window to right', category: 'window' },
    { keyCombo: 'Super+Up', action: 'snap-top', description: 'Snap window to top', category: 'window' },
    { keyCombo: 'Super+Down', action: 'snap-bottom', description: 'Snap window to bottom', category: 'window' },

    // Workspace Management
    { keyCombo: 'Super+1', action: 'apply-dev-workspace', description: 'Apply Development Workspace', category: 'workspace' },
    { keyCombo: 'Super+2', action: 'apply-admin-workspace', description: 'Apply System Admin Workspace', category: 'workspace' },
    { keyCombo: 'Super+3', action: 'apply-media-workspace', description: 'Apply Media Workspace', category: 'workspace' },
    { keyCombo: 'Super+4', action: 'apply-ai-workspace', description: 'Apply AI Development Workspace', category: 'workspace' },
    { keyCombo: 'Super+5', action: 'apply-communication-workspace', description: 'Apply Communication Workspace', category: 'workspace' },
    { keyCombo: 'Super+S', action: 'save-workspace', description: 'Save current workspace', category: 'workspace' },
    { keyCombo: 'Super+Shift+S', action: 'load-workspace', description: 'Load saved workspace', category: 'workspace' },

    // Layout Management
    { keyCombo: 'Super+T', action: 'toggle-layout', description: 'Toggle between tiling/floating', category: 'navigation' },
    { keyCombo: 'Super+G', action: 'create-group', description: 'Create window group', category: 'window' },
    { keyCombo: 'Super+Shift+G', action: 'ungroup-window', description: 'Ungroup active window', category: 'window' },
    { keyCombo: 'Super+D', action: 'cascade-windows', description: 'Cascade all windows', category: 'window' },
    { keyCombo: 'Super+Grid', action: 'grid-layout', description: 'Apply grid layout', category: 'window' },

    // System
    { keyCombo: 'Super+/', action: 'show-shortcuts', description: 'Show keyboard shortcuts', category: 'system' },
    { keyCombo: 'Super+Space', action: 'open-launcher', description: 'Open application launcher', category: 'system' },
    { keyCombo: 'Super+Esc', action: 'show-desktop', description: 'Show desktop (minimize all)', category: 'system' },
    { keyCombo: 'Ctrl+Alt+Del', action: 'task-manager', description: 'Open task manager', category: 'system' }
];

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ onClose }) => {
    const [customHotkeys, setCustomHotkeys] = useState<Hotkey[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <Keyboard className="text-blue-400" size={24} />
                        <h2 className="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Search and Filter */}
                <div className="p-4 border-b border-gray-700 space-y-3">
                    <input
                        type="text"
                        placeholder="Search shortcuts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                        {['all', 'window', 'workspace', 'navigation', 'system'].map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={clsx(
                                    "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                                    selectedCategory === category
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                                )}
                            >
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Shortcuts List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                        {['window', 'workspace', 'navigation', 'system'].map((category) => {
                            const categoryHotkeys = DEFAULT_HOTKEYS.filter(hotkey => {
                                const matchesCategory = selectedCategory === 'all' || selectedCategory === category;
                                const matchesSearch = hotkey.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                      hotkey.keyCombo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                      hotkey.action.toLowerCase().includes(searchQuery.toLowerCase());
                                return matchesCategory && matchesSearch;
                            });

                            if (categoryHotkeys.length === 0) return null;

                            return (
                                <div key={category}>
                                    <h3 className="text-lg font-semibold text-white mb-3 capitalize">
                                        {category} Shortcuts
                                    </h3>
                                    <div className="space-y-2">
                                        {categoryHotkeys.map((hotkey, index) => (
                                            <div
                                                key={`${category}-${index}`}
                                                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-white font-medium">{hotkey.description}</p>
                                                    <p className="text-sm text-gray-400">{hotkey.action}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <kbd className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-gray-300 font-mono">
                                                        {hotkey.keyCombo}
                                                    </kbd>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Custom Hotkeys Section */}
                        {customHotkeys.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Custom Shortcuts</h3>
                                <div className="space-y-2">
                                    {customHotkeys.map((hotkey, index) => (
                                        <div
                                            key={`custom-${index}`}
                                            className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <p className="text-white font-medium">{hotkey.description}</p>
                                                <p className="text-sm text-gray-400">{hotkey.action}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <kbd className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-gray-300 font-mono">
                                                    {hotkey.keyCombo}
                                                </kbd>
                                                <button
                                                    onClick={() => {
                                                        setCustomHotkeys(prev => prev.filter((_, i) => i !== index));
                                                    }}
                                                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {DEFAULT_HOTKEYS.filter(hotkey => {
                        const matchesSearch = hotkey.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            hotkey.keyCombo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            hotkey.action.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesCategory = selectedCategory === 'all' || DEFAULT_HOTKEYS.includes(hotkey);
                        return matchesCategory && matchesSearch;
                    }).length === 0 && (
                        <div className="text-center py-8">
                            <Keyboard className="mx-auto text-gray-600 mb-3" size={48} />
                            <p className="text-gray-400">No shortcuts found</p>
                            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                            Press <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs">Super</kbd> + <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs">?</kbd> to show this help
                        </div>
                        <button
                            className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                        >
                            <Plus size={14} />
                            Add Custom Shortcut
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Hook for managing keyboard shortcuts
export const useKeyboardShortcuts = () => {
    const {
        activeWindowId,
        windows,
        focusWindow,
        maximizeWindow,
        closeWindow,
        minimizeWindow,
        snapWindow,
        toggleLayoutMode,
        createWindowGroup,
        applyWorkspaceTemplate,
        saveWorkspaceState,
        cascadeWindows,
        arrangeWindows
    } = useWindowManager();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const { altKey, shiftKey, ctrlKey, metaKey, key } = event;

            // Prevent default for our shortcuts
            if (altKey || metaKey || ctrlKey) {
                event.preventDefault();
            }

            // Build key combination string
            const parts = [];
            if (metaKey) parts.push('Super');
            if (altKey) parts.push('Alt');
            if (shiftKey) parts.push('Shift');
            if (ctrlKey) parts.push('Ctrl');
            if (key && !['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
                parts.push(key);
            }
            const keyCombo = parts.join('+');

            // Handle shortcuts
            switch (keyCombo) {
                // Window Management
                case 'Alt+Enter':
                    if (activeWindowId) {
                        maximizeWindow(activeWindowId);
                    }
                    break;
                case 'Alt+F4':
                    if (activeWindowId) {
                        closeWindow(activeWindowId);
                    }
                    break;
                case 'Alt+F10':
                    if (activeWindowId) {
                        minimizeWindow(activeWindowId);
                    }
                    break;
                case 'Super+Left':
                    if (activeWindowId) {
                        snapWindow(activeWindowId, 'left');
                    }
                    break;
                case 'Super+Right':
                    if (activeWindowId) {
                        snapWindow(activeWindowId, 'right');
                    }
                    break;
                case 'Super+Up':
                    if (activeWindowId) {
                        snapWindow(activeWindowId, 'top');
                    }
                    break;
                case 'Super+Down':
                    if (activeWindowId) {
                        snapWindow(activeWindowId, 'bottom');
                    }
                    break;

                // Workspace Templates
                case 'Super+1':
                    applyWorkspaceTemplate('development-workspace');
                    break;
                case 'Super+2':
                    applyWorkspaceTemplate('system-admin-workspace');
                    break;
                case 'Super+3':
                    applyWorkspaceTemplate('media-workspace');
                    break;
                case 'Super+4':
                    applyWorkspaceTemplate('ai-development-workspace');
                    break;
                case 'Super+5':
                    applyWorkspaceTemplate('communication-workspace');
                    break;
                case 'Super+S':
                    if (!shiftKey) {
                        saveWorkspaceState('Quick Save');
                    }
                    break;

                // Layout Management
                case 'Super+T':
                    toggleLayoutMode();
                    break;
                case 'Super+D':
                    cascadeWindows();
                    break;
                case 'Super+Grid':
                    arrangeWindows('grid');
                    break;

                // System
                case 'Super+/':
                case 'Super+?':
                    // This would trigger showing the keyboard shortcuts modal
                    console.log('Show keyboard shortcuts');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        activeWindowId,
        windows,
        focusWindow,
        maximizeWindow,
        closeWindow,
        minimizeWindow,
        snapWindow,
        toggleLayoutMode,
        createWindowGroup,
        applyWorkspaceTemplate,
        saveWorkspaceState,
        cascadeWindows,
        arrangeWindows
    ]);
};