import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { monitoringService } from '../services/monitoring/MonitoringService';
import {
  MonitoringConfig,
  PerformanceMetric,
  ErrorEvent,
  UserInteraction,
  HealthCheck,
  MonitoringAlert,
  SystemMetrics,
} from '../services/monitoring/MonitoringConfig';

interface MonitoringContextType {
  // Configuration
  config: MonitoringConfig;
  updateConfig: (config: Partial<MonitoringConfig>) => void;
  isInitialized: boolean;

  // Data access
  metrics: PerformanceMetric[];
  errors: ErrorEvent[];
  interactions: UserInteraction[];
  healthChecks: HealthCheck[];
  alerts: MonitoringAlert[];
  systemMetrics: SystemMetrics | null;

  // Actions
  refreshData: () => void;
  acknowledgeAlert: (alertId: string) => void;
  performHealthCheck: (name: string, check: () => Promise<boolean>) => Promise<void>;
  createAlert: (alert: Omit<MonitoringAlert, 'id'>) => void;

  // Metrics tracking
  trackMetric: (metric: Omit<PerformanceMetric, 'id'>) => void;
  trackError: (error: Omit<ErrorEvent, 'id' | 'sessionId'>) => void;
  trackInteraction: (interaction: Omit<UserInteraction, 'id'>) => void;

  // Statistics
  getMetricsSummary: () => {
    total: number;
    averageRenderTime: number;
    averageApiTime: number;
    errorRate: number;
    healthScore: number;
  };

  // Filter and search
  filterMetrics: (type?: string, timeRange?: number) => PerformanceMetric[];
  filterErrors: (severity?: string, timeRange?: number) => ErrorEvent[];
  searchErrors: (query: string) => ErrorEvent[];
}

const MonitoringContext = createContext<MonitoringContextType | null>(null);

interface MonitoringProviderProps {
  children: ReactNode;
  config?: Partial<MonitoringConfig>;
  autoInitialize?: boolean;
}

