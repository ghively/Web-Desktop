import { Router } from 'express';
import { writeFile, readFile, mkdir, access } from 'fs/promises';
import { join } from 'path';

const router = Router();

// Data storage directory
const MONITORING_DIR = join(process.cwd(), 'data', 'monitoring');

// Ensure monitoring directory exists
async function ensureMonitoringDir(): Promise<void> {
  try {
    await access(MONITORING_DIR);
  } catch {
    await mkdir(MONITORING_DIR, { recursive: true });
  }
}

// Helper functions for file operations
async function writeMonitoringData(filename: string, data: any): Promise<void> {
  await ensureMonitoringDir();
  const filePath = join(MONITORING_DIR, filename);
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

async function readMonitoringData(filename: string): Promise<any> {
  try {
    const filePath = join(MONITORING_DIR, filename);
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      services: {
        database: 'healthy', // Would check actual DB connection
        filesystem: 'healthy', // Would check file system
        websocket: 'healthy', // Would check WebSocket server
      },
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    });
  }
});

// Store metrics
router.post('/metrics', async (req, res) => {
  try {
    const { sessionId, metrics, timestamp } = req.body;

    if (!sessionId || !Array.isArray(metrics)) {
      return res.status(400).json({ error: 'Invalid metrics data' });
    }

    // Store metrics with metadata
    const metricsData = {
      sessionId,
      timestamp: timestamp || Date.now(),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      metrics: metrics.map((metric: any) => ({
        ...metric,
        serverTimestamp: Date.now(),
      })),
    };

    // Append to metrics file
    const existingMetrics = await readMonitoringData('metrics.json');
    existingMetrics.push(metricsData);

    // Keep only last 10,000 metric entries to prevent file bloat
    if (existingMetrics.length > 10000) {
      existingMetrics.splice(0, existingMetrics.length - 10000);
    }

    await writeMonitoringData('metrics.json', existingMetrics);

    res.json({ success: true, count: metrics.length });
  } catch (error) {
    console.error('Failed to store metrics:', error);
    res.status(500).json({ error: 'Failed to store metrics' });
  }
});

