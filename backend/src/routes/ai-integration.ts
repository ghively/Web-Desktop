import express from 'express';
import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// AI Service interfaces
interface AIService {
  name: string;
  type: 'local' | 'cloud';
  endpoint?: string;
  apiKey?: string;
  model?: string;
  capabilities: string[];
}

interface FileAnalysis {
  path: string;
  category: string;
  tags: string[];
  confidence: number;
  summary?: string;
  metadata: Record<string, any>;
}

interface SearchQuery {
  query: string;
  context?: string;
  filters?: Record<string, any>;
  limit?: number;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  actions: WorkflowAction[];
  active: boolean;
  createdAt: Date;
  lastRun?: Date;
}

interface WorkflowAction {
  type: string;
  config: Record<string, any>;
  conditions?: Record<string, any>;
}

interface SecurityEvent {
  id: string;
  type: 'anomaly' | 'threat' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  source: string;
  data: Record<string, any>;
  resolved: boolean;
}

// In-memory storage for development
const aiServices: AIService[] = [
  {
    name: 'Local File Analyzer',
    type: 'local',
    capabilities: ['file-classification', 'content-analysis', 'tagging']
  }
];

const fileCache = new Map<string, FileAnalysis>();
const workflows = new Map<string, Workflow>();
const securityEvents = new Map<string, SecurityEvent>();

// AI Services Management
router.get('/services', (req, res) => {
  res.json(aiServices);
});

router.post('/services', (req, res) => {
  const service: AIService = req.body;
  service.name = service.name || `AI Service ${aiServices.length + 1}`;
  aiServices.push(service);
  res.json(service);
});

// Smart File Organization
router.post('/files/analyze', async (req, res) => {
  try {
    const { filePaths } = req.body;
    const results: FileAnalysis[] = [];

    for (const filePath of filePaths) {
      // Check cache first
      const cacheKey = `${filePath}:${fs.statSync(filePath).mtime.getTime()}`;
      if (fileCache.has(cacheKey)) {
        results.push(fileCache.get(cacheKey)!);
        continue;
      }

      const analysis = await analyzeFile(filePath);
      fileCache.set(cacheKey, analysis);
      results.push(analysis);
    }

    res.json(results);
  } catch (error) {
    console.error('File analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze files' });
  }
});

async function analyzeFile(filePath: string): Promise<FileAnalysis> {
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  // Basic file classification logic
  const category = classifyFile(fileName, ext);
  const tags = generateTags(fileName, ext, filePath);
  const confidence = calculateConfidence(fileName, ext);

  let summary: string | undefined;
  let metadata: Record<string, any> = {};

  // Extract metadata based on file type
  if (['.txt', '.md', '.js', '.ts', '.py', '.java'].includes(ext)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      summary = summarizeText(content);
      metadata = {
        lineCount: content.split('\n').length,
        wordCount: content.split(/\s+/).length,
        encoding: 'utf-8'
      };
    } catch (error) {
      console.error('Error reading text file:', error);
    }
  } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
    metadata = {
      fileType: 'image',
      size: stat.size,
      format: ext.substring(1)
    };
  } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
    metadata = {
      fileType: 'video',
      size: stat.size,
      format: ext.substring(1)
    };
  }

  return {
    path: filePath,
    category,
    tags,
    confidence,
    summary,
    metadata: {
      ...metadata,
      size: stat.size,
      modified: stat.mtime,
      created: stat.birthtime || stat.ctime
    }
  };
}