export function MonitoringProvider({ children, config: initialConfig, autoInitialize = true }: MonitoringProviderProps) {
  const [config, setConfig] = useState<MonitoringConfig>(() => ({
    ...monitoringService['config'],
    ...initialConfig,
  }));
  const [isInitialized, setIsInitialized] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [interactions, setInteractions] = useState<UserInteraction[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);

  // Initialize monitoring service
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      monitoringService.initialize();
      setIsInitialized(true);

      // Update service config if provided
      if (initialConfig) {
        Object.assign(monitoringService['config'], initialConfig);
      }
    }

    return () => {
      if (isInitialized) {
        monitoringService.shutdown();
      }
    };
  }, [autoInitialize, initialConfig, isInitialized]);

  // Periodically refresh data
  useEffect(() => {
    if (!isInitialized) return;

    const refreshInterval = setInterval(() => {
      refreshData();
    }, 5000); // Refresh every 5 seconds

    // Initial refresh
    refreshData();

    return () => clearInterval(refreshInterval);
  }, [isInitialized]);

  // System metrics collection
  useEffect(() => {
    if (!isInitialized) return;

    const collectSystemMetrics = () => {
      const systemData: SystemMetrics = {
        timestamp: Date.now(),
        cpu: {
          usage: 0, // Would need backend API for this
          cores: navigator.hardwareConcurrency || 1,
        },
        memory: 'memory' in performance ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          percentage: ((performance as any).memory.usedJSHeapSize / (performance as any).memory.totalJSHeapSize) * 100,
        } : {
          used: 0,
          total: 0,
          percentage: 0,
        },
        network: {
          online: navigator.onLine,
          downlink: (navigator as any).connection?.downlink,
          rtt: (navigator as any).connection?.rtt,
        },
      };

      // Storage quota if available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then((estimate) => {
          if (estimate.quota && estimate.usage) {
            systemData.storage = {
              quota: estimate.quota,
              usage: estimate.usage,
              percentage: (estimate.usage / estimate.quota) * 100,
            };
          }
          setSystemMetrics(systemData);
        });
      } else {
        setSystemMetrics(systemData);
      }
    };

    const metricsInterval = setInterval(collectSystemMetrics, 30000); // Every 30 seconds
    collectSystemMetrics(); // Initial collection

    return () => clearInterval(metricsInterval);
  }, [isInitialized]);

  const refreshData = useCallback(() => {
    setMetrics(monitoringService.getMetrics());
    setErrors(monitoringService.getErrors());
    setInteractions(monitoringService.getInteractions());
    setHealthChecks(monitoringService.getHealthChecks());
    setAlerts(monitoringService.getAlerts());
  }, []);

  const updateConfig = useCallback((newConfig: Partial<MonitoringConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    Object.assign(monitoringService['config'], updatedConfig);
  }, [config]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    monitoringService.acknowledgeAlert(alertId);
    refreshData();
  }, [refreshData]);

  const performHealthCheck = useCallback(async (name: string, check: () => Promise<boolean>) => {
    await monitoringService.performHealthCheck(name, check);
    refreshData();
  }, [refreshData]);

  const createAlert = useCallback((alert: Omit<MonitoringAlert, 'id'>) => {
    monitoringService.createAlert(alert);
    refreshData();
  }, [refreshData]);

  const trackMetric = useCallback((metric: Omit<PerformanceMetric, 'id'>) => {
    monitoringService.recordMetric(metric);
    refreshData();
  }, [refreshData]);

  const trackError = useCallback((error: Omit<ErrorEvent, 'id' | 'sessionId'>) => {
    monitoringService.recordError(error);
    refreshData();
  }, [refreshData]);

  const trackInteraction = useCallback((interaction: Omit<UserInteraction, 'id'>) => {
    monitoringService.recordInteraction(interaction);
    refreshData();
  }, [refreshData]);

  const getMetricsSummary = useCallback(() => {
    const renderMetrics = metrics.filter(m => m.type === 'render');
    const apiMetrics = metrics.filter(m => m.type === 'api');
    const recentErrors = errors.filter(e => Date.now() - e.timestamp < 300000); // Last 5 minutes
    const recentHealthChecks = healthChecks.filter(h => Date.now() - h.timestamp < 300000);

    const averageRenderTime = renderMetrics.length > 0
      ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length
      : 0;

    const averageApiTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length
      : 0;

    const errorRate = metrics.length > 0
      ? (recentErrors.length / metrics.length) * 100
      : 0;

    const healthScore = recentHealthChecks.length > 0
      ? (recentHealthChecks.filter(h => h.status === 'healthy').length / recentHealthChecks.length) * 100
      : 100;

    return {
      total: metrics.length,
      averageRenderTime,
      averageApiTime,
      errorRate,
      healthScore,
    };
  }, [metrics, errors, healthChecks]);

  const filterMetrics = useCallback((type?: string, timeRange?: number): PerformanceMetric[] => {
    let filtered = metrics;

    if (type) {
      filtered = filtered.filter(m => m.type === type);
    }

    if (timeRange) {
      const cutoff = Date.now() - timeRange;
      filtered = filtered.filter(m => m.timestamp > cutoff);
    }

    return filtered;
  }, [metrics]);

  const filterErrors = useCallback((severity?: string, timeRange?: number): ErrorEvent[] => {
    let filtered = errors;

    if (severity) {
      filtered = filtered.filter(e => e.severity === severity);
    }

    if (timeRange) {
      const cutoff = Date.now() - timeRange;
      filtered = filtered.filter(e => e.timestamp > cutoff);
    }

    return filtered;
  }, [errors]);

  const searchErrors = useCallback((query: string): ErrorEvent[] => {
    const lowercaseQuery = query.toLowerCase();
    return errors.filter(error =>
      error.message.toLowerCase().includes(lowercaseQuery) ||
      error.source?.toLowerCase().includes(lowercaseQuery) ||
      error.type.toLowerCase().includes(lowercaseQuery)
    );
  }, [errors]);

  const contextValue: MonitoringContextType = {
    config,
    updateConfig,
    isInitialized,
    metrics,
    errors,
    interactions,
    healthChecks,
    alerts,
    systemMetrics,
    refreshData,
    acknowledgeAlert,
    performHealthCheck,
    createAlert,
    trackMetric,
    trackError,
    trackInteraction,
    getMetricsSummary,
    filterMetrics,
    filterErrors,
    searchErrors,
  };

  return (
    <MonitoringContext.Provider value={contextValue}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoringContext(): MonitoringContextType {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoringContext must be used within a MonitoringProvider');
  }
  return context;
}