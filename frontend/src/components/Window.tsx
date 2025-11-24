import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import {
    X, Minus, Square, Monitor, Layers,
    ChevronDown, ChevronLeft, ChevronRight,
    Maximize2, Grid3x3, Group, Ungroup,
    StickyNote, Zap, Settings, Copy
} from 'lucide-react';
import {
    useWindowManager,
    useSettings,
    useVirtualDesktopManager,
    type WindowState,
    type WindowGroup,
    type WindowTab,
    type ApplicationCategory
} from '../context/exports';
import { ErrorBoundary } from './ErrorBoundary';
import clsx from 'clsx';

interface WindowProps {
    window: WindowState;
    windowGroup?: WindowGroup;
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

export const Window: React.FC<WindowProps> = ({ window, windowGroup }) => {
    const {
        focusWindow,
        closeWindow,
        minimizeWindow,
        maximizeWindow,
        activeWindowId,
        layoutMode,
        snapWindow,
        unsnapWindow,
        updateWindowPosition,
        updateWindowSize,
        createWindowGroup,
        addWindowToGroup,
        removeWindowFromGroup,
        setActiveTabInGroup,
        moveTabInGroup,
        getWindowGroup,
        getApplicationCategory,
        setApplicationCategory,
        getSnapZones,
        saveWorkspaceState
    } = useWindowManager();
    const { settings } = useSettings();
    const { currentDesktopId, desktops } = useVirtualDesktopManager();
    const [showTabMenu, setShowTabMenu] = useState(false);
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [draggedTab, setDraggedTab] = useState<number | null>(null);

    const isActive = activeWindowId === window.id;
    const isTabbed = window.tabData?.isTabbed;
    const group = windowGroup || (window.tabData?.groupId ? getWindowGroup(window.tabData.groupId) : undefined);

    // Check if window should be displayed on current desktop
    const shouldShowWindow = window.isSticky ||
                           window.desktopId === currentDesktopId ||
                           (!window.desktopId && currentDesktopId === desktops[0]?.id);

    // Don't render if window is minimized or in a group (rendered by group component)
    if (window.isMinimized || !shouldShowWindow || isTabbed) return null;

    // Event handlers
    const handleTabClick = (tabIndex: number) => {
        if (group) {
            setActiveTabInGroup(group.id, tabIndex);
        }
    };

    const handleTabDragStart = (tabIndex: number) => {
        setDraggedTab(tabIndex);
    };

    const handleTabDrop = (dropIndex: number) => {
        if (draggedTab !== null && group && draggedTab !== dropIndex) {
            moveTabInGroup(group.id, draggedTab, dropIndex);
        }
        setDraggedTab(null);
    };

    const handleCreateGroup = () => {
        // Group with similar windows (same category)
        const similarWindows = [window.id]; // In real implementation, find similar windows
        createWindowGroup(similarWindows, `${window.applicationCategory} Tools`, 'tabbed');
    };

    const handleUngroup = () => {
        if (group) {
            removeWindowFromGroup(group.id, window.id);
        }
    };

    const handleCategoryChange = (category: ApplicationCategory) => {
        setApplicationCategory(window.id, category);
        setShowCategoryMenu(false);
    };

    const handleSaveWorkspace = () => {
        saveWorkspaceState(`${window.title} Workspace`, currentDesktopId || undefined);
    };

    // Render tabs for grouped windows
    const renderTabs = () => {
        if (!group || group.windows.length <= 1) return null;

        return (
            <div className="flex border-b border-gray-700 bg-gray-900/50">
                {group.windows.map((tab, index) => (
                    <div
                        key={tab.id}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-2 cursor-pointer border-r border-gray-700 hover:bg-gray-800/50 transition-colors",
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
                    </div>
                ))}
            </div>
        );
    };

    // Render enhanced window controls
    const renderWindowControls = () => {
        return (
            <div className="flex items-center gap-2">
                {/* Smart snapping controls */}
                {layoutMode !== 'tiling' && (
                    <div className="flex items-center gap-1 mr-2">
                        <button
                            onClick={(e) => { e.stopPropagation();
                                if (window.snapData?.isSnapped) {
                                    unsnapWindow(window.id);
                                } else {
                                    snapWindow(window.id, 'left');
                                }
                            }}
                            className={`p-1 rounded text-xs transition-colors ${
                                window.snapData?.snapPosition === 'left'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                            }`}
                            title="Snap Left"
                        >
                            <ChevronLeft size={12} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation();
                                if (window.isMaximized || window.snapData?.snapPosition === 'maximized') {
                                    maximizeWindow(window.id);
                                } else {
                                    snapWindow(window.id, 'maximized');
                                }
                            }}
                            className={`p-1 rounded text-xs transition-colors ${
                                window.isMaximized || window.snapData?.snapPosition === 'maximized'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                            }`}
                            title="Maximize"
                        >
                            <Maximize2 size={12} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation();
                                if (window.snapData?.isSnapped) {
                                    unsnapWindow(window.id);
                                } else {
                                    snapWindow(window.id, 'right');
                                }
                            }}
                            className={`p-1 rounded text-xs transition-colors ${
                                window.snapData?.snapPosition === 'right'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                            }`}
                            title="Snap Right"
                        >
                            <ChevronRight size={12} />
                        </button>
                    </div>
                )}

                {/* Grouping controls */}
                <div className="flex items-center gap-1">
                    {group ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleUngroup(); }}
                            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-100 transition-colors"
                            title="Ungroup Window"
                        >
                            <Ungroup size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleCreateGroup(); }}
                            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-100 transition-colors"
                            title="Create Group"
                        >
                            <Group size={14} />
                        </button>
                    )}
                </div>

                {/* Category selector */}
                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowCategoryMenu(!showCategoryMenu); }}
                        className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-100 transition-colors"
                        title="Application Category"
                    >
                        <StickyNote size={14} />
                    </button>
                    {showCategoryMenu && (
                        <div className="absolute top-8 right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 min-w-40">
                            {Object.keys(getApplicationIcon(null)).map((category) => (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryChange(category as ApplicationCategory)}
                                    className={clsx(
                                        "flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-800 text-sm",
                                        window.applicationCategory === category ? "bg-gray-800 text-blue-400" : "text-gray-300"
                                    )}
                                >
                                    <span>{getApplicationIcon(category as ApplicationCategory)}</span>
                                    <span className="capitalize">{category.replace('-', ' ')}</span>
                                </button>
                            ))}
                        </div>
                    )}
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
                    onClick={(e) => { e.stopPropagation(); minimizeWindow(window.id); }}
                    className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-100 transition-colors"
                    aria-label="Minimize window"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); maximizeWindow(window.id); }}
                    className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-100 transition-colors"
                    aria-label={window.isMaximized ? "Restore window" : "Maximize window"}
                    title={window.isMaximized ? "Restore (Alt+Enter)" : "Maximize (Alt+Enter)"}
                >
                    {window.isMaximized ? <Layers size={12} /> : <Square size={12} />}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); closeWindow(window.id); }}
                    className="p-1 hover:bg-red-900/20 rounded text-gray-400 hover:text-red-400 transition-colors"
                    aria-label="Close window"
                >
                    <X size={14} />
                </button>
            </div>
        );
    };

    // Handle maximized state (same for both modes)
    if (window.isMaximized) {
        return (
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 40,
                    width: '100%',
                    height: 'calc(100% - 40px)',
                    zIndex: window.zIndex,
                    backgroundColor: `rgba(17, 24, 39, ${settings.windowOpacity})`
                }}
                onMouseDown={() => focusWindow(window.id)}
                className={clsx(
                    "flex flex-col rounded-none overflow-hidden border transition-shadow duration-200",
                    isActive ? "border-blue-400 shadow-lg shadow-blue-400/20" : "border-gray-700 shadow-md",
                    "backdrop-blur-md"
                )}
            >
                {/* Window Header */}
                <div
                    className="h-10 bg-gray-950/50 flex items-center justify-between px-4 select-none"
                    onMouseDown={() => focusWindow(window.id)}
                >
                    <div className="flex items-center gap-2">
                        {/* Desktop indicator */}
                        {window.desktopId && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Monitor size={10} />
                                <span>
                                    {desktops.find(d => d.id === window.desktopId)?.name?.replace('Desktop', '') || '1'}
                                </span>
                            </div>
                        )}
                        {window.isSticky && (
                            <Layers size={10} className="text-blue-400" />
                        )}
                        <span className="text-sm">
                            {getApplicationIcon(window.applicationCategory, window.icon)}
                        </span>
                        <span className="text-sm font-medium text-gray-400">{window.title}</span>
                        {window.applicationCategory && (
                            <span className="text-xs text-gray-500 capitalize px-2 py-1 bg-gray-800 rounded">
                                {window.applicationCategory.replace('-', ' ')}
                            </span>
                        )}
                    </div>
                    {renderWindowControls()}
                </div>

                {/* Window Content */}
                <div
                    className="flex-1 overflow-hidden relative"
                    onMouseDown={() => focusWindow(window.id)}
                >
                    <ErrorBoundary
                        onError={(error, errorInfo) => {
                            console.error(`Error in window "${window.title}" (ID: ${window.id}):`, error, errorInfo);
                        }}
                        onRecover={() => {
                            console.log(`Recovered window "${window.title}" (ID: ${window.id}) from error`);
                        }}
                        showRetry={true}
                        showErrorDetails={import.meta.env.DEV}
                        customMessages={{
                            title: `Window Error: ${window.title}`,
                            description: `The "${window.title}" window encountered an error and couldn't render properly.`,
                            retry: 'Restart Window'
                        }}
                        className="h-full"
                    >
                        {window.component}
                    </ErrorBoundary>
                </div>
            </div>
        );
    }

    // Tiling mode - fixed positioning like legacy
    if (layoutMode === 'tiling') {
        return (
            <div
                style={{
                    position: 'absolute',
                    left: window.x || 0,
                    top: window.y || 0,
                    width: window.width || 800,
                    height: window.height || 600,
                    zIndex: window.zIndex,
                    backgroundColor: `rgba(17, 24, 39, ${settings.windowOpacity})`
                }}
                onMouseDown={() => focusWindow(window.id)}
                className={clsx(
                    "flex flex-col overflow-hidden border transition-shadow duration-200",
                    "rounded-none", // No rounded corners in tiling mode
                    isActive ? "border-blue-400 shadow-lg shadow-blue-400/20" : "border-gray-700 shadow-md",
                    "backdrop-blur-md"
                )}
            >
                {/* Window Header */}
                <div
                    className="h-10 bg-gray-950/50 flex items-center justify-between px-4 select-none"
                    onMouseDown={() => focusWindow(window.id)}
                >
                    <div className="flex items-center gap-2">
                        {/* Desktop indicator */}
                        {window.desktopId && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Monitor size={10} />
                                <span>
                                    {desktops.find(d => d.id === window.desktopId)?.name?.replace('Desktop', '') || '1'}
                                </span>
                            </div>
                        )}
                        {window.isSticky && (
                            <Layers size={10} className="text-blue-400" />
                        )}
                        <span className="text-sm">
                            {getApplicationIcon(window.applicationCategory, window.icon)}
                        </span>
                        <span className="text-sm font-medium text-gray-400">{window.title}</span>
                        {window.applicationCategory && (
                            <span className="text-xs text-gray-500 capitalize px-2 py-1 bg-gray-800 rounded">
                                {window.applicationCategory.replace('-', ' ')}
                            </span>
                        )}
                    </div>
                    {renderWindowControls()}
                </div>

                {/* Window Content */}
                <div
                    className="flex-1 overflow-hidden relative"
                    onMouseDown={() => focusWindow(window.id)}
                >
                    <ErrorBoundary
                        onError={(error, errorInfo) => {
                            console.error(`Error in window "${window.title}" (ID: ${window.id}):`, error, errorInfo);
                        }}
                        onRecover={() => {
                            console.log(`Recovered window "${window.title}" (ID: ${window.id}) from error`);
                        }}
                        showRetry={true}
                        showErrorDetails={import.meta.env.DEV}
                        customMessages={{
                            title: `Window Error: ${window.title}`,
                            description: `The "${window.title}" window encountered an error and couldn't render properly.`,
                            retry: 'Restart Window'
                        }}
                        className="h-full"
                    >
                        {window.component}
                    </ErrorBoundary>
                </div>
            </div>
        );
    }

    // Floating mode - use controlled Rnd for proper state management
    return (
        <Rnd
            position={{
                x: window.snapData?.isSnapped ? (window.x || 0) : (window.x || 0),
                y: window.snapData?.isSnapped ? (window.y || 0) : (window.y || 0)
            }}
            size={{
                width: window.snapData?.isSnapped ? (window.width || 800) : (window.width || 800),
                height: window.snapData?.isSnapped ? (window.height || 600) : (window.height || 600)
            }}
            minWidth={300}
            minHeight={200}
            bounds="parent"
            onDragStart={() => focusWindow(window.id)}
            onDragStop={(e, d) => {
                updateWindowPosition(window.id, d.x, d.y);
            }}
            onResizeStart={() => focusWindow(window.id)}
            onResizeStop={(e, direction, ref, delta, position) => {
                updateWindowSize(window.id, ref.offsetWidth, ref.offsetHeight);
                updateWindowPosition(window.id, position.x, position.y);
            }}
            disableDragging={window.snapData?.isSnapped || window.isMaximized}
            style={{
                zIndex: window.zIndex,
                backgroundColor: `rgba(17, 24, 39, ${settings.windowOpacity})`
            }}
            className={clsx(
                "flex flex-col rounded-lg overflow-hidden border transition-all duration-200",
                isActive ? "border-blue-400 shadow-lg shadow-blue-400/20" : "border-gray-700 shadow-md",
                "backdrop-blur-md"
            )}
        >
            {/* Window Header */}
            <div className="h-10 bg-gray-950/50 flex items-center justify-between px-4 select-none cursor-move handle">
                <div className="flex items-center gap-2">
                    {/* Desktop indicator */}
                    {window.desktopId && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Monitor size={10} />
                            <span>
                                {desktops.find(d => d.id === window.desktopId)?.name?.replace('Desktop', '') || '1'}
                            </span>
                        </div>
                    )}
                    {window.isSticky && (
                        <Layers size={10} className="text-blue-400" />
                    )}
                    <span className="text-sm font-medium text-gray-400">{window.title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Window snapping controls */}
                    <div className="flex items-center gap-1 mr-2">
                        <button
                            onClick={(e) => { e.stopPropagation();
                                if (window.snapData?.isSnapped) {
                                    unsnapWindow(window.id);
                                } else {
                                    snapWindow(window.id, 'left');
                                }
                            }}
                            className={`p-1 rounded text-xs transition-colors ${
                                window.snapData?.snapPosition === 'left'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                            }`}
                           
                        >
                            ◀
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation();
                                if (window.isMaximized || window.snapData?.snapPosition === 'maximized') {
                                    maximizeWindow(window.id);
                                } else {
                                    snapWindow(window.id, 'maximized');
                                }
                            }}
                            className={`p-1 rounded text-xs transition-colors ${
                                window.isMaximized || window.snapData?.snapPosition === 'maximized'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                            }`}
                            title={window.isMaximized ? "Restore" : "Maximize"}
                        >
                            {window.isMaximized ? '❐' : '▬'}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation();
                                if (window.snapData?.isSnapped) {
                                    unsnapWindow(window.id);
                                } else {
                                    snapWindow(window.id, 'right');
                                }
                            }}
                            className={`p-1 rounded text-xs transition-colors ${
                                window.snapData?.snapPosition === 'right'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                            }`}
                           
                        >
                            ▶
                        </button>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); minimizeWindow(window.id); }}
                        className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-100 transition-colors"
                    >
                        <Minus size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); maximizeWindow(window.id); }}
                        className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-100 transition-colors"
                        title={window.isMaximized ? "Restore" : "Maximize"}
                    >
                        {window.isMaximized ? <Layers size={12} /> : <Square size={12} />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); closeWindow(window.id); }}
                        className="p-1 hover:bg-red-900/20 rounded text-gray-400 hover:text-red-400 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Window Content */}
            <div className="flex-1 overflow-hidden relative">
                <ErrorBoundary
                    onError={(error, errorInfo) => {
                        console.error(`Error in window "${window.title}" (ID: ${window.id}):`, error, errorInfo);
                    }}
                    onRecover={() => {
                        console.log(`Recovered window "${window.title}" (ID: ${window.id}) from error`);
                    }}
                    showRetry={true}
                    showErrorDetails={import.meta.env.DEV}
                    customMessages={{
                        title: `Window Error: ${window.title}`,
                        description: `The "${window.title}" window encountered an error and couldn't render properly.`,
                        retry: 'Restart Window'
                    }}
                    className="h-full"
                >
                    {window.component}
                </ErrorBoundary>
            </div>
        </Rnd>
    );
};
