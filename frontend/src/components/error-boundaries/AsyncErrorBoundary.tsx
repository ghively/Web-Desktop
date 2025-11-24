import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react';

interface AsyncErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    loadingFallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    onRetry?: () => void;
    maxRetries?: number;
    customMessages?: {
        title?: string;
        description?: string;
        retry?: string;
        close?: string;
    };
}

/**
 * Error boundary specifically designed for async operations
 * with specialized fallback UI for network and async errors
 */
export const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({
    children,
    fallback,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loadingFallback,
    onError,
    onRetry,
    maxRetries = 5,
    customMessages
}) => {
    const defaultFallback = (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 p-8">
            <div className="max-w-md text-center">
                <div className="flex items-center justify-center mb-6">
                    <WifiOff size={48} className="text-red-400" />
                </div>

                <h2 className="text-xl font-semibold text-gray-100 mb-3">
                    Connection Error
                </h2>

                <p className="text-gray-400 mb-6">
                    Failed to load content. Please check your connection and try again.
                </p>

                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => onRetry?.()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                        <RefreshCw size={14} />
                        Retry Connection
                    </button>
                </div>
            </div>
        </div>
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const defaultLoadingFallback = (
        <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="flex items-center gap-3 text-gray-400">
                <Loader2 className="animate-spin" size={24} />
                <span>Loading...</span>
            </div>
        </div>
    );

    return (
        <ErrorBoundary
            fallback={fallback || defaultFallback}
            onError={(error, errorInfo) => {
                // Detect if it's a network-related error
                const isNetworkError =
                    error.message.includes('fetch') ||
                    error.message.includes('network') ||
                    error.message.includes('connection') ||
                    error.name === 'TypeError' && error.message.includes('Failed to fetch');

                if (isNetworkError) {
                    console.error('Network error detected:', error);
                }

                onError?.(error, errorInfo);
            }}
            onRecover={onRetry}
            showRetry={true}
            maxRetries={maxRetries}
            customMessages={{
                title: 'Async Operation Failed',
                description: 'An async operation encountered an error. This might be due to network issues or server problems.',
                retry: 'Retry Operation',
                ...customMessages
            }}
        >
            {children}
        </ErrorBoundary>
    );
};
