import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import type { Props as ErrorBoundaryProps } from './ErrorBoundary';

interface WithErrorBoundaryOptions extends Omit<ErrorBoundaryProps, 'children'> {
    // Additional options specific to HOC can be added here
}

export const withErrorBoundary = <P extends object>(
    Component: React.ComponentType<P>,
    options: WithErrorBoundaryOptions = {}
) => {
    const WrappedComponent = (props: P) => (
        <ErrorBoundary {...options}>
            <Component {...props} />
        </ErrorBoundary>
    );

    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

    return WrappedComponent;
};