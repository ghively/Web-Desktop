import { useEffect, useRef, useCallback, useMemo } from 'react';
import { monitoringService } from '../services/monitoring/MonitoringService';
import { PerformanceMetric, ErrorEvent } from '../services/monitoring/MonitoringConfig';

export interface UseMonitoringOptions {
  trackPerformance?: boolean;
  trackErrors?: boolean;
  trackInteractions?: boolean;
  component?: string;
}

export function useMonitoring(options: UseMonitoringOptions = {}) {
  const {
    trackPerformance = true,
    trackErrors = true,
    trackInteractions = false,
    component = 'Unknown',
  } = options;

  const renderStartTime = useRef<number>();
  const mountTime = useRef<number>(Date.now());

  // Track component render performance
  useEffect(() => {
    if (trackPerformance) {
      renderStartTime.current = performance.now();
    }
  });

  useEffect(() => {
    if (trackPerformance && renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;

      monitoringService.recordMetric({
        timestamp: Date.now(),
        type: 'render',
        name: `${component}-render`,
        value: renderTime,
        unit: 'ms',
        metadata: {
          component,
          renderCount: 1,
        },
      });
    }
  });

  // Track component mount/unmount
  useEffect(() => {
    const mountDuration = Date.now() - mountTime.current;

    monitoringService.recordMetric({
      timestamp: Date.now(),
      type: 'render',
      name: `${component}-mount`,
      value: mountDuration,
      unit: 'ms',
      metadata: {
        component,
        action: 'mount',
      },
    });

    return () => {
      monitoringService.recordMetric({
        timestamp: Date.now(),
        type: 'render',
        name: `${component}-unmount`,
        value: Date.now() - mountTime.current,
        unit: 'ms',
        metadata: {
          component,
          action: 'unmount',
          lifecycle: Date.now() - mountTime.current,
        },
      });
    };
  }, []);

  // Track interactions within component
  const trackInteraction = useCallback((type: string, target: string, metadata?: Record<string, any>) => {
    if (trackInteractions) {
      monitoringService.recordInteraction({
        timestamp: Date.now(),
        type: type as any,
        target,
        metadata: {
          component,
          ...metadata,
        },
      });
    }
  }, [trackInteractions, component]);

  // Track custom performance metrics
  const trackMetric = useCallback((name: string, value: number, type: PerformanceMetric['type'] = 'interaction', unit: PerformanceMetric['unit'] = 'ms', metadata?: Record<string, any>) => {
    if (trackPerformance) {
      monitoringService.recordMetric({
        timestamp: Date.now(),
        type,
        name,
        value,
        unit,
        metadata: {
          component,
          ...metadata,
        },
      });
    }
  }, [trackPerformance, component]);

  // Track errors specific to this component
  const trackError = useCallback((error: Error | string, context?: Record<string, any>) => {
    if (trackErrors) {
      const errorObj = typeof error === 'string' ? new Error(error) : error;

      monitoringService.recordError({
        timestamp: Date.now(),
        type: 'component',
        message: errorObj.message,
        stack: errorObj.stack,
        source: component,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: '', // Will be filled by service
        severity: 'medium',
        context: {
          component,
          ...context,
        },
      });
    }
  }, [trackErrors, component]);

  // Track API calls
  const trackApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    apiName: string,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now();

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;

      trackMetric(`api-${apiName}`, duration, 'api', 'ms', {
        success: true,
        ...metadata,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      trackMetric(`api-${apiName}`, duration, 'api', 'ms', {
        success: false,
        error: (error as Error).message,
        ...metadata,
      });

      trackError(`API call failed: ${apiName}`, {
        error: (error as Error).message,
        duration,
        apiName,
        ...metadata,
      });

      throw error;
    }
  }, [trackMetric, trackError]);

  // Create a performance tracker for async operations
  const createAsyncTracker = useCallback((name: string) => {
    const startTime = performance.now();

    return {
      end: (metadata?: Record<string, any>) => {
        const duration = performance.now() - startTime;
        trackMetric(name, duration, 'interaction', 'ms', metadata);
        return duration;
      },
      getDuration: () => performance.now() - startTime,
    };
  }, [trackMetric]);

  // Memory usage tracking
  const trackMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;

      monitoringService.recordMetric({
        timestamp: Date.now(),
        type: 'memory',
        name: `${component}-memory`,
        value: memory.usedJSHeapSize,
        unit: 'bytes',
        metadata: {
          component,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        },
      });
    }
  }, [component]);

  // Debounced interaction tracking
  const debouncedTrackInteraction = useMemo(() => {
    let lastCall = 0;
    const debounceMs = 100; // Debounce interactions within 100ms

    return (type: string, target: string, metadata?: Record<string, any>) => {
      const now = Date.now();
      if (now - lastCall > debounceMs) {
        trackInteraction(type, target, metadata);
        lastCall = now;
      }
    };
  }, [trackInteraction]);

  return {
    // Tracking methods
    trackInteraction,
    trackMetric,
    trackError,
    trackApiCall,
    trackMemoryUsage,
    debouncedTrackInteraction,

    // Utility methods
    createAsyncTracker,

    // Component info
    component,
    mountTime: mountTime.current,
  };
}

// Specialized hooks for different monitoring aspects
export function usePerformanceTracking(component: string) {
  return useMonitoring({
    trackPerformance: true,
    trackErrors: false,
    trackInteractions: false,
    component,
  });
}

export function useErrorTracking(component: string) {
  return useMonitoring({
    trackPerformance: false,
    trackErrors: true,
    trackInteractions: false,
    component,
  });
}

export function useInteractionTracking(component: string) {
  return useMonitoring({
    trackPerformance: false,
    trackErrors: false,
    trackInteractions: true,
    component,
  });
}

// Hook for monitoring API calls
export function useApiMonitoring() {
  const trackApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    apiName: string,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now();

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;

      monitoringService.recordMetric({
        timestamp: Date.now(),
        type: 'api',
        name: apiName,
        value: duration,
        unit: 'ms',
        metadata: {
          success: true,
          ...metadata,
        },
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      monitoringService.recordMetric({
        timestamp: Date.now(),
        type: 'api',
        name: apiName,
        value: duration,
        unit: 'ms',
        metadata: {
          success: false,
          error: (error as Error).message,
          ...metadata,
        },
      });

      monitoringService.recordError({
        timestamp: Date.now(),
        type: 'network',
        message: `API call failed: ${apiName} - ${(error as Error).message}`,
        source: 'api',
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: '',
        severity: 'medium',
        context: {
          apiName,
          duration,
          error: (error as Error).message,
          ...metadata,
        },
      });

      throw error;
    }
  }, []);

  return { trackApiCall };
}