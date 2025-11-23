import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface DesktopErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Error boundary for the main desktop component
 * Provides more robust error handling for critical desktop functionality
 */
export const DesktopErrorBoundary: React.FC<DesktopErrorBoundaryProps> = ({
    children,
    fallback,
    onError
}) => {
    const defaultFallback = (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[9999]">
            <div className="max-w-md text-center p-8">
                <div className="flex items-center justify-center mb-6">
                    <AlertTriangle size={64} className="text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-gray-100 mb-4">
                    Desktop Error
                </h1>

                <p className="text-gray-400 mb-6">
                    A critical error occurred in the desktop environment. The application may need to be reloaded.
                </p>

                <div className="flex flex-col items-center gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw size={16} />
                        Reload Application
                    </button>

                    <button
                        onClick={() => {
                            // Clear all error logs and try to recover
                            localStorage.removeItem('error-logs');
                            sessionStorage.clear();
                            window.location.reload();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
                    >
                        <Home size={14} />
                        Fresh Start
                    </button>
                </div>

                {import.meta.env.DEV && (
                    <div className="mt-6 text-left">
                        <details className="text-gray-500 text-sm">
                            <summary className="cursor-pointer hover:text-gray-300">
                                Advanced Options
                            </summary>
                            <div className="mt-2 space-y-2">
                                <button
                                    onClick={() => {
                                        // Clear all localStorage
                                        localStorage.clear();
                                        window.location.reload();
                                    }}
                                    className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                                >
                                    Clear All Data & Reload
                                </button>
                                <button
                                    onClick={() => {
                                        // Open in new window without state
                                        window.open(window.location.href, '_blank');
                                    }}
                                    className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                                >
                                    Open New Session
                                </button>
                            </div>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <ErrorBoundary
            fallback={fallback || defaultFallback}
            onError={(error, errorInfo) => {
                console.group('🚨 Critical Desktop Error');
                console.error('Desktop component crashed:', error);
                console.error('Error info:', errorInfo);
                console.groupEnd();

                // Log to localStorage for debugging
                try {
                    const errorReport = {
                        timestamp: new Date().toISOString(),
                        error: {
                            name: error.name,
                            message: error.message,
                            stack: error.stack
                        },
                        errorInfo: {
                            componentStack: errorInfo.componentStack,
                            errorBoundary: 'DesktopErrorBoundary'
                        },
                        userAgent: navigator.userAgent,
                        url: window.location.href
                    };

                    const existingErrors = JSON.parse(localStorage.getItem('desktop-errors') || '[]');
                    const updatedErrors = [...existingErrors.slice(-4), errorReport]; // Keep last 5 errors
                    localStorage.setItem('desktop-errors', JSON.stringify(updatedErrors));
                } catch (logError) {
                    console.error('Failed to log desktop error:', logError);
                }

                onError?.(error, errorInfo);
            }}
            showRetry={false} // Disable retry for critical desktop errors
            showClose={false}
            maxRetries={0}
            customMessages={{
                title: 'Desktop Environment Error',
                description: 'A critical error occurred in the desktop environment.'
            }}
            className="fixed inset-0"
        >
            {children}
        </ErrorBoundary>
    );
};