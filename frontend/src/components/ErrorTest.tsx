import React, { useState } from 'react';
import { SafeComponent } from './index';
import { AlertTriangle, Bug, RefreshCw } from 'lucide-react';

/**
 * Test component for error boundary functionality
 * Used for development and testing purposes
 */
export const ErrorTest: React.FC = () => {
    const [shouldThrow, setShouldThrow] = useState(false);
    const [shouldThrowAsync, setShouldThrowAsync] = useState(false);
    const [componentError, setComponentError] = useState(false);

    const triggerError = () => {
        setShouldThrow(true);
    };

    const triggerAsyncError = async () => {
        setShouldThrowAsync(true);
        await new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Async error triggered')), 100);
        });
    };

    const triggerComponentError = () => {
        setComponentError(true);
    };

    if (shouldThrow) {
        throw new Error('This is a test error from ErrorTest component');
    }

    if (shouldThrowAsync) {
        throw new Error('This is an async error test');
    }

    if (componentError) {
        throw new Error('This is a component state error');
    }

    return (
        <div className="p-6 bg-gray-800 rounded-lg min-h-96">
            <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
                <Bug className="text-red-400" />
                Error Boundary Testing
            </h2>

            <p className="text-gray-300 mb-6">
                Test the error boundary functionality by clicking the buttons below.
                Each button will trigger a different type of error to demonstrate the error handling.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                    onClick={triggerError}
                    className="flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                    <AlertTriangle size={16} />
                    Trigger Render Error
                </button>

                <button
                    onClick={triggerAsyncError}
                    className="flex items-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                    <AlertTriangle size={16} />
                    Trigger Async Error
                </button>

                <button
                    onClick={triggerComponentError}
                    className="flex items-center gap-2 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                    <AlertTriangle size={16} />
                    Trigger State Error
                </button>

                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <RefreshCw size={16} />
                    Reload Page
                </button>
            </div>

            {/* Test SafeComponent */}
            <div className="mt-8 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-100 mb-3">SafeComponent Test</h3>
                <SafeComponent
                    onError={(error) => console.log('SafeComponent caught error:', error)}
                    customMessages={{
                        title: 'Safe Component Error',
                        description: 'This error was caught by SafeComponent wrapper.'
                    }}
                >
                    <button
                        onClick={() => {
                            throw new Error('SafeComponent test error');
                        }}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                    >
                        Test SafeComponent Error
                    </button>
                </SafeComponent>
            </div>

            {/* Error info */}
            <div className="mt-6 p-4 bg-gray-900 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Error Testing Info:</h3>
                <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Render errors are caught by ErrorBoundary</li>
                    <li>• Async errors are caught by AsyncErrorBoundary</li>
                    <li>• Component state errors test error recovery</li>
                    <li>• Check browser console for detailed error logs</li>
                    <li>• Error logs are stored in localStorage for debugging</li>
                </ul>
            </div>
        </div>
    );
};