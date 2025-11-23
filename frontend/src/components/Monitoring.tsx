import React from 'react';
import { MonitoringDashboard } from './MonitoringDashboard';
import { useMonitoring } from '../hooks/useMonitoring';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Activity, AlertTriangle, CheckCircle, Settings } from 'lucide-react';

interface MonitoringProps {
  className?: string;
  windowId?: string;
}

export function Monitoring({ className = '' }: MonitoringProps) {
  const { trackInteraction, trackMetric } = useMonitoring({
    component: 'MonitoringWindow',
    trackPerformance: true,
    trackErrors: true,
  });

  // Track window mount
  React.useEffect(() => {
    trackInteraction('open', 'monitoring-window');
    trackMetric('monitoring-window-open', 1, 'interaction', 'count');
  }, [trackInteraction, trackMetric]);

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <MonitoringDashboard
        autoRefresh={true}
        refreshInterval={10000}
        className="flex-1 overflow-auto"
      />
    </div>
  );
}
