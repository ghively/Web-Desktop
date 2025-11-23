import { Rnd } from 'react-rnd';
import { X, Minus, Square } from 'lucide-react';
import { useWindowManager } from '../context/exports';
import { type WindowState } from '../context/types';
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
                isActive ? "border-blue-400 shadow-lg shadow-blue-400/20" : "border-gray-700 shadow-md",
                "bg-gray-900/90 backdrop-blur-md"
            )}
            disableDragging={window.isMaximized}
            size={window.isMaximized ? { width: '100%', height: 'calc(100% - 40px)' } : undefined}
            position={window.isMaximized ? { x: 0, y: 40 } : undefined}
        >
            {/* Window Header */}
            <div className="h-10 bg-gray-950/50 flex items-center justify-between px-4 select-none cursor-move handle">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-400">{window.title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => minimizeWindow(window.id)} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-100">
                        <Minus size={14} />
                    </button>
                    <button onClick={() => maximizeWindow(window.id)} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-100">
                        <Square size={12} />
                    </button>
                    <button onClick={() => closeWindow(window.id)} className="p-1 hover:bg-red-900/20 rounded text-gray-400 hover:text-red-400">
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
