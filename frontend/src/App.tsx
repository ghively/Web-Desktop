import { WindowManagerProvider, SettingsProvider, VirtualDesktopManagerProvider } from './context/exports';
import { Desktop } from './components/Desktop';
import { BrowserCompatibilityProvider } from './components/BrowserCompatibility';
import { MonitoringProvider } from './context/MonitoringContext';

// Monitoring configuration for production
const monitoringConfig = {
  enabled: true,
  performanceMonitoring: {
    enabled: true,
    sampleRate: 0.5, // Sample 50% of users to reduce overhead
    maxMetrics: 500,
    flushInterval: 30000,
  },
  errorTracking: {
    enabled: true,
    maxErrors: 50,
  },
  userAnalytics: {
    enabled: true,
    sampleRate: 0.3, // Sample 30% of users
    trackInteractions: true,
    trackPerformance: true,
  },
  healthMonitoring: {
    enabled: true,
    checkInterval: 60000,
    timeoutThreshold: 5000,
  },
  endpoints: {
    metrics: '/api/monitoring/metrics',
    errors: '/api/monitoring/errors',
    analytics: '/api/monitoring/analytics',
    health: '/api/monitoring/health',
  },
};

function App() {
  return (
    <BrowserCompatibilityProvider>
      <MonitoringProvider config={monitoringConfig}>
        <SettingsProvider>
          <VirtualDesktopManagerProvider>
            <WindowManagerProvider>
              <Desktop />
            </WindowManagerProvider>
          </VirtualDesktopManagerProvider>
        </SettingsProvider>
      </MonitoringProvider>
    </BrowserCompatibilityProvider>
  );
}

export default App;