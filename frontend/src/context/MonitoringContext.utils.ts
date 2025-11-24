import { useContext } from 'react';
import { MonitoringContext, MonitoringContextType } from './MonitoringContext';

export function useMonitoringContext(): MonitoringContextType {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoringContext must be used within a MonitoringProvider');
  }
  return context;
}