# Error Boundary Implementation

This document describes the comprehensive error boundary system implemented in the Web Desktop frontend to handle component errors gracefully and provide a robust user experience.

## Overview

The error boundary system provides:

- **Graceful error recovery** - Prevents single component failures from crashing the entire application
- **Detailed error logging** - Captures error information for debugging and monitoring
- **User-friendly error UI** - Shows helpful error messages with recovery options
- **Development tooling** - Enhanced error details and debugging capabilities in development
- **Specialized error boundaries** - Different error handling strategies for different use cases

## Components

### 1. Enhanced ErrorBoundary (`/components/ErrorBoundary.tsx`)

The main error boundary class component with advanced features:

**Features:**
- Error catching and logging
- Retry mechanism with configurable max retries
- Custom error messages and fallback UI
- Development vs production error display
- Error detail expansion and clipboard copying
- localStorage error logging
- Error recovery callbacks

**Usage:**
```tsx
<ErrorBoundary
    onError={(error, errorInfo) => console.error('Error:', error)}
    onRecover={() => console.log('Recovered from error')}
    showRetry={true}
    maxRetries={3}
    customMessages={{
        title: 'Custom Error Title',
        description: 'Custom error description'
    }}
>
    <YourComponent />
</ErrorBoundary>
```

### 2. Specialized Error Boundaries

#### AsyncErrorBoundary (`/components/error-boundaries/AsyncErrorBoundary.tsx`)

Specialized for async operations and network-dependent components:

**Features:**
- Network error detection
- Connection-specific error messaging
- Custom retry logic for async operations
- Loading state handling

**Usage:**
```tsx
<AsyncErrorBoundary
    maxRetries={5}
    customMessages={{
        title: 'Connection Error',
        description: 'Failed to load content. Check your connection.'
    }}
>
    <NetworkDependentComponent />
</AsyncErrorBoundary>
```

#### WindowErrorBoundary (`/components/error-boundaries/WindowErrorBoundary.tsx`)

Designed specifically for desktop windows:

**Features:**
- Window-specific error context
- Close/restart window options
- Window title and ID tracking

**Usage:**
```tsx
<WindowErrorBoundary
    windowTitle="My Window"
    windowId="window-123"
    onClose={() => closeWindow('window-123')}
    onRestart={() => restartWindow('window-123')}
>
    <WindowContent />
</WindowErrorBoundary>
```

#### DesktopErrorBoundary (`/components/error-boundaries/DesktopErrorBoundary.tsx`)

Critical error boundary for the main desktop environment:

**Features:**
- Full-screen error handling
- Application reload options
- Advanced debugging options in development
- Critical error recovery strategies

**Usage:**
```tsx
<DesktopErrorBoundary>
    <Desktop />
</DesktopErrorBoundary>
```

### 3. Utility Components

#### SafeComponent (`/components/SafeComponent.tsx`)

Compact wrapper for easy error boundary protection:

```tsx
<SafeComponent
    onError={(error) => handleError(error)}
    customMessages={{ title: 'Safe Error' }}
>
    <YourComponent />
</SafeComponent>
```

#### withErrorBoundary HOC (`/components/withErrorBoundary.tsx`)

Higher-order component for wrapping components:

```tsx
const SafeComponent = withErrorBoundary(YourComponent, {
    maxRetries: 2,
    showRetry: true
});
```

### 4. Error Handling Hook

#### useErrorHandler (`/hooks/useErrorHandler.tsx`)

Comprehensive error handling hook for components:

**Features:**
- Error logging with context
- Async error handling
- Callback wrapping
- Error boundary props generation
- Error count tracking

**Usage:**
```tsx
const { handleError, handleAsyncError, createErrorBoundaryProps } = useErrorHandler({
    component: 'MyComponent',
    onError: (error) => reportError(error)
});

// For error boundary props
<ErrorBoundary {...createErrorBoundaryProps('operation context')}>
    <YourComponent />
</ErrorBoundary>

// For async operations
const result = await handleAsyncError(
    () => riskyApiCall(),
    'API call context'
);
```

## Implementation Details

### Error Logging

All error boundaries automatically log errors to:

1. **Console** - Formatted error groups with context
2. **localStorage** - Persistent error logs for debugging
3. **Custom handlers** - User-defined error reporting functions

Error logs include:
- Timestamp
- Error message and stack
- Component stack trace
- User agent and URL
- Component context and action
- Retry count

### Recovery Strategies

#### 1. Retry Mechanism
- Configurable maximum retries (default: 3)
- Retry count tracking
- Smart retry logic for different error types

#### 2. Component Recovery
- State reset on retry
- Recovery callbacks
- Cleanup of resources

#### 3. Graceful Degradation
- Fallback UI rendering
- Safe operation continuation
- User guidance for critical errors

