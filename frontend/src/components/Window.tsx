import React from 'react';
import { Rnd } from 'react-rnd';
import { X, Minus, Square } from 'lucide-react';
import { useWindowManager, WindowState } from '../context/WindowManager';
import clsx from 'clsx';

interface WindowProps {
    window: WindowState;
}

export const Window: React.FC<WindowProps> = ({ window }) => {
    const { focusWindow, closeWindow, minimizeWindow, maximizeWindow, activeWindowId } = useWindowManager();
    const isActive = activeWindowId === window.id;

    if (window.isMinimized) return null;

    return (
        <Rnd
            default={{
                x: window.x || 0,
                y: window.y || 0,
                width: window.width || 800,
                height: window.height || 600,
            }}
            minWidth={300}
            minHeight={200}
            bounds="parent"
            onDragStart={() => focusWindow(window.id)}
            onResizeStart={() => focusWindow(window.id)}
            style={{ zIndex: window.zIndex }}
            className={clsx(
                "flex flex-col rounded-lg overflow-hidden border transition-shadow duration-200",
                isActive ? "border-blue shadow-lg shadow-blue/20" : "border-surface0 shadow-md",
                "bg-base/90 backdrop-blur-md"
            )}
            disableDragging={window.isMaximized}
            size={window.isMaximized ? { width: '100%', height: '100%' } : undefined}
            position={window.isMaximized ? { x: 0, y: 0 } : undefined}
        >
            {/* Window Header */}
            <div className="h-10 bg-mantle/50 flex items-center justify-between px-4 select-none cursor-move handle">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-subtext0">{window.title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => minimizeWindow(window.id)} className="p-1 hover:bg-surface1 rounded text-subtext0 hover:text-text">
                        <Minus size={14} />
                    </button>
                    <button onClick={() => maximizeWindow(window.id)} className="p-1 hover:bg-surface1 rounded text-subtext0 hover:text-text">
                        <Square size={12} />
                    </button>
                    <button onClick={() => closeWindow(window.id)} className="p-1 hover:bg-red/20 rounded text-subtext0 hover:text-red">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Window Content */}
            <div className="flex-1 overflow-hidden relative">
                {window.component}
            </div>
        </Rnd>
    );
};
