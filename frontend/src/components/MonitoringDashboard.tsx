import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useMonitoringContext } from '../context/MonitoringContext';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Download,
  Filter,
  Search,
} from 'lucide-react';

interface MonitoringDashboardProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function MonitoringDashboard({
  className = '',
  autoRefresh = true,
  refreshInterval = 5000
}: MonitoringDashboardProps) {
  const {
    metrics,
    errors,
    healthChecks,
    alerts,
    systemMetrics,
    getMetricsSummary,
    filterMetrics,
    filterErrors,
    searchErrors,
    acknowledgeAlert,
    refreshData,
  } = useMonitoringContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState(3600000); // 1 hour
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const summary = useMemo(() => getMetricsSummary(), [getMetricsSummary]);
  const filteredErrors = useMemo(() => {
    let filtered = selectedSeverity ? filterErrors(selectedSeverity, selectedTimeRange) : filterErrors(undefined, selectedTimeRange);
    return searchQuery ? searchErrors(searchQuery) : filtered;
  }, [filterErrors, filterMetrics, searchErrors, searchQuery, selectedSeverity, selectedTimeRange]);

  const recentMetrics = useMemo(() => filterMetrics(undefined, selectedTimeRange), [filterMetrics, selectedTimeRange]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  // Prepare chart data
  const performanceChartData = useMemo(() => {
    const renderMetrics = recentMetrics.filter(m => m.type === 'render');
    const apiMetrics = recentMetrics.filter(m => m.type === 'api');

    // Group by time intervals (1 minute)
    const timeGroups = new Map<number, { render: number[], api: number[] }>();

    [...renderMetrics, ...apiMetrics].forEach(metric => {
      const timeKey = Math.floor(metric.timestamp / 60000) * 60000; // Round to minute
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, { render: [], api: [] });
      }
      const group = timeGroups.get(timeKey)!;
      if (metric.type === 'render') {
        group.render.push(metric.value);
      } else {
        group.api.push(metric.value);
      }
    });

    return Array.from(timeGroups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([timestamp, data]) => ({
        time: new Date(timestamp).toLocaleTimeString(),
        render: data.render.length > 0 ? data.render.reduce((a, b) => a + b) / data.render.length : 0,
        api: data.api.length > 0 ? data.api.reduce((a, b) => a + b) / data.api.length : 0,
      }))
      .slice(-20); // Last 20 data points
  }, [recentMetrics]);

  const errorTypeData = useMemo(() => {
    const typeCounts = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
    }));
  }, [errors]);

  const severityColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#991b1b',
  };

  const pieColors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

  const handleRefresh = async () => {
    setIsLoading(true);
    await refreshData();
    setIsLoading(false);
  };

  const handleExportData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      summary,
      metrics: recentMetrics,
      errors: filteredErrors,
      healthChecks,
      alerts,
      systemMetrics,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monitoring Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time application performance and health metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Metrics</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">
              Avg render: {summary.averageRenderTime.toFixed(2)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${summary.errorRate > 5 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.errorRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {errors.length} total errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <CheckCircle className={`h-4 w-4 ${summary.healthScore < 80 ? 'text-yellow-500' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.healthScore.toFixed(0)}%</div>
            <Progress value={summary.healthScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.filter(a => !a.acknowledged).length}</div>
            <p className="text-xs text-muted-foreground">
              {alerts.length} total alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics */}
      {systemMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              System Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">CPU Usage</span>
                  <span className="text-sm text-gray-600">N/A</span>
                </div>
                <Progress value={0} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <span className="text-sm text-gray-600">
                    {systemMetrics.memory.percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={systemMetrics.memory.percentage} />
                <p className="text-xs text-gray-500">
                  {Math.round(systemMetrics.memory.used / 1024 / 1024)}MB / {Math.round(systemMetrics.memory.total / 1024 / 1024)}MB
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Network</span>
                  <Badge variant={systemMetrics.network.online ? 'default' : 'destructive'}>
                    {systemMetrics.network.online ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                {systemMetrics.network.downlink && (
                  <p className="text-xs text-gray-500">
                    Down: {systemMetrics.network.downlink}Mbps | RTT: {systemMetrics.network.rtt}ms
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="render" stroke="#3b82f6" name="Render Time (ms)" />
                    <Line type="monotone" dataKey="api" stroke="#ef4444" name="API Time (ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Response Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentMetrics
                    .filter(m => m.type === 'api')
                    .slice(-10)
                    .reverse()
                    .map((metric) => (
                      <div key={metric.id} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{metric.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${metric.value > 2000 ? 'text-red-500' : 'text-green-500'}`}>
                            {metric.value.toFixed(0)}ms
                          </span>
                          {metric.value > 2000 ? <TrendingUp className="w-4 h-4 text-red-500" /> : <TrendingDown className="w-4 h-4 text-green-500" />}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Error Analytics
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search errors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  />
                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="">All Severities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-3">
                  {filteredErrors.slice(-20).reverse().map((error) => (
                    <div key={error.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              style={{ borderColor: severityColors[error.severity], color: severityColors[error.severity] }}
                            >
                              {error.severity.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(error.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{error.message}</p>
                          {error.source && (
                            <p className="text-xs text-gray-500 mt-1">
                              {error.source}:{error.line}:{error.column}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="font-medium mb-3">Error Distribution</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={errorTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {errorTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthChecks.slice(-20).reverse().map((check) => (
                  <div key={check.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        check.status === 'healthy' ? 'bg-green-500' :
                        check.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium">{check.name}</p>
                        <p className="text-xs text-gray-500">
                          {check.responseTime}ms • {new Date(check.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={check.status === 'healthy' ? 'default' : 'destructive'}>
                      {check.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts
                  .filter(a => !a.acknowledged)
                  .slice(-20)
                  .reverse()
                  .map((alert) => (
                    <Alert key={alert.id}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{alert.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{alert.message}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}