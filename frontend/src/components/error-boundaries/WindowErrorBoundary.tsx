import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';

interface WindowErrorBoundaryProps {
    children: React.ReactNode;
    windowTitle: string;
    windowId: string;
    onClose?: () => void;
    onRestart?: () => void;
    fallback?: React.ReactNode;
}

/**
 * Error boundary specifically designed for windows
 * Provides options to close or restart the window
 */
export const WindowErrorBoundary: React.FC<WindowErrorBoundaryProps> = ({
    children,
    windowTitle,
    windowId,
    onClose,
    onRestart,
    fallback
}) => {
    const defaultFallback = (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 p-8">
            <div className="max-w-md w-full text-center">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center justify-center flex-1">
                        <AlertTriangle size={48} className="text-red-400" />
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="ml-4 p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            title="Close Window"
                        >
                            <X size={20} className="text-gray-400" />
                        </button>
                    )}
                </div>

                <h2 className="text-xl font-semibold text-gray-100 mb-3">
                    {windowTitle} Error
                </h2>

                <p className="text-gray-400 mb-6">
                    The "{windowTitle}" window encountered an error and couldn't render properly.
                </p>

                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => onRestart?.()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                        <RefreshCw size={14} />
                        Restart Window
                    </button>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                        >
                            <X size={14} />
                            Close Window
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <ErrorBoundary
            fallback={fallback || defaultFallback}
            onError={(error, errorInfo) => {
                console.error(`Window Error in "${windowTitle}" (ID: ${windowId}):`, error, errorInfo);
            }}
            onRecover={() => {
                console.log(`Recovered window "${windowTitle}" (ID: ${windowId}) from error`);
                onRestart?.();
            }}
            showRetry={true}
            showErrorDetails={import.meta.env.DEV}
            customMessages={{
                title: `${windowTitle} Error`,
                description: `The "${windowTitle}" window encountered an error and couldn't render properly.`,
                retry: 'Restart Window'
            }}
            maxRetries={3}
        >
            {children}
        </ErrorBoundary>
    );
};