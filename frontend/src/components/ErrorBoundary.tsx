import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X, Bug, MessageSquare } from 'lucide-react';

interface ErrorLog {
    timestamp: string;
    error: Error;
    errorInfo: React.ErrorInfo;
    userAgent: string;
    url: string;
}

export interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    onRecover?: () => void;
    onClose?: () => void;
    showRetry?: boolean;
    showClose?: boolean;
    showErrorDetails?: boolean;
    maxRetries?: number;
    customMessages?: {
        title?: string;
        description?: string;
        retry?: string;
        close?: string;
    };
    enableErrorLogging?: boolean;
    className?: string;
}
export type ErrorBoundaryProps = Props;

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    retryCount: number;
    errorLogs: ErrorLog[];
    showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    private static MAX_ERROR_LOGS = 10;
    private static DEFAULT_MAX_RETRIES = 3;

    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: 0,
            errorLogs: [],
            showDetails: false
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        const errorLog: ErrorLog = {
            timestamp: new Date().toISOString(),
            error,
            errorInfo,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        console.group('🚨 ErrorBoundary caught an error');
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Error Context:', errorLog);
        console.groupEnd();

        // Update state with new error info
        this.setState(prevState => ({
            error,
            errorInfo,
            errorLogs: [...prevState.errorLogs.slice(-ErrorBoundary.MAX_ERROR_LOGS + 1), errorLog]
        }));

        // Log to external service if enabled
        if (this.props.enableErrorLogging !== false) {
            this.logError(errorLog);
        }

        // Call custom error handler if provided
        if (this.props.onError) {
            try {
                this.props.onError(error, errorInfo);
            } catch (handlerError) {
                console.error('Error in custom error handler:', handlerError);
            }
        }
    }

    private logError = (errorLog: ErrorLog) => {
        try {
            // Store errors in localStorage for debugging
            const existingLogs = JSON.parse(localStorage.getItem('error-logs') || '[]');
            const updatedLogs = [...existingLogs.slice(-ErrorBoundary.MAX_ERROR_LOGS + 1), errorLog];
            localStorage.setItem('error-logs', JSON.stringify(updatedLogs));

            // In production, you might send this to an error reporting service
            if (import.meta.env.PROD) {
                // Example: Send to error reporting service
                // Sentry.captureException(errorLog.error, { extra: errorLog });
            }
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }
    };

    handleRetry = () => {
        const maxRetries = this.props.maxRetries ?? ErrorBoundary.DEFAULT_MAX_RETRIES;

        if (this.state.retryCount >= maxRetries) {
            console.warn(`Max retries (${maxRetries}) exceeded for this error boundary`);
            return;
        }

        this.setState(prevState => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: prevState.retryCount + 1,
            showDetails: false
        }));

        // Call recovery callback if provided
        if (this.props.onRecover) {
            try {
                this.props.onRecover();
            } catch (recoverError) {
                console.error('Error in recovery handler:', recoverError);
            }
        }
    };

    handleClose = () => {
        // Call close callback if provided
        if (this.props.onClose) {
            try {
                this.props.onClose();
            } catch (closeError) {
                console.error('Error in close handler:', closeError);
            }
        }
    };

    toggleErrorDetails = () => {
        this.setState(prevState => ({
            showDetails: !prevState.showDetails
        }));
    };

    copyErrorToClipboard = async () => {
        if (!this.state.error || !this.state.errorInfo) return;

        const errorText = `Error: ${this.state.error.toString()}

Component Stack:
${this.state.errorInfo.componentStack}

Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Retry Count: ${this.state.retryCount}`;

        try {
            await navigator.clipboard.writeText(errorText);
            // You could show a toast notification here
            console.log('Error details copied to clipboard');
        } catch (copyError) {
            console.error('Failed to copy error details:', copyError);
        }
    };

    clearErrorLogs = () => {
        this.setState({ errorLogs: [] });
        localStorage.removeItem('error-logs');
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const {
                showRetry = true,
                showClose = false,
                showErrorDetails = import.meta.env.DEV,
                customMessages = {},
                className = ''
            } = this.props;

            const hasExceededRetries = this.state.retryCount >= (this.props.maxRetries ?? ErrorBoundary.DEFAULT_MAX_RETRIES);

            return (
                <div className={`flex flex-col items-center justify-center h-full bg-gray-900 p-8 ${className}`}>
                    <div className="max-w-lg w-full text-center">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center justify-center flex-1">
                                <AlertTriangle size={48} className="text-red-400" />
                            </div>
                            {showClose && (
                                <button
                                    onClick={this.handleClose}
                                    className="ml-4 p-2 hover:bg-gray-800 rounded-lg transition-colors"
                                    title="Close"
                                >
                                    <X size={20} className="text-gray-400" />
                                </button>
                            )}
                        </div>

                        <h2 className="text-xl font-semibold text-gray-100 mb-3">
                            {customMessages.title || 'Something went wrong'}
                        </h2>

                        <p className="text-gray-400 mb-6">
                            {customMessages.description ||
                             (this.state.error?.message || 'An unexpected error occurred')}
                        </p>

                        {hasExceededRetries && (
                            <div className="mb-6 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                                <p className="text-yellow-400 text-sm">
                                    Maximum retry attempts ({this.state.retryCount}) reached.
                                    The issue may require a page refresh.
                                </p>
                            </div>
                        )}

                        {/* Development error details */}
                        {(showErrorDetails || this.state.showDetails) && this.state.errorInfo && (
                            <details className="mb-6 text-left" open={this.state.showDetails}>
                                <summary
                                    className="text-sm text-gray-500 cursor-pointer hover:text-gray-300 mb-2 flex items-center justify-between"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        this.toggleErrorDetails();
                                    }}
                                >
                                    <span>Error Details ({this.state.retryCount} retries)</span>
                                    <Bug size={14} />
                                </summary>

                                <div className="bg-gray-800 rounded p-4 mt-2 text-xs text-red-400 font-mono overflow-auto max-h-64">
                                    <div className="mb-3">
                                        <strong>Error:</strong>
                                        <pre className="whitespace-pre-wrap mt-1 text-red-300">
                                            {this.state.error?.toString()}
                                        </pre>
                                    </div>

                                    {this.state.errorInfo.componentStack && (
                                        <div className="mb-3">
                                            <strong>Component Stack:</strong>
                                            <pre className="whitespace-pre-wrap mt-1 text-gray-300">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    )}

                                    {import.meta.env.DEV && (
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={this.copyErrorToClipboard}
                                                className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
                                            >
                                                <MessageSquare size={10} />
                                                Copy
                                            </button>

                                            {this.state.errorLogs.length > 1 && (
                                                <button
                                                    onClick={this.clearErrorLogs}
                                                    className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
                                                >
                                                    Clear Logs ({this.state.errorLogs.length})
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center justify-center gap-3">
                            {showRetry && !hasExceededRetries && (
                                <button
                                    onClick={this.handleRetry}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                                >
                                    <RefreshCw size={14} />
                                    {customMessages.retry || 'Try Again'}
                                </button>
                            )}

                            {hasExceededRetries && (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm"
                                >
                                    <RefreshCw size={14} />
                                    Refresh Page
                                </button>
                            )}

                            {!showErrorDetails && (
                                <button
                                    onClick={this.toggleErrorDetails}
                                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    Show Details
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
