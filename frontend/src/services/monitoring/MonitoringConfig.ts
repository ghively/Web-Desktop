export interface MonitoringConfig {
  enabled: boolean;
  performanceMonitoring: {
    enabled: boolean;
    sampleRate: number; // 0.0 to 1.0
    maxMetrics: number;
    flushInterval: number; // ms
  };
  errorTracking: {
    enabled: boolean;
    maxErrors: number;
    beforeSend?: (error: ErrorEvent) => ErrorEvent | null;
  };
  userAnalytics: {
    enabled: boolean;
    sampleRate: number;
    trackInteractions: boolean;
    trackPerformance: boolean;
  };
  healthMonitoring: {
    enabled: boolean;
    checkInterval: number; // ms
    timeoutThreshold: number; // ms
  };
  endpoints: {
    metrics: string;
    errors: string;
    analytics: string;
    health: string;
  };
}

export const defaultMonitoringConfig: MonitoringConfig = {
  enabled: true,
  performanceMonitoring: {
    enabled: true,
    sampleRate: 1.0,
    maxMetrics: 1000,
    flushInterval: 30000, // 30 seconds
  },
  errorTracking: {
    enabled: true,
    maxErrors: 100,
  },
  userAnalytics: {
    enabled: true,
    sampleRate: 1.0,
    trackInteractions: true,
    trackPerformance: true,
  },
  healthMonitoring: {
    enabled: true,
    checkInterval: 60000, // 1 minute
    timeoutThreshold: 5000, // 5 seconds
  },
  endpoints: {
    metrics: '/api/monitoring/metrics',
    errors: '/api/monitoring/errors',
    analytics: '/api/monitoring/analytics',
    health: '/api/monitoring/health',
  },
};

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: 'render' | 'api' | 'navigation' | 'interaction' | 'memory' | 'network';
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  metadata?: Record<string, any>;
}

export interface ErrorEvent {
  id: string;
  timestamp: number;
  type: 'javascript' | 'network' | 'promise' | 'component';
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export interface UserInteraction {
  id: string;
  timestamp: number;
  type: 'click' | 'keydown' | 'scroll' | 'resize' | 'focus' | 'blur';
  target: string;
  element?: {
    tagName: string;
    id?: string;
    className?: string;
    text?: string;
  };
  position?: { x: number; y: number };
  value?: any;
  metadata?: Record<string, any>;
}

export interface HealthCheck {
  id: string;
  timestamp: number;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: Record<string, any>;
}

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    online: boolean;
    downlink?: number;
    rtt?: number;
  };
  storage?: {
    quota?: number;
    usage?: number;
    percentage?: number;
  };
}

export interface MonitoringAlert {
  id: string;
  timestamp: number;
  type: 'performance' | 'error' | 'health' | 'threshold';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metrics?: any;
  acknowledged: boolean;
}