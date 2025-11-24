import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { X, Minus, Square, Layers, Group, Copy, ChevronDown } from 'lucide-react';
import {
    useWindowManager,
    useSettings,
    useVirtualDesktopManager,
    type WindowGroup,
    type WindowTab,
    type ApplicationCategory
} from '../context/exports';
import { ErrorBoundary } from './ErrorBoundary';
import { Window } from './Window';
import clsx from 'clsx';

interface WindowGroupProps {
    group: WindowGroup;
}

// Helper function to get application icon
const getApplicationIcon = (category?: ApplicationCategory, customIcon?: string) => {
    if (customIcon) return customIcon;

    const icons: Record<ApplicationCategory, string> = {
        development: '💻',
        terminal: '⌨️',
        browser: '🌐',
        media: '🎬',
        system: '⚙️',
        communication: '💬',
        ai: '🤖',
        'file-manager': '📁',
        notes: '📝',
        monitoring: '📊',
        general: '📋'
    };

    return icons[category || 'general'] || '📋';
};

export const WindowGroup: React.FC<WindowGroupProps> = ({ group }) => {
    const {
        focusWindow,
        minimizeWindow,
        maximizeWindow,
        activeWindowId,
        layoutMode,
        updateWindowPosition,
        updateWindowSize,
        setActiveTabInGroup,
        removeWindowFromGroup,
        deleteWindowGroup,
        saveWorkspaceState
    } = useWindowManager();
    const { settings } = useSettings();
    const { currentDesktopId, desktops } = useVirtualDesktopManager();
    const [draggedTab, setDraggedTab] = useState<number | null>(null);

    // Check if group should be displayed on current desktop
    const shouldShowGroup = group.isSticky ||
                           group.desktopId === currentDesktopId ||
                           (!group.desktopId && currentDesktopId === desktops[0]?.id);

    if (group.isMinimized || !shouldShowGroup) return null;

    const isActive = group.windows.some(w => w.id === activeWindowId);
    const activeTab = group.windows.find(w => w.isActive);

    // Event handlers
    const handleTabClick = (tabIndex: number) => {
        setActiveTabInGroup(group.id, tabIndex);
    };

    const handleTabDragStart = (tabIndex: number) => {
        setDraggedTab(tabIndex);
    };

    const handleTabDrop = (dropIndex: number) => {
        if (draggedTab !== null && draggedTab !== dropIndex) {
            // Move tab logic would need to be implemented in WindowManager
            console.log(`Move tab from ${draggedTab} to ${dropIndex}`);
        }
        setDraggedTab(null);
    };

    const handleTabClose = (tabIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const tab = group.windows[tabIndex];
        if (tab) {
            removeWindowFromGroup(group.id, tab.id);
            // Note: The actual window close logic should be handled by the parent component
        }
    };

    const handleGroupClose = () => {
        // Close all windows in the group
        group.windows.forEach(tab => {
            // Note: The actual window close logic should be handled by the parent component
            console.log('Close window:', tab.id);
        });
        deleteWindowGroup(group.id);
    };

    const handleGroupMinimize = () => {
        minimizeWindow(group.windows[0].id); // Minimize the entire group
    };

    const handleGroupMaximize = () => {
        maximizeWindow(group.windows[0].id); // Maximize the entire group
    };

    const handleSaveWorkspace = () => {
        saveWorkspaceState(`${group.name} Workspace`, currentDesktopId || undefined);
    };

    // Render tabs
    const renderTabs = () => {
        if (group.windows.length <= 1) return null;

        return (
            <div className="flex border-b border-gray-700 bg-gray-900/50 overflow-x-auto">
                {group.windows.map((tab, index) => (
                    <div
                        key={tab.id}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-2 cursor-pointer border-r border-gray-700 hover:bg-gray-800/50 transition-colors flex-shrink-0",
                            tab.isActive ? "bg-gray-800 text-white" : "text-gray-400",
                            draggedTab === index ? "opacity-50" : ""
                        )}
                        onClick={() => handleTabClick(index)}
                        draggable
                        onDragStart={() => handleTabDragStart(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleTabDrop(index)}
                    >
                        <span className="text-sm">
                            {getApplicationIcon(tab.applicationCategory, tab.icon)}
                        </span>
                        <span className="text-xs font-medium truncate max-w-24">
                            {tab.title}
                        </span>
                        {tab.isActive && <div className="w-1 h-1 bg-blue-400 rounded-full" />}
                        <button
                            onClick={(e) => handleTabClose(index, e)}
                            className="ml-1 p-1 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400"
                        >
                            <X size={10} />
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    // Render window controls for group
    const renderGroupControls = () => {
        return (
            <div className="flex items-center gap-2">
                {/* Group indicator */}
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                    <Group size={12} />
                    <span>{group.windows.length}</span>
                </div>

                {/* Save workspace button */}
                <button
                    onClick={(e) => { e.stopPropagation(); handleSaveWorkspace(); }}
                    className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-100 transition-colors"
                    title="Save Workspace"
                >
                    <Copy size={14} />
                </button>

                {/* Standard window controls */}
                <button
                    onClick={(e) => { e.stopPropagation(); handleGroupMinimize(); }}
                    className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-100 transition-colors"
                    aria-label="Minimize group"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleGroupMaximize(); }}
                    className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-100 transition-colors"
                    aria-label={group.isMaximized ? "Restore group" : "Maximize group"}
                    title={group.isMaximized ? "Restore Group" : "Maximize Group"}
                >
                    {group.isMaximized ? <Layers size={12} /> : <Square size={12} />}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleGroupClose(); }}
                    className="p-1 hover:bg-red-900/20 rounded text-gray-400 hover:text-red-400 transition-colors"
                    aria-label="Close group"
                >
                    <X size={14} />
                </button>
            </div>
        );
    };

    // Handle maximized state
    if (group.isMaximized) {
        return (
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 40,
                    width: '100%',
                    height: 'calc(100% - 40px)',
                    zIndex: group.zIndex,
                    backgroundColor: `rgba(17, 24, 39, ${settings.windowOpacity})`
                }}
                onMouseDown={() => activeTab && focusWindow(activeTab.id)}
                className={clsx(
                    "flex flex-col rounded-none overflow-hidden border transition-shadow duration-200",
                    isActive ? "border-blue-400 shadow-lg shadow-blue-400/20" : "border-gray-700 shadow-md",
                    "backdrop-blur-md"
                )}
            >
                {/* Group Header */}
                <div
                    className="h-10 bg-gray-950/50 flex items-center justify-between px-4 select-none"
                    onMouseDown={() => activeTab && focusWindow(activeTab.id)}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-sm">📋</span>
                        <span className="text-sm font-medium text-gray-400">{group.name}</span>
                        <span className="text-xs text-gray-500">({group.windows.length} windows)</span>
                    </div>
                    {renderGroupControls()}
                </div>

                {/* Tabs */}
                {renderTabs()}

                {/* Window Content */}
                <div className="flex-1 overflow-hidden relative">
                    {activeTab && (
                        <ErrorBoundary
                            onError={(error, errorInfo) => {
                                console.error(`Error in group "${group.name}", tab "${activeTab.title}":`, error, errorInfo);
                            }}
                            onRecover={() => {
                                console.log(`Recovered group "${group.name}", tab "${activeTab.title}" from error`);
                            }}
                            showRetry={true}
                            showErrorDetails={import.meta.env.DEV}
                            customMessages={{
                                title: `Group Error: ${group.name}`,
                                description: `The "${activeTab.title}" tab encountered an error and couldn't render properly.`,
                                retry: 'Restart Tab'
                            }}
                            className="h-full"
                        >
                            {activeTab.component}
                        </ErrorBoundary>
                    )}
                </div>
            </div>
        );
    }

    // Tiling mode - fixed positioning
    if (layoutMode === 'tiling') {
        return (
            <div
                style={{
                    position: 'absolute',
                    left: group.bounds.x,
                    top: group.bounds.y,
                    width: group.bounds.width,
                    height: group.bounds.height,
                    zIndex: group.zIndex,
                    backgroundColor: `rgba(17, 24, 39, ${settings.windowOpacity})`
                }}
                onMouseDown={() => activeTab && focusWindow(activeTab.id)}
                className={clsx(
                    "flex flex-col overflow-hidden border transition-shadow duration-200",
                    "rounded-none",
                    isActive ? "border-blue-400 shadow-lg shadow-blue-400/20" : "border-gray-700 shadow-md",
                    "backdrop-blur-md"
                )}
            >
                {/* Group Header */}
                <div
                    className="h-10 bg-gray-950/50 flex items-center justify-between px-4 select-none"
                    onMouseDown={() => activeTab && focusWindow(activeTab.id)}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-sm">📋</span>
                        <span className="text-sm font-medium text-gray-400">{group.name}</span>
                        <span className="text-xs text-gray-500">({group.windows.length} windows)</span>
                    </div>
                    {renderGroupControls()}
                </div>

                {/* Tabs */}
                {renderTabs()}

                {/* Window Content */}
                <div className="flex-1 overflow-hidden relative">
                    {activeTab && (
                        <ErrorBoundary
                            onError={(error, errorInfo) => {
                                console.error(`Error in group "${group.name}", tab "${activeTab.title}":`, error, errorInfo);
                            }}
                            onRecover={() => {
                                console.log(`Recovered group "${group.name}", tab "${activeTab.title}" from error`);
                            }}
                            showRetry={true}
                            showErrorDetails={import.meta.env.DEV}
                            customMessages={{
                                title: `Group Error: ${group.name}`,
                                description: `The "${activeTab.title}" tab encountered an error and couldn't render properly.`,
                                retry: 'Restart Tab'
                            }}
                            className="h-full"
                        >
                            {activeTab.component}
                        </ErrorBoundary>
                    )}
                </div>
            </div>
        );
    }

    // Floating mode - use Rnd
    return (
        <Rnd
            position={{
                x: group.bounds.x,
                y: group.bounds.y
            }}
            size={{
                width: group.bounds.width,
                height: group.bounds.height
            }}
            minWidth={300}
            minHeight={200}
            bounds="parent"
            onDragStart={() => activeTab && focusWindow(activeTab.id)}
            onDragStop={(e, d) => {
                updateWindowPosition(group.windows[0].id, d.x, d.y);
            }}
            onResizeStart={() => activeTab && focusWindow(activeTab.id)}
            onResizeStop={(e, direction, ref, delta, position) => {
                updateWindowSize(group.windows[0].id, ref.offsetWidth, ref.offsetHeight);
                updateWindowPosition(group.windows[0].id, position.x, position.y);
            }}
            disableDragging={group.isMaximized}
            style={{
                zIndex: group.zIndex,
                backgroundColor: `rgba(17, 24, 39, ${settings.windowOpacity})`
            }}
            className={clsx(
                "flex flex-col rounded-lg overflow-hidden border transition-all duration-200",
                isActive ? "border-blue-400 shadow-lg shadow-blue-400/20" : "border-gray-700 shadow-md",
                "backdrop-blur-md"
            )}
        >
            {/* Group Header */}
            <div className="h-10 bg-gray-950/50 flex items-center justify-between px-4 select-none cursor-move handle">
                <div className="flex items-center gap-2">
                    <span className="text-sm">📋</span>
                    <span className="text-sm font-medium text-gray-400">{group.name}</span>
                    <span className="text-xs text-gray-500">({group.windows.length} windows)</span>
                </div>
                {renderGroupControls()}
            </div>

            {/* Tabs */}
            {renderTabs()}

            {/* Window Content */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab && (
                    <ErrorBoundary
                        onError={(error, errorInfo) => {
                            console.error(`Error in group "${group.name}", tab "${activeTab.title}":`, error, errorInfo);
                        }}
                        onRecover={() => {
                            console.log(`Recovered group "${group.name}", tab "${activeTab.title}" from error`);
                        }}
                        showRetry={true}
                        showErrorDetails={import.meta.env.DEV}
                        customMessages={{
                            title: `Group Error: ${group.name}`,
                            description: `The "${activeTab.title}" tab encountered an error and couldn't render properly.`,
                            retry: 'Restart Tab'
                        }}
                        className="h-full"
                    >
                        {activeTab.component}
                    </ErrorBoundary>
                )}
            </div>
        </Rnd>
    );
};