import React, { useCallback, useRef } from 'react';
import type { ErrorBoundaryProps } from '../components/ErrorBoundary';

interface ErrorLog {
    timestamp: string;
    error: Error;
    context?: string;
    component?: string;
    action?: string;
}

interface ErrorHandlerOptions {
    component?: string;
    enableLogging?: boolean;
    onError?: (error: Error, context?: string) => void;
}

/**
 * Hook for handling errors in components with consistent logging and reporting
 */
export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
    const { component, enableLogging = true, onError } = options;
    const errorCountRef = useRef(0);

    const logError = useCallback((error: Error, context?: string, action?: string) => {
        if (!enableLogging) return;

        const errorLog: ErrorLog = {
            timestamp: new Date().toISOString(),
            error,
            context,
            component,
            action
        };

        // Log to console with component context
        console.group(`🚨 Error in ${component || 'Unknown Component'}`);
        console.error('Error:', error);
        if (context) console.error('Context:', context);
        if (action) console.error('Action:', action);
        console.groupEnd();

        // Store in localStorage for debugging
        try {
            const existingLogs = JSON.parse(localStorage.getItem('component-errors') || '[]');
            const updatedLogs = [...existingLogs.slice(-9), errorLog]; // Keep last 10 errors
            localStorage.setItem('component-errors', JSON.stringify(updatedLogs));
        } catch (logError) {
            console.error('Failed to log component error:', logError);
        }

        errorCountRef.current++;

        // Call custom error handler
        if (onError) {
            try {
                onError(error, context);
            } catch (handlerError) {
                console.error('Error in custom error handler:', handlerError);
            }
        }
    }, [component, enableLogging, onError]);

    const handleError = useCallback((error: Error, context?: string) => {
        logError(error, context, 'error-handled');
    }, [logError]);

    const handleAsyncError = useCallback(async (
        asyncFn: () => Promise<any>,
        context?: string
    ): Promise<any> => {
        try {
            return await asyncFn();
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            logError(errorObj, context, 'async-operation');
            throw errorObj;
        }
    }, [logError]);

    const wrapAsyncCallback = useCallback(<T extends any[]>(
        callback: (...args: T) => Promise<any>,
        context?: string
    ) => {
        return async (...args: T) => {
            try {
                return await callback(...args);
            } catch (error) {
                const errorObj = error instanceof Error ? error : new Error(String(error));
                logError(errorObj, context, 'callback-execution');
                throw errorObj;
            }
        };
    }, [logError]);

    const createErrorBoundaryProps = useCallback((context?: string): Partial<ErrorBoundaryProps> => ({
        onError: (error, errorInfo) => {
            logError(error, `${context}\nComponent Stack: ${errorInfo.componentStack}`, 'error-boundary');
        },
        onRecover: () => {
            console.log(`Recovered from error in ${component || 'component'}`);
        },
        showErrorDetails: import.meta.env.DEV,
        enableErrorLogging: enableLogging
    }), [component, enableLogging, logError]);

    const clearErrors = useCallback(() => {
        errorCountRef.current = 0;
        if (component) {
            try {
                const existingLogs = JSON.parse(localStorage.getItem('component-errors') || '[]');
                const filteredLogs = existingLogs.filter((log: ErrorLog) => log.component !== component);
                localStorage.setItem('component-errors', JSON.stringify(filteredLogs));
            } catch (clearError) {
                console.error('Failed to clear component errors:', clearError);
            }
        }
    }, [component]);

    const getErrorCount = useCallback(() => errorCountRef.current, []);

    return {
        handleError,
        handleAsyncError,
        wrapAsyncCallback,
        createErrorBoundaryProps,
        clearErrors,
        getErrorCount,
        logError
    };
};