// Get metrics for analysis
router.get('/metrics', async (req, res) => {
  try {
    const { sessionId, timeRange, limit = 100 } = req.query;

    let metrics = await readMonitoringData('metrics.json');

    // Filter by session ID if provided
    if (sessionId) {
      metrics = metrics.filter((m: any) => m.sessionId === sessionId);
    }

    // Filter by time range if provided
    if (timeRange) {
      const cutoff = Date.now() - parseInt(timeRange as string);
      metrics = metrics.filter((m: any) => m.timestamp > cutoff);
    }

    // Sort by timestamp (newest first)
    metrics.sort((a: any, b: any) => b.timestamp - a.timestamp);

    // Limit results
    if (limit && parseInt(limit as string) > 0) {
      metrics = metrics.slice(0, parseInt(limit as string));
    }

    res.json(metrics);
  } catch (error) {
    console.error('Failed to retrieve metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// Store errors
router.post('/errors', async (req, res) => {
  try {
    const { sessionId, errors, timestamp } = req.body;

    if (!sessionId || !Array.isArray(errors)) {
      return res.status(400).json({ error: 'Invalid error data' });
    }

    const errorData = {
      sessionId,
      timestamp: timestamp || Date.now(),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      errors: errors.map((error: any) => ({
        ...error,
        serverTimestamp: Date.now(),
      })),
    };

    const existingErrors = await readMonitoringData('errors.json');
    existingErrors.push(errorData);

    // Keep only last 5,000 error entries
    if (existingErrors.length > 5000) {
      existingErrors.splice(0, existingErrors.length - 5000);
    }

    await writeMonitoringData('errors.json', existingErrors);

    res.json({ success: true, count: errors.length });
  } catch (error) {
    console.error('Failed to store errors:', error);
    res.status(500).json({ error: 'Failed to store errors' });
  }
});

// Get errors for analysis
router.get('/errors', async (req, res) => {
  try {
    const { sessionId, severity, timeRange, limit = 50 } = req.query;

    let errors = await readMonitoringData('errors.json');

    // Flatten nested errors array
    const flatErrors = errors.flatMap((entry: any) =>
      entry.errors.map((error: any) => ({
        ...error,
        sessionId: entry.sessionId,
        userAgent: entry.userAgent,
        ip: entry.ip,
        batchTimestamp: entry.timestamp,
      }))
    );

    // Apply filters
    if (sessionId) {
      flatErrors.filter((e: any) => e.sessionId === sessionId);
    }

    if (severity) {
      flatErrors.filter((e: any) => e.severity === severity);
    }

    if (timeRange) {
      const cutoff = Date.now() - parseInt(timeRange as string);
      flatErrors.filter((e: any) => e.timestamp > cutoff);
    }

    // Sort by timestamp (newest first)
    flatErrors.sort((a: any, b: any) => b.timestamp - a.timestamp);

    // Limit results
    if (limit && parseInt(limit as string) > 0) {
      flatErrors.splice(parseInt(limit as string));
    }

    res.json(flatErrors);
  } catch (error) {
    console.error('Failed to retrieve errors:', error);
    res.status(500).json({ error: 'Failed to retrieve errors' });
  }
});

// Store user analytics
router.post('/analytics', async (req, res) => {
  try {
    const { sessionId, interactions, timestamp } = req.body;

    if (!sessionId || !Array.isArray(interactions)) {
      return res.status(400).json({ error: 'Invalid analytics data' });
    }

    const analyticsData = {
      sessionId,
      timestamp: timestamp || Date.now(),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      interactions: interactions.map((interaction: any) => ({
        ...interaction,
        serverTimestamp: Date.now(),
      })),
    };

    const existingAnalytics = await readMonitoringData('analytics.json');
    existingAnalytics.push(analyticsData);

    // Keep only last 10,000 interaction entries
    if (existingAnalytics.length > 10000) {
      existingAnalytics.splice(0, existingAnalytics.length - 10000);
    }

    await writeMonitoringData('analytics.json', existingAnalytics);

    res.json({ success: true, count: interactions.length });
  } catch (error) {
    console.error('Failed to store analytics:', error);
    res.status(500).json({ error: 'Failed to store analytics' });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    const { sessionId, timeRange, limit = 100 } = req.query;

    let analytics = await readMonitoringData('analytics.json');

    // Flatten interactions
    const interactions = analytics.flatMap((entry: any) =>
      entry.interactions.map((interaction: any) => ({
        ...interaction,
        sessionId: entry.sessionId,
        userAgent: entry.userAgent,
        ip: entry.ip,
        batchTimestamp: entry.timestamp,
      }))
    );

    // Apply filters
    if (sessionId) {
      interactions.filter((i: any) => i.sessionId === sessionId);
    }

    if (timeRange) {
      const cutoff = Date.now() - parseInt(timeRange as string);
      interactions.filter((i: any) => i.timestamp > cutoff);
    }

    // Sort by timestamp
    interactions.sort((a: any, b: any) => b.timestamp - a.timestamp);

    // Limit results
    if (limit && parseInt(limit as string) > 0) {
      interactions.splice(parseInt(limit as string));
    }

    res.json(interactions);
  } catch (error) {
    console.error('Failed to retrieve analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});

// Get monitoring statistics
router.get('/stats', async (req, res) => {
  try {
    const metrics = await readMonitoringData('metrics.json');
    const errors = await readMonitoringData('errors.json');
    const analytics = await readMonitoringData('analytics.json');

    const stats = {
      overview: {
        totalMetrics: metrics.reduce((sum: number, m: any) => sum + m.metrics.length, 0),
        totalErrors: errors.reduce((sum: number, e: any) => sum + e.errors.length, 0),
        totalInteractions: analytics.reduce((sum: number, a: any) => sum + a.interactions.length, 0),
        activeSessions: new Set([...metrics, ...errors, ...analytics].map((item: any) => item.sessionId)).size,
      },
      performance: {
        averageRenderTime: 0,
        averageApiTime: 0,
        errorRate: 0,
      },
      errors: {
        byType: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        recent24h: 0,
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      },
      generatedAt: new Date().toISOString(),
    };

    // Calculate performance metrics
    const allMetrics = metrics.flatMap((m: any) => m.metrics);
    const renderMetrics = allMetrics.filter((m: any) => m.type === 'render');
    const apiMetrics = allMetrics.filter((m: any) => m.type === 'api');

    if (renderMetrics.length > 0) {
      stats.performance.averageRenderTime = renderMetrics.reduce((sum: number, m: any) => sum + m.value, 0) / renderMetrics.length;
    }

    if (apiMetrics.length > 0) {
      stats.performance.averageApiTime = apiMetrics.reduce((sum: number, m: any) => sum + m.value, 0) / apiMetrics.length;
    }

    // Calculate error statistics
    const allErrors = errors.flatMap((e: any) => e.errors);
    const last24h = Date.now() - (24 * 60 * 60 * 1000);

    stats.errors.recent24h = allErrors.filter((e: any) => e.timestamp > last24h).length;

    allErrors.forEach((error: any) => {
      stats.errors.byType[error.type] = (stats.errors.byType[error.type] || 0) + 1;
      stats.errors.bySeverity[error.severity] = (stats.errors.bySeverity[error.severity] || 0) + 1;
    });

    if (allMetrics.length > 0) {
      stats.performance.errorRate = (allErrors.length / allMetrics.length) * 100;
    }

    res.json(stats);
  } catch (error) {
    console.error('Failed to generate statistics:', error);
    res.status(500).json({ error: 'Failed to generate statistics' });
  }
});

// Export monitoring data
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', type = 'all' } = req.query;

    const exportData: any = {
      exportedAt: new Date().toISOString(),
      exportFormat: format,
    };

    if (type === 'all' || type === 'metrics') {
      exportData.metrics = await readMonitoringData('metrics.json');
    }

    if (type === 'all' || type === 'errors') {
      exportData.errors = await readMonitoringData('errors.json');
    }

    if (type === 'all' || type === 'analytics') {
      exportData.analytics = await readMonitoringData('analytics.json');
    }

    if (type === 'all' || type === 'stats') {
      const stats = await fetch(`${req.protocol}://${req.get('host')}/api/monitoring/stats`);
      exportData.statistics = await stats.json();
    }

    if (format === 'csv') {
      // Convert to CSV (simplified)
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="monitoring-export-${Date.now()}.csv"`);
      res.send('CSV export not yet implemented');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="monitoring-export-${Date.now()}.json"`);
      res.json(exportData);
    }
  } catch (error) {
    console.error('Failed to export data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Cleanup old data (could be called by a cron job)
router.post('/cleanup', async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    // Clean metrics
    const metrics = await readMonitoringData('metrics.json');
    const filteredMetrics = metrics.filter((m: any) => m.timestamp > cutoffTime);
    await writeMonitoringData('metrics.json', filteredMetrics);

    // Clean errors
    const errors = await readMonitoringData('errors.json');
    const filteredErrors = errors.filter((e: any) => e.timestamp > cutoffTime);
    await writeMonitoringData('errors.json', filteredErrors);

    // Clean analytics
    const analytics = await readMonitoringData('analytics.json');
    const filteredAnalytics = analytics.filter((a: any) => a.timestamp > cutoffTime);
    await writeMonitoringData('analytics.json', filteredAnalytics);

    res.json({
      success: true,
      removedMetrics: metrics.length - filteredMetrics.length,
      removedErrors: errors.length - filteredErrors.length,
      removedAnalytics: analytics.length - filteredAnalytics.length,
    });
  } catch (error) {
    console.error('Failed to cleanup data:', error);
    res.status(500).json({ error: 'Failed to cleanup data' });
  }
});

export default router;