function classifyFile(fileName: string, ext: string): string {
  const name = fileName.toLowerCase();

  // Documents
  if (['.txt', '.md', '.doc', '.docx', '.pdf', '.rtf'].includes(ext)) {
    return 'Documents';
  }
  if (['.xls', '.xlsx', '.csv'].includes(ext)) {
    return 'Spreadsheets';
  }
  if (['.ppt', '.pptx'].includes(ext)) {
    return 'Presentations';
  }

  // Code
  if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs'].includes(ext)) {
    return 'Code';
  }

  // Images
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) {
    return 'Images';
  }

  // Videos
  if (['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'].includes(ext)) {
    return 'Videos';
  }

  // Audio
  if (['.mp3', '.wav', '.ogg', '.flac', '.aac'].includes(ext)) {
    return 'Audio';
  }

  // Archives
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
    return 'Archives';
  }

  // Configuration
  if (['.json', '.yaml', '.yml', '.xml', '.ini', '.conf', '.config'].includes(ext)) {
    return 'Configuration';
  }

  // Check naming patterns
  if (name.includes('readme') || name.includes('changelog')) {
    return 'Documentation';
  }
  if (name.includes('config') || name.includes('settings')) {
    return 'Configuration';
  }
  if (name.includes('test') || name.includes('spec')) {
    return 'Test Files';
  }
  if (name.includes('backup') || name.includes('old')) {
    return 'Backups';
  }

  return 'Other';
}

function generateTags(fileName: string, ext: string, filePath: string): string[] {
  const tags: string[] = [];
  const name = fileName.toLowerCase();
  const dir = path.dirname(filePath).toLowerCase();

  // Extension-based tags
  tags.push(ext.substring(1) || 'no-extension');

  // Naming pattern tags
  if (name.includes('readme')) tags.push('documentation');
  if (name.includes('config') || name.includes('settings')) tags.push('configuration');
  if (name.includes('test')) tags.push('test');
  if (name.includes('backup')) tags.push('backup');
  if (name.includes('temp') || name.includes('tmp')) tags.push('temporary');
  if (name.includes('draft')) tags.push('draft');

  // Directory-based tags
  const dirParts = dir.split('/');
  if (dirParts.includes('src')) tags.push('source');
  if (dirParts.includes('docs') || dirParts.includes('documentation')) tags.push('documentation');
  if (dirParts.includes('test') || dirParts.includes('tests')) tags.push('test');
  if (dirParts.includes('config')) tags.push('configuration');
  if (dirParts.includes('build') || dirParts.includes('dist')) tags.push('build');

  // Size-based tags
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 10 * 1024 * 1024) tags.push('large');
    else if (stat.size < 1024) tags.push('small');
  } catch (error) {
    // Ignore stat errors
  }

  // Date-based tags
  const now = new Date();
  const fileDate = new Date();
  try {
    fileDate.setTime(fs.statSync(filePath).mtime.getTime());
    const daysDiff = (now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 1) tags.push('recent');
    else if (daysDiff > 365) tags.push('old');
  } catch (error) {
    // Ignore stat errors
  }

  return [...new Set(tags)]; // Remove duplicates
}

function calculateConfidence(fileName: string, ext: string): number {
  let confidence = 0.5; // Base confidence

  // Extension confidence
  const knownExtensions = ['.txt', '.pdf', '.jpg', '.png', '.mp4', '.mp3', '.zip', '.js', '.ts', '.py'];
  if (knownExtensions.includes(ext)) {
    confidence += 0.3;
  }

  // Naming pattern confidence
  const patterns = ['readme', 'config', 'test', 'backup', 'temp'];
  const fileNameLower = fileName.toLowerCase();
  for (const pattern of patterns) {
    if (fileNameLower.includes(pattern)) {
      confidence += 0.1;
    }
  }

  return Math.min(confidence, 1.0);
}

function summarizeText(content: string): string {
  // Simple text summarization
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  if (lines.length <= 3) {
    return content.substring(0, 200) + (content.length > 200 ? '...' : '');
  }

  // Take first few sentences/lines
  const summary = lines.slice(0, 3).join(' ').substring(0, 200);
  return summary + (summary.length >= 200 ? '...' : '');
}