### Development Features

#### 1. Enhanced Error Display
- Expandable error details
- Component stack visualization
- Error clipboard copying
- Error log management

#### 2. Debugging Tools
- Error count tracking
- localStorage error log viewer
- Development-specific options
- Advanced recovery actions

#### 3. Performance Monitoring
- Error boundary performance impact
- Retry effectiveness tracking
- Component error frequency

## Integration Points

### 1. Window System

All window components are wrapped with enhanced ErrorBoundary:

```tsx
// Window.tsx
<ErrorBoundary
    onError={(error, errorInfo) => {
        console.error(`Error in window "${window.title}":`, error);
    }}
    onRecover={() => {
        console.log(`Recovered window "${window.title}"`);
    }}
    customMessages={{
        title: `Window Error: ${window.title}`,
        retry: 'Restart Window'
    }}
>
    {window.component}
</ErrorBoundary>
```

### 2. Network Components

Network-dependent components use AsyncErrorBoundary:

```tsx
// Terminal.tsx, FileManager.tsx
<AsyncErrorBoundary
    maxRetries={3}
    customMessages={{
        title: 'Connection Error',
        description: 'Failed to establish connection'
    }}
>
    <NetworkComponent />
</AsyncErrorBoundary>
```

### 3. Desktop Environment

The main desktop is wrapped with DesktopErrorBoundary:

```tsx
// Desktop.tsx
<DesktopErrorBoundary>
    <AppLauncherProvider>
        <DesktopContent />
    </AppLauncherProvider>
</DesktopErrorBoundary>
```

## Best Practices

### 1. Error Boundary Placement

- **Top-level**: DesktopErrorBoundary for critical failures
- **Window-level**: Enhanced ErrorBoundary for window content
- **Component-level**: AsyncErrorBoundary for network operations
- **Granular**: SafeComponent for small critical sections

### 2. Error Handling Strategy

- **Anticipate errors**: Use error boundaries for known failure points
- **Provide context**: Include meaningful error messages and recovery options
- **Log intelligently**: Capture relevant context without sensitive data
- **Test thoroughly**: Use ErrorTest component to verify error handling

### 3. Performance Considerations

- **Minimize overhead**: Error boundaries have minimal performance impact
- **Lazy recovery**: Only retry when recovery is likely to succeed
- **Memory management**: Clean up error logs and resources properly
- **Bundle size**: Error boundaries add minimal bundle size impact

## Testing

### ErrorTest Component

Use the ErrorTest component (`/components/ErrorTest.tsx`) to test error boundary functionality:

```tsx
import { ErrorTest } from './components/ErrorTest';

// Open ErrorTest window
openWindow('Error Test', <ErrorTest />);
```

### Test Scenarios

1. **Render Errors**: Component throws during render
2. **Async Errors**: Network operations fail
3. **State Errors**: Component state becomes invalid
4. **Recovery Testing**: Retry mechanisms and state reset
5. **UI Testing**: Error display and user interactions

## Error Monitoring

In production, consider integrating with error monitoring services:

```tsx
// In ErrorBoundary component
if (import.meta.env.PROD) {
    // Sentry.captureException(error, { extra: errorInfo });
    // or other error reporting service
}
```

## Configuration

### Environment Variables

- **VITE_ERROR_REPORTING**: Enable/disable external error reporting
- **VITE_MAX_RETRIES**: Default maximum retry attempts
- **VITE_ERROR_LOGGING**: Enable/disable localStorage error logging

### Default Settings

```typescript
const DEFAULT_CONFIG = {
    maxRetries: 3,
    enableLogging: true,
    showErrorDetails: import.meta.env.DEV,
    showRetry: true,
    enableErrorReporting: import.meta.env.PROD
};
```

## Troubleshooting

### Common Issues

1. **Error Boundary Not Catching**: Ensure errors are thrown during render, not in event handlers
2. **Infinite Retry Loops**: Configure appropriate maxRetries and recovery logic
3. **Memory Leaks**: Properly cleanup resources in error boundaries
4. **Bundle Size**: Ensure error boundaries are properly tree-shaken

### Debugging Tips

1. Check localStorage `error-logs` for detailed error information
2. Use ErrorTest component to verify error boundary behavior
3. Monitor console for detailed error logging groups
4. Verify error boundary placement in component hierarchy

## Future Enhancements

1. **Error Reporting Integration**: Sentry, LogRocket, etc.
2. **Performance Monitoring**: Error boundary performance impact
3. **A/B Testing**: Different error recovery strategies
4. **Machine Learning**: Predictive error detection and prevention
5. **Offline Support**: Enhanced error handling for offline scenarios

---

For more information, see the React documentation on Error Boundaries: https://reactjs.org/docs/error-boundaries.html