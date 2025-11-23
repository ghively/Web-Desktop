import { Rnd } from 'react-rnd';
import { X, Minus, Square, Monitor, Layers } from 'lucide-react';
import { useWindowManager, useSettings, useVirtualDesktopManager, type WindowState } from '../context/exports';
import { ErrorBoundary } from './ErrorBoundary';
import clsx from 'clsx';

interface WindowProps {
    window: WindowState;
}

export const Window: React.FC<WindowProps> = ({ window }) => {
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
        updateWindowSize
    } = useWindowManager();
    const { settings } = useSettings();
    const { currentDesktopId, desktops } = useVirtualDesktopManager();
    const isActive = activeWindowId === window.id;

    // Check if window should be displayed on current desktop
    const shouldShowWindow = window.isSticky ||
                           window.desktopId === currentDesktopId ||
                           (!window.desktopId && currentDesktopId === desktops[0]?.id);

    if (window.isMinimized || !shouldShowWindow) return null;

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
                            <Layers size={10} className="text-blue-400" title="Sticky window (visible on all desktops)" />
                        )}
                        <span className="text-sm font-medium text-gray-400">{window.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Window snapping controls */}
                        {layoutMode === 'floating' && (
                            <div className="flex items-center gap-1 mr-2">
                                <button
                                    onClick={(e) => { e.stopPropagation();
                                        if (window.snapData?.isSnapped) {
                                            unsnapWindow(window.id);
                                        } else {
                                            snapWindow(window.id, 'left');
                                        }
                                    }}
                                    className={`p-1 rounded text-xs ${
                                        window.snapData?.snapPosition === 'left'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                                    }`}
                                    title="Snap to left"
                                >
                                    ◀
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); snapWindow(window.id, 'maximized'); }}
                                    className={`p-1 rounded text-xs ${
                                        window.snapData?.snapPosition === 'maximized'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                                    }`}
                                    title="Maximize"
                                >
                                    ▬
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation();
                                        if (window.snapData?.isSnapped) {
                                            unsnapWindow(window.id);
                                        } else {
                                            snapWindow(window.id, 'right');
                                        }
                                    }}
                                    className={`p-1 rounded text-xs ${
                                        window.snapData?.snapPosition === 'right'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                                    }`}
                                    title="Snap to right"
                                >
                                    ▶
                                </button>
                            </div>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); minimizeWindow(window.id); }}
                            className="p-1 hover:bg-gray-800/80 rounded text-gray-400 hover:text-gray-100 transition-all duration-200 hover:scale-110 focus-enhanced"
                            aria-label="Minimize window"
                            title="Minimize (Ctrl+M)"
                        >
                            <Minus size={14} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); maximizeWindow(window.id); }}
                            className="p-1 hover:bg-gray-800/80 rounded text-gray-400 hover:text-gray-100 transition-all duration-200 hover:scale-110 focus-enhanced"
                            aria-label={window.isMaximized ? "Restore window" : "Maximize window"}
                            title={window.isMaximized ? "Restore (Alt+Enter)" : "Maximize (Alt+Enter)"}
                        >
                            {window.isMaximized ? <Layers size={12} /> : <Square size={12} />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); closeWindow(window.id); }}
                            className="p-1 hover:bg-red-900/30 rounded text-gray-400 hover:text-red-400 transition-all duration-200 hover:scale-110 focus-enhanced"
                            aria-label="Close window"
                            title="Close (Alt+F4)"
                        >
                            <X size={14} />
                        </button>
                    </div>
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
                            <Layers size={10} className="text-blue-400" title="Sticky window (visible on all desktops)" />
                        )}
                        <span className="text-sm font-medium text-gray-400">{window.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Window snapping controls */}
                        {layoutMode === 'floating' && (
                            <div className="flex items-center gap-1 mr-2">
                                <button
                                    onClick={(e) => { e.stopPropagation();
                                        if (window.snapData?.isSnapped) {
                                            unsnapWindow(window.id);
                                        } else {
                                            snapWindow(window.id, 'left');
                                        }
                                    }}
                                    className={`p-1 rounded text-xs ${
                                        window.snapData?.snapPosition === 'left'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                                    }`}
                                    title="Snap to left"
                                >
                                    ◀
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); snapWindow(window.id, 'maximized'); }}
                                    className={`p-1 rounded text-xs ${
                                        window.snapData?.snapPosition === 'maximized'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                                    }`}
                                    title="Maximize"
                                >
                                    ▬
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation();
                                        if (window.snapData?.isSnapped) {
                                            unsnapWindow(window.id);
                                        } else {
                                            snapWindow(window.id, 'right');
                                        }
                                    }}
                                    className={`p-1 rounded text-xs ${
                                        window.snapData?.snapPosition === 'right'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                                    }`}
                                    title="Snap to right"
                                >
                                    ▶
                                </button>
                            </div>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); minimizeWindow(window.id); }}
                            className="p-1 hover:bg-gray-800/80 rounded text-gray-400 hover:text-gray-100 transition-all duration-200 hover:scale-110 focus-enhanced"
                            aria-label="Minimize window"
                            title="Minimize (Ctrl+M)"
                        >
                            <Minus size={14} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); maximizeWindow(window.id); }}
                            className="p-1 hover:bg-gray-800/80 rounded text-gray-400 hover:text-gray-100 transition-all duration-200 hover:scale-110 focus-enhanced"
                            aria-label={window.isMaximized ? "Restore window" : "Maximize window"}
                            title={window.isMaximized ? "Restore (Alt+Enter)" : "Maximize (Alt+Enter)"}
                        >
                            {window.isMaximized ? <Layers size={12} /> : <Square size={12} />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); closeWindow(window.id); }}
                            className="p-1 hover:bg-red-900/30 rounded text-gray-400 hover:text-red-400 transition-all duration-200 hover:scale-110 focus-enhanced"
                            aria-label="Close window"
                            title="Close (Alt+F4)"
                        >
                            <X size={14} />
                        </button>
                    </div>
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
                        <Layers size={10} className="text-blue-400" title="Sticky window (visible on all desktops)" />
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
                            title="Snap to left"
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
                            title="Snap to right"
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
