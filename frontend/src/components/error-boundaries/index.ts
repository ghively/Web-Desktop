// Specialized Error Boundaries for different use cases
export { AsyncErrorBoundary } from './AsyncErrorBoundary';
export { WindowErrorBoundary } from './WindowErrorBoundary';
export { DesktopErrorBoundary } from './DesktopErrorBoundary';

// Re-export the main ErrorBoundary for completeness
export { ErrorBoundary } from '../ErrorBoundary';