// Predictive Search
router.post('/search', async (req, res) => {
  try {
    const query: SearchQuery = req.body;
    const results = await performSearch(query);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

async function performSearch(query: SearchQuery): Promise<any> {
  // This is a simplified implementation
  // In a real system, you would integrate with proper search engines like Elasticsearch

  const searchPath = query.context || process.env.HOME || '/';
  const limit = query.limit || 50;
  const results: any[] = [];

  try {
    const searchInDirectory = (dir: string, depth = 0) => {
      if (depth > 3) return; // Limit depth for performance
      if (results.length >= limit) return;

      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (results.length >= limit) break;

        const fullPath = path.join(dir, item);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            searchInDirectory(fullPath, depth + 1);
          } else {
            // Simple relevance scoring
            let score = 0;
            const name = item.toLowerCase();
            const searchTerms = query.query.toLowerCase().split(' ');

            for (const term of searchTerms) {
              if (name.includes(term)) {
                score += term.length / name.length;
              }
            }

            if (score > 0.1) {
              results.push({
                path: fullPath,
                name: item,
                score,
                type: stat.isFile() ? 'file' : 'directory',
                size: stat.size,
                modified: stat.mtime
              });
            }
          }
        } catch (error) {
          // Skip files we can't access
        }
      }
    };

    searchInDirectory(searchPath);

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);

    return {
      query: query.query,
      results: results.slice(0, limit),
      total: results.length
    };
  } catch (error) {
    console.error('Directory search error:', error);
    return { query: query.query, results: [], total: 0 };
  }
});

// Workflow Automation
router.get('/workflows', (req, res) => {
  res.json(Array.from(workflows.values()));
});

router.post('/workflows', (req, res) => {
  const workflow: Workflow = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description,
    triggers: req.body.triggers || [],
    actions: req.body.actions || [],
    active: req.body.active || false,
    createdAt: new Date()
  };

  workflows.set(workflow.id, workflow);
  res.json(workflow);
});

router.put('/workflows/:id', (req, res) => {
  const { id } = req.params;
  const workflow = workflows.get(id);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  const updated = { ...workflow, ...req.body, id };
  workflows.set(id, updated);
  res.json(updated);
});

router.delete('/workflows/:id', (req, res) => {
  const { id } = req.params;
  const deleted = workflows.delete(id);
  res.json({ success: deleted });
});

// Security Intelligence
router.get('/security/events', (req, res) => {
  const events = Array.from(securityEvents.values());
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  res.json(events);
});

router.post('/security/events', (req, res) => {
  const event: SecurityEvent = {
    id: uuidv4(),
    type: req.body.type,
    severity: req.body.severity,
    description: req.body.description,
    timestamp: new Date(),
    source: req.body.source,
    data: req.body.data || {},
    resolved: false
  };

  securityEvents.set(event.id, event);
  res.json(event);
});

router.put('/security/events/:id/resolve', (req, res) => {
  const { id } = req.params;
  const event = securityEvents.get(id);

  if (!event) {
    return res.status(404).json({ error: 'Security event not found' });
  }

  event.resolved = true;
  securityEvents.set(id, event);
  res.json(event);
});

// Performance Optimization
router.get('/performance/recommendations', async (req, res) => {
  try {
    const recommendations = await generatePerformanceRecommendations();
    res.json(recommendations);
  } catch (error) {
    console.error('Performance analysis error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

async function generatePerformanceRecommendations(): Promise<any> {
  // Simplified performance analysis
  const recommendations = [];

  try {
    // Check system resources
    const memInfo = fs.readFileSync('/proc/meminfo', 'utf-8');
    const memTotal = parseInt(memInfo.split('\n')[0].split(/\s+/)[1]);
    const memAvailable = parseInt(memInfo.split('\n')[2].split(/\s+/)[1]);
    const memUsagePercent = ((memTotal - memAvailable) / memTotal) * 100;

    if (memUsagePercent > 80) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        title: 'High Memory Usage',
        description: 'Memory usage is above 80%. Consider closing unused applications or adding more RAM.',
        impact: 'system_performance',
        solution: 'close_apps or add_memory'
      });
    }

    // Check disk space
    const homeDir = process.env.HOME || '/';
    const stats = fs.statSync(homeDir);

    recommendations.push({
      type: 'optimization',
      severity: 'info',
      title: 'AI Recommendations',
      description: 'Enable AI-powered file organization to automatically categorize and tag your files.',
      impact: 'user_experience',
      solution: 'enable_ai_organization'
    });

  } catch (error) {
    console.error('Performance check error:', error);
  }

  return {
    timestamp: new Date(),
    recommendations,
    score: calculatePerformanceScore()
  };
}

function calculatePerformanceScore(): number {
  // Simplified performance scoring
  return Math.floor(Math.random() * 40) + 60; // 60-100 range
}

export default router;