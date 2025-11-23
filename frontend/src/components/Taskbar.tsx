import { useWindowManager } from '../context/exports';
import { Minus, Play } from 'lucide-react';

export const Taskbar = () => {
    const { windows, focusWindow, activeWindowId } = useWindowManager();

    // Show all running windows like legacy version
    const runningWindows = windows;

    // Only show taskbar if there are running windows
    if (runningWindows.length === 0) return null;

    const getIconForApp = (title: string) => {
        switch (title) {
            case 'Terminal': return '📟';
            case 'Files': return '📂';
            case 'File Manager': return '📂';
            case 'Notes': return '📝';
            case 'Text Editor': return '💻';
            case 'Containers': return '🐳';
            case 'Control Panel': return '⚙️';
            default: return '📦';
        }
    };

    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
            <span className="text-xs text-gray-400 mr-2">Apps:</span>
            {runningWindows.map(window => (
                <button
                    key={window.id}
                    onClick={() => focusWindow(window.id)}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 relative
                        ${activeWindowId === window.id
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                            : window.isMinimized
                            ? 'bg-gray-800/50 text-gray-500 hover:bg-gray-700/50 hover:text-gray-200 border border-transparent'
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 border border-transparent'
                        }
                    `}
                    title={window.isMinimized ? `Restore ${window.title}` : `Focus ${window.title}`}
                >
                    <span className="text-sm">{getIconForApp(window.title)}</span>
                    <span>{window.title}</span>
                    {activeWindowId === window.id && !window.isMinimized && (
                        <Minus size={10} className="ml-1" />
                    )}
                    {window.isMinimized && (
                        <Play size={10} className="ml-1 text-green-400" />
                    )}
                </button>
            ))}
        </div>
    );
};