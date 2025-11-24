import {
  MonitoringConfig,
  PerformanceMetric,
  ErrorEvent,
  UserInteraction,
  HealthCheck,
  MonitoringAlert,
  defaultMonitoringConfig
} from './MonitoringConfig';

 
declare global {
  var NodeJS: {
    Timeout: {
      ref(): this;
      unref(): this;
    };
  };
}
 

export class MonitoringService {
  private config: MonitoringConfig;
  private sessionId: string;
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorEvent[] = [];
  private interactions: UserInteraction[] = [];
  private healthChecks: HealthCheck[] = [];
  private alerts: MonitoringAlert[] = [];
  private isInitialized = false;
  private observers: PerformanceObserver[] = [];
  // eslint-disable-next-line no-undef
  private timers: NodeJS.Timeout[] = [];

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = { ...defaultMonitoringConfig, ...config };
    this.sessionId = this.generateSessionId();
  }

  initialize(): void {
    if (this.isInitialized || !this.config.enabled) return;

    try {
      this.setupPerformanceMonitoring();
      this.setupErrorTracking();
      this.setupUserAnalytics();
      this.setupHealthMonitoring();
      this.setupSystemMetrics();
      this.startTimers();

      this.isInitialized = true;
      console.log('Monitoring service initialized');
    } catch (error) {
      console.error('Failed to initialize monitoring service:', error);
    }
  }

  shutdown(): void {
    this.stopTimers();
    this.disconnectObservers();
    this.flushAllMetrics();
    this.isInitialized = false;
  }

  // Performance Monitoring
  private setupPerformanceMonitoring(): void {
    if (!this.config.performanceMonitoring.enabled) return;

    // Performance Observer for navigation timing
    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming;
          const domEnd = Number(nav.domContentLoadedEventEnd || 0);
          const domStart = Number(nav.domContentLoadedEventStart || 0);
          const fetchStart = Number(nav.fetchStart || 0);

          this.recordMetric({
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'navigation',
            name: 'pageLoad',
            value: entry.duration,
            unit: 'ms',
            metadata: {
              domContentLoaded: domEnd - domStart,
              firstPaint: domEnd - fetchStart,
            }
          });
        }
      });
    });

    navigationObserver.observe({ entryTypes: ['navigation'] });
    this.observers.push(navigationObserver);

    // Performance Observer for paint timing
    const paintObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.recordMetric({
          id: this.generateId(),
          timestamp: Date.now(),
          type: 'render',
          name: entry.name,
          value: entry.startTime,
          unit: 'ms',
        });
      });
    });

    paintObserver.observe({ entryTypes: ['paint'] });
    this.observers.push(paintObserver);

    // Monitor long tasks
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric({
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'render',
            name: 'longTask',
            value: entry.duration,
            unit: 'ms',
            metadata: { startTime: entry.startTime }
          });
        });
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (_e) {
      // Long task API not supported
      console.warn('Long task monitoring not supported');
       
      void _e;
    }
  }

  // Error Tracking
  private setupErrorTracking(): void {
    if (!this.config.errorTracking.enabled) return;

    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordError({
        id: this.generateId(),
        timestamp: Date.now(),
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId,
        severity: this.determineErrorSeverity(event.error),
        context: {
          timestamp: event.timeStamp,
        }
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        id: this.generateId(),
        timestamp: Date.now(),
        type: 'promise',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId,
        severity: 'high',
        context: {
          promise: event.promise,
        }
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.recordError({
          id: this.generateId(),
          timestamp: Date.now(),
          type: 'network',
          message: `Failed to load resource: ${(event.target as { src?: string; href?: string })?.src || (event.target as { src?: string; href?: string })?.href}`,
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: this.sessionId,
          severity: 'medium',
          context: {
            element: (event.target as HTMLElement | null)?.tagName,
            source: (event.target as { src?: string; href?: string })?.src || (event.target as { src?: string; href?: string })?.href,
          }
        });
      }
    }, true);
  }

  // User Analytics
  private setupUserAnalytics(): void {
    if (!this.config.userAnalytics.enabled || !this.config.userAnalytics.trackInteractions) return;

    // Sample rate check
    if (Math.random() > this.config.userAnalytics.sampleRate) return;

    // Click tracking
    document.addEventListener('click', (event) => {
      const target = event.target as Element;
      this.recordInteraction({
        id: this.generateId(),
        timestamp: Date.now(),
        type: 'click',
        target: target.tagName.toLowerCase(),
        element: {
          tagName: target.tagName,
          id: target.id,
          className: target.className,
          text: target.textContent?.substring(0, 100),
        },
        position: { x: event.clientX, y: event.clientY },
      });
    });

    // Key tracking
    document.addEventListener('keydown', (event) => {
      const targetEl = event.target as HTMLElement | null;
      this.recordInteraction({
        id: this.generateId(),
        timestamp: Date.now(),
        type: 'keydown',
        target: targetEl?.tagName.toLowerCase() || 'unknown',
        value: event.key,
      });
    });
  }

  // Health Monitoring
  private setupHealthMonitoring(): void {
    if (!this.config.healthMonitoring.enabled) return;

    // Monitor API connectivity
    this.performHealthCheck('api-connectivity', async () => {
      const response = await fetch(this.config.endpoints.health, {
        method: 'GET',
      });
      return response.ok;
    });
  }

  private setupSystemMetrics(): void {
    // Monitor memory usage (if available)
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        this.recordMetric({
          id: this.generateId(),
          timestamp: Date.now(),
          type: 'memory',
          name: 'heapUsed',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          metadata: {
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
          }
        });
      };

      // Check memory every 30 seconds
      setInterval(checkMemory, 30000);
    }

    // Monitor network connectivity
    window.addEventListener('online', () => {
      this.performHealthCheck('network-status', () => Promise.resolve(navigator.onLine));
    });

    window.addEventListener('offline', () => {
      this.performHealthCheck('network-status', () => Promise.resolve(navigator.onLine));
    });
  }

  // Public API methods
  recordMetric(metric: Omit<PerformanceMetric, 'id'> & { id?: string }): void {
    if (!this.config.performanceMonitoring.enabled) return;
    if (Math.random() > this.config.performanceMonitoring.sampleRate) return;

    const fullMetric: PerformanceMetric = {
      id: this.generateId(),
      ...metric,
    };

    this.metrics.push(fullMetric);

    // Maintain max metrics limit
    if (this.metrics.length > this.config.performanceMonitoring.maxMetrics) {
      this.metrics.shift();
    }

    // Check for performance alerts
    this.checkPerformanceThresholds(fullMetric);
  }

  recordError(error: Omit<ErrorEvent, 'id' | 'sessionId'> & { id?: string; sessionId?: string }): void {
    if (!this.config.errorTracking.enabled) return;

    const fullError: ErrorEvent = {
      id: error.id || this.generateId(),
      sessionId: error.sessionId || this.sessionId,
      ...error,
    };

    // Apply beforeSend filter if configured
    let processedError = fullError;
    if (this.config.errorTracking.beforeSend) {
      const filtered = this.config.errorTracking.beforeSend(fullError);
      if (!filtered) return;
      processedError = filtered;
    }

    this.errors.push(processedError);

    // Maintain max errors limit
    if (this.errors.length > this.config.errorTracking.maxErrors) {
      this.errors.shift();
    }

    // Create alert for critical errors
    if (processedError.severity === 'critical') {
      this.createAlert({
        id: this.generateId(),
        timestamp: Date.now(),
        type: 'error',
        severity: 'critical',
        title: 'Critical Error Detected',
        message: processedError.message,
        metrics: { error: processedError },
        acknowledged: false,
      });
    }
  }

  recordInteraction(interaction: Omit<UserInteraction, 'id'> & { id?: string }): void {
    if (!this.config.userAnalytics.enabled || !this.config.userAnalytics.trackInteractions) return;
    if (Math.random() > this.config.userAnalytics.sampleRate) return;

    const fullInteraction: UserInteraction = {
      id: interaction.id || this.generateId(),
      ...interaction,
    };

    this.interactions.push(fullInteraction);

    // Limit interactions array size
    if (this.interactions.length > 1000) {
      this.interactions.shift();
    }
  }

  async performHealthCheck(name: string, check: () => Promise<boolean>): Promise<void> {
    const startTime = Date.now();

    try {
      const isHealthy = await Promise.race([
        check(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.healthMonitoring.timeoutThreshold)
        )
      ]);

      const healthCheck: HealthCheck = {
        id: this.generateId(),
        timestamp: Date.now(),
        name,
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
      };

      this.healthChecks.push(healthCheck);

      // Alert on unhealthy status
      if (!isHealthy) {
        this.createAlert({
          id: this.generateId(),
          timestamp: Date.now(),
          type: 'health',
          severity: 'warning',
          title: `Health Check Failed: ${name}`,
          message: `Health check "${name}" failed with response time ${healthCheck.responseTime}ms`,
          metrics: { healthCheck },
          acknowledged: false,
        });
      }
    } catch (error) {
      const healthCheck: HealthCheck = {
        id: this.generateId(),
        timestamp: Date.now(),
        name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: { error: (error as Error).message },
      };

      this.healthChecks.push(healthCheck);

      this.createAlert({
        id: this.generateId(),
        timestamp: Date.now(),
        type: 'health',
        severity: 'error',
        title: `Health Check Error: ${name}`,
        message: `Health check "${name}" encountered an error: ${(error as Error).message}`,
        metrics: { healthCheck },
        acknowledged: false,
      });
    }

    // Limit health checks array
    if (this.healthChecks.length > 100) {
      this.healthChecks.shift();
    }
  }

  createAlert(alert: Omit<MonitoringAlert, 'id'> & { id?: string }): void {
    const fullAlert: MonitoringAlert = {
      id: alert.id || this.generateId(),
      ...alert,
    };

    this.alerts.push(fullAlert);

    // Limit alerts array
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }

  // Data retrieval methods
  getMetrics(type?: string, limit?: number): PerformanceMetric[] {
    let filtered = this.metrics;
    if (type) {
      filtered = filtered.filter(m => m.type === type);
    }
    return limit ? filtered.slice(-limit) : filtered;
  }

  getErrors(severity?: string, limit?: number): ErrorEvent[] {
    let filtered = this.errors;
    if (severity) {
      filtered = filtered.filter(e => e.severity === severity);
    }
    return limit ? filtered.slice(-limit) : filtered;
  }

  getInteractions(limit?: number): UserInteraction[] {
    return limit ? this.interactions.slice(-limit) : this.interactions;
  }

  getHealthChecks(name?: string, limit?: number): HealthCheck[] {
    let filtered = this.healthChecks;
    if (name) {
      filtered = filtered.filter(h => h.name === name);
    }
    return limit ? filtered.slice(-limit) : filtered;
  }

  getAlerts(acknowledged?: boolean, limit?: number): MonitoringAlert[] {
    let filtered = this.alerts;
    if (acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === acknowledged);
    }
    return limit ? filtered.slice(-limit) : filtered;
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  // Utility methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineErrorSeverity(error: Error | { message?: string }): 'low' | 'medium' | 'high' | 'critical' {
    if (!error) return 'medium';

    const message = error.message || '';
    if (message.includes('Script error') || message.includes('Network error')) {
      return 'medium';
    }
    if (message.includes('TypeError') || message.includes('ReferenceError')) {
      return 'high';
    }
    if (message.includes('QuotaExceededError') || message.includes('SecurityError')) {
      return 'critical';
    }

    return 'medium';
  }

  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    const thresholds = {
      render: 16, // 60fps = 16ms per frame
      api: 2000,  // 2 seconds
      navigation: 3000, // 3 seconds
      interaction: 100, // 100ms for interaction
    };

    const threshold = thresholds[metric.type as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      this.createAlert({
        id: this.generateId(),
        timestamp: Date.now(),
        type: 'performance',
        severity: metric.value > threshold * 2 ? 'error' : 'warning',
        title: `Performance Degradation: ${metric.name}`,
        message: `${metric.type} "${metric.name}" took ${metric.value}${metric.unit} (threshold: ${threshold}${metric.unit})`,
        metrics: { metric },
        acknowledged: false,
      });
    }
  }

  private startTimers(): void {
    // Flush metrics periodically
    if (this.config.performanceMonitoring.flushInterval > 0) {
      const flushTimer = setInterval(() => {
        this.flushMetrics();
      }, this.config.performanceMonitoring.flushInterval);
      this.timers.push(flushTimer as unknown);
    }

    // Perform health checks periodically
    if (this.config.healthMonitoring.checkInterval > 0) {
      const healthTimer = setInterval(() => {
        this.performHealthCheck('periodic-check', async () => {
          const response = await fetch(this.config.endpoints.health);
          return response.ok;
        });
      }, this.config.healthMonitoring.checkInterval);
      this.timers.push(healthTimer as unknown);
    }
  }

  private stopTimers(): void {
    this.timers.forEach(timer => clearInterval(timer));
    this.timers = [];
  }

  private disconnectObservers(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;

    try {
      const metricsToSend = [...this.metrics];
      this.metrics = [];

      await fetch(this.config.endpoints.metrics, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          metrics: metricsToSend,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Restore metrics if flush failed
      this.metrics.unshift(...this.metrics);
    }
  }

  private async flushAllMetrics(): Promise<void> {
    await Promise.all([
      this.flushMetrics(),
      this.flushErrors(),
      this.flushInteractions(),
    ]);
  }

  private async flushErrors(): Promise<void> {
    if (this.errors.length === 0) return;

    try {
      const errorsToSend = [...this.errors];
      this.errors = [];

      await fetch(this.config.endpoints.errors, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          errors: errorsToSend,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to flush errors:', error);
    }
  }

  private async flushInteractions(): Promise<void> {
    if (this.interactions.length === 0) return;

    try {
      const interactionsToSend = [...this.interactions];
      this.interactions = [];

      await fetch(this.config.endpoints.analytics, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          interactions: interactionsToSend,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to flush interactions:', error);
    }
  }
}

// Singleton instance
export const monitoringService = new MonitoringService();
