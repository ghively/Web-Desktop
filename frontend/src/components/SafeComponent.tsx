import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import type { Props as ErrorBoundaryProps } from './ErrorBoundary';

interface SafeComponentProps extends Omit<ErrorBoundaryProps, 'children'> {
    children: React.ReactNode;
}

/**
 * A wrapper component that provides error boundary protection
 * with a more compact API for easy use in JSX
 */
export const SafeComponent: React.FC<SafeComponentProps> = ({
    children,
    ...errorBoundaryProps
}) => {
    return (
        <ErrorBoundary {...errorBoundaryProps}>
            {children}
        </ErrorBoundary>
    );
};